import { addDays, format, subDays, setHours } from 'date-fns';

// ==========================================
// 1. Types & Interfaces
// ==========================================

export interface Campaign { id: string; name: string; objective: string; status: string; }
export interface AdSet { id: string; campaign_id: string; name: string; daily_budget: number; status: string; }
export interface Creative { id: string; name: string; format: string; image_url: string; }
export interface Audience { id: string; name: string; size_estimate: number; }
export interface Schedule { id: string; name: string; description: string; }

export type ArmPersona = 'EXCELLENT' | 'HIGH_CTR_LOW_CVR' | 'FATIGUE' | 'INSUFFICIENT_SAMPLE' | 'STOP_TARGET' | 'SCALE_TARGET' | 'NORMAL';

export interface Arm {
  id: string;
  campaign_id: string;
  ad_set_id: string;
  creative_id: string;
  audience_id: string;
  schedule_id: string;
  name: string;
  status: string;
  persona: ArmPersona; // For mock generation logic
}

export interface PerformanceDaily {
  id: string;
  arm_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
}

export interface PerformanceHourly {
  id: string;
  arm_id: string;
  datetime: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
}

export interface RecommendedAction {
  id: string;
  arm_id: string;
  action_type: 'BUDGET_UP' | 'BUDGET_DOWN' | 'PAUSE' | 'HOLD';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ROLLED_BACK';
  created_at: string;
}

export interface CrawlerLog {
  id: string;
  job_type: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  message: string;
  created_at: string;
}

export interface ActionLog {
  id: string;
  action_id: string;
  executor: 'BOT' | 'USER';
  status: 'SUCCESS' | 'FAILED';
  created_at: string;
}

// ==========================================
// 2. Static Base Data Generation
// ==========================================

const campaigns = [
  { id: 'CMP-001', toss_campaign_id: 'TOSS-CMP-001', name: '신용대출 금리비교 프로모션', status: 'ON', budget: 10000000 },
  { id: 'CMP-002', toss_campaign_id: 'TOSS-CMP-002', name: '토스뱅크 마이너스통장 개설', status: 'ON', budget: 5000000 },
];

const adSets = [
  { id: 'AS-001', campaign_id: 'CMP-001', toss_adset_id: 'TOSS-AS-001', name: '2030 직장인 타겟', status: 'ON', target_cpa: 15000 },
  { id: 'AS-002', campaign_id: 'CMP-001', toss_adset_id: 'TOSS-AS-002', name: '4050 자영업자 타겟', status: 'ON', target_cpa: 18000 },
  { id: 'AS-003', campaign_id: 'CMP-001', toss_adset_id: 'TOSS-AS-003', name: '고신용자 우대 타겟', status: 'ON', target_cpa: 12000 },
  { id: 'AS-004', campaign_id: 'CMP-001', toss_adset_id: 'TOSS-AS-004', name: '대환대출 관심 타겟', status: 'ON', target_cpa: 20000 },
  { id: 'AS-005', campaign_id: 'CMP-002', toss_adset_id: 'TOSS-AS-005', name: '기존 대출 보유자', status: 'ON', target_cpa: 15000 },
  { id: 'AS-006', campaign_id: 'CMP-002', toss_adset_id: 'TOSS-AS-006', name: '토스 앱 헤비유저', status: 'ON', target_cpa: 10000 },
  { id: 'AS-007', campaign_id: 'CMP-002', toss_adset_id: 'TOSS-AS-007', name: '신용점수 800점 이상', status: 'ON', target_cpa: 12000 },
  { id: 'AS-008', campaign_id: 'CMP-002', toss_adset_id: 'TOSS-AS-008', name: '리타겟팅 (랜딩 이탈자)', status: 'ON', target_cpa: 8000 },
];

const creatives = Array.from({ length: 12 }).map((_, i) => ({
  id: `CRV-${(i + 1).toString().padStart(3, '0')}`,
  ad_set_id: adSets[i % adSets.length].id,
  toss_creative_id: `TOSS-CRV-${i + 1}`,
  type: i % 3 === 0 ? 'VIDEO' : 'IMAGE',
  content: `https://picsum.photos/seed/tossads${i}/400/300`,
}));

