"""
토스애즈 크롤러 — 메인 실행 스크립트

사용법:
  python -m crawler.main                  # 1회 수집 (캠페인 + 오늘 성과)
  python -m crawler.main --login          # 로그인만 (세션 저장)
  python -m crawler.main --sync           # 캠페인 구조 동기화만
  python -m crawler.main --report         # 오늘 성과 수집만
  python -m crawler.main --report-days 7  # 최근 7일 성과 수집
  python -m crawler.main --loop           # 1시간 주기 반복 수집
"""
import argparse
import time
import traceback
from datetime import datetime

from .core.browser import BrowserManager
from .core.supabase_client import insert_crawler_log
from .pages.login_page import LoginPage
from .pages.campaign_page import CampaignPage
from .pages.report_page import ReportPage


def run_once(browser_manager: BrowserManager, args):
    """1회 수집 실행"""
    page = browser_manager.start()
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    try:
        # 1. 로그인
        login_page = LoginPage(page)
        if not login_page.login(browser_manager):
            insert_crawler_log({
                "session_id": session_id,
                "status": "FAILED",
                "error_trace": "로그인 실패 — 앱 인증 타임아웃"
            })
            return False

        # 2. 캠페인 동기화
        if args.login_only:
            print("[✓] 로그인 완료 (세션 저장됨). 종료합니다.")
            return True

        if not args.report_only:
            campaign_page = CampaignPage(page)
            campaign_page.sync_all()

        # 3. 성과 수집
        if not args.sync_only:
            report_page = ReportPage(page)
            if args.report_days > 1:
                report_page.collect_multi_day(args.report_days)
            else:
                report_page.collect_performance()

        # 성공 로그
        insert_crawler_log({
            "session_id": session_id,
            "status": "SUCCESS",
            "screenshot_url": None,
            "error_trace": None
        })

        browser_manager.save_session()
        print(f"\n{'='*50}")
        print(f"[✓] 수집 완료! (세션 ID: {session_id})")
        print(f"{'='*50}")
        return True

    except Exception as e:
        print(f"\n[✗] 에러 발생: {e}")
        traceback.print_exc()
        
        insert_crawler_log({
            "session_id": session_id,
            "status": "FAILED",
            "error_trace": traceback.format_exc()[:500]
        })
        return False

    finally:
        if not args.keep_open:
            browser_manager.close()


def main():
    parser = argparse.ArgumentParser(description="토스애즈 크롤러")
    parser.add_argument("--login", dest="login_only", action="store_true", help="로그인만 수행 (세션 저장)")
    parser.add_argument("--sync", dest="sync_only", action="store_true", help="캠페인 구조 동기화만")
    parser.add_argument("--report", dest="report_only", action="store_true", help="성과 데이터만 수집")
    parser.add_argument("--report-days", type=int, default=1, help="성과 수집 기간 (일)")
    parser.add_argument("--loop", action="store_true", help="1시간 주기 반복 실행")
    parser.add_argument("--headless", action="store_true", help="headless 모드 (브라우저 창 숨김)")
    parser.add_argument("--keep-open", action="store_true", help="수집 후 브라우저 안 닫기")
    args = parser.parse_args()

    print("=" * 50)
    print("  토스애즈 크롤러 v1.0")
    print(f"  시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    if args.loop:
        interval = 3600  # 1시간
        print(f"[♻] 반복 모드: {interval//60}분 간격")
        
        run_count = 0
        fail_count = 0
        max_consecutive_fails = 5  # 연속 5회 실패 시 종료
        
        while fail_count < max_consecutive_fails:
            run_count += 1
            print(f"\n{'='*50}")
            print(f"[♻] 실행 #{run_count} (연속 실패: {fail_count})")
            print(f"{'='*50}")
            
            browser_manager = BrowserManager(headless=args.headless)
            try:
                success = run_once(browser_manager, args)
                if success:
                    fail_count = 0  # 성공 시 리셋
                else:
                    fail_count += 1
            except Exception as e:
                print(f"[!] 루프 에러: {e}")
                fail_count += 1
            finally:
                try:
                    browser_manager.close()
                except:
                    pass
            
            from datetime import timedelta
            next_time = (datetime.now() + timedelta(seconds=interval)).strftime('%H:%M:%S')
            print(f"\n[⏰] 다음 수집: {next_time} ({interval//60}분 후)")
            print(f"[📊] 누적: {run_count}회 실행, 연속실패: {fail_count}회")
            time.sleep(interval)
        
        print(f"\n[✗] 연속 {max_consecutive_fails}회 실패. 크롤러를 종료합니다.")
    else:
        browser_manager = BrowserManager(headless=args.headless)
        run_once(browser_manager, args)


if __name__ == "__main__":
    main()
