import { Router } from 'express';
import { actionService } from '../services/actionService';
import supabase from '../db';

const router = Router();

// GET /actions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recommended_actions')
      .select('*, arm:arm_registry(*), rule:automation_rules(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recommended_actions')
      .update({ status: 'REJECTED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /actions/{id}/rollback
router.post('/:id/rollback', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: action, error: actionError } = await supabase
      .from('recommended_actions')
      .update({ status: 'ROLLED_BACK' })
      .eq('id', id)
      .select()
      .single();

    if (actionError) throw actionError;

    // Enqueue rollback job
    const { error: jobError } = await supabase
      .from('crawler_jobs')
      .insert({
        job_type: 'EXECUTE_ACTION',
        payload: JSON.stringify({ actionId: id, isRollback: true }),
        status: 'PENDING'
      });

    if (jobError) throw jobError;

    res.json({ message: 'Rollback initiated', action });
  } catch (error: any) {
    console.error('Rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback action' });
  }
});

export default router;
