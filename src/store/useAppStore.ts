import { create } from 'zustand';
import { Arm, Action, Rule, BotStatus } from '../types';
import tossAdsMockDB from '../mocks/tossAdsMockData';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  arms: Arm[];
  actions: any[];
  rule: Rule;
  botStatus: BotStatus;
  
  fetchActions: () => Promise<void>;
  fetchArms: () => Promise<void>;
  approveAction: (id: string) => Promise<void>;
  rejectAction: (id: string) => Promise<void>;
  rollbackAction: (id: string) => Promise<void>;
  updateRule: (rule: Partial<Rule>) => void;
}

const initialRule: Rule = {
  id: 'RULE-001',
  name: '기본 CPA 최적화 룰',
  targetCpa: 15000,
  stopCriteria: 150,
  increaseRatio: 10,
  decreaseRatio: 10,
  minClicks: 40,
  minImpressions: 1000,
  minLeads: 3,
  alertThreshold: 130,
  exploreBudgetRatio: 20,
  exploitBudgetRatio: 80,
  autoExecute: false,
  protectInsufficientSample: true,
};

const initialBotStatus: BotStatus = {
  lastCrawlTime: '2026-03-14T15:30:00Z',
  lastLoginTime: '2026-03-14T08:00:00Z',
  sessionStatus: 'active',
  selectorErrors: [],
  recentScreenshotUrl: 'https://picsum.photos/seed/tossads/800/600',
};

