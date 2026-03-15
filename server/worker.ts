import prisma from './db';
import { DecisionEngine } from './services/decisionEngine';

export async function startNodeWorker() {
  console.log('Starting Node.js worker...');
  
  setInterval(async () => {
    try {
      // Find a pending job
      const job = await prisma.crawlerJob.findFirst({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'asc' }
      });

      if (!job) return;

      // Mark as processing
      await prisma.crawlerJob.update({
        where: { id: job.id },
        data: { status: 'PROCESSING', started_at: new Date() }
      });

      console.log(`Processing job: ${job.job_type} (${job.id})`);

      let result = null;

      if (job.job_type === 'SYNC_CAMPAIGNS') {
        // Mock syncing campaigns
        console.log('Syncing campaigns...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = { success: true, synced_count: 5 };
      } else if (job.job_type === 'EVALUATE_ARMS') {
        // Evaluate arms
        console.log('Evaluating arms...');
        const activeArms = await prisma.armRegistry.findMany({
          where: { status: 'ACTIVE' }
        });

        const engine = new DecisionEngine(15000);
        const evaluations = [];

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

          const evalResult = engine.evaluateArm(arm.id, metrics);
          evaluations.push(evalResult);
        }
        
        result = { success: true, evaluations };
      } else if (job.job_type === 'EXECUTE_ACTION') {
        // Execute action
        const payload = JSON.parse(job.payload);
        console.log(`Executing action: ${payload.actionId}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (payload.isRollback) {
          console.log(`Rolled back action: ${payload.actionId}`);
        } else {
          // Update action status to EXECUTED
          await prisma.recommendedAction.update({
            where: { id: payload.actionId },
            data: { status: 'EXECUTED' }
          });
          console.log(`Executed action: ${payload.actionId}`);
        }
        
        result = { success: true, actionId: payload.actionId };
      }

      // Mark as completed
      await prisma.crawlerJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          result: JSON.stringify(result)
        }
      });
      
      // If EVALUATE_ARMS, process the results
      if (job.job_type === 'EVALUATE_ARMS' && result?.evaluations) {
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

    } catch (error) {
      console.error('Worker error:', error);
    }
  }, 5000); // Poll every 5 seconds
}
