"""
ReportPage — 성과 데이터 수집
토스애즈 display-ads 페이지의 광고세트 탭에서 성과 지표 추출

실제 DOM 구조 (스크린샷 기반):
- 광고세트 탭 테이블 열: 광고세트명 | ID | 노출상태 | 인사이트팁 | 상위캠페인 |
  광고유형 | 광고목표 | 노출기간 | 노출시간대 | 타겟 | ...
- 맞춤보고서 탭: 날짜별 상세 리포트
"""
import re
import time
from datetime import datetime, timedelta
from .base_page import BasePage
from ..core.supabase_client import insert_performance

ADS_BASE_URL = "https://ads-platform.toss.im"


class ReportPage(BasePage):

    def collect_performance(self, date_str: str = None):
        """
        성과 데이터 수집 (맞춤 보고서 or 광고세트 탭)
        """
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")

        print(f"\n[REPORT] {date_str} 성과 데이터 수집 시작")

        # 맞춤 보고서 페이지로 이동
        self._navigate_to_report(date_str)
        
        # 페이지 스크린샷
        self._save_screenshot(f"report_{date_str}")
        
        # 데이터 수집
        performances = self._parse_report_data(date_str)

        if performances:
            try:
                insert_performance(performances)
                print(f"[✓] {len(performances)}건 성과 데이터 저장 완료")
            except Exception as e:
                print(f"[!] DB 저장 에러: {e}")
        else:
            print("[!] 수집된 성과 데이터 없음")

        return performances

    def _navigate_to_report(self, date_str: str):
        """맞춤 보고서 or 광고세트 탭으로 이동"""
        current_url = self.page.url
        
        # display-ads 페이지에 이미 있는지 확인
        if "display-ads" not in current_url:
            # 사이드바에서 배너 클릭
            link = self.page.query_selector("a[href*='display-ads']")
            if link:
                link.click()
                time.sleep(8)
        
        # 맞춤 보고서 시도
        report_link = self.page.query_selector("a[href*='report']")
        if not report_link:
            try:
                loc = self.page.get_by_text("맞춤 보고서", exact=True)
                report_link = loc.first.element_handle() if loc.count() > 0 else None
            except:
                report_link = None
        if report_link:
            report_link.click()
            time.sleep(5)
            print("[✓] 맞춤 보고서 페이지 이동")
            return
        
        # 광고세트 탭 클릭 + 날짜 필터
        try:
            loc = self.page.get_by_text("광고세트", exact=True)
            adset_tab = loc.first.element_handle() if loc.count() > 0 else None
        except:
            adset_tab = None
        if adset_tab:
            adset_tab.click()
            time.sleep(3)
        
        # URL에 날짜 파라미터 추가
        base_url = self.page.url.split("?")[0]
        url = f"{base_url}?startDate={date_str}&endDate={date_str}&tab=set"
        self.safe_goto(url)
        print(f"[→] 광고세트 탭 (날짜: {date_str})")

    def _parse_report_data(self, date_str: str) -> list:
        """현재 페이지에서 성과 데이터 추출"""
        performances = []
        page_text = self.page.inner_text("body")
        
        # 1. 테이블에서 데이터 추출
        rows = self.page.query_selector_all("table tbody tr")
        if rows:
            print(f"  테이블 행: {len(rows)}개")
            for row in rows:
                perf = self._parse_perf_row(row, date_str)
                if perf:
                    performances.append(perf)
        
        # 2. 테이블이 없으면 페이지 텍스트에서 숫자 추출
        if not performances and "데이터가 없어요" not in page_text:
            # 전체 배너 성과 요약 데이터 추출 시도
            summary = self._parse_summary_metrics(page_text, date_str)
            if summary:
                performances.append(summary)
        
        return performances

    def _parse_perf_row(self, row, date_str: str) -> dict:
        """테이블 행에서 광고세트별 성과 추출"""
        text = row.inner_text().strip()
        if not text or "전체" in text[:5]:
            return None
        
        cells = row.query_selector_all("td")
        if not cells or len(cells) < 3:
            return None
        
        adset_id = None
        adset_name = None
        metrics = {}
        
        for cell in cells:
            ct = cell.inner_text().strip()
            
            # 광고세트 ID (5~7자리 숫자)
            if re.match(r'^\d{5,7}$', ct) and not adset_id:
                adset_id = ct
                continue
            
            # 광고세트 이름 (긴 한글/영문 텍스트)
            if len(ct) > 10 and not adset_name and ('_' in ct or any(c >= '\uac00' for c in ct)):
                adset_name = ct[:150]
                continue
            
            # 숫자 지표 추출
            num = self._parse_number(ct)
            if num is not None:
                # 컨텍스트에 따라 지표 분류
                if '%' in ct:
                    if 'ctr' not in metrics:
                        metrics['ctr'] = float(ct.replace('%', '').replace(',', '') or 0)
                elif '원' in ct or '₩' in ct or (num > 1000 and ',' in ct):
                    if 'spend' not in metrics:
                        metrics['spend'] = num
                    elif 'cpa' not in metrics and num < metrics.get('spend', float('inf')):
                        metrics['cpa'] = num
                elif num > 100 and 'impressions' not in metrics:
                    metrics['impressions'] = num
                elif num > 0 and 'clicks' not in metrics and 'impressions' in metrics:
                    metrics['clicks'] = num
                elif 'leads' not in metrics and 'clicks' in metrics:
                    metrics['leads'] = num
        
        if not adset_id:
            return None
        
        perf = {
            "toss_adset_id": adset_id,
            "ad_set_name": adset_name or f"광고세트_{adset_id}",
            "date": f"{date_str}T00:00:00Z",
            "impressions": metrics.get("impressions", 0),
            "clicks": metrics.get("clicks", 0),
            "leads": metrics.get("leads", 0),
            "spend": metrics.get("spend", 0),
            "cpa": metrics.get("cpa", 0),
            "ctr": metrics.get("ctr", 0),
        }
        
        print(f"  [{adset_id}] 노출:{perf['impressions']:,} 클릭:{perf['clicks']:,} "
              f"리드:{perf['leads']} 소진:₩{perf['spend']:,}")
        
        return perf

    def _parse_summary_metrics(self, text: str, date_str: str) -> dict:
        """페이지 전체 텍스트에서 요약 성과 추출"""
        impressions = 0
        clicks = 0
        spend = 0
        
        # "노출 1,234" 패턴
        m = re.search(r'노출[:\s]*([\d,]+)', text)
        if m:
            impressions = int(m.group(1).replace(',', ''))
        
        m = re.search(r'클릭[:\s]*([\d,]+)', text)
        if m:
            clicks = int(m.group(1).replace(',', ''))
        
        m = re.search(r'소진[^₩\d]*([\d,]+)원', text)
        if m:
            spend = int(m.group(1).replace(',', ''))
        
        if impressions or clicks or spend:
            return {
                "toss_adset_id": "summary",
                "ad_set_name": "전체 요약",
                "date": f"{date_str}T00:00:00Z",
                "impressions": impressions,
                "clicks": clicks,
                "leads": 0,
                "spend": spend,
                "cpa": 0,
            }
        
        return None

    def _parse_number(self, text: str):
        """숫자 문자열 파싱"""
        cleaned = re.sub(r'[^0-9.]', '', text)
        if cleaned:
            try:
                return int(float(cleaned))
            except:
                pass
        return None

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
