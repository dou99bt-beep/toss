"""
ReportPage — 성과 데이터 수집 (display-ads 테이블 파싱)

실제 DOM 분석 결과:
display-ads 페이지의 캠페인/광고세트 탭 테이블에 성과 컬럼이 포함됨:
  소진 비용 | 노출 수 | CPM | 도달 수 | 빈도 수 | 클릭 수 | CPC | CTR |
  잠재고객 수 | 잠재고객 제출당 비용 | ...

inner_text()로 탭 구분된 텍스트를 추출하면 컬럼별 데이터 파싱 가능.
"""
import re
import time
from datetime import datetime, timedelta
from .base_page import BasePage
from ..core.supabase_client import insert_performance

ADS_BASE_URL = "https://ads-platform.toss.im"

# display-ads 테이블 헤더 → 인덱스 매핑
COLUMN_NAMES = [
    "checkbox", "id", "name", "status_toggle", "status",
    "insight", "objective", "period", "budget", "budget_method",
    "spend", "impressions", "cpm", "reach", "frequency",
    "clicks", "cpc", "ctr",
    "leads", "cpl",
    "plays", "cpplay",
    "detail_views", "installs", "signups", "cart", "purchases", "delete"
]


class ReportPage(BasePage):

    def collect_performance(self, date_str: str = None):
        """display-ads 테이블에서 성과 데이터 수집"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")

        print(f"\n[REPORT] {date_str} 성과 데이터 수집")

        # display-ads 페이지가 로드된 상태여야 함
        if "display-ads" not in self.page.url:
            display_url = f"{ADS_BASE_URL}/advertiser/display-ads"
            self.safe_goto(display_url)
            time.sleep(5)

        # 날짜 범위 설정 (URL 파라미터)
        base = self.page.url.split("?")[0]
        url = f"{base}?startDate={date_str}&endDate={date_str}"
        self.safe_goto(url)
        time.sleep(5)

        performances = []

        # 캠페인 탭 성과 수집
        campaign_perf = self._parse_table_performance(date_str, "캠페인")
        performances.extend(campaign_perf)

        # 광고세트 탭으로 전환
        try:
            tab = self.page.locator("text=광고세트").first
            if tab.is_visible(timeout=3000):
                tab.click()
                time.sleep(5)
        except:
            pass

        adset_perf = self._parse_table_performance(date_str, "광고세트")
        performances.extend(adset_perf)

        if performances:
            try:
                insert_performance(performances)
                print(f"[✓] {len(performances)}건 성과 데이터 저장 완료")
            except Exception as e:
                print(f"[!] DB 저장 에러: {e}")
        else:
            print("[!] 수집된 성과 데이터 없음")

        return performances

    def _parse_table_performance(self, date_str: str, tab_name: str) -> list:
        """display-ads 테이블의 행별 성과 데이터 추출"""
        performances = []

        rows = self.page.query_selector_all("table tbody tr")
        if not rows:
            return performances

        print(f"  [{tab_name}] 테이블 행: {len(rows)}개")

        for row in rows:
            text = row.inner_text().strip()
            if not text:
                continue

            # 탭으로 구분된 셀 추출
            cells = text.split("\t")
            cells = [c.strip() for c in cells if c.strip()]

            if len(cells) < 5:
                continue

            # ID 찾기 (5~7자리 숫자)
            entry_id = None
            entry_name = None

            for c in cells:
                if re.match(r'^\d{5,7}$', c) and not entry_id:
                    entry_id = c
                elif len(c) > 5 and not entry_name and not c.replace(',', '').replace('원', '').isdigit():
                    if any(ch >= '\uac00' for ch in c) or '_' in c:
                        entry_name = c[:100]

            if not entry_id:
                # "전체 캠페인" 요약 행 처리
                if "전체" in text:
                    entry_id = "summary"
                    entry_name = f"전체 {tab_name} 요약"
                else:
                    continue

            # 숫자 지표 추출
            metrics = self._extract_metrics_from_cells(cells)

            if metrics.get("impressions", 0) > 0 or metrics.get("spend", 0) > 0:
                perf = {
                    "toss_adset_id": entry_id,
                    "ad_set_name": entry_name or f"{tab_name}_{entry_id}",
                    "date": f"{date_str}T00:00:00Z",
                    "impressions": metrics.get("impressions", 0),
                    "clicks": metrics.get("clicks", 0),
                    "leads": metrics.get("leads", 0),
                    "spend": metrics.get("spend", 0),
                    "cpa": metrics.get("cpa", 0),
                    "ctr": metrics.get("ctr", 0),
                }
                performances.append(perf)
                print(f"    [{entry_id}] 소진:₩{perf['spend']:,} 노출:{perf['impressions']:,} "
                      f"클릭:{perf['clicks']} CTR:{perf['ctr']}%")

        return performances

    def _extract_metrics_from_cells(self, cells: list) -> dict:
        """셀 목록에서 성과 지표 추출 — 패턴 매칭"""
        metrics = {}

        for i, cell in enumerate(cells):
            # CTR (XX.XX% 패턴)
            ctr_match = re.match(r'^([\d.]+)%$', cell)
            if ctr_match:
                metrics["ctr"] = float(ctr_match.group(1))
                continue

            # 금액 (숫자+원 패턴): 686원, 1,673원 등
            money_match = re.match(r'^([\d,]+)원$', cell)
            if money_match:
                val = int(money_match.group(1).replace(',', ''))
                # 첫 번째 금액 = 소진비용, 두 번째 = CPM, 세 번째 = CPC 등
                if "spend" not in metrics:
                    metrics["spend"] = val
                elif "cpm" not in metrics:
                    metrics["cpm"] = val
                elif "cpc" not in metrics:
                    metrics["cpc"] = val
                elif "cpa" not in metrics:
                    metrics["cpa"] = val
                continue

            # 순수 정수 (콤마 포함): 410, 11 등
            if re.match(r'^[\d,]+$', cell):
                val = int(cell.replace(',', ''))
                if val > 0:
                    if "impressions" not in metrics:
                        metrics["impressions"] = val
                    elif "reach" not in metrics:
                        metrics["reach"] = val
                    elif "clicks" not in metrics:
                        metrics["clicks"] = val
                    elif "leads" not in metrics:
                        metrics["leads"] = val

            # 소수 (1.03 등) - 빈도수
            if re.match(r'^\d+\.\d+$', cell):
                if "frequency" not in metrics:
                    metrics["frequency"] = float(cell)

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
