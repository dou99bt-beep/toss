-- ==========================================
-- Toss Ads CPA Optimization — Supabase Schema
-- 안전하게 재실행 가능 (DROP IF EXISTS 포함)
-- ==========================================

-- Helper: auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Campaign
CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_campaign_id TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'ON',
  budget           DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. AdSet
CREATE TABLE IF NOT EXISTS ad_sets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  toss_adset_id  TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'ON',
  target_cpa     DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_ad_sets_updated_at ON ad_sets;
CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Creative
CREATE TABLE IF NOT EXISTS creatives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id         UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  toss_creative_id  TEXT UNIQUE NOT NULL,
  type              TEXT NOT NULL,
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_creatives_updated_at ON creatives;
CREATE TRIGGER update_creatives_updated_at BEFORE UPDATE ON creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Audience
CREATE TABLE IF NOT EXISTS audiences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  age_min             INT,
  age_max             INT,
  gender              TEXT,
  custom_audience_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_audiences_updated_at ON audiences;
CREATE TRIGGER update_audiences_updated_at BEFORE UPDATE ON audiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Schedule
CREATE TABLE IF NOT EXISTS schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week TEXT NOT NULL,
  start_hour  INT NOT NULL,
  end_hour    INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. ArmRegistry
CREATE TABLE IF NOT EXISTS arm_registry (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id   UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'LEARNING',
  is_control  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_arm_registry_updated_at ON arm_registry;
CREATE TRIGGER update_arm_registry_updated_at BEFORE UPDATE ON arm_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. PerformanceDaily
CREATE TABLE IF NOT EXISTS performance_daily (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id      UUID NOT NULL REFERENCES arm_registry(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL,
  spend       DOUBLE PRECISION NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks      INT NOT NULL DEFAULT 0,
  leads       INT NOT NULL DEFAULT 0,
  cpa         DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_performance_daily_updated_at ON performance_daily;
CREATE TRIGGER update_performance_daily_updated_at BEFORE UPDATE ON performance_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. PerformanceHourly
CREATE TABLE IF NOT EXISTS performance_hourly (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id      UUID NOT NULL REFERENCES arm_registry(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL,
  hour        INT NOT NULL,
  spend       DOUBLE PRECISION NOT NULL DEFAULT 0,
  leads       INT NOT NULL DEFAULT 0,
  cpa         DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_performance_hourly_updated_at ON performance_hourly;
CREATE TRIGGER update_performance_hourly_updated_at BEFORE UPDATE ON performance_hourly FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. PerformanceCreative
CREATE TABLE IF NOT EXISTS performance_creative (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id   UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  date          TIMESTAMPTZ NOT NULL,
  ctr           DOUBLE PRECISION NOT NULL DEFAULT 0,
  cvr           DOUBLE PRECISION NOT NULL DEFAULT 0,
  fatigue_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_performance_creative_updated_at ON performance_creative;
CREATE TRIGGER update_performance_creative_updated_at BEFORE UPDATE ON performance_creative FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. LeadQuality
CREATE TABLE IF NOT EXISTS lead_quality (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id      UUID NOT NULL REFERENCES arm_registry(id) ON DELETE CASCADE,
  lead_id     TEXT UNIQUE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING',
  revenue     DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_lead_quality_updated_at ON lead_quality;
CREATE TRIGGER update_lead_quality_updated_at BEFORE UPDATE ON lead_quality FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. AutomationRule
CREATE TABLE IF NOT EXISTS automation_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  action_type    TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON automation_rules;
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. RecommendedAction
CREATE TABLE IF NOT EXISTS recommended_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  arm_id      UUID NOT NULL REFERENCES arm_registry(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_recommended_actions_updated_at ON recommended_actions;
CREATE TRIGGER update_recommended_actions_updated_at BEFORE UPDATE ON recommended_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. ActionLog
CREATE TABLE IF NOT EXISTS action_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommended_action_id   UUID NOT NULL REFERENCES recommended_actions(id) ON DELETE CASCADE,
  executor                TEXT NOT NULL,
  status                  TEXT NOT NULL,
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_action_logs_updated_at ON action_logs;
CREATE TRIGGER update_action_logs_updated_at BEFORE UPDATE ON action_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. UserApproval
CREATE TABLE IF NOT EXISTS user_approvals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommended_action_id   UUID NOT NULL REFERENCES recommended_actions(id) ON DELETE CASCADE,
  user_id                 TEXT NOT NULL,
  approved_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_user_approvals_updated_at ON user_approvals;
CREATE TRIGGER update_user_approvals_updated_at BEFORE UPDATE ON user_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. CrawlerLog
CREATE TABLE IF NOT EXISTS crawler_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL,
  status          TEXT NOT NULL,
  screenshot_url  TEXT,
  error_trace     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_crawler_logs_updated_at ON crawler_logs;
CREATE TRIGGER update_crawler_logs_updated_at BEFORE UPDATE ON crawler_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. SelectorRegistry
CREATE TABLE IF NOT EXISTS selector_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name       TEXT NOT NULL,
  element_name    TEXT NOT NULL,
  selector_value  TEXT NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_selector_registry_updated_at ON selector_registry;
CREATE TRIGGER update_selector_registry_updated_at BEFORE UPDATE ON selector_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. CrawlerJob
CREATE TABLE IF NOT EXISTS crawler_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     TEXT NOT NULL,
  payload      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  result       TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS update_crawler_jobs_updated_at ON crawler_jobs;
CREATE TRIGGER update_crawler_jobs_updated_at BEFORE UPDATE ON crawler_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS + Policies (idempotent)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'campaigns','ad_sets','creatives','audiences','schedules',
    'arm_registry','performance_daily','performance_hourly',
    'performance_creative','lead_quality','automation_rules',
    'recommended_actions','action_logs','user_approvals',
    'crawler_logs','selector_registry','crawler_jobs'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop existing policy if exists, then create
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
