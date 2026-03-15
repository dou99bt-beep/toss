"""사이드바 DOM 디버깅 — 모든 링크와 배너 요소 출력"""
import time
from crawler.core.browser import BrowserManager

bm = BrowserManager(headless=False)
page = bm.start()

# 계정 선택 페이지에서 0105명률DB 클릭
page.goto("https://ads-platform.toss.im/advertiser/display-ads", wait_until="commit", timeout=30000)
time.sleep(10)

print(f"\nURL: {page.url}")

# 광고계정 선택 처리
body = page.inner_text("body")
if "내 광고계정" in body:
    print("=== 광고계정 선택 필요 ===")
    loc = page.get_by_text("0105명률DB")
    if loc.count() > 0:
        loc.first.click()
        time.sleep(8)
        print(f"계정 클릭 후 URL: {page.url}")

# 모든 a 태그 출력
links = page.query_selector_all("a")
print(f"\n=== a 태그: {len(links)}개 ===")
for i, a in enumerate(links):
    href = a.get_attribute("href") or ""
    try:
        t = a.inner_text().strip()
    except:
        t = ""
    if t and len(t) < 50:
        print(f"  [{i:2d}] href='{href}'  text='{t}'")

# 배너 locator
print("\n=== locator 'text=배너' 결과 ===")
locs = page.locator("text=배너").all()
for i, loc in enumerate(locs):
    try:
        t = loc.inner_text()[:40]
        tag = loc.evaluate("e => e.tagName")
        href = loc.evaluate("e => e.getAttribute('href') || ''")
        print(f"  [{i}] <{tag}> href='{href}' text='{t}'")
    except Exception as ex:
        print(f"  [{i}] error: {ex}")

bm.save_session()
bm.close()
