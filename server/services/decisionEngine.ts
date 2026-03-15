import jStat from 'jstat';

export class DecisionEngine {
  targetCpa: number;
  maxAutoIncreasePct: number;
  maxAutoDecreasePct: number;

  constructor(targetCpa: number) {
    this.targetCpa = targetCpa;
    this.maxAutoIncreasePct = 15;
    this.maxAutoDecreasePct = 20;
  }

  calculateSuccessProbability(clicks: number, leads: number, cpc: number): number {
    if (clicks === 0) return 0.5;
    const targetCvr = cpc / this.targetCpa;
    
    const alpha = leads + 1;
    const betaParam = Math.max(clicks - leads, 0) + 1;
    
    const prob = 1 - jStat.beta.cdf(targetCvr, alpha, betaParam);
    return prob;
  }

  evaluateArm(armId: string, metrics: any) {
    const clicks = metrics.clicks || 0;
    const leads = metrics.leads || 0;
    const cost = metrics.cost || 0;
    const cpc = metrics.cpc || 0;
    const cpa1d = metrics.cpa_1d || 0;
    const cpa3d = metrics.cpa_3d || 0;
    
    let state = "OBSERVING";
    let actionType = "HOLD";
    let actionValue: number | null = null;
    let isAuto = true;
    let reason = "";

    if (cost < (this.targetCpa * 0.5) && clicks < 40) {
      return this.buildResult(armId, "TESTING", "HOLD", null, true, `데이터 수집 중 (클릭 ${clicks}회, 소진액 ${cost}원)`);
    }

    if (clicks >= 40 && leads === 0) {
      return this.buildResult(armId, "PAUSE_CANDIDATE", "PAUSE", null, false, `클릭 ${clicks}회 이상 발생했으나 리드가 0건입니다. 소재 교체 또는 중단이 필요합니다.`);
    }
    
    if (cost > (this.targetCpa * 1.5) && leads === 0) {
      return this.buildResult(armId, "PAUSE_CANDIDATE", "PAUSE", null, false, `비용(${cost}원)이 목표 CPA(${this.targetCpa}원)의 1.5배를 초과했으나 리드가 없습니다.`);
    }

    const probSuccess = this.calculateSuccessProbability(clicks, leads, cpc);
    const trendRatio = cpa3d > 0 ? (cpa1d / cpa3d) : 1.0;

    if (probSuccess > 0.8 && cpa3d <= this.targetCpa) {
      if (trendRatio > 1.3) {
        state = "MANUAL_REVIEW";
        actionType = "HOLD";
        isAuto = false;
        reason = `3일 평균 CPA(${cpa3d}원)는 우수하나, 최근 1일 CPA(${cpa1d}원)가 급등했습니다. 소재 피로도가 의심되어 수동 검토가 필요합니다.`;
      } else {
        state = "SCALE";
        actionType = "BUDGET_UP";
        actionValue = this.maxAutoIncreasePct;
        isAuto = true;
        reason = `성공 확률이 ${(probSuccess*100).toFixed(1)}%로 매우 높고 3일 CPA가 목표치 이하입니다. 예산을 ${actionValue}% 증액합니다.`;
      }
    } else if (probSuccess < 0.3 || cpa3d > this.targetCpa * 1.2) {
      state = "REDUCE";
      actionType = "BUDGET_DOWN";
      actionValue = this.maxAutoDecreasePct;
      isAuto = true;
      reason = `최근 3일 CPA(${cpa3d}원)가 목표를 초과하며 개선 확률이 낮습니다. 예산을 ${actionValue}% 감액하여 리스크를 줄입니다.`;
    } else {
      state = "STABLE";
      actionType = "HOLD";
      isAuto = true;
      reason = `목표 CPA 내에서 안정적으로 운영 중입니다. (성공 확률 ${(probSuccess*100).toFixed(1)}%)`;
    }

    return this.buildResult(armId, state, actionType, actionValue, isAuto, reason);
  }

  buildResult(armId: string, state: string, actionType: string, actionValue: number | null, isAuto: boolean, reason: string) {
    return {
      arm_id: armId,
      recommended_state: state,
      action: {
        type: actionType,
        value: actionValue,
        is_auto_executable: isAuto
      },
      explanation: reason
    };
  }
}
