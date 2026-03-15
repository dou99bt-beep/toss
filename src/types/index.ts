export type ArmStatus = 'TESTING' | 'STABLE' | 'SCALE' | 'REDUCE' | 'PAUSE_CANDIDATE' | 'PAUSED' | 'MANUAL_REVIEW';

export interface Arm {
  id: string;
  campaignName: string;
  adSetName: string;
  creativeName: string;
  target: string;
  schedule: string;
  bidStrategy: string;
  status: ArmStatus;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  validLeads: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cvr: number;
  validLeadRate: number;
  roas: number;
  reason: string; // AI 판단 이유
  createdAt: string;
}

export interface Action {
  id: string;
  armId: string;
  arm_id: string;
  action_type: string;
  type: 'increase_bid' | 'decrease_bid' | 'pause' | 'activate' | 'BUDGET_UP' | 'BUDGET_DOWN' | 'PAUSE' | 'ACTIVATE' | 'HOLD';
  reason: string;
  expectedImpact: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'rolled_back' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ROLLED_BACK';
  created_at: string;
  createdAt: string;
}

export interface Rule {
  id: string;
  name: string;
  targetCpa: number;
  stopCriteria: number;
  increaseRatio: number;
  decreaseRatio: number;
  minClicks: number;
  minImpressions: number;
  minLeads: number;
  alertThreshold: number;
  exploreBudgetRatio: number;
  exploitBudgetRatio: number;
  autoExecute: boolean;
  protectInsufficientSample: boolean;
}

export interface BotStatus {
  lastCrawlTime: string;
  lastLoginTime: string;
  sessionStatus: 'active' | 'expired' | 'error';
  selectorErrors: string[];
  recentScreenshotUrl: string;
}
