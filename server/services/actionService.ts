import prisma from '../db';
// import { executeTossActionTask } from '../tasks/crawlerTasks';

export const actionService = {
  async approveAndExecute(actionId: string, reason: string) {
    // 1. DB 상태 업데이트
    const action = await prisma.recommendedAction.findUnique({
      where: { id: actionId },
    });

    if (!action || action.status !== 'PENDING') {
      return null;
    }

    const updatedAction = await prisma.recommendedAction.update({
      where: { id: actionId },
      data: { status: 'APPROVED' },
    });

    // 2. Python Playwright 워커로 작업 위임 (MSA 구조)
    // CrawlerJob 테이블에 작업을 삽입하면 Python 워커가 폴링하여 실행
    await prisma.crawlerJob.create({
      data: {
        job_type: 'EXECUTE_ACTION',
        payload: JSON.stringify({
          action_id: updatedAction.id,
          arm_id: updatedAction.arm_id,
          action_type: updatedAction.action_type,
          reason: reason
        })
      }
    });

    return updatedAction;
  },
};
