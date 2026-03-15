import { Router } from 'express';
import prisma from '../db';

const router = Router();

// GET /crawler/status
router.get('/status', async (req, res) => {
  const latestLog = await prisma.crawlerLog.findFirst({
    orderBy: { created_at: 'desc' },
  });
  
  res.json({
    status: latestLog?.status || 'IDLE',
    last_run: latestLog?.created_at,
    screenshot_url: latestLog?.screenshot_url,
  });
});

// POST /crawler/relogin
router.post('/relogin', async (req, res) => {
  // 봇 재로그인 로직 호출
  res.json({ message: 'Relogin task triggered' });
});

// POST /crawler/test-run
router.post('/test-run', async (req, res) => {
  const { selector_id } = req.body;
  res.json({ message: 'Test run initiated', selector_id });
});

export default router;
