"""
CreativeFatigueDetector — 소재 피로도 자동 감지

일별 CTR 추세를 추적하여 3일 연속 20% 이상 하락 시 경고.
"""
from datetime import datetime, timedelta
from ..core.supabase_client import supabase


class CreativeFatigueDetector:

    def detect(self, days: int = 7, threshold: float = 0.20) -> list:
        """소재 피로도 감지"""
        print(f"\n{'='*60}")
        print(f"  🎨 소재 피로도 분석 (최근 {days}일)")
        print(f"{'='*60}")

        # 광고세트별 일별 성과 로드
        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        try:
            res = supabase.table("performance_daily") \
                .select("*") \
                .gte("date", since) \
                .order("date") \
                .execute()
            perf = res.data or []
        except:
            perf = []

        if not perf:
            print("[!] 성과 데이터 없음")
            return []

        # 광고세트별 일별 CTR 집계
        daily_ctr = {}  # {adset_id: [{date, ctr}, ...]}
        for p in perf:
            aid = p.get("toss_adset_id")
            if not aid or aid == "summary":
                continue
            if aid not in daily_ctr:
                daily_ctr[aid] = []

            impressions = p.get("impressions", 0)
            clicks = p.get("clicks", 0)
            ctr = (clicks / impressions * 100) if impressions > 0 else 0

            daily_ctr[aid].append({
                "date": p.get("date"),
                "ctr": round(ctr, 3),
                "impressions": impressions,
                "clicks": clicks,
            })

        # 피로도 감지
        alerts = []
        for aid, entries in daily_ctr.items():
            if len(entries) < 3:
                continue

            # 최근 3일 CTR 추세 확인
            recent = entries[-3:]
            declining = True
            for i in range(1, len(recent)):
                if recent[i]["ctr"] >= recent[i-1]["ctr"]:
                    declining = False
                    break

            if not declining:
                continue

            # 하락률 계산
            first_ctr = recent[0]["ctr"]
            last_ctr = recent[-1]["ctr"]
            if first_ctr > 0:
                drop_rate = (first_ctr - last_ctr) / first_ctr
                if drop_rate >= threshold:
                    alert = {
                        "adset_id": aid,
                        "type": "CREATIVE_FATIGUE",
                        "severity": "HIGH" if drop_rate > 0.3 else "MEDIUM",
                        "first_ctr": round(first_ctr, 2),
                        "last_ctr": round(last_ctr, 2),
                        "drop_rate": round(drop_rate * 100, 1),
                        "period": f"{recent[0]['date']} ~ {recent[-1]['date']}",
                        "message": f"CTR {first_ctr:.2f}% → {last_ctr:.2f}% (↓{drop_rate*100:.1f}%)",
                    }
                    alerts.append(alert)

                    icon = "🔴" if drop_rate > 0.3 else "🟡"
                    print(f"\n  {icon} [{aid}] 소재 피로도 감지!")
                    print(f"     CTR: {first_ctr:.2f}% → {last_ctr:.2f}% (↓{drop_rate*100:.1f}%)")
                    print(f"     기간: {recent[0]['date']} ~ {recent[-1]['date']}")
                    print(f"     추천: 새 소재 등록 또는 기존 미사용 소재 활성화")

        if not alerts:
            print("\n  ✅ 피로도 감지된 광고세트 없음")

        return alerts
