import { subDays, format, setHours } from 'date-fns';

// ==========================================
// 1. Types & Interfaces — 토스애즈 리스트 배너 실제 구조
// ==========================================

export interface Campaign { id: string; toss_campaign_id: string; name: string; objective: string; status: string; budget: number; burn_type: string; }
export interface AdSet { id: string; campaign_id: string; toss_adset_id: string; name: string; daily_budget: number; status: string; target_cpa: number; bid_strategy: string; bid_type: string; exposure_time: string; target_optimization: boolean; }
export interface Creative { id: string; ad_set_id: string; toss_creative_id: string; type: string; content: string; creative_type: string; main_copy: string; sub_copy: string; brand_name: string; }
export interface Audience { id: string; name: string; age_min: number | null; age_max: number | null; gender: string; custom_audience_id: string | null; device: string; region: string; }
export interface Schedule { id: string; day_of_week: string; start_hour: number; end_hour: number; }

export type ArmPersona = 'EXCELLENT' | 'HIGH_CTR_LOW_CVR' | 'FATIGUE' | 'INSUFFICIENT_SAMPLE' | 'STOP_TARGET' | 'SCALE_TARGET' | 'NORMAL';

export interface Arm {
  id: string; campaign_id: string; ad_set_id: string; creative_id: string;
  audience_id: string; schedule_id: string; name: string; status: string; persona: ArmPersona;
}

