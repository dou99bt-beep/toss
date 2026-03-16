"""
ReportPage — 성과 데이터 수집 (display-ads inner_text 파싱)

토스애즈는 <table> HTML 대신 div 기반 가상 테이블을 사용.
→ body inner_text() → 줄 단위 파싱으로 성과 데이터 추출.

display-ads URL에 startDate/endDate 파라미터로 날짜 지정 가능.
"""
import re
import time
from datetime import datetime, timedelta
from .base_page import BasePage
from ..core.supabase_client import insert_performance

ADS_BASE_URL = "https://ads-platform.toss.im"


class ReportPage(BasePage):

    def _ensure_display_ads(self, date_str: str):
        """display-ads 페이지 + 날짜 설정 확보"""
        # 광고계정 선택이 필요하면 먼저 처리
        body = self.page.inner_text("body")
        if "내 광고계정" in body or "비즈니스 그룹" in body:
            print("[→] 광고계정 선택 필요")
            from .campaign_page import CampaignPage
            cp = CampaignPage(self.page)
            cp.select_ad_account()
            time.sleep(5)

        # display-ads로 이동
        display_url = f"{ADS_BASE_URL}/advertiser/display-ads?startDate={date_str}&endDate={date_str}"

        if "display-ads" not in self.page.url or date_str not in self.page.url:
            self.safe_goto(display_url)
            time.sleep(5)

            # 다시 계정 선택 화면이 뜨면 처리
            body = self.page.inner_text("body")
            if "내 광고계정" in body:
                from .campaign_page import CampaignPage
                cp = CampaignPage(self.page)
                cp.select_ad_account()
                time.sleep(3)
                self.safe_goto(display_url)
                time.sleep(5)
        else:
            # 이미 display-ads에 있으면 날짜만 변경
            base = self.page.url.split("?")[0]
            url = f"{base}?startDate={date_str}&endDate={date_str}"
            self.safe_goto(url)
            time.sleep(3)

    def collect_performance(self, date_str: str = None):
        """display-ads에서 성과 데이터 수집"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")

        print(f"\n[REPORT] {date_str} 성과 데이터 수집")

        # display-ads 페이지 확보
        self._ensure_display_ads(date_str)

        performances = []

        # 광고세트 탭 클릭 (성과 데이터가 더 상세함)
        try:
            # 탭 영역에서 "광고세트" 클릭
            tab = self.page.locator("text=광고세트").first
            if tab.is_visible(timeout=5000):
                tab.click()
                time.sleep(5)
                print("[✓] 광고세트 탭 전환")
        except:
            print("[!] 광고세트 탭 전환 실패, 현재 탭에서 수집")

        # body inner_text 파싱
        adset_perf = self._parse_body_text(date_str)
        performances.extend(adset_perf)

        if performances:
            try:
                insert_performance(performances)
                print(f"[✓] {len(performances)}건 성과 데이터 저장 완료")
            except Exception as e:
                print(f"[!] DB 저장 에러: {e}")
        else:
            print(f"[!] {date_str} 수집된 성과 데이터 없음")

        return performances

    def _parse_body_text(self, date_str: str) -> list:
        """body inner_text에서 광고세트 행별 성과 데이터 추출"""
        performances = []

        try:
            body = self.page.inner_text("body")
        except:
            return performances

        lines = body.split("\n")
        lines = [l.strip() for l in lines if l.strip()]

        # 광고세트 행 패턴 탐색
        # 토스애즈 행 패턴: ID(5~7자리) → 이름 → 상태 → 지표들
        i = 0
        while i < len(lines):
            line = lines[i]

            # 5~7자리 숫자 = 광고세트 ID
            id_match = re.match(r'^(\d{5,7})$', line)
            if id_match:
                entry_id = id_match.group(1)

                # 주변 라인에서 이름과 지표 수집
                context_lines = lines[max(0, i-2):min(len(lines), i+20)]
                context_text = "\t".join(context_lines)

                entry_name = self._find_name(context_lines, entry_id)
                metrics = self._extract_metrics(context_lines)

                if metrics.get("spend", 0) > 0 or metrics.get("impressions", 0) > 0:
                    perf = {
                        "toss_adset_id": entry_id,
                        "ad_set_name": entry_name or f"광고세트_{entry_id}",
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
                          f"클릭:{perf['clicks']} 리드:{perf['leads']} CTR:{perf['ctr']}%")

            # "전체" 요약 행
            elif "전체 캠페인" in line or "전체 광고세트" in line:
                context_lines = lines[max(0, i-1):min(len(lines), i+10)]
                metrics = self._extract_metrics(context_lines)
                if metrics.get("spend", 0) > 0:
                    perf = {
                        "toss_adset_id": "summary",
                        "ad_set_name": "전체 요약",
                        "date": f"{date_str}T00:00:00Z",
                        "impressions": metrics.get("impressions", 0),
                        "clicks": metrics.get("clicks", 0),
                        "leads": metrics.get("leads", 0),
                        "spend": metrics.get("spend", 0),
                        "cpa": metrics.get("cpa", 0),
                        "ctr": metrics.get("ctr", 0),
                    }
                    performances.append(perf)
                    print(f"    [요약] 소진:₩{perf['spend']:,} 노출:{perf['impressions']:,}")

            i += 1

        return performances

    def _find_name(self, context_lines: list, exclude_id: str) -> str:
        """문맥 라인에서 광고세트 이름 추출"""
        for line in context_lines:
            # 한글/언더스코어 포함 + 5글자 이상 + 숫자만으로 이루어지지 않은 것
            if len(line) > 5 and line != exclude_id:
                if any(ch >= '\uac00' for ch in line) or '_' in line:
                    if not line.replace(',', '').replace('원', '').replace('%', '').isdigit():
                        if not re.match(r'^[\d,]+$', line):
                            return line[:100]
        return None

    def _extract_metrics(self, context_lines: list) -> dict:
        """문맥 라인 목록에서 성과 지표 추출"""
        metrics = {}
        money_count = 0  # 금액 패턴 순서 추적

        for line in context_lines:
            # CTR (XX.XX% 패턴)
            ctr_match = re.match(r'^([\d.]+)%$', line)
            if ctr_match and "ctr" not in metrics:
                metrics["ctr"] = float(ctr_match.group(1))
                continue

            # 금액 (숫자+원 패턴): 686원, 1,673원
            money_match = re.match(r'^([\d,]+)원$', line)
            if money_match:
                val = int(money_match.group(1).replace(',', ''))
                money_count += 1
                if money_count == 1:
                    metrics["spend"] = val  # 첫 번째 금액 = 소진비용
                elif money_count == 2:
                    metrics["cpm"] = val
                elif money_count == 3:
                    metrics["cpc"] = val
                elif money_count == 4:
                    metrics["cpa"] = val
                continue

            # 순수 정수: 노출수 > 도달수 > 클릭수 > 리드수
            if re.match(r'^[\d,]+$', line):
                val = int(line.replace(',', ''))
                if val > 0:
                    if "impressions" not in metrics:
                        metrics["impressions"] = val
                    elif "reach" not in metrics:
                        metrics["reach"] = val
                    elif "clicks" not in metrics:
                        metrics["clicks"] = val
                    elif "leads" not in metrics:
                        metrics["leads"] = val

            # 빈도수 (소수점)
            if re.match(r'^\d+\.\d+$', line) and "frequency" not in metrics:
                metrics["frequency"] = float(line)

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
