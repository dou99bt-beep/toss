"""
브라우저 매니저 — Playwright 세션 관리
- 최초: headful 모드로 사용자 앱 인증 대기
- 이후: state.json 로드하여 자동 접속
"""
import os
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page

STATE_PATH = Path(__file__).parent.parent / "state.json"

class BrowserManager:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.playwright = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None

    def start(self) -> Page:
        """브라우저 시작 + 세션 로드"""
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"]
        )

        # 세션 파일이 있으면 로드
        if STATE_PATH.exists():
            try:
                self.context = self.browser.new_context(
                    storage_state=str(STATE_PATH),
                    viewport={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                print("[✓] 저장된 세션 로드 완료")
            except Exception as e:
                print(f"[!] 세션 로드 실패: {e}. 새 세션 생성.")
                self.context = self._new_context()
        else:
            print("[!] 세션 파일 없음. 새 세션 생성 (로그인 필요)")
            self.context = self._new_context()

        self.page = self.context.new_page()
        return self.page

    def _new_context(self) -> BrowserContext:
        return self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )

    def save_session(self):
        """현재 세션을 state.json에 저장"""
        if self.context:
            self.context.storage_state(path=str(STATE_PATH))
            print(f"[✓] 세션 저장 완료: {STATE_PATH}")

    def close(self):
        """브라우저 종료 (이중 close 방지)"""
        if self.context:
            try:
                self.context.close()
            except:
                pass
            self.context = None
        if self.browser:
            try:
                self.browser.close()
            except:
                pass
            self.browser = None
        if self.playwright:
            try:
                self.playwright.stop()
            except:
                pass
            self.playwright = None
        print("[✓] 브라우저 종료")

    def is_session_valid(self) -> bool:
        """세션 파일이 존재하고 비어있지 않은지 확인"""
        return STATE_PATH.exists() and STATE_PATH.stat().st_size > 100
