import math
from scipy.stats import beta

class DecisionEngine:
    def __init__(self, target_cpa):
        self.target_cpa = target_cpa
        # 너무 공격적인 자동화 방지를 위한 임계치
        self.max_auto_increase_pct = 15 
        self.max_auto_decrease_pct = 20

    def calculate_success_probability(self, clicks, leads, cpc):
        """
        베이지안 Beta 분포를 이용해 CVR이 목표 CVR보다 높을 확률 계산
        목표 CVR = CPC / Target_CPA
        """
        if clicks == 0: return 0.5
        target_cvr = cpc / self.target_cpa
        
        # Beta(alpha, beta) -> alpha: 성공(리드)+1, beta: 실패(클릭-리드)+1
        alpha = leads + 1
        beta_param = max(clicks - leads, 0) + 1
        
        # 1 - CDF(target_cvr) = CVR이 target_cvr보다 클 확률
        prob = 1 - beta.cdf(target_cvr, alpha, beta_param)
        return prob

    def evaluate_arm(self, arm_id, metrics):
        clicks = metrics.get('clicks', 0)
        leads = metrics.get('leads', 0)
        cost = metrics.get('cost', 0)
        cpc = metrics.get('cpc', 0)
        cpa_1d = metrics.get('cpa_1d', 0)
        cpa_3d = metrics.get('cpa_3d', 0)
        
        state = "OBSERVING"
        action_type = "HOLD"
        action_value = None
        is_auto = True
        reason = ""

        # 1. 샘플 부족 보호
        if cost < (self.target_cpa * 0.5) and clicks < 40:
            return self._build_result(arm_id, "TESTING", "HOLD", None, True, 
                                      f"데이터 수집 중 (클릭 {clicks}회, 소진액 {cost}원)")

        # 2. 하드 룰 (Kill Switch)
        if clicks >= 40 and leads == 0:
            return self._build_result(arm_id, "PAUSE_CANDIDATE", "PAUSE", None, False, 
                                      f"클릭 {clicks}회 이상 발생했으나 리드가 0건입니다. 소재 교체 또는 중단이 필요합니다.")
        
        if cost > (self.target_cpa * 1.5) and leads == 0:
            return self._build_result(arm_id, "PAUSE_CANDIDATE", "PAUSE", None, False, 
                                      f"비용({cost}원)이 목표 CPA({self.target_cpa}원)의 1.5배를 초과했으나 리드가 없습니다.")

        # 3. 베이지안 확률 및 추세 평가
        prob_success = self.calculate_success_probability(clicks, leads, cpc)
        trend_ratio = (cpa_1d / cpa_3d) if cpa_3d > 0 else 1.0

        if prob_success > 0.8 and cpa_3d <= self.target_cpa:
            if trend_ratio > 1.3:
                state, action_type, is_auto = "MANUAL_REVIEW", "HOLD", False
                reason = f"3일 평균 CPA({cpa_3d}원)는 우수하나, 최근 1일 CPA({cpa_1d}원)가 급등했습니다. 소재 피로도가 의심되어 수동 검토가 필요합니다."
            else:
                state, action_type, action_value, is_auto = "SCALE", "BUDGET_UP", self.max_auto_increase_pct, True
                reason = f"성공 확률이 {prob_success*100:.1f}%로 매우 높고 3일 CPA가 목표치 이하입니다. 예산을 {action_value}% 증액합니다."
                
        elif prob_success < 0.3 or cpa_3d > self.target_cpa * 1.2:
            state, action_type, action_value, is_auto = "REDUCE", "BUDGET_DOWN", self.max_auto_decrease_pct, True
            reason = f"최근 3일 CPA({cpa_3d}원)가 목표를 초과하며 개선 확률이 낮습니다. 예산을 {action_value}% 감액하여 리스크를 줄입니다."
            
        else:
            state, action_type, is_auto = "STABLE", "HOLD", True
            reason = f"목표 CPA 내에서 안정적으로 운영 중입니다. (성공 확률 {prob_success*100:.1f}%)"

        return self._build_result(arm_id, state, action_type, action_value, is_auto, reason)

    def _build_result(self, arm_id, state, action_type, action_value, is_auto, reason):
        return {
            "arm_id": arm_id,
            "recommended_state": state,
            "action": {
                "type": action_type,
                "value": action_value,
                "is_auto_executable": is_auto
            },
            "explanation": reason
        }
