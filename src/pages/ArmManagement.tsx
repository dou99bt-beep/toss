import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../components/ui';
import { formatCurrency, formatNumber } from '../lib/utils';
import { Filter, Search, ChevronRight, Play, Pause, TrendingUp, TrendingDown, Zap, Eye, AlertTriangle, FlaskConical, CheckCircle2, HelpCircle } from 'lucide-react';
import type { ArmStatus } from '../types';

const STATUS_CONFIG: Record<ArmStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'outline'; icon: React.ReactNode }> = {
  TESTING: { label: '탐색중', variant: 'info', icon: <FlaskConical size={12} /> },
  STABLE: { label: '유지', variant: 'success', icon: <CheckCircle2 size={12} /> },
  SCALE: { label: '증액', variant: 'success', icon: <TrendingUp size={12} /> },
  REDUCE: { label: '감액', variant: 'warning', icon: <TrendingDown size={12} /> },
  PAUSE_CANDIDATE: { label: '중단후보', variant: 'danger', icon: <AlertTriangle size={12} /> },
  PAUSED: { label: '중단', variant: 'default', icon: <Pause size={12} /> },
  MANUAL_REVIEW: { label: '검토필요', variant: 'warning', icon: <HelpCircle size={12} /> },
};

export function ArmManagement() {
  const { arms } = useAppStore();
  const [selectedArmId, setSelectedArmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ArmStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArms = arms.filter(a => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      a.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.adSetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.target.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedArm = arms.find(a => a.id === selectedArmId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Main Table Area */}
      <Card className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CardHeader className="flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <CardTitle>Arm 실험 목록</CardTitle>
            <Badge variant="info">{filteredArms.length}개</Badge>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="캠페인, 세트, 타깃 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ArmStatus | 'ALL')}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="ALL">전체 상태</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">캠페인 / 세트</th>
                <th className="px-4 py-3 font-medium text-right">소진비</th>
                <th className="px-4 py-3 font-medium text-right">노출</th>
                <th className="px-4 py-3 font-medium text-right">클릭</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">리드</th>
                <th className="px-4 py-3 font-medium text-right">CPA</th>
                <th className="px-4 py-3 font-medium text-right">CVR</th>
                <th className="px-4 py-3 font-medium">판단 이유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredArms.map((arm) => {
                const cfg = STATUS_CONFIG[arm.status];
                return (
                  <tr 
                    key={arm.id} 
                    onClick={() => setSelectedArmId(arm.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedArmId === arm.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant}>
                        <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white text-xs">{arm.campaignName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{arm.adSetName}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 text-xs">{formatCurrency(arm.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 text-xs">{formatNumber(arm.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 text-xs">{formatNumber(arm.clicks)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 text-xs">{arm.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white text-xs">{formatNumber(arm.leads)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold text-xs ${arm.cpa > 15000 ? 'text-rose-600 dark:text-rose-400' : arm.cpa > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {arm.cpa > 0 ? formatCurrency(arm.cpa) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 text-xs">{arm.cvr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={arm.reason}>
                      {arm.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Slide Panel */}
      {selectedArm && (() => {
        const cfg = STATUS_CONFIG[selectedArm.status];
        return (
          <Card className="w-full lg:w-[420px] flex-shrink-0 flex flex-col overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedArm.id}</span>
                  <Badge variant={cfg.variant}>
                    <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                  </Badge>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                  {selectedArm.adSetName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedArmId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </CardHeader>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Arm Composition */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Arm 구성 요소</h4>
                <div className="grid grid-cols-3 gap-y-3 text-sm">
                  <div className="text-slate-500 dark:text-slate-400">캠페인</div>
                  <div className="col-span-2 font-medium text-slate-900 dark:text-white truncate" title={selectedArm.campaignName}>{selectedArm.campaignName}</div>
                  <div className="text-slate-500 dark:text-slate-400">소재</div>
                  <div className="col-span-2 font-medium text-slate-900 dark:text-white truncate" title={selectedArm.creativeName}>{selectedArm.creativeName}</div>
                  <div className="text-slate-500 dark:text-slate-400">타깃</div>
                  <div className="col-span-2 font-medium text-slate-900 dark:text-white truncate" title={selectedArm.target}>{selectedArm.target}</div>
                  <div className="text-slate-500 dark:text-slate-400">스케줄</div>
                  <div className="col-span-2 font-medium text-slate-900 dark:text-white truncate">{selectedArm.schedule}</div>
                  <div className="text-slate-500 dark:text-slate-400">입찰전략</div>
                  <div className="col-span-2 font-medium text-slate-900 dark:text-white truncate">{selectedArm.bidStrategy}</div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">누적 성과</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'CPA', value: selectedArm.cpa > 0 ? formatCurrency(selectedArm.cpa) : '-', highlight: selectedArm.cpa > 15000 ? 'rose' : 'emerald' },
                    { label: '리드 수', value: formatNumber(selectedArm.leads) },
                    { label: '소진비', value: formatCurrency(selectedArm.spend) },
                    { label: 'CTR', value: `${selectedArm.ctr.toFixed(2)}%` },
                    { label: 'CPC', value: formatCurrency(selectedArm.cpc) },
                    { label: 'CVR', value: `${selectedArm.cvr.toFixed(2)}%` },
                    { label: '노출', value: formatNumber(selectedArm.impressions) },
                    { label: '유효리드', value: `${selectedArm.validLeads}건` },
                    { label: '유효율', value: `${selectedArm.validLeadRate.toFixed(1)}%` },
                  ].map(m => (
                    <div key={m.label} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{m.label}</div>
                      <div className={`text-sm font-bold ${m.highlight === 'rose' ? 'text-rose-600 dark:text-rose-400' : m.highlight === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* AI Judgment */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> AI 판단 및 추천 액션
                </h4>
                <div className={`p-4 rounded-xl border ${
                  selectedArm.status === 'SCALE' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' :
                  selectedArm.status === 'REDUCE' || selectedArm.status === 'PAUSE_CANDIDATE' || selectedArm.status === 'PAUSED' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50' :
                  selectedArm.status === 'MANUAL_REVIEW' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                }`}>
                  <p className={`text-sm font-medium mb-3 ${
                    selectedArm.status === 'SCALE' ? 'text-emerald-800 dark:text-emerald-300' :
                    selectedArm.status === 'REDUCE' || selectedArm.status === 'PAUSE_CANDIDATE' || selectedArm.status === 'PAUSED' ? 'text-rose-800 dark:text-rose-300' :
                    selectedArm.status === 'MANUAL_REVIEW' ? 'text-amber-800 dark:text-amber-300' :
                    'text-blue-800 dark:text-blue-300'
                  }`}>
                    {selectedArm.reason}
                  </p>
                  <div className="flex gap-2">
                    {selectedArm.status === 'SCALE' && (
                      <Button variant="primary" size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <TrendingUp size={14} /> 예산 증액
                      </Button>
                    )}
                    {(selectedArm.status === 'REDUCE') && (
                      <Button variant="danger" size="sm" className="gap-1">
                        <TrendingDown size={14} /> 예산 감액
                      </Button>
                    )}
                    {(selectedArm.status === 'PAUSE_CANDIDATE') && (
                      <Button variant="danger" size="sm" className="gap-1">
                        <Pause size={14} /> 중단하기
                      </Button>
                    )}
                    {selectedArm.status === 'PAUSED' && (
                      <Button variant="primary" size="sm" className="gap-1">
                        <Play size={14} /> 재활성화
                      </Button>
                    )}
                    {selectedArm.status === 'MANUAL_REVIEW' && (
                      <Button variant="secondary" size="sm" className="gap-1">
                        <Eye size={14} /> 상세 검토
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
