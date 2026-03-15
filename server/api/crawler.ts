import { Router } from 'express';
import supabase from '../db';

const router = Router();

// GET /crawler/status
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crawler_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      status: data?.status || 'IDLE',
      last_run: data?.created_at,
      screenshot_url: data?.screenshot_url,
    });
  } catch (error: any) {
    res.json({ status: 'IDLE', last_run: null, screenshot_url: null });
  }
});

// POST /crawler/relogin
router.post('/relogin', async (req, res) => {
  res.json({ message: 'Relogin task triggered' });
});

// POST /crawler/test-run
router.post('/test-run', async (req, res) => {
  const { selector_id } = req.body;
  res.json({ message: 'Test run initiated', selector_id });
});

export default router;
