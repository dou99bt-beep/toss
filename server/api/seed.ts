import { Router } from 'express';
import prisma from '../db';
import { tossAdsMockDB } from '../../src/mocks/tossAdsMockData';

const router = Router();

router.post('/', async (req, res) => {
  try {
    console.log('Starting database seed...');

    // 1. Delete existing data in reverse order of dependencies
    await prisma.actionLog.deleteMany();
    await prisma.userApproval.deleteMany();
    await prisma.recommendedAction.deleteMany();
    await prisma.automationRule.deleteMany();
    await prisma.performanceHourly.deleteMany();
    await prisma.performanceDaily.deleteMany();
    await prisma.armRegistry.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.audience.deleteMany();
    await prisma.creative.deleteMany();
    await prisma.adSet.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.crawlerLog.deleteMany();
    await prisma.crawlerJob.deleteMany();

    // 2. Insert Base Entities
    await prisma.campaign.createMany({ data: tossAdsMockDB.campaigns });
    await prisma.adSet.createMany({ data: tossAdsMockDB.adSets });
    await prisma.creative.createMany({ data: tossAdsMockDB.creatives });
    await prisma.audience.createMany({ data: tossAdsMockDB.audiences });
    await prisma.schedule.createMany({ data: tossAdsMockDB.schedules });

    // 3. Insert Arms
    const armsToInsert = tossAdsMockDB.arms.map(a => ({
      id: a.id,
      ad_set_id: a.ad_set_id,
      creative_id: a.creative_id,
      audience_id: a.audience_id,
      schedule_id: a.schedule_id,
      status: a.status,
      is_control: false
    }));
    await prisma.armRegistry.createMany({ data: armsToInsert });

    // 4. Insert Performance Data (Batching for large arrays)
    const batchSize = 1000;
    for (let i = 0; i < tossAdsMockDB.performanceDaily.length; i += batchSize) {
      const batch = tossAdsMockDB.performanceDaily.slice(i, i + batchSize).map(p => ({
        id: p.id,
        arm_id: p.arm_id,
        date: new Date(p.date),
        spend: p.spend,
        impressions: p.impressions,
        clicks: p.clicks,
        leads: p.leads,
        cpa: p.leads > 0 ? p.spend / p.leads : 0
      }));
      await prisma.performanceDaily.createMany({ data: batch });
    }

    for (let i = 0; i < tossAdsMockDB.performanceHourly.length; i += batchSize) {
      const batch = tossAdsMockDB.performanceHourly.slice(i, i + batchSize).map(p => {
        const d = new Date(p.datetime);
        return {
          id: p.id,
          arm_id: p.arm_id,
          date: d,
          hour: d.getHours(),
          spend: p.spend,
          leads: p.leads,
          cpa: p.leads > 0 ? p.spend / p.leads : 0
        };
      });
      await prisma.performanceHourly.createMany({ data: batch });
    }

    // 5. Create a Default Automation Rule
    const defaultRule = await prisma.automationRule.create({
      data: {
        id: 'RULE-001',
        name: '기본 CPA 최적화 룰',
        condition_json: JSON.stringify({ type: 'BAYESIAN_EVAL' }),
        action_type: 'DYNAMIC',
        is_active: true
      }
    });

    // 6. Insert Recommended Actions
    const actionsToInsert = tossAdsMockDB.recommendedActions.map(a => ({
      id: a.id,
      rule_id: defaultRule.id,
      arm_id: a.arm_id,
      action_type: a.action_type,
      reason: a.reason,
      status: a.status,
      created_at: new Date(a.created_at)
    }));
    await prisma.recommendedAction.createMany({ data: actionsToInsert });

    // 7. Insert Action Logs
    const actionLogsToInsert = tossAdsMockDB.actionLogs.map(l => ({
      id: l.id,
      recommended_action_id: l.action_id,
      executor: l.executor,
      status: l.status,
      created_at: new Date(l.created_at)
    }));
    await prisma.actionLog.createMany({ data: actionLogsToInsert });

    // 8. Insert Crawler Logs
    const crawlerLogsToInsert = tossAdsMockDB.crawlerLogs.map(l => ({
      id: l.id,
      session_id: 'SESSION-' + Date.now(),
      status: l.status,
      error_trace: l.message, // Using error_trace to store the message
      created_at: new Date(l.created_at)
    }));
    await prisma.crawlerLog.createMany({ data: crawlerLogsToInsert });

    console.log('Database seed completed successfully.');
    res.json({ success: true, message: 'Database seeded successfully with mock data.' });
  } catch (error) {
    console.error('Failed to seed database:', error);
    res.status(500).json({ success: false, error: 'Failed to seed database' });
  }
});

export default router;
