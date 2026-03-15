"""
ReportPage — 성과 데이터 수집
- 날짜별 노출/클릭/전환/소진 데이터
- API 인터셉트 + DOM 파싱
"""
import re
import uuid
from datetime import datetime, timedelta
from .base_page import BasePage
from ..core.supabase_client import supabase, insert_performance

ADS_BASE_URL = "https://ads-platform.toss.im"
DISPLAY_ADS_URL = f"{ADS_BASE_URL}/advertiser/display-ads"


class ReportPage(BasePage):

    def collect_performance(self, date_str: str | None = None):
        """
        성과 데이터 수집 (오늘 또는 지정 날짜)
        토스애즈 리포트 페이지에서 광고세트별 성과 추출
        """
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
        
        print(f"\n[REPORT] {date_str} 성과 데이터 수집 시작")

        # 날짜 파라미터로 이동
        url = f"{DISPLAY_ADS_URL}?startDate={date_str}&endDate={date_str}&tab=set"
        self.safe_goto(url)

        performances = []

        try:
            self.page.wait_for_selector("table, [class*='report'], [class*='data']", timeout=15000)
            
            # 테이블 행 읽기
            rows = self.page.query_selector_all("table tbody tr")
            
            for row in rows:
                cells = row.query_selector_all("td")
                if len(cells) < 4:
                    continue
                
                # 광고세트 ID 추출
                link = row.query_selector("a[href*='set/']")
                adset_id = None
                if link:
                    href = link.get_attribute("href") or ""
                    match = re.search(r'set/(\d+)', href)
                    if match:
                        adset_id = match.group(1)
                
                if not adset_id:
                    continue

                # 성과 지표 추출 (숫자 파싱)
                metrics = self._parse_row_metrics(cells)
                
                if metrics:
                    # arm_registry에서 해당 adset의 arm 찾기
                    adset_result = supabase.table("ad_sets").select("id").eq("toss_adset_id", adset_id).execute()
                    if not adset_result.data:
                        continue
                    
                    adset_db_id = adset_result.data[0]["id"]
                    arm_result = supabase.table("arm_registry").select("id").eq("ad_set_id", adset_db_id).limit(1).execute()
                    
                    if arm_result.data:
                        arm_id = arm_result.data[0]["id"]
                    else:
                        continue
                    
                    perf = {
                        "arm_id": arm_id,
                        "date": f"{date_str}T00:00:00Z",
                        "impressions": metrics.get("impressions", 0),
                        "clicks": metrics.get("clicks", 0),
                        "spend": metrics.get("spend", 0),
                        "leads": metrics.get("leads", 0),
                        "cpa": metrics.get("cpa", 0),
                    }
                    performances.append(perf)
                    
                    name = cells[0].inner_text().strip()[:30] if cells else "?"
                    print(f"  [{name}] 노출:{metrics.get('impressions',0):,} 클릭:{metrics.get('clicks',0):,} "
                          f"리드:{metrics.get('leads',0)} 소진:₩{metrics.get('spend',0):,} CPA:₩{metrics.get('cpa',0):,}")

        except Exception as e:
            print(f"[!] 성과 데이터 파싱 에러: {e}")
            self._save_screenshot("report_error")

        if performances:
            try:
                insert_performance("performance_daily", performances)
                print(f"[✓] {len(performances)}건 성과 데이터 저장 완료")
            except Exception as e:
                print(f"[!] DB 저장 에러: {e}")
        else:
            print("[!] 수집된 성과 데이터 없음")

        return performances

    def collect_multi_day(self, days: int = 7):
        """최근 N일 성과 데이터 수집"""
        print(f"\n[REPORT] 최근 {days}일 성과 데이터 일괄 수집")
        
        all_perfs = []
        today = datetime.now()
        
        for i in range(days):
            date = today - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            perfs = self.collect_performance(date_str)
            all_perfs.extend(perfs or [])
            self._human_delay(2000, 4000)  # 페이지 간 딜레이
        
        print(f"\n[✓] 총 {len(all_perfs)}건 성과 데이터 수집 완료")
        return all_perfs

    def _parse_row_metrics(self, cells) -> dict | None:
        """테이블 셀에서 숫자 지표 추출"""
        try:
            texts = [cell.inner_text().strip() for cell in cells]
            
            def parse_number(text: str) -> int:
                """숫자 문자열 파싱 (1,234 → 1234, ₩10,000 → 10000)"""
                cleaned = re.sub(r'[^\d.]', '', text)
                return int(float(cleaned)) if cleaned else 0
            
            # 토스애즈 테이블 열 순서 감지 시도
            # 일반적: 이름 | 상태 | 노출 | 클릭 | 전환 | 소진 | CPA | ...
            metrics = {}
            
            for i, text in enumerate(texts):
                num = parse_number(text)
                
                # 큰 숫자 → 노출수
                if num > 1000 and "impressions" not in metrics:
                    metrics["impressions"] = num
                # 중간 숫자 → 클릭 or 소진
                elif num > 100 and "clicks" not in metrics and "impressions" in metrics:
                    metrics["clicks"] = num
                # 작은 숫자 → 리드
                elif 0 < num < 100 and "leads" not in metrics and "clicks" in metrics:
                    metrics["leads"] = num

            # 소진액은 금액 표시 찾기 (₩ 또는 원)
            for text in texts:
                if "₩" in text or "원" in text or ("," in text and parse_number(text) > 1000):
                    num = parse_number(text)
                    if num > 1000 and num != metrics.get("impressions"):
                        metrics["spend"] = num
                        break
            
            if "spend" in metrics and "leads" in metrics and metrics["leads"] > 0:
                metrics["cpa"] = metrics["spend"] // metrics["leads"]
            else:
                metrics["cpa"] = 0

            return metrics if metrics.get("impressions") else None

        except Exception as e:
            print(f"  [!] 지표 파싱 에러: {e}")
            return None
