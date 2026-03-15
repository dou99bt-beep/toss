# Python Playwright Worker (Microservice)

이 디렉토리는 Node.js 백엔드와 분리되어 동작하는 **Python Playwright 기반의 크롤러 워커**입니다.
Node.js 백엔드와는 **Shared Database (Prisma CrawlerJob 테이블) 기반의 Polling Queue**를 통해 통신합니다.

## 아키텍처 (MSA 결합)
1. **Node.js (Express)**: 스케줄러(10분 주기) 또는 사용자 요청(승인) 시 `CrawlerJob` 테이블에 작업을 Insert 합니다.
2. **Python Worker**: 무한 루프를 돌며 Node.js의 `/api/jobs/poll` 엔드포인트를 호출하여 대기 중인 작업을 가져옵니다.
3. **Playwright Execution**: 작업을 수신하면 Headless 브라우저를 띄워 토스애즈 관리자 페이지에서 스크래핑 또는 액션(ON/OFF 등)을 수행합니다.
4. **Result Reporting**: 작업이 완료되거나 실패하면 `/api/jobs/{id}/complete` 엔드포인트를 호출하여 결과를 DB에 반영합니다.

## 실행 방법

이 워커는 별도의 프로세스 또는 컨테이너에서 실행되어야 합니다.

```bash
# 1. 의존성 설치
pip install -r requirements.txt
playwright install chromium

# 2. 워커 실행
python main.py
```

## 주요 파일
* `main.py`: Job Polling 및 상태 보고를 담당하는 메인 루프
* `crawler.py`: Playwright를 이용한 실제 토스애즈 제어 로직 (POM 패턴 적용 가능)
* `requirements.txt`: Python 패키지 의존성
