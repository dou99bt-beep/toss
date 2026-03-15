# 토스애즈 운영용 크롤러 아키텍처 설계 (Python Playwright)

본 문서는 토스애즈 관리자 페이지에서 캠페인, 광고세트, 소재, 타깃, 성과 데이터 등을 수집하기 위한 **Python Playwright 기반의 엔터프라이즈급 크롤러 아키텍처** 설계서입니다.

---

## 1. 크롤러 아키텍처 (Crawler Architecture)

### 1.1 로그인 및 세션 처리 전략
*   **세션 유지 (Session State):** Playwright의 `browser_context.storage_state(path="state.json")`를 활용하여 쿠키 및 로컬 스토리지를 저장/재사용합니다.
*   **세션 만료 감지:** 페이지 이동 후 특정 요소(예: 로그인 폼, "세션 만료" 팝업)가 감지되거나, API 응답이 401/403으로 떨어질 경우 세션 만료로 간주합니다.
*   **재로그인 흐름:** 세션 만료 감지 -> 기존 Context 종료 -> Headless/Headful 모드로 새 Context 생성 -> `LoginPage` 진입 -> ID/PW 입력 및 2FA(필요시 수동 개입 대기) -> 성공 시 `state.json` 갱신 -> 실패 지점부터 재시작.

### 1.2 페이지 이동 및 데이터 추출 흐름
*   **이동 방식:** 직접 URL 이동(`page.goto()`)을 우선하되, SPA(Single Page Application) 특성상 URL 변경 없이 렌더링되는 경우 좌측 네비게이션(LNB) 클릭을 통한 이동을 병행합니다.
*   **데이터 추출:** DOM 파싱(BeautifulSoup 병행 또는 Playwright Locator)과 **네트워크 인터셉트(`page.on("response")`)**를 혼합합니다. 토스애즈와 같은 최신 어드민은 XHR/Fetch API 응답(JSON)을 가로채는 것이 DOM 크롤링보다 훨씬 빠르고 안정적입니다.

### 1.3 실패 복구 흐름 (Recovery Flow)
*   **오류 감지:** `TimeoutError`, `TargetClosedError` 등 발생 시 `try-except` 블록에서 캐치.
*   **상태 캡처:** 오류 발생 즉시 `page.screenshot(path="error_timestamp.png")` 및 `page.content()`(DOM HTML)를 로컬 또는 S3에 저장합니다.
*   **재시도 (Retry):** Exponential Backoff 전략을 사용하여 최대 3회 재시도합니다.
*   **알림:** 3회 실패 시 Slack/Discord Webhook으로 스크린샷과 에러 로그를 전송하고 해당 Task를 `FAILED` 상태로 DB에 기록합니다.

---

## 2. Page Object Model (POM) 설계

유지보수성을 위해 각 페이지의 UI 요소와 액션을 클래스로 분리합니다.

*   **`BasePage`**: 공통 메서드 (`wait_for_selector`, `safe_click`, `get_text`, `intercept_api`)
*   **`LoginPage`**: 로그인 폼 입력, 2FA 처리, 세션 저장
*   **`DashboardPage`**: 전체 요약 지표 수집
*   **`CampaignListPage`**: 캠페인 목록 조회, 상태(ON/OFF) 토글, 예산 수정
*   **`AdSetPage`**: 광고세트 목록, 타깃 조건(성/연령/관심사), 노출 시간/요일, 입찰전략 수집
*   **`CreativePage`**: 소재 목록, 이미지/텍스트 정보, 승인 상태 수집
*   **`ReportPage`**: 기간별 성과(시간대별, 성/연령별, 소재별, 광고세트별) 다운로드 또는 API 인터셉트
*   **`SettingsPage`**: 계정 정보 및 결제/잔액 정보 수집

---

## 3. 수집 대상 정의

| 분류 | 수집 항목 | 수집 주기 | 수집 방식 |
| :--- | :--- | :--- | :--- |
| **구조/상태** | 캠페인, 광고세트, 소재 목록 및 ON/OFF 상태 | 10분 | DOM 파싱 / API 인터셉트 |
| **설정값** | 타깃 조건, 입찰전략, 예산, 노출 시간/요일 | 1시간 | 상세 페이지 진입 후 파싱 |
| **기본 성과** | 노출, 클릭, 전환, 지출액 (캠페인/광고세트/소재별) | 1시간 | ReportPage API 인터셉트 |
| **상세 성과** | 시간대별, 성/연령별 성과 | 1일 1회 | ReportPage CSV 다운로드/파싱 |

---

## 4. 셀렉터 관리 방식 (Selector Registry)

