import { Router } from 'express';
import prisma from '../db';

const router = Router();

// GET /dashboard/summary
router.get('/summary', async (req, res) => {
  // 실제로는 DB에서 집계 로직 수행
  res.json({
    total_spend: 1250000,
    total_leads: 450,
    avg_cpa: 2777,
    active_arms: 12,
  });
});

// GET /dashboard/trend
router.get('/trend', async (req, res) => {
  const trends = await prisma.performanceDaily.findMany({
    orderBy: { date: 'asc' },
    take: 30,
  });
  res.json(trends);
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
