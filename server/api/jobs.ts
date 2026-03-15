import { Router } from 'express';
import supabase from '../db';
import { DecisionEngine } from '../services/decisionEngine';

const router = Router();

// Manual trigger for testing
router.post('/trigger-evaluate', async (req, res) => {
  try {
    const { data: activeArms, error: armsError } = await supabase
      .from('arm_registry')
      .select('*')
      .eq('status', 'ACTIVE');

    if (armsError) throw armsError;
    if (!activeArms || activeArms.length === 0) {
      return res.json({ message: 'No active arms to evaluate.' });
    }

    const engine = new DecisionEngine(15000);
    const results = [];

    for (const arm of activeArms) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: metricsData } = await supabase
        .from('performance_daily')
        .select('*')
        .eq('arm_id', arm.id)
        .gte('date', sevenDaysAgo.toISOString())
        .order('date', { ascending: false });

      let impressions = 0, clicks = 0, cost = 0, leads = 0, valid_leads = 0;
      let cost1d = 0, leads1d = 0, cost3d = 0, leads3d = 0, cost7d = 0, leads7d = 0;

      for (const m of (metricsData || [])) {
        impressions += m.impressions;
        clicks += m.clicks;
        cost += m.spend;
        leads += m.leads;
        valid_leads += Math.floor(m.leads * 0.8);
        const mDate = new Date(m.date);
        if (mDate >= oneDayAgo) { cost1d += m.spend; leads1d += m.leads; }
        if (mDate >= threeDaysAgo) { cost3d += m.spend; leads3d += m.leads; }
        if (mDate >= sevenDaysAgo) { cost7d += m.spend; leads7d += m.leads; }
      }

      if (!metricsData || metricsData.length === 0) {
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
        impressions, clicks,
        cpc: clicks > 0 ? cost / clicks : 0,
        cost, leads,
        cpa_1d: leads1d > 0 ? cost1d / leads1d : (cost1d > 0 ? cost1d : 0),
        cpa_3d: leads3d > 0 ? cost3d / leads3d : (cost3d > 0 ? cost3d : 0),
        cpa_7d: leads7d > 0 ? cost7d / leads7d : (cost7d > 0 ? cost7d : 0),
        valid_lead_rate: leads > 0 ? valid_leads / leads : 0
      };

      const result = engine.evaluateArm(arm.id, metrics);
      results.push(result);

      if (result.action.type !== 'HOLD') {
        const { data: defaultRule } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('name', 'Default Decision Engine')
          .limit(1)
          .single();

        const { data: action } = await supabase
          .from('recommended_actions')
          .insert({
            arm_id: arm.id,
            rule_id: defaultRule?.id || 'unknown',
            action_type: result.action.type,
            reason: result.explanation,
            status: result.action.is_auto_executable ? 'APPROVED' : 'PENDING'
          })
          .select()
          .single();

        if (result.action.is_auto_executable && action) {
          await supabase.from('crawler_jobs').insert({
            job_type: 'EXECUTE_ACTION',
            payload: JSON.stringify({ actionId: action.id }),
            status: 'PENDING'
          });
        }
      }
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Failed to trigger evaluation:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Worker fetches the next pending job
router.post('/poll', async (req, res) => {
  try {
    const { data: job, error: findError } = await supabase
      .from('crawler_jobs')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (findError || !job) {
      return res.json({ job: null });
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from('crawler_jobs')
      .update({ status: 'PROCESSING', started_at: new Date().toISOString() })
      .eq('id', job.id)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json({ job: updatedJob });
  } catch (error: any) {
    console.error('Error polling job:', error);
    res.status(500).json({ error: 'Failed to poll job' });
  }
});

// Worker reports job completion or failure
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { status, result, error } = req.body;

  try {
    const { data: updatedJob, error: updateError } = await supabase
      .from('crawler_jobs')
      .update({
        status,
        result: result ? JSON.stringify(result) : null,
        error: error || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Handle EVALUATE_ARMS results
    if (status === 'COMPLETED' && updatedJob.job_type === 'EVALUATE_ARMS' && result?.evaluations) {
      let { data: engineRule } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('name', 'Bayesian Decision Engine')
        .limit(1)
        .single();

      if (!engineRule) {
        const { data: newRule } = await supabase
          .from('automation_rules')
          .insert({
            name: 'Bayesian Decision Engine',
            condition_json: JSON.stringify({ type: 'BAYESIAN_EVAL' }),
            action_type: 'DYNAMIC'
          })
          .select()
          .single();
        engineRule = newRule;
      }

      for (const evalResult of result.evaluations) {
        if (evalResult.action.type !== 'HOLD') {
          const { data: action } = await supabase
            .from('recommended_actions')
            .insert({
              rule_id: engineRule!.id,
              arm_id: evalResult.arm_id,
              action_type: evalResult.action.type,
              reason: evalResult.explanation,
              status: evalResult.action.is_auto_executable ? 'APPROVED' : 'PENDING'
            })
            .select()
            .single();

          if (evalResult.action.is_auto_executable && action) {
            await supabase.from('crawler_jobs').insert({
              job_type: 'EXECUTE_ACTION',
              payload: JSON.stringify({ actionId: action.id }),
              status: 'PENDING'
            });
          }
        }
      }
    }

    res.json({ success: true, job: updatedJob });
  } catch (err: any) {
    console.error('Error completing job:', err);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

// Create a new job
router.post('/', async (req, res) => {
  const { job_type, payload } = req.body;

  try {
    const { data: job, error } = await supabase
      .from('crawler_jobs')
      .insert({ job_type, payload: JSON.stringify(payload) })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, job });
  } catch (error: any) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

export default router;
