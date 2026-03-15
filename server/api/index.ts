import { Router } from 'express';
import prisma from '../db';
import actionsRouter from './actions';
import armsRouter from './arms';
import rulesRouter from './rules';
import crawlerRouter from './crawler';
import dashboardRouter from './dashboard';
import jobsRouter from './jobs';
import seedRouter from './seed';

const router = Router();

router.use('/actions', actionsRouter);
router.use('/arms', armsRouter);
router.use('/rules', rulesRouter);
router.use('/crawler', crawlerRouter);
router.use('/dashboard', dashboardRouter);
router.use('/jobs', jobsRouter);
router.use('/seed', seedRouter);

// GET /audit-logs
router.get('/audit-logs', async (req, res) => {
  const logs = await prisma.actionLog.findMany({
    include: { recommended_action: { include: { arm: true, rule: true } } },
    orderBy: { created_at: 'desc' },
  });
  res.json(logs);
});

export default router;
