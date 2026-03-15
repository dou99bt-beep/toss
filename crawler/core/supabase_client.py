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
    """캠페인 데이터 upsert"""
    if not campaigns:
        return
    result = supabase.table("campaigns").upsert(campaigns, on_conflict="toss_campaign_id").execute()
    print(f"[DB] campaigns: {len(result.data)}건 저장")
    return result.data


def upsert_ad_sets(ad_sets: list[dict]):
    """광고세트 데이터 upsert"""
    if not ad_sets:
        return
    result = supabase.table("ad_sets").upsert(ad_sets, on_conflict="toss_adset_id").execute()
    print(f"[DB] ad_sets: {len(result.data)}건 저장")
    return result.data


def upsert_creatives(creatives: list[dict]):
    """소재 데이터 upsert"""
    if not creatives:
        return
    result = supabase.table("creatives").upsert(creatives, on_conflict="toss_creative_id").execute()
    print(f"[DB] creatives: {len(result.data)}건 저장")
    return result.data


def insert_performance(table: str, data: list[dict]):
    """성과 데이터 삽입 (중복 무시)"""
    if not data:
        return
    result = supabase.table(table).insert(data).execute()
    print(f"[DB] {table}: {len(result.data)}건 삽입")
    return result.data


def insert_crawler_log(log: dict):
    """크롤러 실행 로그 저장"""
    result = supabase.table("crawler_logs").insert(log).execute()
    return result.data
