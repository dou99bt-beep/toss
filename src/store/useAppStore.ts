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
      const response = await fetch('/api/actions');
      if (response.ok) {
        const data = await response.json();
        set({ actions: data });
        return;
      }
    } catch (error) {
      console.warn('API unavailable, using mock data for actions');
    }
    // Fallback to mock data
    set({ actions: tossAdsMockDB.recommendedActions });
  },

  fetchArms: async () => {
    try {
      const response = await fetch('/api/arms');
      if (response.ok) {
        const data = await response.json();
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
          
          // Determine status from decision engine logic
          const rule = get().rule;
          let status: Arm['status'] = ARM_STATUS_MAP[arm.status] || 'STABLE';
          let reason = '목표 CPA 내에서 안정적으로 운영 중입니다.';
          
          if (totalSpend < rule.targetCpa * 0.5 && totalClicks < rule.minClicks) {
            status = 'TESTING';
            reason = `데이터 수집 중 (클릭 ${totalClicks}회, 소진액 ${totalSpend.toLocaleString()}원). 최소 ${rule.minClicks}회 클릭 이후 평가 시작.`;
          } else if (totalClicks >= rule.minClicks && totalLeads === 0) {
            status = 'PAUSE_CANDIDATE';
            reason = `클릭 ${totalClicks}회 이상 발생했으나 리드가 0건입니다. 소재 교체 또는 중단이 필요합니다.`;
          } else if (cpa > 0 && cpa <= rule.targetCpa * 0.8) {
            status = 'SCALE';
            reason = `CPA가 ${cpa.toLocaleString()}원으로 목표치(${rule.targetCpa.toLocaleString()}원)보다 크게 낮아 예산 증액을 권장합니다.`;
          } else if (cpa > rule.targetCpa * (rule.stopCriteria / 100)) {
            status = 'PAUSED';
            reason = `CPA(${cpa.toLocaleString()}원)가 중단 기준(${(rule.targetCpa * rule.stopCriteria / 100).toLocaleString()}원)을 초과했습니다.`;
          } else if (cpa > rule.targetCpa * 1.1) {
            status = 'REDUCE';
            reason = `CPA(${cpa.toLocaleString()}원)가 목표를 초과하고 있어 예산 감액을 권장합니다.`;
          } else if (arm.status === 'PAUSED') {
            status = 'PAUSED';
            reason = '관리자에 의해 일시 중지된 상태입니다.';
          }
          
          return {
            id: arm.id,
            campaignName: arm.ad_set?.campaign?.name || 'Unknown Campaign',
            adSetName: arm.ad_set?.name || 'Unknown Ad Set',
            creativeName: arm.creative?.content || 'Unknown Creative',
            target: arm.audience?.name || 'Unknown Target',
            schedule: arm.schedule ? `${arm.schedule.day_of_week} ${arm.schedule.start_hour}~${arm.schedule.end_hour}시` : '-',
            bidStrategy: arm.ad_set?.target_cpa ? `타겟 CPA ${arm.ad_set.target_cpa.toLocaleString()}원` : '자동',
            status,
            spend: totalSpend,
            impressions: totalImpressions,
            clicks: totalClicks,
            leads: totalLeads,
            validLeads,
            cpa,
            ctr,
            cpc,
            cvr,
            validLeadRate,
            roas: 0,
            reason,
            createdAt: arm.created_at || new Date().toISOString()
          };
        });
        set({ arms: mappedArms });
        return;
      }
    } catch (error) {
      console.warn('API unavailable, using mock data for arms');
    }
    // Fallback: generate arms from mock data directly
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
        status = 'TESTING'; reason = `데이터 수집 중 (클릭 ${totalClicks}회). 최소 ${rule.minClicks}회 클릭 이후 평가 시작.`;
      } else if (totalClicks >= rule.minClicks && totalLeads === 0) {
        status = 'PAUSE_CANDIDATE'; reason = `클릭 ${totalClicks}회 이상 발생했으나 리드가 0건.`;
      } else if (cpa > 0 && cpa <= rule.targetCpa * 0.8) {
        status = 'SCALE'; reason = `CPA ${cpa.toLocaleString()}원으로 우수. 예산 증액 권장.`;
      } else if (cpa > rule.targetCpa * (rule.stopCriteria / 100)) {
        status = 'PAUSED'; reason = `CPA가 중단 기준을 초과했습니다.`;
      } else if (cpa > rule.targetCpa * 1.1) {
        status = 'REDUCE'; reason = `CPA가 목표를 초과. 예산 감액 권장.`;
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
