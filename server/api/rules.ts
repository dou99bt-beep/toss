import { Router } from 'express';
import supabase from '../db';

const router = Router();

// GET /rules
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /rules
router.post('/', async (req, res) => {
  try {
    const { name, condition_json, action_type } = req.body;
    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        name,
        condition_json: JSON.stringify(condition_json),
        action_type,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
