import { Router } from 'express';
import supabase from '../db';

const router = Router();

// GET /arms — with related data
router.get('/', async (req, res) => {
  try {
    const { data: arms, error } = await supabase
      .from('arm_registry')
      .select(`
        *,
        ad_set:ad_sets(*, campaign:campaigns(*)),
        creative:creatives(*),
        audience:audiences(*),
        schedule:schedules(*),
        daily_performance:performance_daily(*)
      `);

    if (error) throw error;
    res.json(arms || []);
  } catch (error: any) {
    console.error('Failed to fetch arms:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /arms/{id}
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: arm, error } = await supabase
      .from('arm_registry')
      .select(`
        *,
        daily_performance:performance_daily(*),
        hourly_performance:performance_hourly(*)
      `)
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ detail: 'Arm not found' });
    res.json(arm);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /arms/{id}/pause
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('arm_registry')
      .update({ status: 'PAUSED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /arms/{id}/resume
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('arm_registry')
      .update({ status: 'ACTIVE' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /arms/{id}/budget/increase
router.post('/:id/budget/increase', async (req, res) => {
  try {
    const { id } = req.params;
    const { increase_percentage, reason } = req.body;

    // 1. Fetch arm + ad_set + campaign
    const { data: arm, error: armError } = await supabase
      .from('arm_registry')
      .select('*, ad_set:ad_sets(*, campaign:campaigns(*))')
      .eq('id', id)
      .single();

    if (armError || !arm) return res.status(404).json({ detail: 'Arm not found' });

    const old_budget = arm.ad_set.campaign.budget;
    const new_budget = old_budget * (1 + (increase_percentage / 100));

    // 2. Update campaign budget
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ budget: new_budget })
      .eq('id', arm.ad_set.campaign_id);

    if (updateError) throw updateError;

    res.json({ status: 'success', arm_id: id, old_budget, new_budget, reason });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /arms/{id}/budget/decrease
router.post('/:id/budget/decrease', async (req, res) => {
  try {
    const { id } = req.params;
    const { decrease_percentage, reason } = req.body;

    const { data: arm, error: armError } = await supabase
      .from('arm_registry')
      .select('*, ad_set:ad_sets(*, campaign:campaigns(*))')
      .eq('id', id)
      .single();

    if (armError || !arm) return res.status(404).json({ detail: 'Arm not found' });

    const old_budget = arm.ad_set.campaign.budget;
    const new_budget = old_budget * (1 - (decrease_percentage / 100));

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ budget: new_budget })
      .eq('id', arm.ad_set.campaign_id);

    if (updateError) throw updateError;

    res.json({ status: 'success', arm_id: id, old_budget, new_budget, reason });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
