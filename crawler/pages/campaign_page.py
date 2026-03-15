"""
CampaignPage — 토스애즈 캠페인/광고세트/소재 데이터 수집
- API 응답 인터셉트 방식 우선
- DOM 파싱 fallback
"""
import json
import re
import uuid
from datetime import datetime
from .base_page import BasePage
from ..core.supabase_client import upsert_campaigns, upsert_ad_sets, upsert_creatives

ADS_BASE_URL = "https://ads-platform.toss.im"
DISPLAY_ADS_URL = f"{ADS_BASE_URL}/advertiser/display-ads"


class CampaignPage(BasePage):

    def sync_all(self):
        """캠페인 → 광고세트 → 소재 순서로 동기화"""
        print("\n{'='*50}")
        print("[SYNC] 캠페인/광고세트/소재 동기화 시작")
        print("{'='*50}")
        
        campaigns = self._collect_campaigns()
        if not campaigns:
            print("[!] 캠페인 수집 실패")
            return False

        for campaign in campaigns:
            ad_sets = self._collect_ad_sets(campaign["toss_campaign_id"])
            if ad_sets:
                for ad_set in ad_sets:
                    self._collect_creatives(campaign["toss_campaign_id"], ad_set["toss_adset_id"])

        print("[✓] 동기화 완료")
        return True

    def _collect_campaigns(self) -> list[dict]:
        """캠페인 목록 수집"""
        print("[→] 캠페인 목록 수집 중...")
        self.safe_goto(DISPLAY_ADS_URL)

        campaigns = []

        # 방법 1: DOM에서 캠페인 정보 추출
        try:
            # 캠페인 행 찾기
            self.page.wait_for_selector("[class*='campaign'], [class*='contract'], table tbody tr", timeout=10000)
            
            rows = self.page.query_selector_all("table tbody tr, [class*='campaign-item'], [class*='contract-item']")
            
            for row in rows:
                text = row.inner_text()
                if not text.strip():
                    continue
                
                # 링크에서 캠페인 ID 추출
                link = row.query_selector("a[href*='contract/']")
                campaign_id = None
                if link:
                    href = link.get_attribute("href") or ""
                    match = re.search(r'contract/(\d+)', href)
                    if match:
                        campaign_id = match.group(1)
                
                if campaign_id:
                    # 이름 추출 (첫 번째 텍스트 요소)
                    name_el = row.query_selector("a, [class*='name'], td:first-child")
                    name = name_el.inner_text().strip() if name_el else f"Campaign {campaign_id}"
                    
                    # 상태 추출
                    status = "ON"
                    status_el = row.query_selector("[class*='toggle'], [class*='status'], [class*='switch']")
                    if status_el:
                        status_text = status_el.get_attribute("aria-checked") or status_el.inner_text()
                        status = "ON" if status_text in ["true", "ON", "활성"] else "OFF"
                    
                    campaigns.append({
                        "toss_campaign_id": str(campaign_id),
                        "name": name[:100],
                        "status": status,
                        "budget": 0,
                    })
                    print(f"  [캠페인] {name} (ID: {campaign_id}, {status})")

        except Exception as e:
            print(f"[!] DOM 파싱 에러: {e}")
            self._save_screenshot("campaign_error")

        if campaigns:
            upsert_campaigns(campaigns)
        
        return campaigns

    def _collect_ad_sets(self, campaign_id: str) -> list[dict]:
        """특정 캠페인의 광고세트 목록 수집"""
        print(f"[→] 광고세트 수집 중 (캠페인 {campaign_id})...")
        
        url = f"{ADS_BASE_URL}/display-ads/v2/contract/{campaign_id}"
        self.safe_goto(url)

        ad_sets = []

        try:
            self.page.wait_for_selector("table tbody tr, [class*='adset'], [class*='set-item']", timeout=10000)
            
            rows = self.page.query_selector_all("table tbody tr, [class*='adset-item'], [class*='set-item']")
            
            for row in rows:
                text = row.inner_text()
                if not text.strip():
                    continue
                
                # 광고세트 ID 추출
                link = row.query_selector("a[href*='set/']")
                adset_id = None
                if link:
                    href = link.get_attribute("href") or ""
                    match = re.search(r'set/(\d+)', href)
                    if match:
                        adset_id = match.group(1)
                
                if adset_id:
                    # 캠페인 DB ID 조회
                    from ..core.supabase_client import supabase
                    camp_result = supabase.table("campaigns").select("id").eq("toss_campaign_id", campaign_id).execute()
                    camp_db_id = camp_result.data[0]["id"] if camp_result.data else str(uuid.uuid4())
                    
                    name_el = row.query_selector("a, [class*='name'], td:first-child")
                    name = name_el.inner_text().strip() if name_el else f"AdSet {adset_id}"
                    
                    status = "ON"
                    status_el = row.query_selector("[class*='toggle'], [class*='status']")
                    if status_el:
                        status_text = status_el.get_attribute("aria-checked") or status_el.inner_text()
                        status = "ON" if status_text in ["true", "ON"] else "OFF"
                    
                    ad_sets.append({
                        "campaign_id": camp_db_id,
                        "toss_adset_id": str(adset_id),
                        "name": name[:200],
                        "status": status,
                        "target_cpa": 0,
                    })
                    print(f"  [광고세트] {name[:50]}... (ID: {adset_id}, {status})")

        except Exception as e:
            print(f"[!] 광고세트 파싱 에러: {e}")
            self._save_screenshot("adset_error")

        if ad_sets:
            upsert_ad_sets(ad_sets)
        
        return ad_sets

    def _collect_creatives(self, campaign_id: str, adset_id: str):
        """특정 광고세트의 소재 수집"""
        print(f"  [→] 소재 수집 중 (광고세트 {adset_id})...")

        # 소재 탭으로 이동
        url = f"{DISPLAY_ADS_URL}?contractIds={campaign_id}&tab=ad&setIds={adset_id}"
        self.safe_goto(url)

        creatives = []

        try:
            self.page.wait_for_selector("table tbody tr, [class*='creative'], [class*='ad-item']", timeout=10000)
            
            rows = self.page.query_selector_all("table tbody tr, [class*='ad-item']")
            
            for i, row in enumerate(rows):
                text = row.inner_text()
                if not text.strip():
                    continue
                    
                # 소재 ID 추출
                link = row.query_selector("a[href*='ad/']")
                creative_id = None
                if link:
                    href = link.get_attribute("href") or ""
                    match = re.search(r'ad/(\d+)', href)
                    if match:
                        creative_id = match.group(1)
                
                if not creative_id:
                    creative_id = f"{adset_id}-{i+1}"

                # 광고세트 DB ID
                from ..core.supabase_client import supabase
                adset_result = supabase.table("ad_sets").select("id").eq("toss_adset_id", adset_id).execute()
                adset_db_id = adset_result.data[0]["id"] if adset_result.data else str(uuid.uuid4())
                
                name_el = row.query_selector("[class*='name'], td:nth-child(2), a")
                content = name_el.inner_text().strip() if name_el else f"Creative {creative_id}"
                
                creatives.append({
                    "ad_set_id": adset_db_id,
                    "toss_creative_id": str(creative_id),
                    "type": "TEXT",
                    "content": content[:200],
                })
                print(f"    [소재] {content[:40]}... (ID: {creative_id})")

        except Exception as e:
            print(f"  [!] 소재 파싱 에러: {e}")

        if creatives:
            upsert_creatives(creatives)
