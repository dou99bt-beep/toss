import { Router } from 'express';
import supabase from '../db';
import { tossAdsMockDB } from '../../src/mocks/tossAdsMockData';

const router = Router();

router.post('/', async (req, res) => {
  try {
    console.log('Starting Supabase database seed...');

    // 1. Delete existing data (reverse FK order)
    await supabase.from('action_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('user_approvals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('recommended_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('automation_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('performance_hourly').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('performance_daily').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('performance_creative').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lead_quality').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('arm_registry').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audiences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('creatives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('ad_sets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('crawler_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('crawler_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Cleared existing data.');

    // 2. Insert Base Entities
    const { error: campErr } = await supabase.from('campaigns').insert(tossAdsMockDB.campaigns);
    if (campErr) { console.error('campaigns insert error:', campErr); throw campErr; }

    const { error: adsetErr } = await supabase.from('ad_sets').insert(tossAdsMockDB.adSets);
    if (adsetErr) { console.error('ad_sets insert error:', adsetErr); throw adsetErr; }

    const { error: crErr } = await supabase.from('creatives').insert(tossAdsMockDB.creatives);
    if (crErr) { console.error('creatives insert error:', crErr); throw crErr; }

    const { error: audErr } = await supabase.from('audiences').insert(tossAdsMockDB.audiences);
    if (audErr) { console.error('audiences insert error:', audErr); throw audErr; }

    const { error: schErr } = await supabase.from('schedules').insert(tossAdsMockDB.schedules);
    if (schErr) { console.error('schedules insert error:', schErr); throw schErr; }

    console.log('Inserted base entities.');

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
    const { error: armErr } = await supabase.from('arm_registry').insert(armsToInsert);
    if (armErr) { console.error('arm_registry insert error:', armErr); throw armErr; }

    console.log('Inserted arms.');

    // 4. Insert Performance Data (batched)
    const batchSize = 500;
    const dailyData = tossAdsMockDB.performanceDaily.map(p => ({
      id: p.id,
      arm_id: p.arm_id,
      date: new Date(p.date).toISOString(),
      spend: p.spend,
      impressions: p.impressions,
      clicks: p.clicks,
      leads: p.leads,
      cpa: p.leads > 0 ? p.spend / p.leads : 0
    }));

    for (let i = 0; i < dailyData.length; i += batchSize) {
      const batch = dailyData.slice(i, i + batchSize);
      const { error } = await supabase.from('performance_daily').insert(batch);
      if (error) { console.error('performance_daily batch error:', error); throw error; }
    }

    const hourlyData = tossAdsMockDB.performanceHourly.map(p => {
      const d = new Date(p.datetime);
      return {
        id: p.id,
        arm_id: p.arm_id,
        date: d.toISOString(),
        hour: d.getHours(),
        spend: p.spend,
        leads: p.leads,
        cpa: p.leads > 0 ? p.spend / p.leads : 0
      };
    });

    for (let i = 0; i < hourlyData.length; i += batchSize) {
      const batch = hourlyData.slice(i, i + batchSize);
      const { error } = await supabase.from('performance_hourly').insert(batch);
      if (error) { console.error('performance_hourly batch error:', error); throw error; }
    }

    console.log('Inserted performance data.');

    // 5. Default Automation Rule
    const { data: defaultRule, error: ruleErr } = await supabase
      .from('automation_rules')
      .insert({
        id: 'a0000000-0000-0000-0000-000000000001',
        name: '기본 CPA 최적화 룰',
        condition_json: JSON.stringify({ type: 'BAYESIAN_EVAL' }),
        action_type: 'DYNAMIC',
        is_active: true
      })
      .select()
      .single();
    if (ruleErr) { console.error('automation_rules insert error:', ruleErr); throw ruleErr; }

    // 6. Recommended Actions
    const actionsToInsert = tossAdsMockDB.recommendedActions.map(a => ({
      id: a.id,
      rule_id: defaultRule.id,
      arm_id: a.arm_id,
      action_type: a.action_type,
      reason: a.reason,
      status: a.status,
      created_at: new Date(a.created_at).toISOString()
    }));
    const { error: actErr } = await supabase.from('recommended_actions').insert(actionsToInsert);
    if (actErr) { console.error('recommended_actions insert error:', actErr); throw actErr; }

    // 7. Action Logs
    const actionLogsToInsert = tossAdsMockDB.actionLogs.map(l => ({
      id: l.id,
      recommended_action_id: l.action_id,
      executor: l.executor,
      status: l.status,
      created_at: new Date(l.created_at).toISOString()
    }));
    const { error: logErr } = await supabase.from('action_logs').insert(actionLogsToInsert);
    if (logErr) { console.error('action_logs insert error:', logErr); throw logErr; }

    // 8. Crawler Logs
    const crawlerLogsToInsert = tossAdsMockDB.crawlerLogs.map(l => ({
      id: l.id,
      session_id: 'SESSION-' + Date.now(),
      status: l.status,
      error_trace: l.message,
      created_at: new Date(l.created_at).toISOString()
    }));
    const { error: crawlErr } = await supabase.from('crawler_logs').insert(crawlerLogsToInsert);
    if (crawlErr) { console.error('crawler_logs insert error:', crawlErr); throw crawlErr; }

    console.log('Database seed completed successfully.');
    res.json({ success: true, message: 'Supabase database seeded successfully with mock data.' });
  } catch (error: any) {
    console.error('Failed to seed database:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to seed database' });
  }
});

export default router;