const audiences = [
  { id: 'AUD-001', name: '최근 30일 대출 탭 방문자', age_min: 20, age_max: 60, gender: 'ALL', custom_audience_id: 'CA-001' },
  { id: 'AUD-002', name: '신용점수 조회 활성 유저', age_min: 20, age_max: 60, gender: 'ALL', custom_audience_id: 'CA-002' },
  { id: 'AUD-003', name: '타사 대출 보유 (마이데이터)', age_min: 25, age_max: 55, gender: 'ALL', custom_audience_id: 'CA-003' },
  { id: 'AUD-004', name: '소득 상위 30% 직장인', age_min: 25, age_max: 50, gender: 'ALL', custom_audience_id: 'CA-004' },
  { id: 'AUD-005', name: '개인사업자/프리랜서', age_min: 30, age_max: 60, gender: 'ALL', custom_audience_id: 'CA-005' },
  { id: 'AUD-006', name: '20대 사회초년생', age_min: 20, age_max: 29, gender: 'ALL', custom_audience_id: 'CA-006' },
];

const schedules = [
  { id: 'SCH-001', day_of_week: 'ALL', start_hour: 0, end_hour: 24 },
  { id: 'SCH-002', day_of_week: 'WEEKDAY', start_hour: 9, end_hour: 18 },
  { id: 'SCH-003', day_of_week: 'ALL', start_hour: 7, end_hour: 20 },
  { id: 'SCH-004', day_of_week: 'WEEKEND', start_hour: 10, end_hour: 22 },
  { id: 'SCH-005', day_of_week: 'ALL', start_hour: 7, end_hour: 24 },
  { id: 'SCH-006', day_of_week: 'WEEKDAY', start_hour: 18, end_hour: 24 },
  { id: 'SCH-007', day_of_week: 'WEEKDAY', start_hour: 9, end_hour: 21 },
  { id: 'SCH-008', day_of_week: 'ALL', start_hour: 11, end_hour: 14 },
];

// ==========================================
// 3. Dynamic Arm Generation (20+ Arms)
// ==========================================

const armConfigs: { name: string; persona: ArmPersona }[] = [
  { name: 'A-01_직장인_최저금리_평일', persona: 'EXCELLENT' },
  { name: 'A-02_직장인_1분송금_출퇴근', persona: 'SCALE_TARGET' },
  { name: 'A-03_자영업자_한도조회_24H', persona: 'HIGH_CTR_LOW_CVR' }, // 낚시성 소재 느낌
  { name: 'A-04_고신용자_프리미엄_주말', persona: 'INSUFFICIENT_SAMPLE' },
  { name: 'A-05_대환대출_갈아타기_평일', persona: 'FATIGUE' }, // 초기엔 좋다가 효율 감소
  { name: 'A-06_대환대출_금리비교_심야', persona: 'STOP_TARGET' }, // 심야 대환대출 전환율 저조
  { name: 'A-07_기존보유자_추가대출_24H', persona: 'NORMAL' },
  { name: 'A-08_헤비유저_앱푸시_출퇴근', persona: 'EXCELLENT' },
  { name: 'A-09_신용800_우대금리_평일', persona: 'SCALE_TARGET' },
  { name: 'A-10_리타겟팅_마감임박_주말', persona: 'FATIGUE' },
  { name: 'A-11_직장인_영상소재_점심', persona: 'NORMAL' },
  { name: 'A-12_자영업자_영상소재_야간', persona: 'STOP_TARGET' },
  { name: 'A-13_고신용자_텍스트_출퇴근', persona: 'HIGH_CTR_LOW_CVR' },
  { name: 'A-14_대환대출_영상소재_24H', persona: 'NORMAL' },
  { name: 'A-15_기존보유자_텍스트_주말', persona: 'INSUFFICIENT_SAMPLE' },
  { name: 'A-16_헤비유저_영상소재_심야', persona: 'NORMAL' },
  { name: 'A-17_신용800_텍스트_점심', persona: 'EXCELLENT' },
  { name: 'A-18_리타겟팅_영상소재_평일', persona: 'SCALE_TARGET' },
  { name: 'A-19_직장인_배너_월수금', persona: 'FATIGUE' },
  { name: 'A-20_자영업자_배너_주말', persona: 'STOP_TARGET' },
];

