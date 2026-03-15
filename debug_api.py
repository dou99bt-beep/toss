"""API 인터셉트 디스커버리 v2 — 결과를 파일로 저장"""
import time, json
from crawler.core.browser import BrowserManager

captured = []

def on_response(response):
    url = response.url
    ct = response.headers.get("content-type", "")
    if "json" not in ct:
        return
    try:
        body = response.json()
        captured.append({
            "url": url,
            "status": response.status,
            "body": body
        })
    except:
        pass

bm = BrowserManager(headless=False)
page = bm.start()
page.on("response", on_response)

# Step 1: display-ads
page.goto("https://ads-platform.toss.im/advertiser/display-ads", wait_until="commit", timeout=30000)
time.sleep(8)

# Step 2: 계정선택
try:
    loc = page.get_by_text("0105명률DB")
    if loc.count() > 0:
        loc.first.click()
        time.sleep(8)
except:
    pass

# Step 3: display-ads 재이동
page.goto("https://ads-platform.toss.im/advertiser/display-ads", wait_until="commit", timeout=30000)
time.sleep(8)

# Step 4: 캠페인 상세
page.goto("https://ads-platform.toss.im/display-ads/v2/contract/336305", wait_until="commit", timeout=30000)
time.sleep(8)

# Step 5: 광고세트 상세
page.goto("https://ads-platform.toss.im/display-ads/v2/contract/336305/set/1006185", wait_until="commit", timeout=30000)
time.sleep(8)

# 결과 저장
results = []
for c in captured:
    url = c["url"]
    # 불필요한 URL 필터
    if any(skip in url for skip in ["sentry", "app-event", "emoji", "analytics", "gtm", "gtag"]):
        continue
    body = c["body"]
    results.append({
        "url": url,
        "status": c["status"],
        "type": type(body).__name__,
        "keys": list(body.keys()) if isinstance(body, dict) else None,
        "sample": json.dumps(body, ensure_ascii=False)[:500]
    })

with open("api_capture.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n=== {len(results)}개 API 응답 저장 → api_capture.json ===")
for r in results:
    print(f"\n  [{r['status']}] {r['url'][:100]}")
    if r['keys']:
        print(f"    keys: {r['keys']}")

bm.save_session()
bm.close()
