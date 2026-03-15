"""
Supabase 클라이언트 — 크롤러에서 DB 저장용
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://eqborqviqnjlqkmtwtox.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYm9ycXZpcW5qbHFrbXR3dG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ3NTgsImV4cCI6MjA4OTEzMDc1OH0.z_VDvIy5Hl46r5ncgziuaCtF_bBUNCIoPF6QKbSzHz8")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_campaigns(campaigns: list[dict]):
    """캠페인 데이터 upsert (중복시 업데이트)"""
    if not campaigns:
        return
    try:
        result = supabase.table("campaigns").upsert(
            campaigns, on_conflict="toss_campaign_id"
        ).execute()
        print(f"[DB] campaigns: {len(result.data)}건 저장")
        return result.data
    except Exception as e:
        print(f"[DB] campaigns upsert 에러: {e}")
        # 개별 건으로 재시도
        for c in campaigns:
            try:
                supabase.table("campaigns").upsert(
                    c, on_conflict="toss_campaign_id"
                ).execute()
            except:
                pass
        return []


def upsert_ad_sets(ad_sets: list[dict]):
    """광고세트 데이터 upsert"""
    if not ad_sets:
        return
    try:
        result = supabase.table("ad_sets").upsert(
            ad_sets, on_conflict="toss_adset_id"
        ).execute()
        print(f"[DB] ad_sets: {len(result.data)}건 저장")
        return result.data
    except Exception as e:
        print(f"[DB] ad_sets upsert 에러: {e}")
        for a in ad_sets:
            try:
                supabase.table("ad_sets").upsert(
                    a, on_conflict="toss_adset_id"
                ).execute()
            except:
                pass
        return []


def upsert_creatives(creatives: list[dict]):
    """소재 데이터 upsert"""
    if not creatives:
        return
    try:
        result = supabase.table("creatives").upsert(
            creatives, on_conflict="toss_creative_id"
        ).execute()
        print(f"[DB] creatives: {len(result.data)}건 저장")
        return result.data
    except Exception as e:
        print(f"[DB] creatives upsert 에러: {e}")
        return []


def insert_performance(data: list[dict]):
    """성과 데이터 삽입 (중복 무시)"""
    if not data:
        return
    try:
        result = supabase.table("performance_daily").upsert(
            data, on_conflict="date,toss_adset_id"
        ).execute()
        print(f"[DB] performance_daily: {len(result.data)}건 저장")
        return result.data
    except Exception as e:
        print(f"[DB] performance 저장 에러: {e}")
        return []


def insert_crawler_log(log: dict):
    """크롤러 실행 로그 저장"""
    try:
        result = supabase.table("crawler_logs").insert(log).execute()
        return result.data
    except Exception as e:
        print(f"[DB] crawler_log 에러: {e}")
        return []
