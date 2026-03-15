"""
CampaignPage — 토스애즈 캠페인/광고세트/소재 데이터 수집

토스애즈 페이지 흐름:
1. 로그인 후 → "내 광고계정" 페이지 (계정 선택)
2. 광고계정 클릭 → advertiser/{id}/display-ads (캠페인 목록)
3. 캠페인 클릭 → 광고세트 목록
4. 광고세트 클릭 → 소재 목록

데이터 수집은 주로 API 인터셉트 + DOM 파싱 혼합
"""
import json
import re
import uuid
import time
from datetime import datetime
from .base_page import BasePage
from ..core.supabase_client import upsert_campaigns, upsert_ad_sets, upsert_creatives

ADS_BASE_URL = "https://ads-platform.toss.im"


class CampaignPage(BasePage):

    def select_ad_account(self, account_name: str = None):
        """광고계정 선택 (내 광고계정 페이지에서)"""
        print("[→] 광고계정 선택 중...")
        
        page_text = self.page.inner_text("body")
        
        if "내 광고계정" in page_text or "비즈니스 그룹" in page_text:
            print("[✓] 광고계정 선택 페이지 감지")
            
            # 특정 계정 이름으로 찾기 (0105명률DB가 라이브 광고 계정)
            target_name = account_name or "0105명률DB"
            account_el = self.page.query_selector(f"text={target_name}")
            
            if not account_el:
                # a 태그에서 advertiser 링크 찾기 → 두 번째 계정 시도
                account_links = self.page.query_selector_all("a[href*='/advertiser/']")
                if len(account_links) >= 2:
                    account_el = account_links[1]  # 두 번째 계정
                    print(f"[→] 두 번째 광고계정 선택")
                elif account_links:
                    account_el = account_links[0]
                    print(f"[→] 첫 번째 광고계정 선택")
            
            if account_el:
                account_el.click()
                print("[✓] 광고계정 클릭 완료")
                time.sleep(8)  # SPA 로딩 대기
                self._save_screenshot("account_selected")
                return True
            else:
                # 텍스트가 있는 모든 요소 중 클릭 가능한 것 찾기
                all_els = self.page.query_selector_all("[class*='account'], [class*='item']")
                for el in all_els:
                    t = el.inner_text()
                    if "명률" in t and "비즈니스" not in t:
                        el.click()
                        print(f"[✓] '{t.strip()[:30]}' 클릭")
                        time.sleep(8)
                        return True
                print("[!] 클릭할 광고계정을 찾을 수 없습니다.")
                self._save_screenshot("no_account_found")
                return False
        else:
            print("[→] 이미 광고계정 내부에 있습니다.")
            return True

    def sync_all(self):
        """캠페인 → 광고세트 동기화"""
        print(f"\n{'='*50}")
        print("[SYNC] 캠페인/광고세트/소재 동기화 시작")
        print(f"{'='*50}")
        
        # Step 1: 광고계정 선택
        self.select_ad_account()
        
        # Step 2: 현재 페이지 확인
        self._save_screenshot("before_sync")
        print(f"[DEBUG] 현재 URL: {self.page.url}")
        
        # Step 3: 사이드바에서 "배너" 클릭 → display-ads 페이지로 이동
        current_url = self.page.url
        if "display-ads" not in current_url:
            print("[→] 사이드바에서 '배너' 메뉴 클릭...")
            # 사이드바의 "배너" 링크 클릭 (href에 display-ads 포함)
            banner_link = self.page.query_selector("a[href*='display-ads']")
            if not banner_link:
                # 텍스트로 찾기
                banner_link = self.page.query_selector("nav >> text=배너")
                if not banner_link:
                    banner_link = self.page.query_selector("text=배너")
            
            if banner_link:
                banner_link.click()
                print("[✓] '배너' 메뉴 클릭 완료")
                time.sleep(8)
                self._save_screenshot("display_ads_navigated")
            else:
                # URL 직접 이동
                adv_match = re.search(r'/advertiser/(\d+)', current_url)
                if adv_match:
                    display_url = f"{ADS_BASE_URL}/advertiser/{adv_match.group(1)}/display-ads"
                    print(f"[→] 직접 URL 이동: {display_url}")
                    self.safe_goto(display_url)
                else:
                    print("[!] display-ads 페이지를 찾을 수 없습니다.")
        
        # Step 4: 광고세트 탭 클릭
        print("[→] '광고세트' 탭 확인 중...")
        adset_tab = self.page.query_selector("text=광고세트")
        if adset_tab:
            adset_tab.click()
            print("[✓] '광고세트' 탭 클릭")
            time.sleep(5)
            self._save_screenshot("adset_tab")
        
        # Step 5: 현재 페이지 분석 & 데이터 수집
        self._save_screenshot("final_page")
        page_text = self.page.inner_text("body")
        print(f"[DEBUG] URL: {self.page.url}")
        
        campaigns = self._collect_from_page(page_text)
        
        if campaigns:
            print(f"[✓] {len(campaigns)}건 동기화 완료")
        else:
            if "내역이 없어요" in page_text:
                print("[!] '내역이 없어요' — 이 계정에 캠페인이 없습니다.")
            else:
                print(f"[DEBUG] 텍스트 (300자): {page_text[:300]}")
        
        return True

    def _collect_from_page(self, page_text: str) -> list[dict]:
        """현재 페이지에서 캠페인/광고세트 정보 추출"""
        campaigns = []
        
        # 테이블 행 검색
        try:
            rows = self.page.query_selector_all("table tbody tr")
            if rows:
                print(f"[→] 테이블 발견: {len(rows)}행")
                for row in rows:
                    self._parse_campaign_row(row, campaigns)
        except Exception as e:
            print(f"[!] 테이블 파싱 에러: {e}")

        # 테이블이 없으면 리스트/카드 형식 검색
        if not campaigns:
            try:
                items = self.page.query_selector_all("[class*='item'], [class*='row'], [class*='card']")
                if items:
                    print(f"[→] 리스트 아이템 발견: {len(items)}개")
                    for item in items:
                        self._parse_list_item(item, campaigns)
            except Exception as e:
                print(f"[!] 리스트 파싱 에러: {e}")

        # 링크에서 캠페인 ID 추출
        if not campaigns:
            try:
                links = self.page.query_selector_all("a[href*='contract']")
                for link in links:
                    href = link.get_attribute("href") or ""
                    text = link.inner_text().strip()
                    match = re.search(r'contract(?:Ids?|/)?[=/]?(\d+)', href)
                    if match and text:
                        campaign_id = match.group(1)
                        campaigns.append({
                            "toss_campaign_id": campaign_id,
                            "name": text[:100],
                            "status": "ON",
                            "budget": 0,
                        })
                        print(f"  [캠페인] {text[:50]} (ID: {campaign_id})")
            except Exception as e:
                print(f"[!] 링크 파싱 에러: {e}")

        if campaigns:
            upsert_campaigns(campaigns)
        
        return campaigns

    def _parse_campaign_row(self, row, campaigns: list):
        """테이블 행에서 캠페인 데이터 추출"""
        text = row.inner_text().strip()
        if not text:
            return
        
        link = row.query_selector("a")
        if link:
            href = link.get_attribute("href") or ""
            name = link.inner_text().strip()
            
            # ID 추출
            match = re.search(r'(\d{5,})', href)
            if match:
                campaigns.append({
                    "toss_campaign_id": match.group(1),
                    "name": name[:100],
                    "status": "ON",
                    "budget": 0,
                })
                print(f"  [캠페인] {name[:50]} (ID: {match.group(1)})")

    def _parse_list_item(self, item, campaigns: list):
        """리스트/카드 아이템에서 데이터 추출"""
        text = item.inner_text().strip()
        link = item.query_selector("a")
        
        if link:
            href = link.get_attribute("href") or ""
            match = re.search(r'(\d{5,})', href)
            if match and text:
                campaigns.append({
                    "toss_campaign_id": match.group(1),
                    "name": text[:100],
                    "status": "ON",
                    "budget": 0,
                })
