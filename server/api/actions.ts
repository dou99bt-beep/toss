import { Router } from 'express';
import { actionService } from '../services/actionService';
import prisma from '../db';

const router = Router();

// GET /actions
router.get('/', async (req, res) => {
  const actions = await prisma.recommendedAction.findMany({
    include: { arm: true, rule: true },
    orderBy: { created_at: 'desc' },
  });
  res.json(actions);
});

// POST /actions/{id}/approve
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const action = await actionService.approveAndExecute(id, reason || '사용자 수동 승인');
    
    if (!action) {
      return res.status(404).json({ detail: 'Action not found or already executed' });
    }
    
    res.json(action);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /actions/{id}/reject
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const action = await prisma.recommendedAction.update({
    where: { id },
    data: { status: 'REJECTED' },
  });
  res.json(action);
});

// POST /actions/{id}/rollback
router.post('/:id/rollback', async (req, res) => {
  const { id } = req.params;
  
  try {
    const action = await prisma.recommendedAction.update({
      where: { id },
      data: { status: 'ROLLED_BACK' },
    });
    
    // Here we would also enqueue a job to reverse the action on Toss Ads
    await prisma.crawlerJob.create({
      data: {
        job_type: 'EXECUTE_ACTION',
        payload: JSON.stringify({ actionId: id, isRollback: true }),
        status: 'PENDING'
      }
    });

    res.json({ message: 'Rollback initiated', action });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback action' });
  }
});

export default router;
