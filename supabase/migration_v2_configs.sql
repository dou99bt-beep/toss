-- ==========================================
-- CPA 최적화 Phase 1: 광고세트 상세 설정 저장
-- ==========================================

-- 광고세트 상세 설정 (타겟/노출시간/입찰)
CREATE TABLE IF NOT EXISTS ad_set_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_adset_id   TEXT NOT NULL,
  adset_name      TEXT,
  
  -- 입찰 설정
  bid_type        TEXT,            -- '자동 입찰' | '직접 입찰'
  bid_strategy    TEXT,            -- '전환 최대' | null
  target_cost     INT DEFAULT 0,   -- 목표 비용 (원)
  daily_budget    INT DEFAULT 0,   -- 일 예산 (원)
  
  -- 노출 설정
  ad_format       TEXT DEFAULT '리스트',  -- '리스트' | '보드' | '1:1 이미지' | '비디오'
  schedule_type   TEXT,            -- '항상 노출' | '시간 설정' | '요일별 설정'
  schedule_json   JSONB,           -- 요일/시간 매트릭스 {"mon":[0,1,8,9,...], "tue":[...]}
  period_type     TEXT,            -- '캠페인과 동일' | '직접 설정'
  period_start    DATE,
  period_end      DATE,
  
  -- 타겟 설정
  target_gender   TEXT DEFAULT '전체',   -- '전체' | '남성' | '여성'
  target_age      TEXT DEFAULT '전체',   -- '전체' | '특정 연령'
  target_age_min  INT,
  target_age_max  INT,
  target_device   TEXT DEFAULT '전체',
  target_carrier  TEXT DEFAULT '전체',
  target_interests JSONB,          -- ["대출","신용관리","금융 정보",...]
  target_industries JSONB,         -- ["전문서비스","세금",...]
  target_spending TEXT,            -- 소비 수준
  target_count    INT,             -- 예상 타겟수
  
  -- 소재 정보
  creatives_count INT DEFAULT 0,   -- 등록된 소재 수
  creatives_json  JSONB,           -- [{name, status, type}, ...]
  
  -- 메타
  collected_at    TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(toss_adset_id, collected_at::date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_asc_adset ON ad_set_configs(toss_adset_id);
CREATE INDEX IF NOT EXISTS idx_asc_date ON ad_set_configs(collected_at);
