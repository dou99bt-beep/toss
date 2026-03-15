"""
LoginPage — 토스애즈 로그인 처리
- Step 1: 이메일/비밀번호 입력 → 로그인 클릭
- Step 2: 2FA 앱 인증 대기 (필요시)
- Step 3: 세션 저장
"""
import os
import time
from dotenv import load_dotenv
from .base_page import BasePage

load_dotenv()

TOSS_ADS_URL = "https://ads-platform.toss.im/advertiser/display-ads"
LOGIN_URL = "https://ads-platform.toss.im"

# 환경변수에서 로그인 정보 읽기
TOSS_EMAIL = os.getenv("TOSS_ADS_EMAIL", "")
TOSS_PASSWORD = os.getenv("TOSS_ADS_PASSWORD", "")


class LoginPage(BasePage):
    def login(self, browser_manager) -> bool:
        """
        토스애즈 로그인
        1. 저장된 세션으로 접속 시도
        2. 로그인 폼 감지 → 이메일/비밀번호 자동 입력
        3. 2FA(앱 인증) 필요시 대기
        """
        print("[→] 토스애즈 접속 중...")
        self.safe_goto(TOSS_ADS_URL, timeout=15000)

        # 세션이 유효하면 바로 OK
        if self._is_logged_in():
            print("[✓] 세션 유효 — 로그인 성공!")
            browser_manager.save_session()
            return True

        # 로그인 폼이 보이는지 확인
        print("[→] 로그인 페이지 감지. 로그인 시작...")
        
        # Step 1: 이메일/비밀번호 입력
        if not self._fill_credentials():
            print("[!] 자격증명 입력 실패. 브라우저에서 수동으로 로그인해 주세요.")
            return self._wait_for_manual_login(browser_manager)

        # Step 2: 로그인 버튼 클릭
        self._click_login_button()

        # Step 3: 결과 확인 (즉시 로그인 or 2FA 대기)
        time.sleep(3)
        
        if self._is_logged_in():
            print("[✓] 로그인 성공! (비밀번호 인증)")
            browser_manager.save_session()
            return True

        # 2FA 앱 인증 대기
        print("=" * 50)
        print("[!] 토스 앱 인증이 필요합니다.")
        print("[!] 토스 앱에서 알림을 확인하고 인증해 주세요.")
        print("=" * 50)

        return self._wait_for_2fa(browser_manager)

    def _fill_credentials(self) -> bool:
        """이메일/비밀번호 자동 입력"""
        try:
            # 이메일 필드 찾기
            email_selectors = [
                "input[type='email']",
                "input[type='text']",
                "input[name='email']",
                "input[placeholder*='이메일']",
                "input[placeholder*='아이디']",
            ]
            
            email_input = None
            for selector in email_selectors:
                try:
                    email_input = self.page.wait_for_selector(selector, timeout=3000)
                    if email_input:
                        break
                except:
                    continue
            
            if not email_input:
                print("[!] 이메일 입력 필드를 찾을 수 없습니다.")
                return False

            # 비밀번호 필드 찾기
            pw_selectors = [
                "input[type='password']",
                "input[name='password']",
                "input[placeholder*='비밀번호']",
            ]
            
            pw_input = None
            for selector in pw_selectors:
                try:
                    pw_input = self.page.wait_for_selector(selector, timeout=3000)
                    if pw_input:
                        break
                except:
                    continue

            if not pw_input:
                print("[!] 비밀번호 입력 필드를 찾을 수 없습니다.")
                return False

            # 값 입력
            if TOSS_EMAIL:
                email_input.click()
                email_input.fill("")
                time.sleep(0.3)
                email_input.fill(TOSS_EMAIL)
                print(f"[✓] 이메일 입력: {TOSS_EMAIL[:3]}***")
            else:
                # 이메일이 이미 입력되어 있을 수 있음
                existing = email_input.input_value()
                if existing:
                    print(f"[✓] 기존 이메일 사용: {existing[:3]}***")
                else:
                    print("[!] TOSS_ADS_EMAIL 환경변수가 설정되지 않았습니다.")
                    print("[!] .env 파일에 TOSS_ADS_EMAIL=이메일 추가해 주세요.")
                    return False

            if TOSS_PASSWORD:
                pw_input.click()
                pw_input.fill("")
                time.sleep(0.3)
                pw_input.fill(TOSS_PASSWORD)
                print("[✓] 비밀번호 입력 완료")
            else:
                print("[!] TOSS_ADS_PASSWORD 환경변수가 설정되지 않았습니다.")
                print("[!] .env 파일에 TOSS_ADS_PASSWORD=비밀번호 추가해 주세요.")
                print("[!] 브라우저에서 직접 비밀번호를 입력해 주세요.")
                return False

            return True

        except Exception as e:
            print(f"[!] 자격증명 입력 에러: {e}")
            return False

    def _click_login_button(self):
        """로그인 버튼 클릭"""
        login_selectors = [
            "button:has-text('로그인')",
            "button[type='submit']",
            "input[type='submit']",
            "button:has-text('Login')",
        ]
        
        for selector in login_selectors:
            if self.safe_click(selector, timeout=3000):
                print("[✓] 로그인 버튼 클릭")
                return True
        
        # Enter 키로 대체
        self.page.keyboard.press("Enter")
        print("[✓] Enter 키 입력")
        return True

    def _is_logged_in(self) -> bool:
        """현재 로그인 상태인지 확인"""
        url = self.page.url
        # 광고 관리 페이지에 있으면 로그인 됨
        if "advertiser" in url and "login" not in url.lower():
            return True
        # 대시보드나 display-ads 페이지
        if "display-ads" in url:
            return True
        # 내 광고계정 페이지 (계정 선택 화면)
        try:
            body_text = self.page.inner_text("body")
            if "내 광고계정" in body_text or "비즈니스 그룹" in body_text:
                return True
        except:
            pass
        return False

    def _wait_for_2fa(self, browser_manager, max_wait: int = 300) -> bool:
        """2FA 앱 인증 대기 (최대 5분)"""
        elapsed = 0
        check_interval = 3

        while elapsed < max_wait:
            time.sleep(check_interval)
            elapsed += check_interval

            if self._is_logged_in():
                print(f"\n[✓] 2FA 인증 완료! ({elapsed}초)")
                browser_manager.save_session()
                return True

            remaining = max_wait - elapsed
            print(f"\r[⏳] 앱 인증 대기 중... (남은 시간: {remaining}초)", end="", flush=True)

        print(f"\n[✗] 2FA 타임아웃 ({max_wait}초)")
        self._save_screenshot("2fa_timeout")
        return False

    def _wait_for_manual_login(self, browser_manager, max_wait: int = 300) -> bool:
        """수동 로그인 대기"""
        print("=" * 50)
        print("[!] 브라우저 창에서 직접 로그인해 주세요.")
        print(f"[!] 최대 {max_wait // 60}분 대기합니다.")
        print("=" * 50)

        elapsed = 0
        check_interval = 3

        while elapsed < max_wait:
            time.sleep(check_interval)
            elapsed += check_interval

            if self._is_logged_in():
                print(f"\n[✓] 수동 로그인 감지! ({elapsed}초)")
                browser_manager.save_session()
                return True

            remaining = max_wait - elapsed
            print(f"\r[⏳] 로그인 대기 중... (남은 시간: {remaining}초)", end="", flush=True)

        print(f"\n[✗] 로그인 타임아웃 ({max_wait}초)")
        self._save_screenshot("login_timeout")
        return False

    def check_session_expired(self) -> bool:
        """세션 만료 확인"""
        if not self._is_logged_in():
            # 로그인 페이지로 리다이렉트됨
            if "login" in self.page.url.lower() or self.page.url == LOGIN_URL:
                print("[!] 세션 만료 감지")
                return True
        return False
