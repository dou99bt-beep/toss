"""
AdSetModifier — 기존 광고세트 설정 변경 자동화

Playwright로 토스애즈 광고세트 상세 페이지에서:
- 입찰 방식 변경 (자동/직접)
- 목표 비용 변경
- 노출 시간 변경 (항상/요일별)
- ON/OFF 토글
을 자동으로 수행.
"""
import re
import time
import json
from datetime import datetime
from .base_page import BasePage
from ..core.supabase_client import supabase

ADS_URL = "https://ads-platform.toss.im"
CAMPAIGN_ID = "336305"


class AdSetModifier(BasePage):

    def modify_adset(self, adset_id: str, changes: dict) -> bool:
        """광고세트 설정 변경

        Args:
            adset_id: 토스애즈 광고세트 ID
            changes: 변경할 설정 딕셔너리
                - bid_type: "자동 입찰" | "직접 입찰"
                - target_cost: 목표 비용 (원)
                - schedule_type: "항상 노출" | "요일별 설정"
                - daily_budget: 일 예산 (원)
                - toggle: "ON" | "OFF"

        Returns:
            True if successful
        """
        print(f"\n{'='*50}")
        print(f"[MODIFY] 광고세트 {adset_id} 설정 변경")
        print(f"  변경: {json.dumps(changes, ensure_ascii=False)}")
        print(f"{'='*50}")

        # 1. 광고세트 상세 페이지 이동
        url = f"{ADS_URL}/display-ads/v2/contract/{CAMPAIGN_ID}/set/{adset_id}"
        self.safe_goto(url)
        time.sleep(5)

        # 페이지 로드 확인
        body = self.page.inner_text("body")
        if "광고세트" not in body and "입찰" not in body:
            print("[!] 광고세트 상세 페이지 로드 실패")
            self._save_screenshot("modify_fail")
            return False

        modified = False

        # 2. ON/OFF 토글
        if "toggle" in changes:
            modified = self._toggle_adset(changes["toggle"]) or modified

        # 3. 입찰 방식 변경
        if "bid_type" in changes:
            modified = self._change_bid_type(changes["bid_type"]) or modified

        # 4. 목표 비용 변경
        if "target_cost" in changes:
            modified = self._change_target_cost(changes["target_cost"]) or modified

        # 5. 일 예산 변경
        if "daily_budget" in changes:
            modified = self._change_daily_budget(changes["daily_budget"]) or modified

        # 6. 노출 시간 변경
        if "schedule_type" in changes:
            modified = self._change_schedule(changes["schedule_type"]) or modified

        # 7. 저장
        if modified:
            return self._save_changes(adset_id)

        print("[→] 변경 사항 없음")
        return True

    def toggle_adsets(self, adset_ids: list, action: str = "OFF"):
        """여러 광고세트 일괄 ON/OFF"""
        print(f"\n[TOGGLE] {len(adset_ids)}개 광고세트 → {action}")
        results = {}
        for aid in adset_ids:
            ok = self.modify_adset(aid, {"toggle": action})
            results[aid] = ok
            time.sleep(2)
        return results

    def _toggle_adset(self, action: str) -> bool:
        """광고세트 ON/OFF 토글"""
        body = self.page.inner_text("body")

        # 현재 상태 확인
        is_on = "운영 중" in body or "노출 중" in body
        want_on = action.upper() == "ON"

        if is_on == want_on:
            print(f"  [→] 이미 {action} 상태")
            return False

        # 토글 버튼 찾기 (스위치/체크박스)
        toggle = self.page.query_selector(
            "input[type='checkbox'], [role='switch'], button[class*='toggle'], "
            "button[class*='switch'], [class*='Toggle'], [class*='Switch']"
        )
        if toggle:
            toggle.click()
            time.sleep(2)
            print(f"  [✓] {action} 토글 완료")
            return True

        print(f"  [!] 토글 버튼을 찾지 못함")
        return False

    def _change_bid_type(self, bid_type: str) -> bool:
        """입찰 방식 변경"""
        body = self.page.inner_text("body")

        # 현재 입찰 방식 확인
        if bid_type in body:
            print(f"  [→] 이미 {bid_type} 설정됨")
            return False

        # 라디오 버튼 또는 셀렉터 찾기
        # "자동 입찰" / "직접 입찰" 라벨 클릭
        try:
            label = self.page.get_by_text(bid_type, exact=False).first
            label.click()
            time.sleep(2)
            print(f"  [✓] 입찰 방식 → {bid_type}")
            return True
        except:
            print(f"  [!] 입찰 방식 라벨 '{bid_type}' 찾기 실패")
            return False

    def _change_target_cost(self, cost: int) -> bool:
        """목표 비용 변경"""
        # "목표 비용" 레이블 근처 입력 필드
        inputs = self.page.query_selector_all("input[type='text'], input[type='number']")

        for inp in inputs:
            placeholder = inp.get_attribute("placeholder") or ""
            name = inp.get_attribute("name") or ""
            value = inp.get_attribute("value") or ""

            # 목표 비용 관련 input 찾기
            if "목표" in placeholder or "비용" in placeholder or "cost" in name.lower():
                inp.click()
                time.sleep(0.3)
                inp.fill("")
                time.sleep(0.3)
                inp.type(str(cost), delay=50)
                time.sleep(1)
                print(f"  [✓] 목표 비용 → ₩{cost:,}")
                return True

        # body 텍스트에서 "목표 비용" 위치 기반 탐색
        body = self.page.inner_text("body")
        if "목표 비용" in body:
            # 텍스트 근처 input을 찾는 방식
            section = self.page.query_selector("text=목표 비용")
            if section:
                parent = section.evaluate_handle("el => el.closest('div')")
                inp = parent.as_element().query_selector("input")
                if inp:
                    inp.click()
                    inp.fill(str(cost))
                    time.sleep(1)
                    print(f"  [✓] 목표 비용 → ₩{cost:,}")
                    return True

        print("  [!] 목표 비용 input 찾기 실패")
        return False

    def _change_daily_budget(self, budget: int) -> bool:
        """일 예산 변경 (광고세트 레벨)"""
        inputs = self.page.query_selector_all("input[type='text'], input[type='number']")

        for inp in inputs:
            placeholder = inp.get_attribute("placeholder") or ""
            name = inp.get_attribute("name") or ""

            if "예산" in placeholder or "budget" in name.lower():
                inp.click()
                time.sleep(0.3)
                inp.fill("")
                time.sleep(0.3)
                inp.type(str(budget), delay=50)
                time.sleep(1)
                print(f"  [✓] 일 예산 → ₩{budget:,}")
                return True

        print("  [!] 일 예산 input 찾기 실패")
        return False

    def _change_schedule(self, schedule_type: str) -> bool:
        """노출 시간 변경"""
        body = self.page.inner_text("body")

        if schedule_type in body:
            # 이미 해당 옵션과 매치되는지 확인 (라디오 선택 상태)
            pass

        try:
            label = self.page.get_by_text(schedule_type, exact=False).first
            label.click()
            time.sleep(2)
            print(f"  [✓] 노출 시간 → {schedule_type}")
            return True
        except:
            print(f"  [!] 노출 시간 '{schedule_type}' 라벨 찾기 실패")
            return False

    def _save_changes(self, adset_id: str) -> bool:
        """저장 버튼 클릭"""
        self._save_screenshot("before_save")

        # 저장 버튼 찾기
        save_candidates = [
            "button:has-text('저장')",
            "button:has-text('수정')",
            "button:has-text('확인')",
            "[type='submit']",
        ]

        for selector in save_candidates:
            try:
                btn = self.page.query_selector(selector)
                if btn and btn.is_visible():
                    btn.click()
                    time.sleep(3)
                    self._save_screenshot("after_save")

                    # 에러 메시지 확인
                    body = self.page.inner_text("body")
                    if "에러" in body or "오류" in body or "실패" in body:
                        print(f"  [!] 저장 에러 감지")
                        return False

                    print(f"  [✓] 저장 완료")
                    self._log_modification(adset_id, "SAVED")
                    return True
            except:
                continue

        print("  [!] 저장 버튼 찾기 실패")
        return False

    def _log_modification(self, adset_id: str, status: str):
        """변경 로그 저장"""
        try:
            supabase.table("action_logs").insert({
                "recommended_action_id": None,
                "executor": "AUTO_MODIFIER",
                "status": status,
                "error_message": f"adset:{adset_id}"
            }).execute()
        except:
            pass  # 로깅 실패는 무시
