import { Router } from 'express';
import prisma from '../db';
import { DecisionEngine } from '../services/decisionEngine';

const router = Router();

// Manual trigger for testing
router.post('/trigger-evaluate', async (req, res) => {
  try {
    const activeArms = await prisma.armRegistry.findMany({
      where: { status: 'ACTIVE' }
    });

    if (activeArms.length === 0) {
      return res.json({ message: 'No active arms to evaluate.' });
    }

    const engine = new DecisionEngine(15000);
    const results = [];

    for (const arm of activeArms) {
      // Fetch real metrics from database
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const metricsData = await prisma.performanceDaily.findMany({
        where: {
          arm_id: arm.id,
          date: { gte: sevenDaysAgo }
        },
        orderBy: { date: 'desc' }
      });

      let impressions = 0;
      let clicks = 0;
      let cost = 0;
      let leads = 0;
      let valid_leads = 0;

      let cost1d = 0, leads1d = 0;
      let cost3d = 0, leads3d = 0;
      let cost7d = 0, leads7d = 0;

      for (const m of metricsData) {
        impressions += m.impressions;
        clicks += m.clicks;
        cost += m.spend;
        leads += m.leads;
        valid_leads += Math.floor(m.leads * 0.8); // Mock valid leads

        if (m.date >= oneDayAgo) {
          cost1d += m.spend;
          leads1d += m.leads;
        }
        if (m.date >= threeDaysAgo) {
          cost3d += m.spend;
          leads3d += m.leads;
        }
        if (m.date >= sevenDaysAgo) {
          cost7d += m.spend;
          leads7d += m.leads;
        }
      }

      // If no data, use simulated metrics for testing purposes
      if (metricsData.length === 0) {
        impressions = Math.floor(Math.random() * 20000);
        clicks = Math.floor(Math.random() * 200);
        cost = Math.floor(Math.random() * 50000);
        leads = Math.floor(Math.random() * 5);
        valid_leads = Math.floor(leads * 0.8);
        cost1d = cost / 7; leads1d = leads / 7;
        cost3d = (cost / 7) * 3; leads3d = (leads / 7) * 3;
        cost7d = cost; leads7d = leads;
      }

      const metrics = {
        impressions,
        clicks,
        cpc: clicks > 0 ? cost / clicks : 0,
        cost,
        leads,
        cpa_1d: leads1d > 0 ? cost1d / leads1d : (cost1d > 0 ? cost1d : 0),
        cpa_3d: leads3d > 0 ? cost3d / leads3d : (cost3d > 0 ? cost3d : 0),
        cpa_7d: leads7d > 0 ? cost7d / leads7d : (cost7d > 0 ? cost7d : 0),
        valid_lead_rate: leads > 0 ? valid_leads / leads : 0
      };

      const result = engine.evaluateArm(arm.id, metrics);
      results.push(result);

      if (result.action.type !== 'HOLD') {
        const defaultRule = await prisma.automationRule.findFirst({
          where: { name: 'Default Decision Engine' }
        });

        const action = await prisma.recommendedAction.create({
          data: {
            arm_id: arm.id,
            rule_id: defaultRule?.id || 'unknown',
            action_type: result.action.type,
            reason: result.explanation,
            status: result.action.is_auto_executable ? 'APPROVED' : 'PENDING'
          }
        });
        
        if (result.action.is_auto_executable) {
          await prisma.crawlerJob.create({
            data: {
              job_type: 'EXECUTE_ACTION',
              payload: JSON.stringify({ actionId: action.id }),
              status: 'PENDING'
            }
          });
        }
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Failed to trigger evaluation:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Worker fetches the next pending job
router.post('/poll', async (req, res) => {
  try {
    // Find the oldest pending job
    const job = await prisma.crawlerJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'asc' },
    });

    if (!job) {
      return res.json({ job: null });
    }

    // Mark it as processing
    const updatedJob = await prisma.crawlerJob.update({
      where: { id: job.id },
      data: {
        status: 'PROCESSING',
        started_at: new Date(),
      },
    });

    res.json({ job: updatedJob });
  } catch (error) {
    console.error('Error polling job:', error);
    res.status(500).json({ error: 'Failed to poll job' });
  }
});

// Worker reports job completion or failure
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { status, result, error } = req.body;

  try {
    const updatedJob = await prisma.crawlerJob.update({
      where: { id },
      data: {
        status, // 'COMPLETED' or 'FAILED'
        result: result ? JSON.stringify(result) : null,
        error: error || null,
        completed_at: new Date(),
      },
    });

    // Handle specific job results
    if (status === 'COMPLETED' && updatedJob.job_type === 'EVALUATE_ARMS' && result?.evaluations) {
      // Find or create a default rule for the Decision Engine
      let engineRule = await prisma.automationRule.findFirst({
        where: { name: 'Bayesian Decision Engine' }
      });
      if (!engineRule) {
        engineRule = await prisma.automationRule.create({
          data: {
            name: 'Bayesian Decision Engine',
            condition_json: JSON.stringify({ type: 'BAYESIAN_EVAL' }),
            action_type: 'DYNAMIC'
          }
        });
      }

      // Insert recommended actions
      for (const evalResult of result.evaluations) {
        if (evalResult.action.type !== 'HOLD') {
          const action = await prisma.recommendedAction.create({
            data: {
              rule_id: engineRule.id,
              arm_id: evalResult.arm_id,
              action_type: evalResult.action.type,
              reason: evalResult.explanation,
              status: evalResult.action.is_auto_executable ? 'APPROVED' : 'PENDING'
            }
          });
          
          if (evalResult.action.is_auto_executable) {
            await prisma.crawlerJob.create({
              data: {
                job_type: 'EXECUTE_ACTION',
                payload: JSON.stringify({ actionId: action.id }),
                status: 'PENDING'
              }
            });
          }
        }
      }
    }

    res.json({ success: true, job: updatedJob });
  } catch (err) {
    console.error('Error completing job:', err);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

// Create a new job (can be called by other Node.js services)
router.post('/', async (req, res) => {
  const { job_type, payload } = req.body;

  try {
    const job = await prisma.crawlerJob.create({
      data: {
        job_type,
        payload: JSON.stringify(payload),
      },
    });
    res.json({ success: true, job });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

export default router;
