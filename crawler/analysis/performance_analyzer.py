"""
PerformanceAnalyzer — 광고세트별 성과 분석 + 최적 조합 추천

Supabase에 저장된 성과 데이터(performance_daily)와 설정 데이터(ad_set_configs)를
조인하여 어떤 타겟/노출시간/입찰 방식 조합이 최적인지 분석.
"""
import json
from datetime import datetime, timedelta
from ..core.supabase_client import supabase


class PerformanceAnalyzer:

    def __init__(self):
        self.configs = []
        self.performance = []

    def load_data(self, days: int = 30):
        """Supabase에서 설정 + 성과 데이터 로드"""
        print("\n[분석] 데이터 로드 중...")

        # 1. 광고세트 설정 (최신)
        try:
            res = supabase.table("ad_set_configs") \
                .select("*") \
                .order("collected_at", desc=True) \
                .execute()
            self.configs = res.data or []
            print(f"  설정: {len(self.configs)}건")
        except Exception as e:
            print(f"  [!] 설정 로드 에러: {e}")

        # 2. 성과 데이터
        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        try:
            res = supabase.table("performance_daily") \
                .select("*") \
                .gte("date", since) \
                .execute()
            self.performance = res.data or []
            print(f"  성과: {len(self.performance)}건 (최근 {days}일)")
        except Exception as e:
            print(f"  [!] 성과 로드 에러: {e}")

    def analyze(self) -> dict:
        """전체 분석 실행"""
        if not self.configs:
            self.load_data()

        report = {
            "generated_at": datetime.now().isoformat(),
            "config_count": len(self.configs),
            "performance_count": len(self.performance),
        }

        # 1. 광고세트별 CPA 순위
        report["cpa_ranking"] = self._rank_by_cpa()

        # 2. 입찰 방식별 성과 비교
        report["bid_comparison"] = self._compare_by_field("bid_type")

        # 3. 노출 시간별 성과 비교
        report["schedule_comparison"] = self._compare_by_field("schedule_type")

        # 4. 최적 조합 추천
        report["recommendations"] = self._generate_recommendations()

        return report

    def _rank_by_cpa(self) -> list:
        """광고세트별 CPA 순위"""
        # 성과 데이터를 adset_id별로 집계
        perf_by_adset = {}
        for p in self.performance:
            aid = p.get("toss_adset_id")
            if not aid:
                continue
            if aid not in perf_by_adset:
                perf_by_adset[aid] = {
                    "spend": 0, "impressions": 0, "clicks": 0,
                    "leads": 0, "days": 0
                }
            perf_by_adset[aid]["spend"] += p.get("spend", 0)
            perf_by_adset[aid]["impressions"] += p.get("impressions", 0)
            perf_by_adset[aid]["clicks"] += p.get("clicks", 0)
            perf_by_adset[aid]["leads"] += p.get("leads", 0)
            perf_by_adset[aid]["days"] += 1

        # 설정과 매칭
        ranking = []
        seen_ids = set()
        for c in self.configs:
            aid = c.get("toss_adset_id")
            if not aid or aid in seen_ids:
                continue
            seen_ids.add(aid)

            perf = perf_by_adset.get(aid, {})
            spend = perf.get("spend", 0)
            clicks = perf.get("clicks", 0)
            leads = perf.get("leads", 0)
            impressions = perf.get("impressions", 0)

            cpa = spend / leads if leads > 0 else float('inf')
            cpc = spend / clicks if clicks > 0 else 0
            ctr = (clicks / impressions * 100) if impressions > 0 else 0

            ranking.append({
                "adset_id": aid,
                "name": c.get("adset_name", "")[:40],
                "bid_type": c.get("bid_type"),
                "schedule_type": c.get("schedule_type"),
                "target_cost": c.get("target_cost", 0),
                "spend": round(spend),
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(ctr, 2),
                "cpc": round(cpc),
                "leads": leads,
                "cpa": round(cpa) if cpa != float('inf') else None,
                "days": perf.get("days", 0),
            })

        # CPA 기준 정렬 (낮을수록 좋음, None은 마지막)
        ranking.sort(key=lambda x: x["cpa"] if x["cpa"] is not None else 999999)
        return ranking

    def _compare_by_field(self, field: str) -> dict:
        """특정 설정 필드별 성과 비교"""
        groups = {}
        seen_ids = set()

        for c in self.configs:
            aid = c.get("toss_adset_id")
            if not aid or aid in seen_ids:
                continue
            seen_ids.add(aid)

            val = c.get(field, "미설정") or "미설정"
            if val not in groups:
                groups[val] = {"adsets": [], "spend": 0, "clicks": 0, "impressions": 0, "leads": 0}
            groups[val]["adsets"].append(aid)

        # 성과 데이터 집계
        for p in self.performance:
            aid = p.get("toss_adset_id")
            for val, g in groups.items():
                if aid in g["adsets"]:
                    g["spend"] += p.get("spend", 0)
                    g["clicks"] += p.get("clicks", 0)
                    g["impressions"] += p.get("impressions", 0)
                    g["leads"] += p.get("leads", 0)

        # 결과 정리
        result = {}
        for val, g in groups.items():
            result[val] = {
                "adset_count": len(g["adsets"]),
                "spend": round(g["spend"]),
                "impressions": g["impressions"],
                "clicks": g["clicks"],
                "ctr": round((g["clicks"] / g["impressions"] * 100), 2) if g["impressions"] > 0 else 0,
                "cpc": round(g["spend"] / g["clicks"]) if g["clicks"] > 0 else 0,
                "leads": g["leads"],
                "cpa": round(g["spend"] / g["leads"]) if g["leads"] > 0 else None,
            }

        return result

    def _generate_recommendations(self) -> list:
        """최적화 추천 생성"""
        recs = []
        ranking = self._rank_by_cpa()

        if not ranking:
            recs.append({
                "type": "DATA_NEEDED",
                "message": "성과 데이터가 부족합니다. 최소 3일 이상 데이터 수집 후 분석이 가능합니다.",
                "priority": "HIGH"
            })
            return recs

        # 가장 좋은/나쁜 광고세트 식별
        best = [r for r in ranking if r["cpa"] is not None and r["spend"] > 10000]
        worst = [r for r in ranking if r["cpa"] is None or r["cpa"] > 50000]

        if best:
            top = best[0]
            recs.append({
                "type": "BEST_PERFORMER",
                "message": f"최고 성과 광고세트: {top['name']} (CPA: ₩{top['cpa']:,}, CTR: {top['ctr']}%)",
                "adset_id": top["adset_id"],
                "config": {
                    "bid_type": top["bid_type"],
                    "schedule_type": top["schedule_type"],
                    "target_cost": top["target_cost"]
                },
                "priority": "INFO"
            })

        if worst:
            for w in worst[:3]:
                if w["spend"] > 50000:  # 5만원 이상 소진했는데 전환 0
                    recs.append({
                        "type": "LOW_PERFORMER",
                        "message": f"비효율 광고세트: {w['name']} (소진: ₩{w['spend']:,}, 전환: {w['leads']}건)",
                        "adset_id": w["adset_id"],
                        "action": "OFF 또는 타겟/소재 변경 권장",
                        "priority": "WARNING"
                    })

        # A/B 테스트 추천
        bid_comp = self._compare_by_field("bid_type")
        schedule_comp = self._compare_by_field("schedule_type")

        # 입찰 방식 비교
        if len(bid_comp) > 1:
            recs.append({
                "type": "AB_TEST_SUGGEST",
                "message": "입찰 방식별 비교 가능: " + ", ".join(
                    f"{k} (CTR:{v['ctr']}%)" for k, v in bid_comp.items()
                ),
                "priority": "MEDIUM"
            })

        # 노출 시간 비교
        if len(schedule_comp) > 1:
            recs.append({
                "type": "AB_TEST_SUGGEST",
                "message": "노출 시간별 비교 가능: " + ", ".join(
                    f"{k} ({v['adset_count']}개)" for k, v in schedule_comp.items()
                ),
                "priority": "MEDIUM"
            })

        return recs

    def print_report(self, report: dict = None):
        """분석 보고서 출력"""
        if report is None:
            report = self.analyze()

        print(f"\n{'='*60}")
        print(f"  📊 토스애즈 CPA 최적화 분석 보고서")
        print(f"  생성: {report['generated_at'][:19]}")
        print(f"  설정: {report['config_count']}건 | 성과: {report['performance_count']}건")
        print(f"{'='*60}")

        # CPA 순위
        print(f"\n{'─'*60}")
        print(f"  🏆 CPA 순위 (낮을수록 좋음)")
        print(f"{'─'*60}")
        for i, r in enumerate(report.get("cpa_ranking", [])[:10]):
            cpa_str = f"₩{r['cpa']:,}" if r["cpa"] else "-"
            print(f"  {i+1}. [{r['adset_id']}] {r['name'][:30]}")
            print(f"     소진:₩{r['spend']:,} | 클릭:{r['clicks']} | CTR:{r['ctr']}% | CPA:{cpa_str}")

        # 입찰 방식 비교
        print(f"\n{'─'*60}")
        print(f"  ⚡ 입찰 방식별 비교")
        print(f"{'─'*60}")
        for k, v in report.get("bid_comparison", {}).items():
            cpa = f"₩{v['cpa']:,}" if v.get("cpa") else "-"
            print(f"  {k}: {v['adset_count']}개 세트 | CTR:{v['ctr']}% | CPC:₩{v['cpc']:,} | CPA:{cpa}")

        # 노출 시간 비교
        print(f"\n{'─'*60}")
        print(f"  ⏰ 노출 시간별 비교")
        print(f"{'─'*60}")
        for k, v in report.get("schedule_comparison", {}).items():
            cpa = f"₩{v['cpa']:,}" if v.get("cpa") else "-"
            print(f"  {k}: {v['adset_count']}개 세트 | CTR:{v['ctr']}% | CPA:{cpa}")

        # 추천
        print(f"\n{'─'*60}")
        print(f"  💡 추천 사항")
        print(f"{'─'*60}")
        for r in report.get("recommendations", []):
            icon = {"HIGH": "🔴", "WARNING": "🟡", "MEDIUM": "🔵", "INFO": "🟢"}.get(r["priority"], "⚪")
            print(f"  {icon} [{r['type']}] {r['message']}")

        return report
