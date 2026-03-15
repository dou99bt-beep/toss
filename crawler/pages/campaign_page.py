"""
CampaignPage — 토스애즈 캠페인/광고세트/소재 데이터 수집

실제 토스애즈 DOM 구조 (스크린샷 기반):
- 캠페인 탭: 테이블에 캠페인ID, 이름, 상태, 예산, 소진비용 표시
- 광고세트 탭: 테이블에 광고세트ID, 이름, 노출상태, 상위캠페인, 광고유형 등
- 소재 탭: 소재 목록

네비게이션 흐름:
1. 로그인 → "내 광고계정" → 0105명률DB 클릭
2. 대시보드 → 사이드바 "배너" 클릭 → display-ads
3. 캠페인/광고세트/소재 탭 전환
"""
import re
import time
from .base_page import BasePage
from ..core.supabase_client import upsert_campaigns, upsert_ad_sets

ADS_BASE_URL = "https://ads-platform.toss.im"


class CampaignPage(BasePage):

    def select_ad_account(self, account_name: str = None):
        """광고계정 선택"""
        print("[→] 광고계정 선택 중...")
        page_text = self.page.inner_text("body")
        
        if "내 광고계정" not in page_text and "비즈니스 그룹" not in page_text:
            print("[→] 이미 광고계정 내부에 있습니다.")
            return True
        
        print("[✓] 광고계정 선택 페이지 감지")
        target = account_name or "0105명률DB"
        try:
            loc = self.page.get_by_text(target, exact=True)
            el = loc.first.element_handle() if loc.count() > 0 else None
        except:
            el = None
        
        if not el:
            links = self.page.query_selector_all("a[href*='/advertiser/']")
            el = links[1] if len(links) >= 2 else (links[0] if links else None)
        
        if el:
            el.click()
            print("[✓] 광고계정 클릭 완료")
            time.sleep(8)
            return True
        
        print("[!] 광고계정을 찾을 수 없습니다.")
        return False

    def _nav_to_display_ads(self):
        """display-ads 페이지로 이동"""
        current_url = self.page.url
        if "display-ads" in current_url:
            return True
        
        # Strategy 1: Playwright locator로 사이드바 "배너" 클릭 (SPA 내부 라우팅)
        print("[→] 사이드바 '배너' 메뉴 클릭 시도...")
        try:
            # "배너" 텍스트가 포함된 요소 클릭 (사이드바)
            banner_loc = self.page.locator("text=배너").first
            if banner_loc.is_visible(timeout=3000):
                banner_loc.click()
                time.sleep(8)
                if "display-ads" in self.page.url:
                    print("[✓] 사이드바 '배너' 클릭 → display-ads 도달")
                    return True
                print(f"[!] 클릭 후 URL: {self.page.url}")
        except Exception as e:
            print(f"[!] 배너 locator 에러: {e}")
        
        # Strategy 2: 모든 a 태그에서 display-ads 링크 찾기
        all_links = self.page.query_selector_all("a")
        for a in all_links:
            href = a.get_attribute("href") or ""
            if "display-ads" in href:
                a.click()
                time.sleep(8)
                print(f"[✓] display-ads 링크 클릭: {href}")
                return True
        
        # Strategy 3: URL 직접 이동 + 추가 대기
        if "/advertiser" in current_url:
            display_url = f"{ADS_BASE_URL}/advertiser/display-ads"
            print(f"[→] display-ads 직접 이동: {display_url}")
            self.page.goto(display_url, wait_until="networkidle", timeout=30000)
            time.sleep(10)
            print(f"[→] 이동 후 URL: {self.page.url}")
            return True
        
        print("[!] display-ads 페이지 이동 실패")
        return False

    def sync_all(self):
        """전체 동기화: 계정선택 → display-ads → 캠페인 → 광고세트"""
        print(f"\n{'='*50}")
        print("[SYNC] 캠페인/광고세트 동기화 시작")
        print(f"{'='*50}")
        
        # Step 1: 계정 선택 (display-ads URL 접근 시 계정선택 트리거됨)
        self.select_ad_account()
        
        # Step 2: 계정 선택 후 display-ads로 다시 이동
        #   계정 선택 후 dashboard로 리다이렉트되므로 display-ads를 다시 방문
        display_url = f"{ADS_BASE_URL}/advertiser/display-ads"
        print(f"[→] display-ads 재이동: {display_url}")
        self.safe_goto(display_url)
        time.sleep(5)
        
        # 계정 선택 페이지가 다시 뜨면 즉시 계정 클릭
        body = self.page.inner_text("body")
        if "내 광고계정" in body:
            self.select_ad_account()
            self.safe_goto(display_url)
            time.sleep(5)
        
        self._save_screenshot("display_ads")
        print(f"[DEBUG] URL: {self.page.url}")

        # 3. 캠페인 수집
        campaigns = self._collect_campaigns()
        
        # 4. 광고세트 탭 클릭 → 수집
        self._click_tab("광고세트")
        ad_sets = self._collect_ad_sets()

        print(f"\n[SYNC 결과] 캠페인: {len(campaigns)}건, 광고세트: {len(ad_sets)}건")
        return True

    def _click_tab(self, tab_name: str):
        """탭 클릭 (캠페인/광고세트/소재)"""
        try:
            loc = self.page.get_by_text(tab_name, exact=True)
            tab = loc.first.element_handle() if loc.count() > 0 else None
        except:
            tab = None
        if tab:
            tab.click()
            print(f"[✓] '{tab_name}' 탭 클릭")
            time.sleep(5)
            self._save_screenshot(f"tab_{tab_name}")
        else:
            print(f"[!] '{tab_name}' 탭을 찾을 수 없습니다.")

    def _collect_campaigns(self) -> list:
        """캠페인 테이블에서 데이터 수집"""
        print("\n[→] 캠페인 수집 중...")
        campaigns = []
        
        # 테이블 행 읽기
        rows = self.page.query_selector_all("table tbody tr")
        if not rows:
            # 테이블이 없으면 div 기반 리스트 시도
            rows = self.page.query_selector_all("[role='row']")
        
        print(f"  테이블 행: {len(rows)}개")
        
        for row in rows:
            text = row.inner_text().strip()
            if not text or "전체 캠페인" in text:
                continue
            
            # 캠페인 ID 추출 (6자리 숫자)
            cells = row.query_selector_all("td")
            if not cells or len(cells) < 2:
                continue
            
            # 첫번째 셀: 체크박스, 두번째: ID, 세번째: 이름
            campaign_id = None
            campaign_name = None
            status = "OFF"
            budget = 0
            spend = 0
            
            for cell in cells:
                cell_text = cell.inner_text().strip()
                
                # 6자리 숫자 = 캠페인 ID
                if re.match(r'^\d{5,7}$', cell_text) and not campaign_id:
                    campaign_id = cell_text
                
                # 한글 포함 긴 텍스트 = 캠페인 이름
                elif len(cell_text) > 5 and not campaign_name and not cell_text.replace(',','').replace('원','').replace('₩','').isdigit():
                    if any(c >= '\uac00' for c in cell_text):  # 한글 포함
                        campaign_name = cell_text[:100]
                
                # ON/OFF 상태
                if "집행중" in cell_text or "ON" in cell_text.upper():
                    status = "ON"
                
                # 금액 (콤마 포함 숫자 + 원)
                money = re.search(r'([\d,]+)원', cell_text)
                if money:
                    val = int(money.group(1).replace(',', ''))
                    if val > 100000 and budget == 0:
                        budget = val
                    elif val > 0:
                        spend = val
            
            # ON 토글 확인
            toggle = row.query_selector("[class*='toggle'], [class*='switch']")
            if toggle:
                toggle_text = toggle.inner_text() if toggle else ""
                toggle_class = toggle.get_attribute("class") or ""
                if "on" in toggle_class.lower() or "ON" in toggle_text:
                    status = "ON"
            
            if campaign_id:
                data = {
                    "toss_campaign_id": campaign_id,
                    "name": campaign_name or f"캠페인_{campaign_id}",
                    "status": status,
                    "budget": budget,
                }
                campaigns.append(data)
                print(f"  [캠페인] {campaign_name or campaign_id} (ID:{campaign_id}) 상태:{status} 예산:₩{budget:,}")
        
        if campaigns:
            upsert_campaigns(campaigns)
        else:
            body = self.page.inner_text("body")
            if "내역이 없어요" in body:
                print("  [!] 캠페인 내역이 없습니다.")
            else:
                print(f"  [DEBUG] 텍스트 앞200자: {body[:200]}")
        
        return campaigns

    def _collect_ad_sets(self) -> list:
        """광고세트 테이블에서 데이터 수집"""
        print("\n[→] 광고세트 수집 중...")
        ad_sets = []
        
        rows = self.page.query_selector_all("table tbody tr")
        if not rows:
            rows = self.page.query_selector_all("[role='row']")
        
        print(f"  테이블 행: {len(rows)}개")
        
        for row in rows:
            text = row.inner_text().strip()
            if not text or "전체 광고세트" in text:
                continue
            
            cells = row.query_selector_all("td")
            if not cells or len(cells) < 2:
                continue
            
            adset_id = None
            adset_name = None
            status = "OFF"
            campaign_name = None
            
            for cell in cells:
                cell_text = cell.inner_text().strip()
                
                # 6~7자리 숫자 = 광고세트 ID
                if re.match(r'^\d{5,7}$', cell_text) and not adset_id:
                    adset_id = cell_text
                
                # 긴 한글 텍스트 = 광고세트 이름 (보통 가장 긴 텍스트)
                elif len(cell_text) > 10 and not adset_name:
                    if any(c >= '\uac00' for c in cell_text) or '_' in cell_text:
                        adset_name = cell_text[:150]
                
                # 상위 캠페인명 (명률1차 0105 형태)
                elif "명률" in cell_text and len(cell_text) < 30:
                    campaign_name = cell_text
                
                # ON/OFF
                if cell_text.upper() == "ON":
                    status = "ON"
            
            # 토글 확인
            toggle = row.query_selector("[class*='toggle'], [class*='switch']")
            if toggle:
                tc = (toggle.get_attribute("class") or "").lower()
                if "on" in tc or "active" in tc or "checked" in tc:
                    status = "ON"
            
            if adset_id:
                data = {
                    "toss_adset_id": adset_id,
                    "name": adset_name or f"광고세트_{adset_id}",
                    "status": status,
                    "target_cpa": 0,
                }
                # toss_campaign_id 추가 (상위 캠페인 연결용)
                if campaign_name:
                    data["toss_campaign_id"] = campaign_name
                
                ad_sets.append(data)
                status_icon = "🟢" if status == "ON" else "⚪"
                print(f"  {status_icon} [{adset_id}] {(adset_name or '')[:50]}")
        
        if ad_sets:
            upsert_ad_sets(ad_sets)
        else:
            body = self.page.inner_text("body")
            if "내역이 없어요" in body:
                print("  [!] 광고세트 내역이 없습니다.")
        
        return ad_sets
