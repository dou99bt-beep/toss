import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { Clock, User, Bot, Settings, PlayCircle, XCircle, Edit3, CheckCircle2 } from 'lucide-react';

const auditLogs = [
  { id: 1, time: '2024-03-14 14:30:22', user: 'System Bot', type: 'auto_action', action: 'Arm 중단', target: 'Arm-A12 (직장인/텍스트)', reason: 'CPA 목표치 150% 초과 (Rule #3)', status: 'success' },
  { id: 2, time: '2024-03-14 13:15:05', user: '김운영 (운영자)', type: 'manual_action', action: '예산 증액 승인', target: 'Arm-B05 (사업자/이미지)', reason: '수동 승인 (+20%)', status: 'success' },
  { id: 3, time: '2024-03-14 10:00:00', user: 'System Bot', type: 'sync', action: '데이터 동기화', target: 'Toss Ads API', reason: '정기 스케줄', status: 'success' },
  { id: 4, time: '2024-03-13 18:45:12', user: '이분석 (분석자)', type: 'rule_update', action: 'Rule 수정', target: 'Rule #3 (CPA 초과 중단)', reason: '임계치 130% -> 150% 변경', status: 'success' },
  { id: 5, time: '2024-03-13 15:20:33', user: 'System Bot', type: 'auto_action', action: '입찰가 하향', target: 'Arm-C01 (20대/텍스트)', reason: 'API 오류 (Rate Limit)', status: 'failed' },
];

export function AuditLog() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'auto_action': return <Bot size={16} className="text-blue-500" />;
      case 'manual_action': return <User size={16} className="text-emerald-500" />;
      case 'sync': return <Clock size={16} className="text-slate-500" />;
      case 'rule_update': return <Settings size={16} className="text-purple-500" />;
      default: return <Edit3 size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">시스템 변경 사항 및 액션 실행 이력을 추적합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 활동 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8 pb-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative pl-8">
                {/* Timeline Dot */}
                <div className="absolute -left-3.5 top-1 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center">
                  {getIcon(log.type)}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{log.action}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">on</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{log.target}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} /> {log.time}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {log.reason}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <User size={14} /> {log.user}
                    </div>
                    <div>
                      {log.status === 'success' ? (
                        <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 size={12} className="mr-1" /> 성공</Badge>
                      ) : (
                        <Badge variant="danger" className="bg-rose-50 text-rose-700 border-rose-200"><XCircle size={12} className="mr-1" /> 실패</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