const arms: Arm[] = armConfigs.map((config, i) => ({
  id: `ARM-${(i + 1).toString().padStart(3, '0')}`,
  campaign_id: campaigns[i % campaigns.length].id,
  ad_set_id: adSets[i % adSets.length].id,
  creative_id: creatives[i % creatives.length].id,
  audience_id: audiences[i % audiences.length].id,
  schedule_id: schedules[i % schedules.length].id,
  name: config.name,
  status: config.persona === 'STOP_TARGET' && i % 2 === 0 ? 'PAUSED' : 'ACTIVE',
  persona: config.persona,
}));

// ==========================================
// 4. Performance Data Generators
// ==========================================

const generatePerformanceData = () => {
  const dailyData: PerformanceDaily[] = [];
  const hourlyData: PerformanceHourly[] = [];
  const today = new Date();
  
  const baseCpc = 350;

  arms.forEach(arm => {
    // Persona Base Metrics
    let baseImpressions = 5000;
    let baseCtr = 0.02; // 2%
    let baseCvr = 0.05; // 5% (Lead / Click)

    switch (arm.persona) {
      case 'EXCELLENT':
        baseCtr = 0.035; baseCvr = 0.08; baseImpressions = 8000; break;
      case 'SCALE_TARGET':
        baseCtr = 0.025; baseCvr = 0.06; baseImpressions = 15000; break;
      case 'HIGH_CTR_LOW_CVR':
        baseCtr = 0.060; baseCvr = 0.005; baseImpressions = 10000; break;
      case 'FATIGUE':
        baseCtr = 0.040; baseCvr = 0.07; baseImpressions = 12000; break; // Will degrade
      case 'INSUFFICIENT_SAMPLE':
        baseCtr = 0.015; baseCvr = 0.03; baseImpressions = 200; break;
      case 'STOP_TARGET':
        baseCtr = 0.010; baseCvr = 0.01; baseImpressions = 6000; break;
      case 'NORMAL':
      default:
        baseCtr = 0.020; baseCvr = 0.04; baseImpressions = 5000; break;
    }

    // Generate 30 days of daily data
    for (let i = 29; i >= 0; i--) {
      const currentDate = subDays(today, i);
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // Day of week modifier
      const dowModifier = isWeekend ? 0.7 : 1.1;
      
      // Fatigue modifier (degrades over time if persona is FATIGUE)
      let fatigueModifier = 1.0;
      if (arm.persona === 'FATIGUE') {
        const daysActive = 30 - i;
        fatigueModifier = Math.max(0.3, 1.0 - (daysActive * 0.03)); // Drops 3% per day
      }

      // Random noise (±15%)
      const noise = () => 0.85 + Math.random() * 0.3;

      const dailyImpressions = Math.floor(baseImpressions * dowModifier * fatigueModifier * noise());
      const dailyClicks = Math.floor(dailyImpressions * baseCtr * fatigueModifier * noise());
      const dailyCost = dailyClicks * Math.floor(baseCpc * noise());
      const dailyLeads = Math.floor(dailyClicks * baseCvr * fatigueModifier * noise());
      const dailyValidLeads = Math.floor(dailyLeads * (0.7 + Math.random() * 0.2)); // 70-90% valid

      dailyData.push({
        id: `PD-${arm.id}-${format(currentDate, 'yyyyMMdd')}`,
        arm_id: arm.id,
        date: format(currentDate, 'yyyy-MM-dd'),
        impressions: dailyImpressions,
        clicks: dailyClicks,
        spend: dailyCost,
        leads: dailyLeads,
      });

      // Generate 7 days of hourly data (only for the last 7 days)
      if (i < 7) {
        for (let hour = 0; hour < 24; hour++) {
          let todModifier = 1.0;
          if (hour >= 0 && hour < 6) todModifier = 0.1; // Dawn
          else if (hour >= 7 && hour <= 9) todModifier = 1.5; // Commute
          else if (hour >= 11 && hour <= 13) todModifier = 1.3; // Lunch
          else if (hour >= 18 && hour <= 22) todModifier = 1.2; // Evening

          const hourlyImpressions = Math.floor((dailyImpressions / 24) * todModifier * noise());
          const hourlyClicks = Math.floor(hourlyImpressions * baseCtr * fatigueModifier * noise());
          const hourlyCost = hourlyClicks * Math.floor(baseCpc * noise());
          const hourlyLeads = Math.floor(hourlyClicks * baseCvr * fatigueModifier * noise());

          const hourDate = setHours(currentDate, hour);
          
          hourlyData.push({
            id: `PH-${arm.id}-${format(hourDate, 'yyyyMMddHH')}`,
            arm_id: arm.id,
            datetime: format(hourDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            impressions: hourlyImpressions,
            clicks: hourlyClicks,
            spend: hourlyCost,
            leads: hourlyLeads,
          });
        }
      }
    }
  });

  return { dailyData, hourlyData };
};

const { dailyData, hourlyData } = generatePerformanceData();

// ==========================================
// 5. Operational Logs & Actions
// ==========================================

const recommendedActions: RecommendedAction[] = [
  { id: 'ACT-001', arm_id: 'ARM-006', action_type: 'PAUSE', reason: '최근 3일 CPA가 목표치(15,000원)를 200% 초과했습니다.', status: 'EXECUTED', created_at: new Date().toISOString() },
  { id: 'ACT-002', arm_id: 'ARM-002', action_type: 'BUDGET_UP', reason: '성공 확률 92%, CPA 8,500원으로 매우 우수합니다. 예산을 20% 증액합니다.', status: 'APPROVED', created_at: new Date().toISOString() },
  { id: 'ACT-003', arm_id: 'ARM-005', action_type: 'BUDGET_DOWN', reason: '초기 대비 효율이 40% 하락하여 피로도가 의심됩니다. 예산을 15% 감액합니다.', status: 'PENDING', created_at: new Date().toISOString() },
  { id: 'ACT-004', arm_id: 'ARM-003', action_type: 'HOLD', reason: 'CTR은 높으나 전환율이 극히 낮습니다. 소재 낚시성 여부 수동 검토가 필요합니다.', status: 'PENDING', created_at: new Date().toISOString() },
  { id: 'ACT-005', arm_id: 'ARM-012', action_type: 'PAUSE', reason: '7일 연속 리드 발생이 없으며 비용만 소진 중입니다.', status: 'ROLLED_BACK', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const crawlerLogs: CrawlerLog[] = [
  { id: 'CL-001', job_type: 'SYNC_CAMPAIGNS', status: 'SUCCESS', message: '캠페인 2개, 광고그룹 8개 동기화 완료', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'CL-002', job_type: 'SYNC_PERFORMANCE', status: 'SUCCESS', message: '최근 7일 성과 데이터 수집 완료 (2,450건)', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'CL-003', job_type: 'EXECUTE_ACTION', status: 'FAILED', message: '토스애즈 어드민 로그인 세션 만료. 재인증 필요', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'CL-004', job_type: 'EXECUTE_ACTION', status: 'SUCCESS', message: 'ARM-006 상태 PAUSE 변경 완료', created_at: new Date(Date.now() - 300000).toISOString() },
];

const actionLogs: ActionLog[] = [
  { id: 'AL-001', action_id: 'ACT-001', executor: 'BOT', status: 'SUCCESS', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'AL-002', action_id: 'ACT-005', executor: 'USER', status: 'SUCCESS', created_at: new Date(Date.now() - 80000000).toISOString() }, // 롤백 실행 로그
];

// ==========================================
// 6. Export Mock Database
// ==========================================

export const tossAdsMockDB = {
  campaigns,
  adSets,
  creatives,
  audiences,
  schedules,
  arms,
  performanceDaily: dailyData,
  performanceHourly: hourlyData,
  recommendedActions,
  crawlerLogs,
  actionLogs,
};

export default tossAdsMockDB;
