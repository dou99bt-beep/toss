import { Router } from 'express';
import prisma from '../db';

const router = Router();

// GET /arms
router.get('/', async (req, res) => {
  const arms = await prisma.armRegistry.findMany({
    include: { 
      ad_set: {
        include: {
          campaign: true
        }
      }, 
      creative: true, 
      audience: true, 
      schedule: true,
      daily_performance: true
    },
  });
  res.json(arms);
});

// GET /arms/{id}
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const arm = await prisma.armRegistry.findUnique({
    where: { id },
    include: {
      daily_performance: { orderBy: { date: 'desc' }, take: 7 },
      hourly_performance: { orderBy: { date: 'desc' }, take: 24 },
    },
  });
  
  if (!arm) return res.status(404).json({ detail: 'Arm not found' });
  res.json(arm);
});

// POST /arms/{id}/pause
router.post('/:id/pause', async (req, res) => {
  const { id } = req.params;
  const arm = await prisma.armRegistry.update({
    where: { id },
    data: { status: 'PAUSED' },
  });
  res.json(arm);
});

// POST /arms/{id}/resume
router.post('/:id/resume', async (req, res) => {
  const { id } = req.params;
  const arm = await prisma.armRegistry.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });
  res.json(arm);
});

// POST /arms/{id}/budget/increase
router.post('/:id/budget/increase', async (req, res) => {
  const { id } = req.params;
  const { increase_percentage, reason } = req.body;
  
  const arm = await prisma.armRegistry.findUnique({
    where: { id },
    include: { ad_set: { include: { campaign: true } } },
  });
  
  if (!arm) return res.status(404).json({ detail: 'Arm not found' });
  
  const old_budget = arm.ad_set.campaign.budget;
  const new_budget = old_budget * (1 + (increase_percentage / 100));
  
  // 실제로는 토스애즈 API 연동 또는 봇 실행
  await prisma.campaign.update({
    where: { id: arm.ad_set.campaign_id },
    data: { budget: new_budget },
  });
  
  res.json({
    status: 'success',
    arm_id: id,
    old_budget,
    new_budget,
    reason
  });
});

// POST /arms/{id}/budget/decrease
router.post('/:id/budget/decrease', async (req, res) => {
  const { id } = req.params;
  const { decrease_percentage, reason } = req.body;
  
  const arm = await prisma.armRegistry.findUnique({
    where: { id },
    include: { ad_set: { include: { campaign: true } } },
  });
  
  if (!arm) return res.status(404).json({ detail: 'Arm not found' });
  
  const old_budget = arm.ad_set.campaign.budget;
  const new_budget = old_budget * (1 - (decrease_percentage / 100));
  
  await prisma.campaign.update({
    where: { id: arm.ad_set.campaign_id },
    data: { budget: new_budget },
  });
  
  res.json({
    status: 'success',
    arm_id: id,
    old_budget,
    new_budget,
    reason
  });
});

export default router;
