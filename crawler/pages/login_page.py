"""
LoginPage — 토스애즈 로그인 처리
- 세션 있으면 자동 로그인
- 세션 없으면 headful 모드로 앱 인증 대기
"""
import time
from .base_page import BasePage

TOSS_ADS_URL = "https://ads-platform.toss.im/advertiser/display-ads"
LOGIN_URL = "https://ads-platform.toss.im"


class LoginPage(BasePage):
    def login(self, browser_manager) -> bool:
        """
        토스애즈 로그인 시도
        1. 저장된 세션으로 접속 시도
        2. 로그인 페이지 감지 시 → 사용자 앱 인증 대기
        """
        print("[→] 토스애즈 접속 중...")
        self.safe_goto(TOSS_ADS_URL)

        # 세션이 유효하면 바로 대시보드
        if not self.is_login_page() and "advertiser" in self.page.url:
            print("[✓] 세션 유효 — 로그인 성공!")
            browser_manager.save_session()
            return True

        # 로그인 필요
        print("=" * 50)
        print("[!] 로그인이 필요합니다.")
        print("[!] 브라우저 창에서 토스 앱 인증을 완료해 주세요.")
        print("[!] (QR 코드 스캔 또는 앱 알림 확인)")
        print("=" * 50)

        # 최대 5분 대기 (앱 인증)
        max_wait = 300  # 초
        elapsed = 0
        check_interval = 3  # 초

        while elapsed < max_wait:
            time.sleep(check_interval)
            elapsed += check_interval

            current_url = self.page.url
            
            # 로그인 성공 감지
            if "advertiser" in current_url and "login" not in current_url.lower():
                print(f"\n[✓] 로그인 성공! ({elapsed}초 소요)")
                browser_manager.save_session()
                return True
            
            # 진행 표시
            remaining = max_wait - elapsed
            print(f"\r[⏳] 앱 인증 대기 중... (남은 시간: {remaining}초)", end="", flush=True)

        print(f"\n[✗] 로그인 타임아웃 ({max_wait}초)")
        self._save_screenshot("login_timeout")
        return False

    def check_session_expired(self) -> bool:
        """세션 만료 확인 (페이지 이동 후 호출)"""
        if self.is_login_page():
            print("[!] 세션 만료 감지")
            return True
        
        # 팝업 확인
        expired_text = self.safe_text("[class*='modal']", timeout=1000)
        if expired_text and ("만료" in expired_text or "로그인" in expired_text):
            print("[!] 세션 만료 팝업 감지")
            return True
        
        return False
