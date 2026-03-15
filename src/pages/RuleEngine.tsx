import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { formatCurrency, formatNumber } from '../lib/utils';
import { Settings, Shield, Target, Gauge, AlertTriangle, Save, FlaskConical, Rocket, BarChart3 } from 'lucide-react';

export function RuleEngine() {
  const { rule, updateRule } = useAppStore();
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // Budget allocation visualization data
  const totalBudget = 500000;
  const exploreBudget = totalBudget * (rule.exploreBudgetRatio / 100);
  const exploitBudget = totalBudget * (rule.exploitBudgetRatio / 100);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rule Engine 설정</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">의사결정 엔진의 규칙과 안전장치를 설정합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          {showSaved && <Badge variant="success">✓ 저장 완료</Badge>}
          <Button className="gap-2" onClick={handleSave}>
            <Save size={16} /> 설정 저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target CPA & Stop Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              목표 CPA 및 중단 기준
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">목표 CPA (원)</label>
              <input
                type="number"
                value={rule.targetCpa}
                onChange={e => updateRule({ targetCpa: Number(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">이 금액 이하의 CPA를 달성하는 것이 목표입니다.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">중단 기준 (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="100"
                  max="300"
                  step="10"
                  value={rule.stopCriteria}
                  onChange={e => updateRule({ stopCriteria: Number(e.target.value) })}
                  className="flex-1 accent-blue-600"
                />
                <span className="w-16 text-center text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{rule.stopCriteria}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">CPA가 목표치의 {rule.stopCriteria}%를 넘으면 중단 후보로 분류합니다.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">알림 임계값 (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="100"
                  max="200"
                  step="5"
                  value={rule.alertThreshold}
                  onChange={e => updateRule({ alertThreshold: Number(e.target.value) })}
                  className="flex-1 accent-amber-500"
                />
                <span className="w-16 text-center text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{rule.alertThreshold}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">CPA가 목표치의 {rule.alertThreshold}%를 넘으면 경고 알림을 발생시킵니다.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">현재 설정 시뮬레이션</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>목표 CPA</span>
                  <span className="font-medium">{formatCurrency(rule.targetCpa)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>경고 발생</span>
                  <span className="font-medium">{formatCurrency(rule.targetCpa * rule.alertThreshold / 100)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>중단 기준</span>
                  <span className="font-medium">{formatCurrency(rule.targetCpa * rule.stopCriteria / 100)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Adjustment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge size={18} className="text-emerald-500" />
              예산 증/감액 비율
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">성과 우수 시 증액 비율 (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={rule.increaseRatio}
                  onChange={e => updateRule({ increaseRatio: Number(e.target.value) })}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-16 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">+{rule.increaseRatio}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">성과 부진 시 감액 비율 (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={rule.decreaseRatio}
                  onChange={e => updateRule({ decreaseRatio: Number(e.target.value) })}
                  className="flex-1 accent-rose-500"
                />
                <span className="w-16 text-center text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg">-{rule.decreaseRatio}%</span>
              </div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <h4 className="text-sm font-medium text-slate-900 dark:text-white pt-1">최소 데이터 기준 (샘플 보호)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">최소 클릭 수</label>
                <input
                  type="number"
                  value={rule.minClicks}
                  onChange={e => updateRule({ minClicks: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">최소 노출 수</label>
                <input
                  type="number"
                  value={rule.minImpressions}
                  onChange={e => updateRule({ minImpressions: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">최소 리드 수</label>
                <input
                  type="number"
                  value={rule.minLeads}
                  onChange={e => updateRule({ minLeads: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">이 기준 미만의 데이터를 가진 Arm은 의사결정에서 '탐색중(TESTING)' 상태로 보호합니다.</p>
          </CardContent>
        </Card>
      </div>

      {/* Explore / Exploit Budget Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" />
            Explore / Exploit 예산 배분
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FlaskConical size={14} className="text-blue-500" /> 탐색 (Explore) 비율 (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={rule.exploreBudgetRatio}
                    onChange={e => {
                      const explore = Number(e.target.value);
                      updateRule({ exploreBudgetRatio: explore, exploitBudgetRatio: 100 - explore });
                    }}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="w-16 text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">{rule.exploreBudgetRatio}%</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">새로운 소재/타깃/시간대 조합을 테스트하는데 할당할 예산 비율</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Rocket size={14} className="text-emerald-500" /> 확장 (Exploit) 비율 (%)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${rule.exploitBudgetRatio}%` }}></div>
                  </div>
                  <span className="w-16 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">{rule.exploitBudgetRatio}%</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">성과가 검증된 Arm에 집중 투자하는 예산 비율</p>
              </div>
            </div>

            {/* Allocation Visualization */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <div className="flex items-end gap-3 mb-4 h-[120px]">
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">{formatCurrency(exploreBudget)}</div>
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg flex items-center justify-center"
                      style={{ height: `${Math.max(20, rule.exploreBudgetRatio)}%` }}
                    >
                      <FlaskConical size={18} className="text-white opacity-80" />
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">탐색</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{formatCurrency(exploitBudget)}</div>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg flex items-center justify-center"
                      style={{ height: `${Math.max(20, rule.exploitBudgetRatio)}%` }}
                    >
                      <Rocket size={18} className="text-white opacity-80" />
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">확장</div>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${rule.exploreBudgetRatio}%` }} />
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${rule.exploitBudgetRatio}%` }} />
                </div>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">일 예산 {formatCurrency(totalBudget)} 기준</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} className="text-rose-500" />
            안전 / 자동화 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">Auto-pilot 모드</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">의사결정 엔진 결과를 자동으로 실행합니다. BUDGET_UP/DOWN은 자동, PAUSE는 수동 승인 필요.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={rule.autoExecute}
                onChange={e => updateRule({ autoExecute: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-start justify-between py-3">
            <div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">샘플 부족 보호</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                최소 기준(클릭 {rule.minClicks}회 / 노출 {formatNumber(rule.minImpressions)}회 / 리드 {rule.minLeads}건) 미만의 Arm에 대해 자동 액션을 차단합니다.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={rule.protectInsufficientSample}
                onChange={e => updateRule({ protectInsufficientSample: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
