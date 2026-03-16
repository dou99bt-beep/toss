"""
BudgetOptimizer — CPA 비례 예산 자동 배분

전체 일 예산 풀에서 CPA가 낮은(좋은) 광고세트에 더 많은 예산 배분.
최소 ₩50,000 / 최대 풀의 40% 제한.
"""
import json
from datetime import datetime, timedelta
from ..core.supabase_client import supabase

MIN_BUDGET = 50000    # 최소 일 예산
MAX_RATIO = 0.40      # 한 세트에 최대 40%
CPA_TARGET = 15000    # 목표 CPA (최적: ₩6,000~15,000, 최대 허용: ₩20,000)


class BudgetOptimizer:

    def optimize(self, total_pool: int = 300000, days: int = 7) -> dict:
        """CPA 기반 예산 최적 배분 계산"""
        print(f"\n{'='*60}")
        print(f"  💰 예산 자동 배분 최적화")
        print(f"  총 풀: ₩{total_pool:,} | 분석 기간: {days}일")
        print(f"{'='*60}")

        # 1. 설정 + 성과 로드
        configs = self._load_configs()
        perf_map = self._load_performance(days)

        if not configs:
            return {"error": "광고세트 설정 없음"}

        # 2. 광고세트별 CPA 계산
        rankings = []
        seen = set()
        for c in configs:
            aid = c.get("toss_adset_id")
            if not aid or aid in seen:
                continue
            seen.add(aid)

            perf = perf_map.get(aid, {})
            spend = perf.get("spend", 0)
            leads = perf.get("leads", 0)
            clicks = perf.get("clicks", 0)
            impressions = perf.get("impressions", 0)

            cpa = spend / leads if leads > 0 else float('inf')
            ctr = clicks / impressions * 100 if impressions > 0 else 0

            rankings.append({
                "adset_id": aid,
                "name": c.get("adset_name", "")[:40],
                "current_budget": c.get("daily_budget", 0),
                "cpa": cpa,
                "ctr": ctr,
                "spend": spend,
                "leads": leads,
            })

        # 성과 없는 세트 = 기본 예산
        active = [r for r in rankings if r["cpa"] != float('inf')]
        inactive = [r for r in rankings if r["cpa"] == float('inf')]

        if not active:
            print("[!] CPA 데이터 있는 세트 없음 — 균등 배분")
            equal = max(MIN_BUDGET, total_pool // len(rankings))
            for r in rankings:
                r["new_budget"] = equal
            return self._format_result(rankings, total_pool)

        # 3. CPA 역수 비례 배분
        # 성과 없는 세트에 최소 예산 배정
        reserved = MIN_BUDGET * len(inactive)
        available = total_pool - reserved

        # CPA 역수 (낮을수록 좋음 → 큰 비율)
        inv_sum = sum(1 / r["cpa"] for r in active)

        for r in active:
            ratio = (1 / r["cpa"]) / inv_sum
            # 최대 비율 제한
            ratio = min(ratio, MAX_RATIO)
            budget = int(available * ratio)
            budget = max(budget, MIN_BUDGET)
            budget = (budget // 10000) * 10000  # 만원 단위 반올림
            r["new_budget"] = budget
            r["ratio"] = round(ratio * 100, 1)

        for r in inactive:
            r["new_budget"] = MIN_BUDGET
            r["ratio"] = 0

        # 4. 결과 출력
        return self._format_result(rankings, total_pool)

    def _load_configs(self) -> list:
        try:
            res = supabase.table("ad_set_configs").select("*").order("collected_at", desc=True).execute()
            return res.data or []
        except:
            return []

    def _load_performance(self, days: int) -> dict:
        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        perf_map = {}
        try:
            res = supabase.table("performance_daily").select("*").gte("date", since).execute()
            for p in (res.data or []):
                aid = p.get("toss_adset_id")
                if aid not in perf_map:
                    perf_map[aid] = {"spend": 0, "clicks": 0, "impressions": 0, "leads": 0}
                perf_map[aid]["spend"] += p.get("spend", 0)
                perf_map[aid]["clicks"] += p.get("clicks", 0)
                perf_map[aid]["impressions"] += p.get("impressions", 0)
                perf_map[aid]["leads"] += p.get("leads", 0)
        except:
            pass
        return perf_map

    def _format_result(self, rankings: list, pool: int) -> dict:
        rankings.sort(key=lambda x: x.get("new_budget", 0), reverse=True)
        total_new = sum(r.get("new_budget", 0) for r in rankings)

        print(f"\n{'─'*60}")
        print(f"  📊 배분 결과")
        print(f"{'─'*60}")
        for r in rankings:
            cpa = f"₩{r['cpa']:,.0f}" if r['cpa'] != float('inf') else "-"
            change = r.get("new_budget", 0) - r.get("current_budget", 0)
            arrow = "↑" if change > 0 else "↓" if change < 0 else "="
            print(f"  [{r['adset_id']}] {r['name'][:30]}")
            print(f"    CPA:{cpa} | 현재:₩{r.get('current_budget',0):,} → 신규:₩{r.get('new_budget',0):,} {arrow}")

        print(f"\n  총 배분: ₩{total_new:,} / 풀: ₩{pool:,}")

        # DB 저장
        self._save_to_db(rankings)

        return {"rankings": rankings, "total_allocated": total_new, "pool": pool}

    def _save_to_db(self, rankings: list):
        """예산 배분 결과를 recommended_actions로 저장"""
        for r in rankings:
            change = r.get("new_budget", 0) - r.get("current_budget", 0)
            if change == 0:
                continue
            try:
                supabase.table("recommended_actions").insert({
                    "rule_id": self._get_or_create_rule(),
                    "action_type": "BUDGET_CHANGE",
                    "reason": json.dumps({
                        "adset_id": r["adset_id"],
                        "name": r["name"],
                        "current": r.get("current_budget", 0),
                        "new": r.get("new_budget", 0),
                        "cpa": r["cpa"] if r["cpa"] != float('inf') else None,
                    }, ensure_ascii=False, default=str),
                    "status": "PENDING",
                }).execute()
            except Exception as e:
                print(f"  [!] DB 저장 에러: {e}")
                break

    def _get_or_create_rule(self) -> str:
        """BUDGET_OPT 자동화 룰 ID 확보"""
        try:
            res = supabase.table("automation_rules").select("id").eq("name", "BUDGET_OPTIMIZER").limit(1).execute()
            if res.data:
                return res.data[0]["id"]
            res = supabase.table("automation_rules").insert({
                "name": "BUDGET_OPTIMIZER",
                "condition_json": json.dumps({"type": "CPA_PROPORTIONAL"}),
                "action_type": "BUDGET_CHANGE",
                "is_active": True,
            }).execute()
            return res.data[0]["id"]
        except:
            return "00000000-0000-0000-0000-000000000000"
