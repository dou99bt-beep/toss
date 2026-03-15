import { Router } from 'express';
import supabase from '../db';

const router = Router();

// GET /dashboard/summary
router.get('/summary', async (req, res) => {
  res.json({
    total_spend: 1250000,
    total_leads: 450,
    avg_cpa: 2777,
    active_arms: 12,
  });
});

// GET /dashboard/trend
router.get('/trend', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('performance_daily')
      .select('*')
      .order('date', { ascending: true })
      .limit(30);

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /dashboard/heatmap/hourly
router.get('/heatmap/hourly', async (req, res) => {
  res.json({ message: 'Hourly heatmap data' });
});

// GET /dashboard/heatmap/weekday-hour
router.get('/heatmap/weekday-hour', async (req, res) => {
  res.json({ message: 'Weekday-hour heatmap data' });
});

export default router;
