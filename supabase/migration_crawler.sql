-- ==========================================
-- 크롤러용 스키마 마이그레이션
-- performance_daily에 toss_adset_id 직접 저장
-- ad_sets.campaign_id nullable 처리
-- ==========================================

-- 1. ad_sets.campaign_id를 nullable로 변경 (크롤러가 campaign UUID 없이 저장 가능)
ALTER TABLE ad_sets ALTER COLUMN campaign_id DROP NOT NULL;

-- 2. performance_daily에 toss_adset_id 컬럼 추가 (크롤러가 직접 저장)
ALTER TABLE performance_daily ADD COLUMN IF NOT EXISTS toss_adset_id TEXT;
ALTER TABLE performance_daily ALTER COLUMN arm_id DROP NOT NULL;

-- 3. performance_daily에 toss_adset_id + date 유니크 제약 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'performance_daily_toss_date_unique'
  ) THEN
    ALTER TABLE performance_daily ADD CONSTRAINT performance_daily_toss_date_unique
      UNIQUE (toss_adset_id, date);
  END IF;
END $$;

-- 4. campaigns 테이블에 toss_account_id 컬럼 추가
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS toss_account_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ad_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget_type TEXT;

-- 5. ad_sets 테이블에 추가 필드
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS toss_campaign_id TEXT;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS bid_strategy TEXT;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS bid_amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE ad_sets ADD COLUMN IF NOT EXISTS exposure_type TEXT;

-- 6. performance_daily에 추가 필드
ALTER TABLE performance_daily ADD COLUMN IF NOT EXISTS ad_set_name TEXT;
ALTER TABLE performance_daily ADD COLUMN IF NOT EXISTS ctr DOUBLE PRECISION DEFAULT 0;
ALTER TABLE performance_daily ADD COLUMN IF NOT EXISTS cvr DOUBLE PRECISION DEFAULT 0;