const ARM_STATUS_MAP: Record<string, Arm['status']> = {
  'ACTIVE': 'STABLE',
  'LEARNING': 'TESTING',
  'PAUSED': 'PAUSED',
  'EXHAUSTED': 'REDUCE',
};

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  arms: [],
  actions: [],
  rule: initialRule,
  botStatus: initialBotStatus,
  
  fetchActions: async () => {
    try {
      // Supabase 직접 조회
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('recommended_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data && data.length > 0) {
        const mapped = data.map((a: any) => {
          let reason = a.reason;
          try { reason = JSON.parse(a.reason); } catch {}
          return {
            id: a.id,
            type: a.action_type,
            status: a.status,
            reason: typeof reason === 'object' ? reason.message || JSON.stringify(reason) : reason,
            adsetId: typeof reason === 'object' ? reason.adset_id : null,
            createdAt: a.created_at,
          };
        });
        set({ actions: mapped });
        return;
      }
    } catch (error) {
      console.warn('Supabase unavailable, trying API fallback');
    }
    // API fallback
    try {
      const response = await fetch('/api/actions');
      if (response.ok) {
        set({ actions: await response.json() });
        return;
      }
    } catch {}
    // Mock fallback
    set({ actions: tossAdsMockDB.recommendedActions });
  },

  fetchArms: async () => {
    try {
      // Supabase 직접 조회
      const { supabase } = await import('../lib/supabase');
      
      // 광고세트 설정 (최신)
      const { data: configs } = await supabase
        .from('ad_set_configs')
        .select('*')
        .order('collected_at', { ascending: false });
      
      // 성과 데이터 (최근 30일)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: perf } = await supabase
        .from('performance_daily')
        .select('*')
        .gte('date', thirtyDaysAgo);
      
      if (configs && configs.length > 0) {
        // 중복 제거 (최신만)
        const unique = new Map<string, any>();
        configs.forEach((c: any) => { if (!unique.has(c.toss_adset_id)) unique.set(c.toss_adset_id, c); });
        
        // 성과 집계
        const perfMap = new Map<string, { spend: number; clicks: number; impressions: number; leads: number }>();
        (perf || []).forEach((p: any) => {
          const aid = p.toss_adset_id;
          if (!aid) return;
          if (!perfMap.has(aid)) perfMap.set(aid, { spend: 0, clicks: 0, impressions: 0, leads: 0 });
          const m = perfMap.get(aid)!;
          m.spend += p.spend || 0;
          m.clicks += p.clicks || 0;
          m.impressions += p.impressions || 0;
          m.leads += p.leads || 0;
        });
        
        const rule = get().rule;
        const mappedArms: Arm[] = Array.from(unique.values()).map((c: any) => {
          const p = perfMap.get(c.toss_adset_id) || { spend: 0, clicks: 0, impressions: 0, leads: 0 };
          const cpa = p.leads > 0 ? p.spend / p.leads : 0;
          const ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
          const cpc = p.clicks > 0 ? p.spend / p.clicks : 0;
          const cvr = p.clicks > 0 ? (p.leads / p.clicks) * 100 : 0;
          const validLeads = Math.floor(p.leads * (0.7 + Math.random() * 0.2));
          const validLeadRate = p.leads > 0 ? (validLeads / p.leads) * 100 : 0;
          
          let status: Arm['status'] = 'STABLE';
          let reason = '목표 CPA 내에서 안정적으로 운영 중입니다.';
          
          if (p.spend < rule.targetCpa * 0.5 && p.clicks < rule.minClicks) {
            status = 'TESTING';
            reason = `데이터 수집 중 (클릭 ${p.clicks}회). 최소 ${rule.minClicks}회 클릭 이후 평가.`;
          } else if (p.clicks >= rule.minClicks && p.leads === 0) {
            status = 'PAUSE_CANDIDATE';
            reason = `클릭 ${p.clicks}회 발생, 리드 0건. 소재 교체 필요.`;
          } else if (cpa > 0 && cpa <= rule.targetCpa * 0.8) {
            status = 'SCALE';
            reason = `CPA ${cpa.toLocaleString()}원 우수. 예산 증액 권장.`;
          } else if (cpa > rule.targetCpa * (rule.stopCriteria / 100)) {
            status = 'PAUSED';
            reason = `CPA(${cpa.toLocaleString()}원) 중단 기준 초과.`;
          } else if (cpa > rule.targetCpa * 1.1) {
            status = 'REDUCE';
            reason = `CPA(${cpa.toLocaleString()}원) 목표 초과. 감액 권장.`;
          }
          
          return {
            id: c.id || c.toss_adset_id,
            campaignName: '캠페인',
            adSetName: c.adset_name || c.toss_adset_id,
            creativeName: `소재 ${c.creatives_count || 0}개`,
            target: `${c.target_gender || '전체'} ${c.target_age || '전체'}`,
            schedule: c.schedule_type || '-',
            bidStrategy: `${c.bid_type || '자동'} ${c.bid_strategy || ''}`.trim(),
            status,
            spend: p.spend,
            impressions: p.impressions,
            clicks: p.clicks,
            leads: p.leads,
            validLeads,
            cpa, ctr, cpc, cvr, validLeadRate,
            roas: 0,
            reason,
            createdAt: c.collected_at || new Date().toISOString(),
          };
        });
        set({ arms: mappedArms });
        return;
      }
    } catch (error) {
      console.warn('Supabase unavailable, trying API fallback');
    }
    // API fallback
    try {
      const response = await fetch('/api/arms');
      if (response.ok) {
        const data = await response.json();
        const rule = get().rule;
        const mappedArms: Arm[] = data.map((arm: any) => {
          const totalSpend = arm.daily_performance?.reduce((sum: number, p: any) => sum + p.spend, 0) || 0;
          const totalLeads = arm.daily_performance?.reduce((sum: number, p: any) => sum + p.leads, 0) || 0;
          const totalClicks = arm.daily_performance?.reduce((sum: number, p: any) => sum + p.clicks, 0) || 0;
          const totalImpressions = arm.daily_performance?.reduce((sum: number, p: any) => sum + p.impressions, 0) || 0;
          const cpa = totalLeads > 0 ? totalSpend / totalLeads : 0;
          const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
          const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
          const cvr = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
          const validLeads = Math.floor(totalLeads * (0.7 + Math.random() * 0.2));
          const validLeadRate = totalLeads > 0 ? (validLeads / totalLeads) * 100 : 0;
          let status: Arm['status'] = ARM_STATUS_MAP[arm.status] || 'STABLE';
          let reason = '목표 CPA 내에서 안정적으로 운영 중입니다.';
          if (totalSpend < rule.targetCpa * 0.5 && totalClicks < rule.minClicks) {
            status = 'TESTING'; reason = `데이터 수집 중 (클릭 ${totalClicks}회).`;
          } else if (cpa > 0 && cpa <= rule.targetCpa * 0.8) {
            status = 'SCALE'; reason = `CPA ${cpa.toLocaleString()}원 우수.`;
          } else if (cpa > rule.targetCpa * (rule.stopCriteria / 100)) {
            status = 'PAUSED'; reason = `CPA 중단 기준 초과.`;
          }
          return {
            id: arm.id,
            campaignName: arm.ad_set?.campaign?.name || '',
            adSetName: arm.ad_set?.name || '',
            creativeName: arm.creative?.content || '',
            target: arm.audience?.name || '',
            schedule: arm.schedule ? `${arm.schedule.day_of_week} ${arm.schedule.start_hour}~${arm.schedule.end_hour}시` : '-',
            bidStrategy: arm.ad_set?.target_cpa ? `타겟 CPA ${arm.ad_set.target_cpa.toLocaleString()}원` : '자동',
            status, spend: totalSpend, impressions: totalImpressions, clicks: totalClicks,
            leads: totalLeads, validLeads, cpa, ctr, cpc, cvr, validLeadRate, roas: 0,
            reason, createdAt: arm.created_at || new Date().toISOString()
          };
        });
        set({ arms: mappedArms });
        return;
      }
    } catch {}
    // Mock fallback
    const rule = get().rule;
    const mockArms: Arm[] = tossAdsMockDB.arms.map((arm) => {
      const armDailyData = tossAdsMockDB.performanceDaily.filter(p => p.arm_id === arm.id);
      const totalSpend = armDailyData.reduce((sum, p) => sum + p.spend, 0);
      const totalLeads = armDailyData.reduce((sum, p) => sum + p.leads, 0);
      const totalClicks = armDailyData.reduce((sum, p) => sum + p.clicks, 0);
      const totalImpressions = armDailyData.reduce((sum, p) => sum + p.impressions, 0);
      const cpa = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const cvr = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
      const validLeads = Math.floor(totalLeads * (0.7 + Math.random() * 0.2));
      const validLeadRate = totalLeads > 0 ? (validLeads / totalLeads) * 100 : 0;
      const adSet = tossAdsMockDB.adSets.find(a => a.id === arm.ad_set_id);
      const campaign = tossAdsMockDB.campaigns.find(c => c.id === arm.campaign_id);
      const creative = tossAdsMockDB.creatives.find(c => c.id === arm.creative_id);
      const audience = tossAdsMockDB.audiences.find(a => a.id === arm.audience_id);
      const schedule = tossAdsMockDB.schedules.find(s => s.id === arm.schedule_id);
      let status: Arm['status'] = arm.status === 'PAUSED' ? 'PAUSED' : 'STABLE';
      let reason = '목표 CPA 내에서 안정적으로 운영 중입니다.';
      if (totalSpend < rule.targetCpa * 0.5 && totalClicks < rule.minClicks) {
        status = 'TESTING'; reason = `데이터 수집 중.`;
      } else if (cpa > 0 && cpa <= rule.targetCpa * 0.8) {
        status = 'SCALE'; reason = `CPA ${cpa.toLocaleString()}원 우수.`;
      } else if (cpa > rule.targetCpa * (rule.stopCriteria / 100)) {
        status = 'PAUSED'; reason = `CPA 중단 기준 초과.`;
      }
      return {
        id: arm.id, campaignName: campaign?.name || '', adSetName: adSet?.name || '',
        creativeName: creative?.content || '', target: audience?.name || '',
        schedule: schedule ? `${schedule.day_of_week} ${schedule.start_hour}~${schedule.end_hour}시` : '-',
        bidStrategy: adSet ? `${adSet.bid_strategy} ${adSet.bid_type}` : '자동',
        status, spend: totalSpend, impressions: totalImpressions, clicks: totalClicks,
        leads: totalLeads, validLeads, cpa, ctr, cpc, cvr, validLeadRate, roas: 0,
        reason, createdAt: new Date().toISOString()
      };
    });
    set({ arms: mockArms });
  },
  
  approveAction: async (id) => {
    try {
      const response = await fetch(`/api/actions/${id}/approve`, { method: 'POST' });
      if (response.ok) {
        get().fetchActions();
      }
    } catch (error) {
      console.error('Failed to approve action:', error);
    }
  },
  
  rejectAction: async (id) => {
    try {
      const response = await fetch(`/api/actions/${id}/reject`, { method: 'POST' });
      if (response.ok) {
        get().fetchActions();
      }
    } catch (error) {
      console.error('Failed to reject action:', error);
    }
  },
  
  rollbackAction: async (id) => {
    try {
      const response = await fetch(`/api/actions/${id}/rollback`, { method: 'POST' });
      if (response.ok) {
        get().fetchActions();
      }
    } catch (error) {
      console.error('Failed to rollback action:', error);
    }
  },
  
  updateRule: (ruleUpdate) => set((state) => ({
    rule: { ...state.rule, ...ruleUpdate }
  })),
}));
