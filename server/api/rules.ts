import { Router } from 'express';
import prisma from '../db';

const router = Router();

// GET /rules
router.get('/', async (req, res) => {
  const rules = await prisma.automationRule.findMany({
    orderBy: { created_at: 'desc' },
  });
  res.json(rules);
});

// POST /rules
router.post('/', async (req, res) => {
  const { name, condition_json, action_type, require_approval } = req.body;
  
  const rule = await prisma.automationRule.create({
    data: {
      name,
      condition_json: JSON.stringify(condition_json),
      action_type,
      is_active: true,
    },
  });
  
  res.json(rule);
});

export default router;