export interface PerformanceDaily { id: string; arm_id: string; date: string; impressions: number; clicks: number; spend: number; leads: number; }
export interface PerformanceHourly { id: string; arm_id: string; datetime: string; impressions: number; clicks: number; spend: number; leads: number; }
export interface RecommendedAction { id: string; arm_id: string; action_type: 'BUDGET_UP' | 'BUDGET_DOWN' | 'PAUSE' | 'HOLD'; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ROLLED_BACK'; created_at: string; }
export interface CrawlerLog { id: string; job_type: string; status: 'SUCCESS' | 'FAILED' | 'RUNNING'; message: string; created_at: string; }
export interface ActionLog { id: string; action_id: string; executor: 'BOT' | 'USER'; status: 'SUCCESS' | 'FAILED'; created_at: string; }

// ==========================================
// 리드 양식 구조 (토스애즈 7화면)
// ==========================================
export interface LeadFormScreen {
  step: number;
  title: string;
  type: 'title' | 'intro' | 'question' | 'review' | 'consent' | 'completion';
  content: Record<string, any>;
}

export const leadFormScreens: LeadFormScreen[] = [
  { step: 1, title: '제목 화면', type: 'title', content: { publicTitle: '법무법인 명율', maxLength: 14 } },
  { step: 2, title: '소개 화면', type: 'intro', content: {
    type: '일반', category: '전문서비스', notice: '광고 책임변호사 소성록',
    hasEventImage: true, descriptionLines: 2,
    listItems: [
      { icon: '💛', highlight: '갚아도 늘기만 하는 빚 힘드시죠?', benefit: '최대 91%까지 채무를 줄여드려요' },
      { icon: '🛡️', highlight: '비밀 철저하게 절대보장', benefit: '가족,직장도 모르게 진행가능해요' },
      { icon: '👍', highlight: '독촉과 압류가 걱정이시죠?', benefit: '신속하게 검토하고 빠르게 진행해요' },
    ]
  }},
  { step: 3, title: '1번 질문', type: 'question', content: {
    questionType: '객관식', required: true, multiple: true,
    question: '현재 직업을 선택해주세요',
    answers: ['직장인', '사업자', '프리랜서', '아르바이트', '무직', '기타']
  }},
  { step: 4, title: '2번 질문', type: 'question', content: {
    questionType: '객관식', required: true, multiple: false,
    question: '현재 채무 금액(빚)은 얼마인가요?',
    answers: ['1,000~2,000만원', '2,000~4,000만원', '4,000~6,000만원', '6,000~1억원', '1억 이상']
  }},
  { step: 5, title: '정보 검토', type: 'review', content: {
    collectPhone: true, collectName: true, collectBirthdate: true,
    previewText: '상담 신청할 김토스님의 정보를 확인해주세요'
  }},
  { step: 6, title: '동의문', type: 'consent', content: {
    advertiserType: '국내', advertiserName: '법무법인 명율',
    retentionPeriod: '동의 시점으로부터 6개월 이내 파기',
    consents: ['필수 개인정보 수집·이용 동의', '필수 개인정보 제3자 제공 동의', '필수 서비스 개선을 위한 응답 활용 동의']
  }},
  { step: 7, title: '완료 화면', type: 'completion', content: {
    completionAction: '종료하기', subText: '1시간 이내 연락드릴게요',
    formType: '상담 신청', referenceUrl: 'https://174058503845472.dbcart.net/'
  }},
];

// ==========================================
// 2. 실제 개인회생/파산 비즈니스 기반 데이터
// ==========================================

const campaigns = [
  { id: 'CMP-001', toss_campaign_id: '336305', name: '명율1차 0105', objective: '잠재고객 모으기', status: 'ON', budget: 6070000, burn_type: '일반 소진' },
  { id: 'CMP-002', toss_campaign_id: '351159', name: '명율2차 0315_신규테스트', objective: '잠재고객 모으기', status: 'ON', budget: 3000000, burn_type: '일반 소진' },
];

const adSets = [
  // 캠페인 1: 명율1차 — 실제 운영 광고세트
  { id: 'AS-001', campaign_id: 'CMP-001', toss_adset_id: '1006185', name: '03_15_타겟자동_기존_리스트_자동입찰_전환최대화_타겟지정_항상노출', daily_budget: 500000, status: 'ON', target_cpa: 15000, bid_strategy: '자동입찰', bid_type: '전환 최대화', exposure_time: '항상 노출', target_optimization: true },
  { id: 'AS-002', campaign_id: 'CMP-001', toss_adset_id: '1006186', name: '03_15_타겟자동_기존_리스트_직접입찰_CPC200_남45-54_화금_야간', daily_budget: 200000, status: 'ON', target_cpa: 0, bid_strategy: '직접입찰', bid_type: 'CPC 200원', exposure_time: '시간 설정', target_optimization: false },
  { id: 'AS-003', campaign_id: 'CMP-001', toss_adset_id: '1006187', name: '03_15_타겟자동_기존_리스트_직접입찰_CPC600_남45-54_화금_야간', daily_budget: 300000, status: 'ON', target_cpa: 0, bid_strategy: '직접입찰', bid_type: 'CPC 600원', exposure_time: '시간 설정', target_optimization: false },
  { id: 'AS-004', campaign_id: 'CMP-001', toss_adset_id: '1006188', name: '03_15_타겟자동_기존_리스트_자동입찰_전환최대화_여45-59_수금_야간', daily_budget: 350000, status: 'ON', target_cpa: 10000, bid_strategy: '자동입찰', bid_type: '전환 최대화', exposure_time: '요일별 설정', target_optimization: true },
  { id: 'AS-005', campaign_id: 'CMP-001', toss_adset_id: '1006189', name: '03_15_항상노출_기존_리스트_자동입찰_타겟CPA6000_여45-59', daily_budget: 250000, status: 'ON', target_cpa: 6000, bid_strategy: '자동입찰', bid_type: '목표 CPA', exposure_time: '항상 노출', target_optimization: false },
  // 캠페인 2: 명율2차 — 신규 테스트
  { id: 'AS-006', campaign_id: 'CMP-002', toss_adset_id: '1007001', name: '03_15_신규_리스트_자동입찰_전환최대화_전체타겟_항상노출', daily_budget: 400000, status: 'ON', target_cpa: 12000, bid_strategy: '자동입찰', bid_type: '전환 최대화', exposure_time: '항상 노출', target_optimization: true },
  { id: 'AS-007', campaign_id: 'CMP-002', toss_adset_id: '1007002', name: '03_15_신규_리스트_직접입찰_CPC400_남30-59_평일낮', daily_budget: 200000, status: 'ON', target_cpa: 0, bid_strategy: '직접입찰', bid_type: 'CPC 400원', exposure_time: '시간 설정', target_optimization: false },
  { id: 'AS-008', campaign_id: 'CMP-002', toss_adset_id: '1007003', name: '03_15_신규_리스트_자동입찰_전환최대화_여30-49_주말', daily_budget: 300000, status: 'ON', target_cpa: 8000, bid_strategy: '자동입찰', bid_type: '전환 최대화', exposure_time: '요일별 설정', target_optimization: false },
];

const creatives = [
  // 문구강조 소재들 (실제 카피 반영)
  { id: 'CRV-001', ad_set_id: 'AS-001', toss_creative_id: '1553089', type: 'TEXT', content: '빚독촉,압류 즉시 중단해 드립니다', creative_type: '문구강조', main_copy: '빚독촉,압류 즉시 중단해 드립니다', sub_copy: '명율에서 개인회생으로 해결합니다!', brand_name: '법무법인 명율' },
  { id: 'CRV-002', ad_set_id: 'AS-001', toss_creative_id: '1553087', type: 'TEXT', content: '2026 빚탈출 프로젝트', creative_type: '문구강조', main_copy: '2026 빚탈출 프로젝트', sub_copy: '명율이 길을 찾겠습니다!', brand_name: '법무법인 명율' },
  { id: 'CRV-003', ad_set_id: 'AS-002', toss_creative_id: '1553090', type: 'TEXT', content: '개인회생 가능 여부를 확인하세요', creative_type: '문구강조', main_copy: '개인회생 가능 여부를 확인하세요', sub_copy: '무료 상담으로 빠르게 확인!', brand_name: '법무법인 명율' },
  { id: 'CRV-004', ad_set_id: 'AS-003', toss_creative_id: '1553091', type: 'TEXT', content: '채무 최대 91% 감면 가능합니다', creative_type: '문구강조', main_copy: '채무 최대 91% 감면 가능합니다', sub_copy: '지금 바로 무료 상담 신청하세요', brand_name: '법무법인 명율' },
  { id: 'CRV-005', ad_set_id: 'AS-004', toss_creative_id: '1553092', type: 'IMAGE', content: '빚 걱정 끝! 새로운 시작', creative_type: '이미지강조', main_copy: '빚 걱정 끝! 새로운 시작', sub_copy: '개인회생 전문 법무법인 명율', brand_name: '법무법인 명율' },
  { id: 'CRV-006', ad_set_id: 'AS-005', toss_creative_id: '1553093', type: 'TEXT', content: '압류·독촉 먼저 멈춰드립니다', creative_type: '문구강조', main_copy: '압류·독촉 먼저 멈춰드립니다', sub_copy: '하루만에 접수 완료 가능', brand_name: '법무법인 명율' },
  { id: 'CRV-007', ad_set_id: 'AS-006', toss_creative_id: '1554001', type: 'TEXT', content: '파산 vs 회생, 뭐가 유리할까?', creative_type: '문구강조', main_copy: '파산 vs 회생, 뭐가 유리할까?', sub_copy: '전문 변호사가 직접 상담해 드려요', brand_name: '법무법인 명율' },
  { id: 'CRV-008', ad_set_id: 'AS-006', toss_creative_id: '1554002', type: 'IMAGE', content: '월 상환금 30만원으로 줄이기', creative_type: '이미지강조', main_copy: '월 상환금 30만원으로 줄이기', sub_copy: '개인회생 무료 상담 진행 중', brand_name: '법무법인 명율' },
  { id: 'CRV-009', ad_set_id: 'AS-007', toss_creative_id: '1554003', type: 'TEXT', content: '빚 때문에 잠 못 이루시나요?', creative_type: '문구강조', main_copy: '빚 때문에 잠 못 이루시나요?', sub_copy: '명율이 해결책을 드립니다', brand_name: '법무법인 명율' },
  { id: 'CRV-010', ad_set_id: 'AS-007', toss_creative_id: '1554004', type: 'VIDEO', content: '개인회생 성공사례 영상', creative_type: '영상강조', main_copy: '실제 의뢰인 후기 공개', sub_copy: '9억 빚에서 자유로워진 사연', brand_name: '법무법인 명율' },
  { id: 'CRV-011', ad_set_id: 'AS-008', toss_creative_id: '1554005', type: 'TEXT', content: '가족도 모르게 조용히 진행', creative_type: '문구강조', main_copy: '가족도 모르게 조용히 진행', sub_copy: '비밀보장 100% 개인회생 전문', brand_name: '법무법인 명율' },
  { id: 'CRV-012', ad_set_id: 'AS-008', toss_creative_id: '1554006', type: 'TEXT', content: '급여 압류 당했다면 지금 연락', creative_type: '문구강조', main_copy: '급여 압류 당했다면 지금 연락', sub_copy: '24시간 이내 접수 가능합니다', brand_name: '법무법인 명율' },
];

const audiences = [
  { id: 'AUD-001', name: '전체 타겟 (타겟최적화 ON)', age_min: null, age_max: null, gender: 'ALL', custom_audience_id: null, device: '전체', region: '전체' },
  { id: 'AUD-002', name: '남성 45-54세', age_min: 45, age_max: 54, gender: '남성', custom_audience_id: null, device: '전체', region: '전체' },
  { id: 'AUD-003', name: '여성 45-59세', age_min: 45, age_max: 59, gender: '여성', custom_audience_id: null, device: '전체', region: '전체' },
  { id: 'AUD-004', name: '남성 30-59세', age_min: 30, age_max: 59, gender: '남성', custom_audience_id: null, device: '전체', region: '전체' },
  { id: 'AUD-005', name: '여성 30-49세', age_min: 30, age_max: 49, gender: '여성', custom_audience_id: null, device: '전체', region: '전체' },
  { id: 'AUD-006', name: '전체 30-60세 (대출 관심)', age_min: 30, age_max: 60, gender: 'ALL', custom_audience_id: 'CA-LOAN', device: '전체', region: '전체' },
];

const schedules = [
  { id: 'SCH-001', day_of_week: 'ALL', start_hour: 0, end_hour: 24 },
  { id: 'SCH-002', day_of_week: '화,금', start_hour: 18, end_hour: 24 },
  { id: 'SCH-003', day_of_week: '수,금', start_hour: 18, end_hour: 24 },
  { id: 'SCH-004', day_of_week: 'WEEKDAY', start_hour: 9, end_hour: 18 },
  { id: 'SCH-005', day_of_week: 'WEEKEND', start_hour: 10, end_hour: 22 },
  { id: 'SCH-006', day_of_week: 'ALL', start_hour: 7, end_hour: 23 },
  { id: 'SCH-007', day_of_week: 'WEEKDAY', start_hour: 18, end_hour: 24 },
  { id: 'SCH-008', day_of_week: 'ALL', start_hour: 11, end_hour: 14 },
];

// ==========================================
// 3. Arm 조합 (광고세트 × 소재 × 타겟 × 스케줄)
// ==========================================

const armConfigs: { name: string; persona: ArmPersona; ad_set_idx: number; creative_idx: number; audience_idx: number; schedule_idx: number }[] = [
  // 캠페인1 — 기존 운영
  { name: '명율_자동전환_타겟지정_빚독촉카피_항상', persona: 'EXCELLENT', ad_set_idx: 0, creative_idx: 0, audience_idx: 0, schedule_idx: 0 },
  { name: '명율_자동전환_타겟지정_빚탈출카피_항상', persona: 'SCALE_TARGET', ad_set_idx: 0, creative_idx: 1, audience_idx: 0, schedule_idx: 0 },
  { name: '명율_CPC200_남45-54_회생확인카피_화금야간', persona: 'HIGH_CTR_LOW_CVR', ad_set_idx: 1, creative_idx: 2, audience_idx: 1, schedule_idx: 1 },
  { name: '명율_CPC600_남45-54_채무감면카피_화금야간', persona: 'INSUFFICIENT_SAMPLE', ad_set_idx: 2, creative_idx: 3, audience_idx: 1, schedule_idx: 1 },
  { name: '명율_자동전환_여45-59_이미지소재_수금야간', persona: 'FATIGUE', ad_set_idx: 3, creative_idx: 4, audience_idx: 2, schedule_idx: 2 },
  { name: '명율_타겟CPA6000_여45-59_압류독촉카피_항상', persona: 'STOP_TARGET', ad_set_idx: 4, creative_idx: 5, audience_idx: 2, schedule_idx: 0 },
  // 캠페인2 — 신규 테스트
  { name: '명율2차_자동전환_전체_파산vs회생카피_항상', persona: 'NORMAL', ad_set_idx: 5, creative_idx: 6, audience_idx: 0, schedule_idx: 0 },
  { name: '명율2차_자동전환_전체_월상환이미지_항상', persona: 'EXCELLENT', ad_set_idx: 5, creative_idx: 7, audience_idx: 0, schedule_idx: 0 },
  { name: '명율2차_CPC400_남30-59_잠못이루카피_평일낮', persona: 'SCALE_TARGET', ad_set_idx: 6, creative_idx: 8, audience_idx: 3, schedule_idx: 3 },
  { name: '명율2차_CPC400_남30-59_성공사례영상_평일낮', persona: 'HIGH_CTR_LOW_CVR', ad_set_idx: 6, creative_idx: 9, audience_idx: 3, schedule_idx: 3 },
  { name: '명율2차_자동전환_여30-49_비밀보장카피_주말', persona: 'NORMAL', ad_set_idx: 7, creative_idx: 10, audience_idx: 4, schedule_idx: 4 },
  { name: '명율2차_자동전환_여30-49_급여압류카피_주말', persona: 'STOP_TARGET', ad_set_idx: 7, creative_idx: 11, audience_idx: 4, schedule_idx: 4 },
  // 추가 조합
  { name: '명율_자동전환_30-60전체_회생확인_종일', persona: 'NORMAL', ad_set_idx: 0, creative_idx: 2, audience_idx: 5, schedule_idx: 5 },
  { name: '명율_CPC200_남45-54_빚탈출카피_화금야간', persona: 'FATIGUE', ad_set_idx: 1, creative_idx: 1, audience_idx: 1, schedule_idx: 1 },
  { name: '명율_타겟CPA6000_여45-59_비밀보장_항상', persona: 'SCALE_TARGET', ad_set_idx: 4, creative_idx: 10, audience_idx: 2, schedule_idx: 0 },
  { name: '명율2차_자동전환_전체_빚독촉카피_항상', persona: 'EXCELLENT', ad_set_idx: 5, creative_idx: 0, audience_idx: 0, schedule_idx: 0 },
  { name: '명율_CPC600_남45-54_압류독촉_화금야간', persona: 'INSUFFICIENT_SAMPLE', ad_set_idx: 2, creative_idx: 5, audience_idx: 1, schedule_idx: 1 },
  { name: '명율_자동전환_여45-59_채무감면_수금야간', persona: 'NORMAL', ad_set_idx: 3, creative_idx: 3, audience_idx: 2, schedule_idx: 2 },
  { name: '명율2차_CPC400_남30-59_급여압류_평일야간', persona: 'STOP_TARGET', ad_set_idx: 6, creative_idx: 11, audience_idx: 3, schedule_idx: 6 },
  { name: '명율2차_자동전환_여30-49_파산vs회생_주말', persona: 'NORMAL', ad_set_idx: 7, creative_idx: 6, audience_idx: 4, schedule_idx: 4 },
];

const arms: Arm[] = armConfigs.map((config, i) => ({
  id: `ARM-${(i + 1).toString().padStart(3, '0')}`,
  campaign_id: adSets[config.ad_set_idx].campaign_id,
  ad_set_id: adSets[config.ad_set_idx].id,
  creative_id: creatives[config.creative_idx].id,
  audience_id: audiences[config.audience_idx].id,
  schedule_id: schedules[config.schedule_idx].id,
  name: config.name,
  status: config.persona === 'STOP_TARGET' ? 'PAUSED' : 'ACTIVE',
  persona: config.persona,
}));

// ==========================================
// 4. 성과 데이터 생성기 (CPC 350원 기준, 개인회생 도메인)
// ==========================================

const generatePerformanceData = () => {
  const dailyData: PerformanceDaily[] = [];
  const hourlyData: PerformanceHourly[] = [];
  const today = new Date();
  const baseCpc = 350;

  arms.forEach(arm => {
    let baseImpressions = 5000;
    let baseCtr = 0.02;
    let baseCvr = 0.05;

    switch (arm.persona) {
      case 'EXCELLENT': baseCtr = 0.035; baseCvr = 0.08; baseImpressions = 8000; break;
      case 'SCALE_TARGET': baseCtr = 0.025; baseCvr = 0.06; baseImpressions = 15000; break;
      case 'HIGH_CTR_LOW_CVR': baseCtr = 0.060; baseCvr = 0.005; baseImpressions = 10000; break;
      case 'FATIGUE': baseCtr = 0.040; baseCvr = 0.07; baseImpressions = 12000; break;
      case 'INSUFFICIENT_SAMPLE': baseCtr = 0.015; baseCvr = 0.03; baseImpressions = 200; break;
      case 'STOP_TARGET': baseCtr = 0.010; baseCvr = 0.01; baseImpressions = 6000; break;
      case 'NORMAL': default: baseCtr = 0.020; baseCvr = 0.04; baseImpressions = 5000; break;
    }

    for (let i = 29; i >= 0; i--) {
      const currentDate = subDays(today, i);
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const dowModifier = isWeekend ? 0.7 : 1.1;
      let fatigueModifier = 1.0;
      if (arm.persona === 'FATIGUE') {
        fatigueModifier = Math.max(0.3, 1.0 - ((30 - i) * 0.03));
      }
      const noise = () => 0.85 + Math.random() * 0.3;

      const dailyImpressions = Math.floor(baseImpressions * dowModifier * fatigueModifier * noise());
      const dailyClicks = Math.floor(dailyImpressions * baseCtr * fatigueModifier * noise());
      const dailyCost = dailyClicks * Math.floor(baseCpc * noise());
      const dailyLeads = Math.floor(dailyClicks * baseCvr * fatigueModifier * noise());

      dailyData.push({
        id: `PD-${arm.id}-${format(currentDate, 'yyyyMMdd')}`,
        arm_id: arm.id,
        date: format(currentDate, 'yyyy-MM-dd'),
        impressions: dailyImpressions,
        clicks: dailyClicks,
        spend: dailyCost,
        leads: dailyLeads,
      });

      if (i < 7) {
        for (let hour = 0; hour < 24; hour++) {
          let todModifier = 1.0;
          if (hour >= 0 && hour < 6) todModifier = 0.1;
          else if (hour >= 7 && hour <= 9) todModifier = 1.5;
          else if (hour >= 11 && hour <= 13) todModifier = 1.3;
          else if (hour >= 18 && hour <= 22) todModifier = 1.2;

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
// 5. 운영 로그 & 액션 (개인회생/파산 맥락)
// ==========================================

const recommendedActions: RecommendedAction[] = [
  { id: 'ACT-001', arm_id: 'ARM-006', action_type: 'PAUSE', reason: '타겟CPA6000 세트에서 CPA가 ₩20,714로 중단 기준(₩22,500)에 근접합니다. 확인 후 중단 여부를 결정하세요.', status: 'EXECUTED', created_at: new Date().toISOString() },
  { id: 'ACT-002', arm_id: 'ARM-001', action_type: 'BUDGET_UP', reason: '빚독촉 카피 자동전환 세트: 성공 확률 94%, CPA ₩7,200으로 매우 우수. 예산 20% 증액 권장.', status: 'APPROVED', created_at: new Date().toISOString() },
  { id: 'ACT-003', arm_id: 'ARM-005', action_type: 'BUDGET_DOWN', reason: '이미지소재 여45-59 세트: 초기 대비 CTR 40% 하락, 피로도 의심. 예산 15% 감액 권장.', status: 'PENDING', created_at: new Date().toISOString() },
  { id: 'ACT-004', arm_id: 'ARM-003', action_type: 'HOLD', reason: 'CPC200 회생확인 카피: CTR 5.2%로 높으나 CVR 1.1%로 극히 낮음. 어그로성 문구 의심, 수동 검토 필요.', status: 'PENDING', created_at: new Date().toISOString() },
  { id: 'ACT-005', arm_id: 'ARM-012', action_type: 'PAUSE', reason: '급여압류 카피 여30-49: 7일 연속 리드 0건, 비용만 소진 중. 즉시 중단 권장.', status: 'ROLLED_BACK', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const crawlerLogs: CrawlerLog[] = [
  { id: 'CL-001', job_type: 'SYNC_CAMPAIGNS', status: 'SUCCESS', message: '캠페인 2개, 광고세트 8개, 소재 12개 동기화 완료', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'CL-002', job_type: 'SYNC_PERFORMANCE', status: 'SUCCESS', message: '최근 7일 성과 데이터 수집 완료 (3,360건)', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'CL-003', job_type: 'EXECUTE_ACTION', status: 'FAILED', message: '토스애즈 로그인 세션 만료. 재인증 필요.', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'CL-004', job_type: 'EXECUTE_ACTION', status: 'SUCCESS', message: 'ARM-006 예산 감액 완료 (500,000→425,000)', created_at: new Date(Date.now() - 300000).toISOString() },
];

const actionLogs: ActionLog[] = [
  { id: 'AL-001', action_id: 'ACT-001', executor: 'BOT', status: 'SUCCESS', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'AL-002', action_id: 'ACT-005', executor: 'USER', status: 'SUCCESS', created_at: new Date(Date.now() - 80000000).toISOString() },
];

// ==========================================
// 6. Export
// ==========================================

export const tossAdsMockDB = {
  campaigns, adSets, creatives, audiences, schedules,
  arms, performanceDaily: dailyData, performanceHourly: hourlyData,
  recommendedActions, crawlerLogs, actionLogs, leadFormScreens,
};

export default tossAdsMockDB;
