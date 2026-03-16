"""
ABTestDesigner — A/B 테스트 매트릭스 자동 설계

현재 최고 성과 광고세트를 대조군(Control)으로,
1~2개 변수만 변경한 실험군(Treatment)을 자동 설계.
"""
import json
from datetime import datetime
from ..core.supabase_client import supabase
from .performance_analyzer import PerformanceAnalyzer


# 테스트 가능한 변수와 옵션
TEST_VARIABLES = {
    "schedule_type": {
        "name": "노출 시간",
        "options": ["항상 노출", "요일별 설정"],
        "priority": 1,
    },
    "bid_type": {
        "name": "입찰 방식",
        "options": ["자동 입찰", "직접 입찰"],
        "priority": 2,
    },
    "target_cost": {
        "name": "목표 비용",
        "options": [8000, 10000, 13000, 15000],
        "priority": 3,
    },
    "target_gender": {
        "name": "성별 타겟",
        "options": ["전체", "남성", "여성"],
        "priority": 4,
    },
}

DAILY_BUDGET_MIN = 50000  # 광고세트당 최소 일 예산


class ABTestDesigner:

    def __init__(self):
        self.analyzer = PerformanceAnalyzer()

    def design_test_plan(self, max_treatments: int = 2, daily_budget: int = 50000) -> dict:
        """A/B 테스트 계획 생성"""
        print(f"\n{'='*60}")
        print(f"  🧪 A/B 테스트 계획 설계")
        print(f"{'='*60}")

        # 1. 데이터 로드 + 분석
        self.analyzer.load_data(days=30)
        report = self.analyzer.analyze()
        ranking = report.get("cpa_ranking", [])

        # 2. 대조군 선정 (최고 성과 광고세트)
        control = self._select_control(ranking)
        if not control:
            print("[!] 대조군 선정 불가 — 성과 데이터 부족")
            return self._empty_plan("성과 데이터 부족")

        print(f"\n  대조군: [{control['adset_id']}] {control['name']}")
        print(f"  설정: {control.get('bid_type')} | {control.get('schedule_type')}")

        # 3. 대조군 전체 설정 가져오기
        control_config = self._get_config(control["adset_id"])

        # 4. 실험군 설계
        treatments = self._design_treatments(control_config, max_treatments)

        # 5. 계획 조립
        plan = {
            "created_at": datetime.now().isoformat(),
            "status": "DESIGNED",
            "daily_budget_per_arm": daily_budget,
            "total_daily_budget": daily_budget * (1 + len(treatments)),
            "min_days": 3,
            "control": {
                "adset_id": control["adset_id"],
                "name": control["name"],
                "config": control_config,
            },
            "treatments": treatments,
            "expected_metrics": self._estimate_metrics(control, treatments),
        }

        self._print_plan(plan)
        return plan

    def _select_control(self, ranking: list) -> dict:
        """최고 성과 광고세트를 대조군으로 선정"""
        # CPA가 있고 충분한 데이터가 있는 광고세트
        for r in ranking:
            if r.get("cpa") is not None and r.get("spend", 0) > 10000:
                return r

        # CPA 없으면 CTR 기준
        if ranking:
            best = max(ranking, key=lambda x: x.get("ctr", 0))
            if best.get("ctr", 0) > 0:
                return best

        return ranking[0] if ranking else None

    def _get_config(self, adset_id: str) -> dict:
        """광고세트 설정 조회"""
        try:
            res = supabase.table("ad_set_configs") \
                .select("*") \
                .eq("toss_adset_id", adset_id) \
                .order("collected_at", desc=True) \
                .limit(1) \
                .execute()
            if res.data:
                return res.data[0]
        except:
            pass
        return {}

    def _design_treatments(self, control_config: dict, max_count: int) -> list:
        """대조군 대비 1개 변수만 변경한 실험군 설계"""
        treatments = []

        # 변수 우선순위 순으로 시도
        sorted_vars = sorted(TEST_VARIABLES.items(), key=lambda x: x[1]["priority"])

        for var_key, var_info in sorted_vars:
            if len(treatments) >= max_count:
                break

            current_val = control_config.get(var_key)
            options = var_info["options"]

            # 현재 사용하지 않는 옵션으로 실험
            for opt in options:
                if str(opt) != str(current_val) and len(treatments) < max_count:
                    treatment = {
                        "name": f"실험_{var_info['name']}_{opt}",
                        "variable": var_key,
                        "variable_name": var_info["name"],
                        "control_value": current_val,
                        "treatment_value": opt,
                        "config_diff": {var_key: opt},
                    }
                    treatments.append(treatment)

        return treatments

    def _estimate_metrics(self, control: dict, treatments: list) -> dict:
        """예상 메트릭 계산"""
        days = 3
        daily_budget = DAILY_BUDGET_MIN
        total_arms = 1 + len(treatments)

        return {
            "test_duration_days": days,
            "arms_count": total_arms,
            "daily_cost": daily_budget * total_arms,
            "total_cost": daily_budget * total_arms * days,
            "min_impressions_needed": 1000 * total_arms,
            "min_clicks_needed": 30 * total_arms,
        }

    def _empty_plan(self, reason: str) -> dict:
        return {
            "status": "CANNOT_DESIGN",
            "reason": reason,
            "control": None,
            "treatments": [],
        }

    def _print_plan(self, plan: dict):
        """테스트 계획 출력"""
        print(f"\n{'─'*60}")
        print(f"  🎯 대조군 (Control)")
        print(f"{'─'*60}")
        ctrl = plan["control"]
        cfg = ctrl.get("config", {})
        print(f"  광고세트: [{ctrl['adset_id']}] {ctrl['name'][:40]}")
        print(f"  입찰: {cfg.get('bid_type')} / {cfg.get('bid_strategy')}")
        print(f"  목표비용: ₩{cfg.get('target_cost', 0):,}")
        print(f"  노출시간: {cfg.get('schedule_type')}")

        for i, t in enumerate(plan["treatments"]):
            print(f"\n{'─'*60}")
            print(f"  🧪 실험군 {i+1}: {t['name']}")
            print(f"{'─'*60}")
            print(f"  변경 변수: {t['variable_name']}")
            print(f"  대조군 값: {t['control_value']} → 실험군 값: {t['treatment_value']}")

        metrics = plan["expected_metrics"]
        print(f"\n{'─'*60}")
        print(f"  💰 예산 요약")
        print(f"{'─'*60}")
        print(f"  Arm 수: {metrics['arms_count']}개 (대조군 1 + 실험군 {len(plan['treatments'])})")
        print(f"  일 예산: ₩{metrics['daily_cost']:,} ({metrics['arms_count']}개 × ₩{DAILY_BUDGET_MIN:,})")
        print(f"  테스트 기간: {metrics['test_duration_days']}일")
        print(f"  총 예산: ₩{metrics['total_cost']:,}")

    def save_plan(self, plan: dict):
        """테스트 계획을 DB/파일에 저장"""
        try:
            with open("test_plan.json", "w", encoding="utf-8") as f:
                # config에서 non-serializable 제거
                clean_plan = json.loads(json.dumps(plan, default=str))
                json.dump(clean_plan, f, ensure_ascii=False, indent=2)
            print(f"\n[✓] 테스트 계획 저장: test_plan.json")
        except Exception as e:
            print(f"[!] 저장 에러: {e}")
