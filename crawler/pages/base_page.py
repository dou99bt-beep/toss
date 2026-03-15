"""
BasePage — 모든 페이지 오브젝트의 베이스 클래스
"""
import time
import random
from datetime import datetime
from pathlib import Path
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout

SCREENSHOT_DIR = Path(__file__).parent.parent / "screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)


class BasePage:
    def __init__(self, page: Page):
        self.page = page

    def safe_goto(self, url: str, wait_until: str = "networkidle", timeout: int = 30000):
        """안전한 페이지 이동"""
        try:
            self.page.goto(url, wait_until=wait_until, timeout=timeout)
            self._human_delay()
            return True
        except PlaywrightTimeout:
            print(f"[!] 페이지 로딩 타임아웃: {url}")
            self._save_screenshot("timeout")
            return False

    def safe_click(self, selector: str, timeout: int = 5000):
        """안전한 클릭 (존재 확인 후)"""
        try:
            self.page.wait_for_selector(selector, state="visible", timeout=timeout)
            self.page.click(selector)
            self._human_delay()
            return True
        except PlaywrightTimeout:
            print(f"[!] 요소 찾기 실패: {selector}")
            return False

    def safe_text(self, selector: str, timeout: int = 3000) -> str | None:
        """안전하게 텍스트 가져오기"""
        try:
            el = self.page.wait_for_selector(selector, timeout=timeout)
            return el.inner_text() if el else None
        except PlaywrightTimeout:
            return None

    def wait_for_api(self, url_pattern: str, timeout: int = 15000):
        """API 응답 인터셉트"""
        try:
            with self.page.expect_response(
                lambda r: url_pattern in r.url and r.status == 200,
                timeout=timeout
            ) as response_info:
                pass
            return response_info.value.json()
        except Exception as e:
            print(f"[!] API 인터셉트 실패: {url_pattern} — {e}")
            return None

    def is_login_page(self) -> bool:
        """현재 페이지가 로그인 페이지인지 확인"""
        url = self.page.url
        return "login" in url.lower() or "auth" in url.lower()

    def _human_delay(self, min_ms: int = 800, max_ms: int = 2000):
        """사람처럼 랜덤 딜레이"""
        time.sleep(random.randint(min_ms, max_ms) / 1000)

    def _save_screenshot(self, prefix: str = "page"):
        """스크린샷 저장"""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = SCREENSHOT_DIR / f"{prefix}_{ts}.png"
        self.page.screenshot(path=str(path))
        print(f"[📸] 스크린샷 저장: {path}")
        return str(path)
