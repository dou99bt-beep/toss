"""
AdSetConfigCollector — 광고세트 상세 설정 수집

캠페인 상세 페이지 사이드바에서 각 광고세트를 클릭하여:
- 입찰 방식 (자동/직접, 전환최대, 목표비용)
- 일 예산
- 노출 시간 (항상/시간설정/요일별)
- 타겟 (성별, 연령, 관심·속성정보, 업종)
- 소재 목록
을 파싱하여 ad_set_configs 테이블에 저장
"""
import re
import json
import time
from datetime import datetime
from .base_page import BasePage
from ..core.supabase_client import supabase

ADS_URL = "https://ads-platform.toss.im"
CAMPAIGN_ID = "336305"


class AdSetConfigCollector(BasePage):

    def collect_all_configs(self):
        """모든 광고세트의 상세 설정 수집"""
        print(f"\n{'='*50}")
        print("[CONFIG] 광고세트 상세 설정 수집 시작")
        print(f"{'='*50}")

        # 1. display-ads 페이지 → 계정 선택
        self.safe_goto(f"{ADS_URL}/advertiser/display-ads")
        time.sleep(8)
        body = self.page.inner_text("body")
        if "내 광고계정" in body or "비즈니스 그룹" in body:
            try:
                self.page.get_by_text("0105명률DB").first.click()
                time.sleep(8)
                print("[✓] 계정 선택")
            except:
                pass
            # display-ads 재이동
            self.safe_goto(f"{ADS_URL}/advertiser/display-ads")
            time.sleep(5)

        # 2. 광고세트 탭 → ID 목록 수집
        adset_ids = self._get_adset_ids_from_table()
        if not adset_ids:
            print("[!] 광고세트 ID를 찾지 못했습니다")
            return []

        print(f"[✓] {len(adset_ids)}개 광고세트 발견")

        # 3. 각 광고세트 상세 페이지 순회
        configs = []
        for i, item in enumerate(adset_ids):
            print(f"\n--- [{i+1}/{len(adset_ids)}] ID:{item['id']} {item['name'][:40]} ---")
            config = self._collect_single_config(item)
            if config:
                configs.append(config)
            time.sleep(2)

        # 4. DB 저장
        if configs:
            self._save_configs(configs)

        print(f"\n[✓] 총 {len(configs)}개 광고세트 설정 수집 완료")
        return configs

    def _get_adset_ids_from_table(self) -> list:
        """display-ads 광고세트 탭에서 ID 목록 추출"""
        items = []

        # 광고세트 탭 클릭
        try:
            tab = self.page.get_by_text("광고세트", exact=True).first
            tab.click()
            time.sleep(5)
        except:
            pass

        rows = self.page.query_selector_all("table tbody tr")
        print(f"  테이블 행: {len(rows)}개")

        for row in rows:
            text = row.inner_text().strip()
            cells = [c.strip() for c in text.split("\t") if c.strip()]
            for j, cell in enumerate(cells):
                if re.match(r'^\d{5,7}$', cell):
                    name = cells[j + 1] if j + 1 < len(cells) else ""
                    items.append({"id": cell, "name": name[:80]})
                    break

        return items

    def _collect_single_config(self, item: dict) -> dict:
        """단일 광고세트의 상세 설정 수집"""
        adset_id = item["id"]

        # 광고세트 상세 페이지 이동
        url = f"{ADS_URL}/display-ads/v2/contract/{CAMPAIGN_ID}/set/{adset_id}"
        self.safe_goto(url)
        time.sleep(5)

        # 전체 스크롤 다운
        self.page.evaluate("window.scrollTo(0, 5000)")
        time.sleep(2)

        # 페이지 텍스트 추출
        body = self.page.inner_text("body")

        config = {
            "toss_adset_id": adset_id,
            "adset_name": item["name"],
        }

        # 1. 입찰 방식 파싱
        config.update(self._parse_bid_settings(body))

        # 2. 예산 파싱
        config.update(self._parse_budget(body))

        # 3. 노출 시간 파싱
        config.update(self._parse_schedule(body))

        # 4. 노출 기간 파싱
        config.update(self._parse_period(body))

        # 5. 타겟 파싱
        config.update(self._parse_target(body))

        # 6. 소재 파싱
        config.update(self._parse_creatives(body))

        # 7. 광고 유형
        config["ad_format"] = self._detect_format(body)

        print(f"  입찰: {config.get('bid_type')} / {config.get('bid_strategy')}")
        print(f"  예산: ₩{config.get('daily_budget', 0):,}")
        print(f"  노출: {config.get('schedule_type')}")
        print(f"  타겟: {config.get('target_gender')} / 소재:{config.get('creatives_count', 0)}개")

        return config

    def _parse_bid_settings(self, text: str) -> dict:
        """입찰 방식 파싱"""
        result = {"bid_type": None, "bid_strategy": None, "target_cost": 0}

        if "자동 입찰" in text:
            result["bid_type"] = "자동 입찰"
            if "전환 최대" in text or "전환최대" in text:
                result["bid_strategy"] = "전환 최대"
        elif "직접 입찰" in text:
            result["bid_type"] = "직접 입찰"

        # 목표 비용
        m = re.search(r'목표 비용\s*\n?\s*([\d,]+)\s*원', text)
        if m:
            result["target_cost"] = int(m.group(1).replace(',', ''))

        return result

    def _parse_budget(self, text: str) -> dict:
        """일 예산 파싱"""
        result = {"daily_budget": 0}
        # "일 예산" 뒤의 숫자
        m = re.search(r'일 예산[^\d]*([\d,]+)\s*원', text)
        if m:
            result["daily_budget"] = int(m.group(1).replace(',', ''))
        return result

    def _parse_schedule(self, text: str) -> dict:
        """노출 시간 파싱"""
        result = {"schedule_type": "항상 노출", "schedule_json": None}

        if "요일별 설정" in text:
            result["schedule_type"] = "요일별 설정"
            result["schedule_json"] = self._parse_schedule_grid()
        elif "시간 설정" in text and "항상 노출" not in text.split("시간 설정")[0][-20:]:
            result["schedule_type"] = "시간 설정"
        else:
            result["schedule_type"] = "항상 노출"

        return result

    def _parse_schedule_grid(self) -> dict:
        """요일별 노출 시간 그리드 파싱"""
        # 테이블에서 X(미노출) vs 빈칸(노출) 파싱
        schedule = {}
        days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

        rows = self.page.query_selector_all("table tr")
        for row in rows:
            text = row.inner_text().strip()
            # "00시\tX\tX\t\t\tX\tX\tX" 패턴
            m = re.match(r'(\d{1,2})시', text)
            if not m:
                continue
            hour = int(m.group(1))
            cells = text.split("\t")[1:]  # 시간 제외
            for i, cell in enumerate(cells):
                if i < len(days):
                    day = days[i]
                    if day not in schedule:
                        schedule[day] = []
                    if cell.strip() != "X":  # X가 아니면 노출
                        schedule[day].append(hour)

        return schedule if schedule else None

    def _parse_period(self, text: str) -> dict:
        """노출 기간 파싱"""
        result = {"period_type": "캠페인과 동일", "period_start": None, "period_end": None}

        if "직접 설정" in text and "캠페인과 동일" not in text.split("직접 설정")[0][-30:]:
            result["period_type"] = "직접 설정"
            dates = re.findall(r'(\d{4})\.\s*(\d{2})\.\s*(\d{2})', text)
            if len(dates) >= 1:
                result["period_start"] = f"{dates[0][0]}-{dates[0][1]}-{dates[0][2]}"
            if len(dates) >= 2:
                result["period_end"] = f"{dates[1][0]}-{dates[1][1]}-{dates[1][2]}"

        return result

    def _parse_target(self, text: str) -> dict:
        """타겟 설정 파싱"""
        result = {
            "target_gender": "전체",
            "target_age": "전체",
            "target_age_min": None,
            "target_age_max": None,
            "target_device": "전체",
            "target_carrier": "전체",
            "target_interests": None,
            "target_industries": None,
            "target_spending": None,
            "target_count": None,
        }

        # 성별
        if "남성" in text and "여성" not in text:
            result["target_gender"] = "남성"
        elif "여성" in text and "남성" not in text:
            result["target_gender"] = "여성"

        # 연령
        age_m = re.search(r'만\s*(\d+)세\s*[~～-]\s*만?\s*(\d+)세', text)
        if age_m:
            result["target_age"] = "특정 연령"
            result["target_age_min"] = int(age_m.group(1))
            result["target_age_max"] = int(age_m.group(2))

        # 타겟수
        count_m = re.search(r'([\d,]+)\s*명\s*예상', text)
        if count_m:
            result["target_count"] = int(count_m.group(1).replace(',', ''))

        return result

    def _parse_creatives(self, text: str) -> dict:
        """소재 정보 파싱"""
        # 사이드바에서 소재명 + 승인/반려 상태 추출
        creatives = []
        lines = text.split("\n")
        for i, line in enumerate(lines):
            line = line.strip()
            if line in ("승인", "반려"):
                # 이전 줄이 소재명
                if i > 0:
                    name = lines[i-1].strip()
                    if name and name not in ("승인", "반려"):
                        creatives.append({
                            "name": name[:50],
                            "status": line
                        })

        return {
            "creatives_count": len(creatives),
            "creatives_json": json.dumps(creatives, ensure_ascii=False) if creatives else None
        }

    def _detect_format(self, text: str) -> str:
        """광고 유형 감지"""
        if "보드" in text and "이미지" in text:
            return "보드"
        elif "비디오" in text:
            return "비디오"
        return "리스트"

    def _save_configs(self, configs: list):
        """수집된 설정을 DB에 저장"""
        today = datetime.now().strftime("%Y-%m-%d")
        saved = 0
        for c in configs:
            try:
                # schedule_json/creatives_json은 이미 문자열 또는 dict
                data = {
                    "toss_adset_id": c["toss_adset_id"],
                    "adset_name": c.get("adset_name"),
                    "bid_type": c.get("bid_type"),
                    "bid_strategy": c.get("bid_strategy"),
                    "target_cost": c.get("target_cost", 0),
                    "daily_budget": c.get("daily_budget", 0),
                    "ad_format": c.get("ad_format", "리스트"),
                    "schedule_type": c.get("schedule_type"),
                    "schedule_json": c.get("schedule_json"),
                    "period_type": c.get("period_type"),
                    "period_start": c.get("period_start"),
                    "period_end": c.get("period_end"),
                    "target_gender": c.get("target_gender"),
                    "target_age": c.get("target_age"),
                    "target_age_min": c.get("target_age_min"),
                    "target_age_max": c.get("target_age_max"),
                    "target_device": c.get("target_device"),
                    "target_carrier": c.get("target_carrier"),
                    "target_interests": c.get("target_interests"),
                    "target_industries": c.get("target_industries"),
                    "target_spending": c.get("target_spending"),
                    "target_count": c.get("target_count"),
                    "creatives_count": c.get("creatives_count", 0),
                    "creatives_json": c.get("creatives_json"),
                }
                supabase.table("ad_set_configs").insert(data).execute()
                saved += 1
            except Exception as e:
                print(f"  [!] DB 저장 에러 ({c['toss_adset_id']}): {e}")

        print(f"[DB] ad_set_configs: {saved}건 저장")
