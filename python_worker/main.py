import time
import requests
import json
from crawler import TossAdsCrawler
from decision_engine import DecisionEngine

# Node.js 백엔드 API 주소 (동일 컨테이너/로컬 환경 기준)
API_BASE_URL = "http://localhost:3000/api/jobs"

def poll_for_jobs():
    print("[Worker] Starting to poll for jobs...")
    crawler = TossAdsCrawler(headless=True)
    
    try:
        while True:
            try:
                # 1. 대기 중인 작업 폴링
                response = requests.post(f"{API_BASE_URL}/poll", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    job = data.get("job")
                    
                    if job:
                        print(f"\n[Worker] Found job: {job['id']} (Type: {job['job_type']})")
                        process_job(crawler, job)
                    else:
                        # 작업이 없으면 대기
                        time.sleep(5)
                else:
                    print(f"[Worker] API Error: {response.status_code}")
                    time.sleep(5)
            except requests.exceptions.RequestException as e:
                print(f"[Worker] Connection error: {e}")
                time.sleep(5)
    except KeyboardInterrupt:
        print("[Worker] Shutting down...")
    finally:
        crawler.close()

def process_job(crawler, job):
    job_id = job["id"]
    job_type = job["job_type"]
    payload = json.loads(job["payload"])
    
    status = "FAILED"
    result = None
    error_msg = None
    
    try:
        if job_type == "SYNC_CAMPAIGNS":
            print("[Worker] Executing SYNC_CAMPAIGNS...")
            result = crawler.sync_campaigns()
            status = "COMPLETED"
            
        elif job_type == "EXECUTE_ACTION":
            print(f"[Worker] Executing EXECUTE_ACTION for action_id: {payload.get('action_id')}...")
            result = crawler.execute_action(
                action_id=payload.get("action_id"),
                arm_id=payload.get("arm_id"),
                action_type=payload.get("action_type")
            )
            status = "COMPLETED"
            
        elif job_type == "EVALUATE_ARMS":
            print("[Worker] Executing EVALUATE_ARMS...")
            target_cpa = payload.get("target_cpa", 15000)
            arms_data = payload.get("arms", [])
            
            engine = DecisionEngine(target_cpa=target_cpa)
            evaluations = []
            
            for arm in arms_data:
                arm_id = arm.get("arm_id")
                metrics = arm.get("metrics", {})
                eval_result = engine.evaluate_arm(arm_id, metrics)
                evaluations.append(eval_result)
                
            result = {"evaluations": evaluations}
            status = "COMPLETED"
            
        else:
            error_msg = f"Unknown job_type: {job_type}"
            print(f"[Worker] {error_msg}")
            
    except Exception as e:
        error_msg = str(e)
        print(f"[Worker] Job failed with error: {error_msg}")
        
    finally:
        # 2. 작업 결과 리포팅
        report_payload = {
            "status": status,
            "result": result,
            "error": error_msg
        }
        try:
            res = requests.post(f"{API_BASE_URL}/{job_id}/complete", json=report_payload)
            if res.status_code == 200:
                print(f"[Worker] Successfully reported job {job_id} as {status}")
            else:
                print(f"[Worker] Failed to report job {job_id}: {res.text}")
        except Exception as e:
            print(f"[Worker] Error reporting job completion: {e}")

if __name__ == "__main__":
    poll_for_jobs()
