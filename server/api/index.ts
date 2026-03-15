import { Router } from 'express';
import supabase from '../db';

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
  try {
    const { data, error } = await supabase
      .from('action_logs')
      .select('*, recommended_action:recommended_actions(*, arm:arm_registry(*), rule:automation_rules(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
