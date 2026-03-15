import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../components/ui';
import { Check, X, RotateCcw, AlertCircle, TrendingUp, PauseCircle } from 'lucide-react';

export function ActionCenter() {
  const { actions, fetchActions, approveAction, rejectAction, rollbackAction } = useAppStore();

  useEffect(() => {
    fetchActions();
    // Set up polling every 10 seconds
    const interval = setInterval(fetchActions, 10000);
    return () => clearInterval(interval);
  }, [fetchActions]);

  const pendingActions = actions.filter(a => a.status === 'PENDING');
  const historyActions = actions.filter(a => a.status !== 'PENDING');

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'BUDGET_UP': return <TrendingUp className="text-emerald-500" size={20} />;
      case 'BUDGET_DOWN': return <TrendingUp className="text-rose-500 rotate-180" size={20} />;
      case 'PAUSE': return <PauseCircle className="text-amber-500" size={20} />;
      default: return <AlertCircle className="text-blue-500" size={20} />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'BUDGET_UP': return '예산 증액';
      case 'BUDGET_DOWN': return '예산 감액';
      case 'PAUSE': return 'Arm 중단';
      case 'ACTIVATE': return 'Arm 활성화';
      case 'HOLD': return '관망 / 유지';
      default: return type;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Action Center</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">의사결정 엔진(Decision Engine)이 제안한 액션을 검토하고 승인합니다.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">승인 대기열</h3>
            <Badge variant="warning">{pendingActions.length}건</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              await fetch('/api/jobs/trigger-evaluate', { method: 'POST' });
              alert('Evaluation triggered!');
              fetchActions();
            } catch (e) {
              console.error(e);
            }
          }}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Trigger Evaluation
          </Button>
        </div>

        {pendingActions.length === 0 ? (
          <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
            <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400">
              대기 중인 액션이 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingActions.map(action => {
              return (
                <Card key={action.id} className="border-l-4 border-l-amber-500">
                  <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0">
                        {getActionIcon(action.action_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{action.id.split('-')[0]}</span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">·</span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Arm ID: {action.arm_id.split('-')[0]}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                          {getActionLabel(action.action_type)}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                          <strong>사유:</strong> {action.reason}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <Button 
                        variant="primary" 
                        className="flex-1 sm:w-32 gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        onClick={() => approveAction(action.id)}
                      >
                        <Check size={16} /> 승인
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 sm:w-32 gap-2"
                        onClick={() => rejectAction(action.id)}
                      >
                        <X size={16} /> 거부
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">최근 처리 내역</h3>
        
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">상태</th>
                  <th className="px-6 py-3 font-medium">액션 / Arm ID</th>
                  <th className="px-6 py-3 font-medium">사유</th>
                  <th className="px-6 py-3 font-medium">처리 일시</th>
                  <th className="px-6 py-3 font-medium text-right">롤백</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyActions.map(action => (
                  <tr key={action.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <Badge 
                        variant={
                          action.status === 'APPROVED' ? 'success' : 
                          action.status === 'REJECTED' ? 'danger' : 
                          action.status === 'EXECUTED' ? 'info' : 
                          action.status === 'ROLLED_BACK' ? 'warning' : 'default'
                        }
                      >
                        {action.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {getActionIcon(action.action_type)}
                        {getActionLabel(action.action_type)}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">{action.arm_id.split('-')[0]}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-md truncate" title={action.reason}>
                      {action.reason}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(action.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {action.status === 'APPROVED' || action.status === 'EXECUTED' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                          onClick={() => rollbackAction(action.id)}
                        >
                          <RotateCcw size={16} />
                        </Button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {historyActions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      처리 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
