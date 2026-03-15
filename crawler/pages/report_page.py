"""
ReportPage — 성과 데이터 수집

토스애즈 성과 데이터 위치 (스크린샷 분석 결과):
- 광고세트 탭: 설정 정보만 (노출상태, 캠페인, 유형 등) → 성과 없음
- 캠페인 상세: /display-ads/v2/contract/{캠페인ID} → 성과 차트/테이블
- 광고세트 상세: /display-ads/v2/contract/{캠페인ID}/set/{광고세트ID}
- 대시보드 "배너 성과": 요약 차트 (CTR, 소진비용)

수집 전략:
1. 캠페인 상세 페이지에서 전체 성과 파싱
2. 개별 광고세트 상세 페이지에서 성과 파싱
3. 대시보드 요약 데이터 fallback
"""
import re
import time
from datetime import datetime, timedelta
from .base_page import BasePage
from ..core.supabase_client import insert_performance

ADS_BASE_URL = "https://ads-platform.toss.im"
CAMPAIGN_ID = "336305"  # 명률1차 0105


class ReportPage(BasePage):

    def collect_performance(self, date_str: str = None):
        """성과 데이터 수집 — 캠페인 상세 페이지에서"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")

        print(f"\n[REPORT] {date_str} 성과 데이터 수집 시작")

        performances = []

        # Strategy 1: 캠페인 상세 페이지
        perf = self._collect_from_campaign_detail(date_str)
        performances.extend(perf)

        # Strategy 2: 대시보드 요약 데이터 (fallback)
        if not performances:
            summary = self._collect_from_dashboard(date_str)
            if summary:
                performances.append(summary)

        if performances:
            try:
                insert_performance(performances)
                print(f"[✓] {len(performances)}건 성과 데이터 저장 완료")
            except Exception as e:
                print(f"[!] DB 저장 에러: {e}")
        else:
            print("[!] 수집된 성과 데이터 없음")

        return performances

    def _collect_from_campaign_detail(self, date_str: str) -> list:
        """캠페인 상세 페이지에서 성과 수집"""
        url = f"{ADS_BASE_URL}/display-ads/v2/contract/{CAMPAIGN_ID}"
        print(f"[→] 캠페인 상세 이동: {url}")
        self.safe_goto(url)
        time.sleep(5)
        self._save_screenshot(f"campaign_detail_{date_str}")

        performances = []
        body = self.page.inner_text("body")

        # 테이블 파싱 시도
        rows = self.page.query_selector_all("table tbody tr")
        if rows:
            print(f"  캠페인 상세 테이블 행: {len(rows)}개")
            for row in rows:
                perf = self._parse_performance_row(row, date_str)
                if perf:
                    performances.append(perf)

        # 테이블이 없으면 텍스트에서 숫자 추출
        if not performances:
            perf = self._parse_text_metrics(body, date_str)
            if perf:
                performances.append(perf)

        return performances

    def _collect_from_dashboard(self, date_str: str) -> dict:
        """대시보드 배너 성과 요약에서 수집"""
        url = f"{ADS_BASE_URL}/advertiser/display-ads"
        self.safe_goto(url)
        time.sleep(5)

        body = self.page.inner_text("body")
        return self._parse_text_metrics(body, date_str, adset_id="summary")

    def _parse_performance_row(self, row, date_str: str) -> dict:
        """테이블 행에서 성과 데이터 추출"""
        cells = row.query_selector_all("td")
        if not cells or len(cells) < 3:
            return None

        texts = []
        for c in cells:
            try:
                texts.append(c.inner_text().strip())
            except:
                texts.append("")

        # 광고세트 ID 찾기
        adset_id = None
        adset_name = None
        for t in texts:
            m = re.match(r'^(\d{5,7})$', t)
            if m:
                adset_id = m.group(1)
                break

        metrics = self._extract_metrics(texts)

        if adset_id and metrics.get("impressions", 0) > 0:
            perf = {
                "toss_adset_id": adset_id,
                "ad_set_name": adset_name or f"광고세트_{adset_id}",
                "date": f"{date_str}T00:00:00Z",
                **metrics,
            }
            print(f"  [{adset_id}] 노출:{metrics.get('impressions',0):,} "
                  f"클릭:{metrics.get('clicks',0):,} 소진:₩{metrics.get('spend',0):,}")
            return perf
        return None

    def _parse_text_metrics(self, text: str, date_str: str, adset_id: str = None) -> dict:
        """페이지 텍스트에서 성과 지표 추출"""
        metrics = {}

        # 노출 (숫자 패턴)
        m = re.search(r'노출[수\s:]*?([\d,]+)', text)
        if m:
            metrics["impressions"] = int(m.group(1).replace(',', ''))

        m = re.search(r'클릭[수\s:]*?([\d,]+)', text)
        if m:
            metrics["clicks"] = int(m.group(1).replace(',', ''))

        m = re.search(r'전환[수\s:]*?([\d,]+)', text)
        if m:
            metrics["leads"] = int(m.group(1).replace(',', ''))

        m = re.search(r'소진[^₩\d]*([\d,]+)원', text)
        if not m:
            m = re.search(r'소진 비용[^₩\d]*([\d,]+)', text)
        if m:
            metrics["spend"] = int(m.group(1).replace(',', ''))

        m = re.search(r'CTR[:\s]*([\d.]+)%?', text)
        if m:
            metrics["ctr"] = float(m.group(1))

        m = re.search(r'CPA[:\s]*₩?([\d,]+)', text)
        if m:
            metrics["cpa"] = int(m.group(1).replace(',', ''))

        if any(v > 0 for v in metrics.values()):
            return {
                "toss_adset_id": adset_id or CAMPAIGN_ID,
                "ad_set_name": "전체 캠페인 요약",
                "date": f"{date_str}T00:00:00Z",
                "impressions": metrics.get("impressions", 0),
                "clicks": metrics.get("clicks", 0),
                "leads": metrics.get("leads", 0),
                "spend": metrics.get("spend", 0),
                "cpa": metrics.get("cpa", 0),
                "ctr": metrics.get("ctr", 0),
            }
        return None

    def _extract_metrics(self, texts: list) -> dict:
        """텍스트 리스트에서 숫자 지표 분류"""
        metrics = {"impressions": 0, "clicks": 0, "leads": 0, "spend": 0, "cpa": 0, "ctr": 0}
        numbers = []

        for t in texts:
            if '%' in t:
                try:
                    metrics["ctr"] = float(re.sub(r'[^0-9.]', '', t))
                except:
                    pass
                continue

            cleaned = re.sub(r'[^\d]', '', t)
            if cleaned:
                numbers.append(int(cleaned))

        # 숫자 크기로 지표 분류 (큰 순: 노출 > 소진 > 클릭 > 리드)
        numbers.sort(reverse=True)
        if len(numbers) >= 1:
            metrics["impressions"] = numbers[0]
        if len(numbers) >= 2:
            metrics["spend"] = numbers[1] if numbers[1] > 100 else numbers[1]
        if len(numbers) >= 3:
            metrics["clicks"] = numbers[2]
        if len(numbers) >= 4:
            metrics["leads"] = numbers[3]

        return metrics

    def collect_multi_day(self, days: int = 7):
        """최근 N일 성과 데이터 수집"""
        print(f"\n[REPORT] 최근 {days}일 성과 데이터 일괄 수집")
        all_perfs = []
        today = datetime.now()

        for i in range(days):
            d = today - timedelta(days=i)
            ds = d.strftime("%Y-%m-%d")
            perfs = self.collect_performance(ds)
            all_perfs.extend(perfs or [])
            self._human_delay(2000, 4000)

        print(f"\n[✓] 총 {len(all_perfs)}건 성과 데이터 수집 완료")
        return all_perfs
