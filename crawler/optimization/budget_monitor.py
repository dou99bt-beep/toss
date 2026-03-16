"""
BudgetMonitor — 예산 소진 실시간 모니터링 + 알림

매 시간 체크:
- 과소진 (120% 초과 예상) → ⚠️
- 미소진 (50% 미만 예상) → ⚠️  
- 비효율 (전환 0건 + 5만원 이상 소진) → 🔴
"""
from datetime import datetime, timedelta
from ..core.supabase_client import supabase


class BudgetMonitor:

    def check(self) -> list:
        """현재 예산 소진 상태 체크"""
        print(f"\n{'='*60}")
        print(f"  📊 예산 소진 모니터")
        print(f"  시간: {datetime.now().strftime('%H:%M')}")
        print(f"{'='*60}")

        alerts = []

        # 오늘 성과 데이터
        today = datetime.now().strftime("%Y-%m-%d")
        try:
            res = supabase.table("performance_daily") \
                .select("*") \
                .eq("date", today) \
                .execute()
            today_perf = res.data or []
        except:
            today_perf = []

        # 광고세트 설정 (예산 정보)
        try:
            res = supabase.table("ad_set_configs") \
                .select("toss_adset_id,adset_name,daily_budget") \
                .order("collected_at", desc=True) \
                .execute()
            configs = {}
            for c in (res.data or []):
                aid = c.get("toss_adset_id")
                if aid not in configs:
                    configs[aid] = c
        except:
            configs = {}

        if not today_perf:
            print("  [→] 오늘 성과 데이터 아직 없음")
            return alerts

        # 현재 시간 기준 진행률
        hour = datetime.now().hour
        if hour == 0:
            hour = 1
        day_progress = hour / 24

        for p in today_perf:
            aid = p.get("toss_adset_id")
            if not aid or aid == "summary":
                continue

            spend = p.get("spend", 0)
            leads = p.get("leads", 0)
            impressions = p.get("impressions", 0)

            config = configs.get(aid, {})
            budget = config.get("daily_budget", 0)
            name = config.get("adset_name", aid)[:30]

            if budget <= 0:
                continue

            # 예상 일 소진액
            projected = spend / day_progress if day_progress > 0 else spend
            spend_ratio = projected / budget

            # 과소진 (120% 초과)
            if spend_ratio > 1.2:
                alert = {
                    "adset_id": aid,
                    "type": "OVERSPEND",
                    "severity": "WARNING",
                    "message": f"[{name}] 과소진 예상: ₩{projected:,.0f} / 예산 ₩{budget:,} ({spend_ratio*100:.0f}%)",
                    "spend": spend,
                    "budget": budget,
                    "projected": projected,
                }
                alerts.append(alert)
                print(f"  ⚠️ {alert['message']}")

            # 미소진 (50% 미만)
            elif spend_ratio < 0.5 and hour >= 12:
                alert = {
                    "adset_id": aid,
                    "type": "UNDERSPEND",
                    "severity": "INFO",
                    "message": f"[{name}] 미소진: ₩{projected:,.0f} / 예산 ₩{budget:,} ({spend_ratio*100:.0f}%)",
                    "spend": spend,
                    "budget": budget,
                }
                alerts.append(alert)
                print(f"  ℹ️ {alert['message']}")

            # 비효율 (2만원+ 소진 + 전환 0건)
            if spend >= 20000 and leads == 0:
                alert = {
                    "adset_id": aid,
                    "type": "INEFFICIENT",
                    "severity": "HIGH",
                    "message": f"[{name}] 비효율: ₩{spend:,} 소진 + 전환 0건",
                    "spend": spend,
                    "leads": 0,
                }
                alerts.append(alert)
                print(f"  🔴 {alert['message']}")

        if not alerts:
            print("  ✅ 이상 없음")

        return alerts
