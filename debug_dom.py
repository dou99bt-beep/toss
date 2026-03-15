"""광고세트 상세 페이지 DOM 텍스트 파일 저장"""
import time
from crawler.core.browser import BrowserManager

bm = BrowserManager(headless=False)
page = bm.start()

# 계정 접속 → 선택
page.goto("https://ads-platform.toss.im/advertiser/display-ads", wait_until="commit", timeout=30000)
time.sleep(8)
try:
    loc = page.get_by_text("0105명률DB")
    if loc.count() > 0:
        loc.first.click()
        time.sleep(8)
except:
    pass

# 광고세트 상세 페이지 (ON 상태인 1006185)
print("[→] 광고세트 상세 페이지")
page.goto("https://ads-platform.toss.im/display-ads/v2/contract/336305/set/1006185",
          wait_until="commit", timeout=30000)
time.sleep(10)
page.evaluate("window.scrollTo(0, 5000)")
time.sleep(3)

body = page.inner_text("body")
with open("adset_detail_text.txt", "w", encoding="utf-8") as f:
    f.write(f"URL: {page.url}\n\n")
    f.write(body)
print(f"[✓] 광고세트 상세 텍스트 저장 ({len(body):,}자)")
page.screenshot(path="crawler/screenshots/adset_detail_dom.png", full_page=True)
print("[✓] 스크린샷 저장")

# 대시보드도 저장
print("[→] 대시보드 페이지")
page.goto("https://ads-platform.toss.im/advertiser/display-ads", wait_until="commit", timeout=30000)
time.sleep(10)
page.evaluate("window.scrollTo(0, 5000)")
time.sleep(3)

body2 = page.inner_text("body")
with open("dashboard_text.txt", "w", encoding="utf-8") as f:
    f.write(f"URL: {page.url}\n\n")
    f.write(body2)
print(f"[✓] 대시보드 텍스트 저장 ({len(body2):,}자)")

bm.save_session()
bm.close()
