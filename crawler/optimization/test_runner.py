"""
TestRunner — A/B 테스트 자동 실행 프레임워크

전체 테스트 사이클 관리:
1. 분석 → 테스트 계획 설계
2. 실험군 광고세트 자동 생성
3. 3일간 데이터 수집
4. 통계적 판정 → 승자/패자 결정
5. 패자 OFF → 승자 예산 증가
6. 새 테스트 사이클 시작
"""
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from ..core.supabase_client import supabase
from ..analysis.ab_test_designer import ABTestDesigner
from ..analysis.performance_analyzer import PerformanceAnalyzer

PLAN_DIR = Path(__file__).parent.parent.parent / "test_plans"
PLAN_DIR.mkdir(exist_ok=True)


class TestRunner:

    def __init__(self, page=None):
        self.page = page  # Playwright page (None for analysis-only mode)
        self.designer = ABTestDesigner()
        self.analyzer = PerformanceAnalyzer()

    def run_full_cycle(self, auto_create: bool = False):
        """전체 A/B 테스트 사이클 실행"""
        print(f"\n{'='*60}")
        print(f"  🔄 A/B 테스트 사이클 시작")
        print(f"  시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        # Step 1: 기존 테스트 상태 확인
        active_test = self._get_active_test()
        if active_test:
            print(f"\n[→] 진행 중인 테스트 발견: {active_test['name']}")
            return self._evaluate_active_test(active_test)

        # Step 2: 새 테스트 설계
        plan = self.designer.design_test_plan(max_treatments=2)
        if plan.get("status") == "CANNOT_DESIGN":
            print(f"[!] 테스트 설계 불가: {plan.get('reason')}")
            return plan

        # Step 3: 테스트 계획 저장
        test_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        plan["test_id"] = test_id
        plan["status"] = "DESIGNED"
        plan["start_date"] = datetime.now().isoformat()
        plan["end_date"] = (datetime.now() + timedelta(days=plan.get("min_days", 3))).isoformat()

        self._save_test_plan(plan)

        # Step 4: 실험군 생성 (auto_create=True일 때만)
        if auto_create and self.page:
            print("\n[→] 실험군 광고세트 자동 생성 시작...")
            from ..pages.adset_creator import AdSetCreator
            creator = AdSetCreator(self.page)
            results = creator.create_from_test_plan(plan)

            plan["creation_results"] = results
            plan["status"] = "RUNNING"
            self._save_test_plan(plan)

            # DB에 테스트 기록
            self._record_test(plan)
        else:
            print("\n[→] 자동 생성 비활성화. 수동으로 광고세트를 생성하세요.")
            print(f"    테스트 계획: {PLAN_DIR / f'test_{test_id}.json'}")

        return plan

    def evaluate_test(self, test_id: str = None):
        """진행 중인 테스트 평가"""
        if test_id:
            plan = self._load_test_plan(test_id)
        else:
            plan = self._get_active_test()

        if not plan:
            print("[!] 평가할 테스트가 없습니다")
            return None

        print(f"\n{'='*60}")
        print(f"  📊 테스트 평가: {plan.get('test_id')}")
        print(f"{'='*60}")

        # 데이터 수집
        self.analyzer.load_data(days=7)
        report = self.analyzer.analyze()
        ranking = report.get("cpa_ranking", [])

        # 대조군 성과
        control_id = plan.get("control", {}).get("adset_id")
        control_perf = next((r for r in ranking if r["adset_id"] == control_id), None)

        # 실험군 성과
        treatment_perfs = []
        for t in plan.get("treatments", []):
            # 생성 결과에서 ID 가져오기
            created = plan.get("creation_results", [])
            for cr in created:
                if cr.get("success") and cr.get("adset_id"):
                    perf = next((r for r in ranking if r["adset_id"] == cr["adset_id"]), None)
                    if perf:
                        treatment_perfs.append({
                            "treatment": t,
                            "performance": perf,
                        })

        # 판정
        verdict = self._judge(control_perf, treatment_perfs, plan)
        plan["verdict"] = verdict
        plan["status"] = "EVALUATED"
        self._save_test_plan(plan)

        self._print_verdict(verdict)
        return verdict

    def _judge(self, control_perf: dict, treatment_perfs: list, plan: dict) -> dict:
        """통계적 판정"""
        verdict = {
            "judged_at": datetime.now().isoformat(),
            "control": control_perf,
            "treatments": [],
            "winner": None,
            "actions": [],
        }

        if not control_perf:
            verdict["status"] = "INSUFFICIENT_DATA"
            verdict["message"] = "대조군 성과 데이터 부족"
            return verdict

        min_days = plan.get("min_days", 3)
        if control_perf.get("days", 0) < min_days:
            verdict["status"] = "TOO_EARLY"
            verdict["message"] = f"데이터 수집 {control_perf['days']}/{min_days}일 — 판정 불가"
            return verdict

        # 각 실험군 비교
        best_cpa = control_perf.get("cpa") or float('inf')
        winner_id = control_perf.get("adset_id")
        winner_type = "CONTROL"

        for tp in treatment_perfs:
            perf = tp["performance"]
            t_cpa = perf.get("cpa") or float('inf')

            result = {
                "adset_id": perf["adset_id"],
                "name": tp["treatment"]["name"],
                "cpa": t_cpa,
                "vs_control": round(((t_cpa - best_cpa) / best_cpa) * 100, 1) if best_cpa > 0 and best_cpa != float('inf') else None,
            }

            if t_cpa < best_cpa and perf.get("leads", 0) >= 3:  # 최소 3건 전환
                result["verdict"] = "WINNER"
                best_cpa = t_cpa
                winner_id = perf["adset_id"]
                winner_type = "TREATMENT"
            elif t_cpa > best_cpa * 1.3:  # 30% 이상 나쁨
                result["verdict"] = "LOSER"
                verdict["actions"].append({
                    "type": "TURN_OFF",
                    "adset_id": perf["adset_id"],
                    "reason": f"CPA {t_cpa:,.0f}원 > 대조군 {best_cpa:,.0f}원 (30%+ 초과)"
                })
            else:
                result["verdict"] = "INCONCLUSIVE"

            verdict["treatments"].append(result)

        verdict["winner"] = {
            "adset_id": winner_id,
            "type": winner_type,
            "cpa": best_cpa if best_cpa != float('inf') else None,
        }
        verdict["status"] = "JUDGED"
        verdict["message"] = f"승자: {'대조군' if winner_type == 'CONTROL' else '실험군'} (CPA: ₩{best_cpa:,.0f})" if best_cpa != float('inf') else "데이터 부족"

        return verdict

    def apply_verdict(self, verdict: dict):
        """판정 결과 자동 적용 (패자 OFF)"""
        if not self.page:
            print("[!] 브라우저 연결 필요 (--apply 모드)")
            return

        from ..pages.adset_modifier import AdSetModifier
        modifier = AdSetModifier(self.page)

        for action in verdict.get("actions", []):
            if action["type"] == "TURN_OFF":
                print(f"\n[→] OFF: {action['adset_id']} - {action['reason']}")
                modifier.modify_adset(action["adset_id"], {"toggle": "OFF"})

    def _get_active_test(self) -> dict:
        """진행 중인 테스트 찾기"""
        plans = list(PLAN_DIR.glob("test_*.json"))
        for p in sorted(plans, reverse=True):
            with open(p, "r", encoding="utf-8") as f:
                plan = json.load(f)
            if plan.get("status") in ("RUNNING", "DESIGNED"):
                return plan
        return None

    def _save_test_plan(self, plan: dict):
        """테스트 계획 저장"""
        test_id = plan.get("test_id", datetime.now().strftime("%Y%m%d_%H%M%S"))
        path = PLAN_DIR / f"test_{test_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(plan, f, ensure_ascii=False, indent=2, default=str)
        print(f"[✓] 테스트 계획 저장: {path}")

    def _load_test_plan(self, test_id: str) -> dict:
        """저장된 테스트 계획 로드"""
        path = PLAN_DIR / f"test_{test_id}.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def _evaluate_active_test(self, plan: dict) -> dict:
        """진행 중인 테스트 자동 평가"""
        end_date = plan.get("end_date")
        if end_date:
            end = datetime.fromisoformat(end_date)
            if datetime.now() < end:
                remaining = (end - datetime.now()).days
                print(f"[→] 테스트 진행 중, {remaining}일 남음")
                return {"status": "RUNNING", "remaining_days": remaining}

        return self.evaluate_test(plan.get("test_id"))

    def _record_test(self, plan: dict):
        """DB에 테스트 기록"""
        try:
            supabase.table("automation_rules").insert({
                "name": f"AB_TEST_{plan['test_id']}",
                "condition_json": json.dumps(plan.get("treatments", []), default=str),
                "action_type": "AB_TEST",
                "is_active": True,
            }).execute()
        except Exception as e:
            print(f"[!] 테스트 기록 에러: {e}")

    def _print_verdict(self, verdict: dict):
        """판정 결과 출력"""
        print(f"\n{'─'*60}")
        print(f"  🏆 판정 결과: {verdict.get('message', '알 수 없음')}")
        print(f"{'─'*60}")

        if verdict.get("control"):
            c = verdict["control"]
            cpa = f"₩{c['cpa']:,}" if c.get("cpa") else "-"
            print(f"  대조군: [{c['adset_id']}] CPA:{cpa} CTR:{c.get('ctr', 0)}%")

        for t in verdict.get("treatments", []):
            cpa = f"₩{t['cpa']:,}" if t.get("cpa") and t["cpa"] != float('inf') else "-"
            icon = {"WINNER": "🏆", "LOSER": "❌", "INCONCLUSIVE": "⚪"}.get(t.get("verdict"), "?")
            print(f"  {icon} 실험군: [{t['adset_id']}] {t['name'][:30]} CPA:{cpa} ({t.get('vs_control', '?')}%)")

        if verdict.get("actions"):
            print(f"\n  자동 조치:")
            for a in verdict["actions"]:
                print(f"    → {a['type']}: {a['adset_id']} - {a['reason']}")