셀렉터 변경으로 인한 크롤러 중단을 막기 위해 JSON 기반의 Registry를 운영합니다.

### 4.1 JSON 구조 제안 (`selectors.json`)
```json
{
  "version": "1.2.0",
  "updated_at": "2026-03-14T00:00:00Z",
  "CampaignListPage": {
    "campaign_row": {
      "primary": "tr.campaign-list-item",
      "fallback": "table[data-test-id='campaign-table'] tbody tr",
      "description": "캠페인 목록의 각 행"
    },
    "status_toggle": {
      "primary": "button.toggle-switch",
      "fallback": "input[type='checkbox'].status-checkbox"
    }
  }
}
```

### 4.2 셀렉터 버전 관리 및 Fallback 전략
*   **버전 관리:** `selectors.json`은 Git으로 관리되며, 토스애즈 UI 업데이트 감지 시 새 버전으로 업데이트 후 핫디플로이(Hot-deploy) 가능하도록 설계합니다.
*   **Fallback 로직:** `primary` 셀렉터로 요소를 찾지 못하면(Timeout 3초), `fallback` 셀렉터로 재시도합니다. 둘 다 실패하면 에러를 발생시키고 DOM을 저장합니다.

---

## 5. 수집 결과 저장 구조

### 5.1 저장 파이프라인
1.  **Raw Data (Data Lake):** API 응답 JSON 원본 파일이나 파싱 전 HTML은 S3 또는 로컬 스토리지에 날짜별로 저장합니다. (추후 파서 로직 변경 시 소급 적용 목적)
2.  **Normalized Data (RDB):** 정제된 데이터는 PostgreSQL/MySQL에 저장합니다.

### 5.2 테이블 매핑
*   `campaigns`, `ad_sets`, `creatives`: 설정값 및 메타데이터 저장 (SCD Type 2 방식으로 이력 관리 권장)
*   `performance_hourly`, `performance_daily`: 시계열 성과 데이터 저장 (Upsert 방식)
*   `crawler_logs`: 크롤링 실행 이력, 성공/실패 여부, 스크린샷 URL 저장

---

## 6. 스케줄링 (Scheduling)

Celery + Redis (또는 APScheduler)를 활용합니다.

*   **정기 동기화 주기:**
    *   상태/예산 동기화: 10분 주기
    *   성과 동기화: 1시간 주기
*   **온디맨드 실행:** 사용자가 대시보드에서 '새로고침' 버튼 클릭 시 즉시 실행 큐에 할당.
*   **실패 시 재시도:** Celery의 `autoretry_for` 데코레이터를 사용하여 일시적 네트워크 오류 시 3분 후 재시도.
*   **세션 만료 감지:** 작업 시작 전 `check_session()` 함수를 실행하여 만료 시 `LoginTask`를 먼저 큐에 넣고 대기.

---

## 7. 안전장치 (Safety Mechanisms)

*   **사람 승인 vs 자동 액션:**
    *   **읽기(수집):** 100% 자동 실행.
    *   **쓰기(예산 변경, ON/OFF):** Rule Engine이 제안한 액션 중 '자동 승인' 조건에 맞지 않는 것은 DB에 `PENDING` 상태로 두고, 관리자가 UI에서 승인해야만 봇이 실행.
*   **과도한 반복 방지 (Rate Limiting):** 페이지 이동 간 `page.wait_for_timeout(random.randint(1000, 3000))`를 삽입하여 사람처럼 동작하게 함.
*   **연속 실패 차단 (Circuit Breaker):** 동일한 셀렉터 오류가 3회 연속 발생하면 해당 Task 스케줄을 일시 중지(Pause)하고 관리자에게 얼럿 발송.
*   **브라우저 수명 관리:** 메모리 누수 방지를 위해 50회 Task 실행 후 또는 1시간마다 브라우저 인스턴스를 완전히 종료하고 재시작.

---

## 8. 출력 형식 (코드 및 디렉토리 구조)

### 8.1 폴더 구조
```text
tossads_crawler/
├── core/
│   ├── browser.py         # Playwright 컨텍스트 및 브라우저 관리
│   ├── logger.py          # 커스텀 로거 (파일, 콘솔, 슬랙)
│   └── exceptions.py      # 커스텀 예외 (SessionExpiredError 등)
├── pages/
│   ├── base_page.py       # POM Base
│   ├── login_page.py
│   ├── campaign_page.py
│   └── report_page.py
├── selectors/
│   ├── registry.py        # JSON 로더 및 Fallback 매니저
│   └── selectors_v1.json
├── tasks/
│   ├── celery_app.py      # Celery 설정
│   ├── sync_tasks.py      # 수집 스케줄러 태스크
│   └── action_tasks.py    # ON/OFF, 예산 변경 태스크
├── models/
│   └── schemas.py         # Pydantic 모델 (데이터 검증용)
└── main.py                # 온디맨드 실행 진입점
```

