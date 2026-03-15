import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '../components/ui';
import { Bell, AlertTriangle, TrendingUp, Zap, ShieldAlert, Clock, CheckCircle2, XCircle, Filter } from 'lucide-react';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertCategory = 'cpa' | 'fatigue' | 'budget' | 'system' | 'quality';

interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  arm?: string;
  time: string;
  acknowledged: boolean;
}

const alerts: Alert[] = [
  { id: 'ALT-001', severity: 'critical', category: 'cpa', title: 'CPA 급등 — 중단 기준 초과', message: 'Arm "남45-54_화금_야간_CPC600" CPA가 ₩20,714으로 중단 기준(₩22,500)에 근접합니다. 확인 후 중단 여부를 결정하세요.', arm: 'ARM-003', time: '2분 전', acknowledged: false },
  { id: 'ALT-002', severity: 'critical', category: 'quality', title: '저품질 클릭 유도 의심', message: '소재 "문구강조_공포형_B"의 CTR(5.2%)은 높으나 CVR(1.1%)이 극히 낮습니다. 어그로성 문구일 가능성이 있습니다.', time: '15분 전', acknowledged: false },
  { id: 'ALT-003', severity: 'warning', category: 'fatigue', title: '소재 피로도 경고', message: '소재 "이미지_사례형_E" 피로도 지수 90 도달. 최근 3일 CTR이 40% 하락했습니다. 소재 교체를 권장합니다.', time: '30분 전', acknowledged: false },
  { id: 'ALT-004', severity: 'warning', category: 'budget', title: '일일 예산 소진 속도 초과', message: '오늘 15시 기준 일일 예산의 78%가 소진되었습니다. 현재 속도라면 19시에 예산 소진 예상.', time: '45분 전', acknowledged: true },
  { id: 'ALT-005', severity: 'info', category: 'cpa', title: '성과 우수 Arm 발견', message: 'Arm "여45-59_수금_야간_자동입찰" CPA ₩10,000 달성. 예산 증액 액션이 자동 생성되었습니다.', arm: 'ARM-001', time: '1시간 전', acknowledged: true },
  { id: 'ALT-006', severity: 'warning', category: 'system', title: '토스애즈 세션 만료 임박', message: '현재 세션의 남은 시간이 2시간입니다. 세션 만료 전 자동 갱신이 예정되어 있습니다.', time: '1시간 전', acknowledged: true },
  { id: 'ALT-007', severity: 'info', category: 'budget', title: 'Explore 예산 소진', message: '오늘 탐색(Explore) 예산 할당분이 모두 소진되었습니다. 새로운 Arm 테스트는 내일 시작됩니다.', time: '2시간 전', acknowledged: true },
  { id: 'ALT-008', severity: 'critical', category: 'system', title: '크롤링 셀렉터 오류', message: '토스애즈 어드민 UI 변경으로 인해 "광고세트 예산" 셀렉터(input#budget-field)가 작동하지 않습니다. 셀렉터 업데이트가 필요합니다.', time: '3시간 전', acknowledged: false },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ReactNode; badgeVariant: 'danger' | 'warning' | 'info'; color: string }> = {
  critical: { icon: <ShieldAlert size={18} />, badgeVariant: 'danger', color: 'text-rose-500' },
  warning: { icon: <AlertTriangle size={18} />, badgeVariant: 'warning', color: 'text-amber-500' },
  info: { icon: <Zap size={18} />, badgeVariant: 'info', color: 'text-blue-500' },
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  cpa: 'CPA', fatigue: '피로도', budget: '예산', system: '시스템', quality: '품질',
};

export function AlertCenter() {
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  const filtered = alerts.filter(a => filter === 'all' || a.severity === filter);
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={24} /> Alert Center
            {unacknowledgedCount > 0 && (
              <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-white bg-rose-500 rounded-full">{unacknowledgedCount}</span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">시스템 경고 및 이상 탐지 알림을 실시간으로 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'critical', 'warning', 'info'] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? 'primary' : 'outline'}
              onClick={() => setFilter(s)}
              className="gap-1"
            >
              {s === 'all' && <Filter size={14} />}
              {s === 'critical' && <ShieldAlert size={14} />}
              {s === 'warning' && <AlertTriangle size={14} />}
              {s === 'info' && <Zap size={14} />}
              {s === 'all' ? `전체 (${alerts.length})` : s === 'critical' ? `긴급 (${alerts.filter(a=>a.severity==='critical').length})` : s === 'warning' ? `경고 (${alerts.filter(a=>a.severity==='warning').length})` : `정보 (${alerts.filter(a=>a.severity==='info').length})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">미확인 긴급</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{criticalCount}</div>
            </div>
            <ShieldAlert size={28} className="text-rose-200 dark:text-rose-900/50" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">미확인 경고</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}</div>
            </div>
            <AlertTriangle size={28} className="text-amber-200 dark:text-amber-900/50" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">해결 완료</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{alerts.filter(a => a.acknowledged).length}</div>
            </div>
            <CheckCircle2 size={28} className="text-emerald-200 dark:text-emerald-900/50" />
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle>알림 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            return (
              <div key={alert.id} className={`flex items-start gap-4 p-5 transition-colors ${!alert.acknowledged ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/30`}>
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' :
                  alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' :
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                }`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{alert.title}</span>
                    <Badge variant={cfg.badgeVariant}>{CATEGORY_LABELS[alert.category]}</Badge>
                    {!alert.acknowledged && <Badge variant="outline" className="text-xs">NEW</Badge>}
                    {alert.arm && <Badge variant="default" className="text-xs">{alert.arm}</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <Clock size={12} /> {alert.time}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {!alert.acknowledged ? (
                    <Button size="sm" variant="outline" className="text-xs">확인</Button>
                  ) : (
                    <CheckCircle2 size={18} className="text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
