import cron from 'node-cron';
import prisma from '../db';

export function initScheduler() {
  console.log('[Scheduler] Initializing cron jobs...');

  // 10분 주기: Python Playwright 워커에게 토스애즈 스크래핑 작업 위임 (MSA 구조)
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Scheduler] Enqueuing TossAds scraping task (every 10 mins)');
    try {
      await prisma.crawlerJob.create({
        data: {
          job_type: 'SYNC_CAMPAIGNS',
          payload: JSON.stringify({ timestamp: new Date().toISOString() })
        }
      });
      console.log('[Scheduler] Successfully enqueued SYNC_CAMPAIGNS job');
    } catch (error) {
      console.error('[Scheduler] Failed to enqueue SYNC_CAMPAIGNS job:', error);
    }
  });

  // 15분 주기: Rule Engine 실행 -> Arm 성과 평가 -> 추천 액션 생성
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Running Rule Engine evaluation (every 15 mins)');
    try {
      // 1. 활성화된 Arm 목록 조회
      const activeArms = await prisma.armRegistry.findMany({
        where: { status: 'ACTIVE' }
      });

      if (activeArms.length === 0) {
        console.log('[Scheduler] No active arms to evaluate.');
        return;
      }

      // 2. 각 Arm의 성과 데이터 집계 (여기서는 예시 데이터를 생성하여 전송)
      // 실제 구현 시에는 PerformanceDaily, PerformanceHourly 테이블을 조인하여 계산
      const armsData = activeArms.map(arm => ({
        arm_id: arm.id,
        metrics: {
          impressions: Math.floor(Math.random() * 20000),
          clicks: Math.floor(Math.random() * 200),
          cpc: 300,
          cost: Math.floor(Math.random() * 50000),
          leads: Math.floor(Math.random() * 5),
          cpa_7d: 14000,
          cpa_3d: 15500,
          cpa_1d: 16000,
          valid_lead_rate: 0.8
        }
      }));

      // 3. Python 워커에 EVALUATE_ARMS 작업 위임
      await prisma.crawlerJob.create({
        data: {
          job_type: 'EVALUATE_ARMS',
          payload: JSON.stringify({
            target_cpa: 15000,
            arms: armsData
          })
        }
      });
      console.log('[Scheduler] Successfully enqueued EVALUATE_ARMS job');
    } catch (error) {
      console.error('[Scheduler] Failed to enqueue EVALUATE_ARMS job:', error);
    }
  });

  // 1시간 주기: CRM 데이터 동기화 (리드 퀄리티 업데이트)
  cron.schedule('0 * * * *', () => {
    console.log('[Scheduler] Running CRM synchronization (hourly)');
    // TODO: implement CRM sync logic
  });
}