### 8.2 주요 클래스 및 예시 코드

**1. Selector Registry (`selectors/registry.py`)**
```python
import json

class SelectorRegistry:
    def __init__(self, json_path="selectors/selectors_v1.json"):
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    def get(self, page_name: str, element_name: str) -> dict:
        return self.data.get(page_name, {}).get(element_name, {})
```

**2. Base Page (`pages/base_page.py`)**
```python
from playwright.sync_api import Page, TimeoutError
from selectors.registry import SelectorRegistry

class BasePage:
    def __init__(self, page: Page, registry: SelectorRegistry):
        self.page = page
        self.registry = registry

    def safe_click(self, page_name: str, element_name: str):
        selectors = self.registry.get(page_name, element_name)
        primary = selectors.get("primary")
        fallback = selectors.get("fallback")

        try:
            self.page.wait_for_selector(primary, state="visible", timeout=3000)
            self.page.click(primary)
        except TimeoutError:
            if fallback:
                print(f"[Fallback] Using fallback selector for {element_name}")
                self.page.wait_for_selector(fallback, state="visible", timeout=5000)
                self.page.click(fallback)
            else:
                self._handle_error(f"Failed to click {element_name}")

    def _handle_error(self, message: str):
        self.page.screenshot(path=f"error_{message.replace(' ', '_')}.png")
        with open("error_dom.html", "w") as f:
            f.write(self.page.content())
        raise Exception(message)
```

**3. Campaign Page (`pages/campaign_page.py`)**
```python
from pages.base_page import BasePage

class CampaignListPage(BasePage):
    PAGE_NAME = "CampaignListPage"

    def toggle_campaign_status(self, campaign_id: str, target_status: bool):
        # 1. 특정 캠페인 행 찾기 (예시)
        row_selector = f"tr[data-campaign-id='{campaign_id}']"
        self.page.wait_for_selector(row_selector)
        
        # 2. 토글 버튼 클릭
        toggle_btn = f"{row_selector} {self.registry.get(self.PAGE_NAME, 'status_toggle')['primary']}"
        self.page.click(toggle_btn)
        
        # 3. API 응답 대기 (네트워크 인터셉트 활용)
        with self.page.expect_response(lambda response: "/api/campaigns/status" in response.url and response.status == 200) as response_info:
            # 클릭 후 서버 반영 대기
            pass
        return True
```

**4. Browser Manager (`core/browser.py`)**
```python
from playwright.sync_api import sync_playwright

class BrowserManager:
    def __init__(self, headless=True):
        self.headless = headless
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=self.headless)
        
    def get_context(self, state_path="state.json"):
        try:
            context = self.browser.new_context(storage_state=state_path)
        except Exception:
            # state.json이 없거나 손상된 경우 새 컨텍스트 생성
            context = self.browser.new_context()
        return context

    def close(self):
        self.browser.close()
        self.playwright.stop()
```

### 8.3 실행 흐름도 (Execution Flow)
1. **Trigger:** Celery Beat가 `sync_campaigns` 태스크 호출.
2. **Init:** `BrowserManager`가 `state.json`을 로드하여 Context 생성.
3. **Navigate:** `page.goto("토스애즈 URL")`
4. **Auth Check:** 로그인 페이지로 리다이렉트 시 `LoginPage.login()` 수행 후 `state.json` 저장.
5. **Action:** `CampaignListPage` 진입 -> API 인터셉트 세팅 -> 데이터 스크래핑.
6. **Save:** 수집된 JSON 데이터를 Pydantic으로 검증 후 DB(PostgreSQL)에 Upsert.
7. **Cleanup:** Context 종료 (메모리 확보).

### 8.4 로깅 전략
*   **INFO:** 크롤러 시작/종료, 수집된 아이템 수, 소요 시간.
*   **WARNING:** Fallback 셀렉터 사용, 재시도(Retry) 발생.
*   **ERROR:** DOM 요소를 찾을 수 없음, 네트워크 타임아웃, 로그인 실패. (에러 발생 시 스크린샷 경로와 HTML 덤프 경로를 로그에 반드시 포함)
*   **저장소:** ELK 스택 또는 Datadog으로 전송하여 대시보드화. 로컬 개발 시에는 `rotating_file_handler` 사용.
