"""
AdSetCreator — 새 광고세트 생성 자동화

Playwright로 토스애즈에서 새 광고세트를 자동 생성:
1. 캠페인 상세 → "세트 추가" 클릭
2. 사이드바에서 새 광고세트 선택
3. 설정 입력 (이름, 예산, 입찰, 노출시간, 타겟)
4. 저장

config dict 예시:
{
    "name": "테스트_0316_광고세트(리스트)_자동입찰_전환최대화",
    "ad_format": "리스트",
    "daily_budget": 50000,
    "bid_type": "자동 입찰",
    "bid_strategy": "전환 최대",
    "target_cost": 13000,
    "schedule_type": "항상 노출",
    "target_gender": "전체",
}
"""
import re
import time
import json
from datetime import datetime
from .base_page import BasePage
from ..core.supabase_client import supabase

ADS_URL = "https://ads-platform.toss.im"
CAMPAIGN_ID = "336305"


class AdSetCreator(BasePage):

    def create_adset(self, config: dict) -> dict:
        """새 광고세트 생성

        Args:
            config: 광고세트 설정
                - name: 광고세트명
                - ad_format: "리스트" (기본)
                - daily_budget: 일 예산 (원, 최소 50000)
                - bid_type: "자동 입찰" | "직접 입찰"
                - bid_strategy: "전환 최대" | null
                - target_cost: 목표 비용 (원)
                - schedule_type: "항상 노출" | "요일별 설정"
                - target_gender: "전체" | "남성" | "여성"

        Returns:
            {"success": bool, "adset_id": str|None, "error": str|None}
        """
        ts = datetime.now().strftime("%m%d_%H%M")
        name = config.get("name", f"테스트_{ts}_광고세트(리스트)")

        print(f"\n{'='*60}")
        print(f"[CREATE] 새 광고세트 생성: {name}")
        print(f"{'='*60}")

        # Step 1: 캠페인 상세 페이지 이동
        url = f"{ADS_URL}/display-ads/v2/contract/{CAMPAIGN_ID}"
        self.safe_goto(url)
        time.sleep(5)

        body = self.page.inner_text("body")
        if "내 광고계정" in body or "비즈니스 그룹" in body:
            try:
                self.page.get_by_text("0105명률DB").first.click()
                time.sleep(8)
                self.safe_goto(url)
                time.sleep(5)
            except:
                pass

        # Step 2: "세트 추가" 클릭
        print("[→] 세트 추가 클릭...")
        added = self._click_add_set()
        if not added:
            return {"success": False, "error": "세트 추가 버튼 클릭 실패"}

        time.sleep(5)
        self._save_screenshot("after_add_set")

        # Step 3: 광고 유형 선택 (리스트)
        ad_format = config.get("ad_format", "리스트")
        self._select_ad_format(ad_format)
        time.sleep(3)

        # Step 4: 광고세트명 입력
        self._set_name(name)
        time.sleep(1)

        # Step 5: 일 예산
        budget = config.get("daily_budget", 50000)
        self._set_budget(budget)
        time.sleep(1)

        # Step 6: 입찰 설정
        bid_type = config.get("bid_type", "자동 입찰")
        self._set_bid_type(bid_type)
        time.sleep(1)

        bid_strategy = config.get("bid_strategy", "전환 최대")
        if bid_strategy:
            self._set_bid_strategy(bid_strategy)
            time.sleep(1)

        target_cost = config.get("target_cost")
        if target_cost:
            self._set_target_cost(target_cost)
            time.sleep(1)

        # Step 7: 노출 기간 (캠페인과 동일)
        self._set_period("캠페인과 동일")
        time.sleep(1)

        # Step 8: 노출 시간
        schedule = config.get("schedule_type", "항상 노출")
        self._set_schedule(schedule)
        time.sleep(1)

        # Step 9: 스크롤 다운 → 타겟
        self.page.evaluate("window.scrollTo(0, 3000)")
        time.sleep(2)

        # Step 10: 저장
        self._save_screenshot("before_save")
        result = self._save_adset(name)

        return result

    def _click_add_set(self) -> bool:
        """세트 추가 버튼 클릭"""
        # 방법 1: 텍스트로 찾기
        try:
            btn = self.page.get_by_text("세트 추가", exact=True).first
            if btn.is_visible():
                btn.click()
                print("  [✓] '세트 추가' 클릭")
                return True
        except:
            pass

        # 방법 2: + 버튼 (사이드바)
        try:
            plus_btns = self.page.query_selector_all("button")
            for btn in plus_btns:
                text = btn.inner_text().strip()
                if text in ("+", "세트 추가", "추가"):
                    btn.click()
                    print(f"  [✓] '{text}' 버튼 클릭")
                    return True
        except:
            pass

        print("  [!] 세트 추가 버튼 찾기 실패")
        return False

    def _select_ad_format(self, fmt: str):
        """광고 유형 선택"""
        try:
            label = self.page.get_by_text(fmt, exact=False).first
            label.click()
            print(f"  [✓] 광고 유형 → {fmt}")
        except:
            print(f"  [→] 광고 유형 '{fmt}' 선택 건너뜀 (기본값 사용)")

    def _set_name(self, name: str):
        """광고세트명 입력"""
        # 이름 input 필드 탐색
        inputs = self.page.query_selector_all("input[type='text']")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            attr_name = (inp.get_attribute("name") or "").lower()
            value = inp.get_attribute("value") or ""

            if "이름" in placeholder or "name" in attr_name or "광고세트" in placeholder:
                inp.click()
                inp.fill("")
                inp.type(name, delay=30)
                print(f"  [✓] 광고세트명 → {name[:30]}...")
                return

        # 첫 번째 빈 input에 입력
        for inp in inputs:
            value = inp.get_attribute("value") or ""
            if not value:
                inp.click()
                inp.type(name, delay=30)
                print(f"  [✓] 광고세트명 → {name[:30]}... (첫번째 빈 input)")
                return

        print("  [!] 이름 input 찾기 실패")

    def _set_budget(self, budget: int):
        """일 예산 입력"""
        inputs = self.page.query_selector_all("input[type='text'], input[type='number']")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            attr_name = (inp.get_attribute("name") or "").lower()

            if "예산" in placeholder or "budget" in attr_name:
                inp.click()
                time.sleep(0.3)
                inp.fill("")
                inp.type(str(budget), delay=50)
                print(f"  [✓] 일 예산 → ₩{budget:,}")
                return

        print("  [!] 예산 input 찾기 실패")

    def _set_bid_type(self, bid_type: str):
        """입찰 방식 선택"""
        try:
            label = self.page.get_by_text(bid_type, exact=False).first
            label.click()
            print(f"  [✓] 입찰 방식 → {bid_type}")
        except:
            print(f"  [!] 입찰 방식 '{bid_type}' 찾기 실패")

    def _set_bid_strategy(self, strategy: str):
        """입찰 전략 선택 (전환 최대 등)"""
        try:
            # "전환 최대화" 또는 "전환 최대" 찾기
            candidates = [strategy, strategy + "화", "전환수 최대화", "전환 최대화"]
            for text in candidates:
                try:
                    label = self.page.get_by_text(text, exact=False).first
                    if label.is_visible():
                        label.click()
                        print(f"  [✓] 입찰 전략 → {text}")
                        return
                except:
                    continue
        except:
            pass
        print(f"  [→] 입찰 전략 '{strategy}' 선택 건너뜀")

    def _set_target_cost(self, cost: int):
        """목표 비용 입력"""
        inputs = self.page.query_selector_all("input[type='text'], input[type='number']")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "")
            attr_name = (inp.get_attribute("name") or "").lower()

            if "목표" in placeholder or "비용" in placeholder or "cost" in attr_name:
                inp.click()
                time.sleep(0.3)
                inp.fill("")
                inp.type(str(cost), delay=50)
                print(f"  [✓] 목표 비용 → ₩{cost:,}")
                return

        print("  [!] 목표 비용 input 찾기 실패")

    def _set_period(self, period_type: str):
        """노출 기간 설정"""
        try:
            label = self.page.get_by_text(period_type, exact=False).first
            label.click()
            print(f"  [✓] 노출 기간 → {period_type}")
        except:
            print(f"  [→] 노출 기간 '{period_type}' 건너뜀 (기본값 사용)")

    def _set_schedule(self, schedule_type: str):
        """노출 시간 설정"""
        try:
            label = self.page.get_by_text(schedule_type, exact=False).first
            label.click()
            print(f"  [✓] 노출 시간 → {schedule_type}")
        except:
            print(f"  [→] 노출 시간 '{schedule_type}' 건너뜀 (기본값)")

    def _save_adset(self, name: str) -> dict:
        """저장 버튼 클릭 + 결과 확인"""
        save_selectors = [
            "button:has-text('저장')",
            "button:has-text('수정')",
            "button:has-text('확인')",
            "[type='submit']",
        ]

        for selector in save_selectors:
            try:
                btn = self.page.query_selector(selector)
                if btn and btn.is_visible():
                    btn.click()
                    time.sleep(5)
                    self._save_screenshot("after_save")

                    body = self.page.inner_text("body")
                    if "에러" in body or "오류" in body:
                        error_msg = self._extract_error(body)
                        print(f"  [!] 저장 에러: {error_msg}")
                        return {"success": False, "error": error_msg}

                    # URL에서 새 adset ID 추출 시도
                    url = self.page.url
                    m = re.search(r'/set/(\d+)', url)
                    new_id = m.group(1) if m else None

                    print(f"  [✓] 광고세트 생성 완료! ID: {new_id}")
                    return {"success": True, "adset_id": new_id, "name": name}
            except:
                continue

        print("  [!] 저장 버튼 찾기 실패")
        return {"success": False, "error": "저장 버튼 없음"}

    def _extract_error(self, body: str) -> str:
        """에러 메시지 추출"""
        for line in body.split("\n"):
            if "에러" in line or "오류" in line or "실패" in line or "최소" in line:
                return line.strip()[:100]
        return "알 수 없는 에러"

    def create_from_test_plan(self, plan: dict) -> list:
        """A/B 테스트 계획에서 실험군 광고세트 자동 생성"""
        results = []
        budget = plan.get("daily_budget_per_arm", 50000)

        control_config = plan.get("control", {}).get("config", {})

        for i, treatment in enumerate(plan.get("treatments", [])):
            # 대조군 설정 복사 + 변경 적용
            config = {
                "name": treatment["name"],
                "ad_format": control_config.get("ad_format", "리스트"),
                "daily_budget": budget,
                "bid_type": control_config.get("bid_type", "자동 입찰"),
                "bid_strategy": control_config.get("bid_strategy"),
                "target_cost": control_config.get("target_cost", 0),
                "schedule_type": control_config.get("schedule_type", "항상 노출"),
                "target_gender": control_config.get("target_gender", "전체"),
            }

            # 실험군 변경 사항 적용
            for key, val in treatment.get("config_diff", {}).items():
                config[key] = val

            print(f"\n{'─'*40}")
            print(f"  실험군 {i+1}: {treatment['name']}")
            print(f"  변경: {treatment['variable_name']} = {treatment['treatment_value']}")
            print(f"{'─'*40}")

            result = self.create_adset(config)
            results.append(result)
            time.sleep(3)

        return results
