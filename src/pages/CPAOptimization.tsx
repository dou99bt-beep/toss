import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, TrendingDown, TrendingUp, Clock, Target, 
  Zap, Eye, MousePointerClick, Users, DollarSign, 
  FlaskConical, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface AdSetConfig {
  id: string;
  toss_adset_id: string;
  adset_name: string;
  bid_type: string;
  bid_strategy: string;
  target_cost: number;
  daily_budget: number;
  schedule_type: string;
  target_gender: string;
  creatives_count: number;
  collected_at: string;
  ad_format: string;
}

interface PerfData {
  toss_adset_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpa: number;
  ctr: number;
}

type TabType = 'overview' | 'configs' | 'abtest';

export function CPAOptimization() {
  const [configs, setConfigs] = useState<AdSetConfig[]>([]);
  const [performance, setPerformance] = useState<PerfData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [configRes, perfRes] = await Promise.all([
        supabase.from('ad_set_configs').select('*').order('collected_at', { ascending: false }),
        supabase.from('performance_daily').select('*').order('date', { ascending: false }).limit(200),
      ]);
      setConfigs(configRes.data || []);
      setPerformance(perfRes.data || []);
    } catch (e) {
      console.error('Data load error:', e);
    }
    setLoading(false);
  }

  // 중복 제거 (최신 설정만)
  const uniqueConfigs = configs.reduce((acc, c) => {
    if (!acc.find(x => x.toss_adset_id === c.toss_adset_id)) acc.push(c);
    return acc;
  }, [] as AdSetConfig[]);

  // 통계 계산
  const totalSpend = performance.reduce((s, p) => s + (p.spend || 0), 0);
  const totalClicks = performance.reduce((s, p) => s + (p.clicks || 0), 0);
  const totalImpressions = performance.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalLeads = performance.reduce((s, p) => s + (p.leads || 0), 0);
  const avgCPA = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  // 입찰 방식별 분류
  const bidGroups = uniqueConfigs.reduce((acc, c) => {
    const key = c.bid_type || '미설정';
    if (!acc[key]) acc[key] = 0;
    acc[key]++;
    return acc;
  }, {} as Record<string, number>);

  // 노출 시간별 분류
  const scheduleGroups = uniqueConfigs.reduce((acc, c) => {
    const key = c.schedule_type || '미설정';
    if (!acc[key]) acc[key] = 0;
    acc[key]++;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="text-blue-500" size={28} />
            CPA 최적화 센터
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            광고세트 설정 분석 · A/B 테스트 관리 · 자동 최적화
          </p>
        </div>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        {[
          { id: 'overview' as TabType, label: '📊 성과 개요', icon: BarChart3 },
          { id: 'configs' as TabType, label: '⚙️ 광고세트 설정', icon: Target },
          { id: 'abtest' as TabType, label: '🧪 A/B 테스트', icon: FlaskConical },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          totalSpend={totalSpend}
          totalClicks={totalClicks}
          totalImpressions={totalImpressions}
          totalLeads={totalLeads}
          avgCPA={avgCPA}
          avgCTR={avgCTR}
          configCount={uniqueConfigs.length}
          bidGroups={bidGroups}
          scheduleGroups={scheduleGroups}
        />
      )}

      {activeTab === 'configs' && (
        <ConfigsTab configs={uniqueConfigs} />
      )}

      {activeTab === 'abtest' && (
        <ABTestTab configs={uniqueConfigs} />
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ totalSpend, totalClicks, totalImpressions, totalLeads, avgCPA, avgCTR, configCount, bidGroups, scheduleGroups }: any) {
  const kpiCards = [
    { label: '광고세트', value: configCount, unit: '개', icon: Target, color: 'blue', trend: null },
    { label: '총 소진비용', value: totalSpend, unit: '원', icon: DollarSign, color: 'green', format: 'currency' },
    { label: '평균 CPA', value: avgCPA, unit: '원', icon: TrendingDown, color: 'purple', format: 'currency' },
    { label: '평균 CTR', value: avgCTR, unit: '%', icon: MousePointerClick, color: 'amber', format: 'percent' },
    { label: '총 클릭', value: totalClicks, unit: '회', icon: MousePointerClick, color: 'cyan', format: 'number' },
    { label: '총 전환', value: totalLeads, unit: '건', icon: Users, color: 'rose', format: 'number' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
    rose: 'from-rose-500 to-rose-600',
  };

  const bgColorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-emerald-50 dark:bg-emerald-900/20',
    purple: 'bg-violet-50 dark:bg-violet-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
    rose: 'bg-rose-50 dark:bg-rose-900/20',
  };

  function formatVal(val: number, format?: string) {
    if (format === 'currency') return `₩${Math.round(val).toLocaleString()}`;
    if (format === 'percent') return `${val.toFixed(2)}%`;
    if (format === 'number') return val.toLocaleString();
    return val.toString();
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[kpi.color]} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {kpi.format ? formatVal(kpi.value, kpi.format) : kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 입찰 방식 분포 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> 입찰 방식 분포
          </h3>
          <div className="space-y-3">
            {Object.entries(bidGroups).map(([key, count]) => {
              const total = Object.values(bidGroups).reduce((s: number, v) => s + (v as number), 0);
              const pct = total > 0 ? ((count as number) / total * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{key}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{count as number}개 ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 노출 시간 분포 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-cyan-500" /> 노출 시간 분포
          </h3>
          <div className="space-y-3">
            {Object.entries(scheduleGroups).map(([key, count]) => {
              const total = Object.values(scheduleGroups).reduce((s: number, v) => s + (v as number), 0);
              const pct = total > 0 ? ((count as number) / total * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{key}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{count as number}개 ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CLI Commands */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-6 border border-slate-700">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          💻 CLI 명령어
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono">
          {[
            { cmd: 'python -m crawler.main --collect-configs', desc: '광고세트 설정 수집 (재시도+관심사 파싱)' },
            { cmd: 'python -m crawler.main --analyze', desc: '성과 분석 보고서' },
            { cmd: 'python -m crawler.main --design-test', desc: 'A/B 테스트 설계' },
            { cmd: 'python -m crawler.main --run-test', desc: '테스트 사이클 실행' },
            { cmd: 'python -m crawler.main --evaluate', desc: '테스트 평가/판정' },
            { cmd: 'python -m crawler.main --optimize-budget', desc: '💰 CPA 기반 예산 자동 배분' },
            { cmd: 'python -m crawler.main --check-fatigue', desc: '🎨 소재 피로도 감지' },
            { cmd: 'python -m crawler.main --monitor', desc: '📊 예산 소진 모니터링' },
            { cmd: 'python -m crawler.main --report', desc: '성과 데이터 수집' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <span className="text-green-400 shrink-0">$</span>
              <div>
                <code className="text-blue-300">{item.cmd}</code>
                <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Configs Tab ─── */
function ConfigsTab({ configs }: { configs: AdSetConfig[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          광고세트 설정 현황 ({configs.length}개)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">ID</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">광고세트명</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">입찰</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">예산</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">노출시간</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">소재</th>
              <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">수집일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {configs.map((c, i) => (
              <tr key={c.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.toss_adset_id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white text-xs leading-tight max-w-[240px] truncate">
                    {c.adset_name || '-'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    c.bid_type?.includes('자동') 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : c.bid_type?.includes('직접')
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {c.bid_type || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                  {c.daily_budget > 0 ? `₩${c.daily_budget.toLocaleString()}` : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    c.schedule_type?.includes('항상')
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : c.schedule_type?.includes('요일')
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    <Clock size={12} />
                    {c.schedule_type || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
                  {c.creatives_count || 0}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {c.collected_at ? new Date(c.collected_at).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── A/B Test Tab ─── */
function ABTestTab({ configs }: { configs: AdSetConfig[] }) {
  const autoBid = configs.filter(c => c.bid_type?.includes('자동'));
  const manualBid = configs.filter(c => c.bid_type?.includes('직접'));
  const alwaysOn = configs.filter(c => c.schedule_type?.includes('항상'));
  const scheduled = configs.filter(c => c.schedule_type?.includes('요일'));

  const testScenarios = [
    {
      name: '노출 시간 테스트',
      description: '항상 노출 vs 요일별 설정',
      controlLabel: '항상 노출',
      controlCount: alwaysOn.length,
      treatmentLabel: '요일별 설정',
      treatmentCount: scheduled.length,
      status: alwaysOn.length > 0 && scheduled.length > 0 ? 'READY' : 'INSUFFICIENT',
      color: 'cyan',
    },
    {
      name: '입찰 방식 테스트',
      description: '자동 입찰 vs 직접 입찰',
      controlLabel: '자동 입찰',
      controlCount: autoBid.length,
      treatmentLabel: '직접 입찰',
      treatmentCount: manualBid.length,
      status: autoBid.length > 0 && manualBid.length > 0 ? 'READY' : 'INSUFFICIENT',
      color: 'blue',
    },
    {
      name: '목표 비용 테스트',
      description: '₩10,000 vs ₩13,000 vs ₩15,000',
      controlLabel: '₩13,000',
      controlCount: configs.filter(c => c.target_cost === 13000).length,
      treatmentLabel: '₩10,000',
      treatmentCount: configs.filter(c => c.target_cost === 10000).length,
      status: 'PLANNED',
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Test Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testScenarios.map((test, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{test.name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                test.status === 'READY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                test.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {test.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{test.description}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-green-500" /> {test.controlLabel}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{test.controlCount}개</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <FlaskConical size={12} className="text-blue-500" /> {test.treatmentLabel}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{test.treatmentCount}개</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                예상 비용: <span className="font-medium text-slate-700 dark:text-slate-300">₩150,000/일 (3 arms × ₩50,000)</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Workflow */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          🔄 A/B 테스트 워크플로우
        </h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {[
            { step: 1, label: '분석', desc: '--analyze', icon: BarChart3, color: 'blue' },
            { step: 2, label: '설계', desc: '--design-test', icon: Target, color: 'violet' },
            { step: 3, label: '생성', desc: '--run-test-auto', icon: Zap, color: 'amber' },
            { step: 4, label: '수집', desc: '3일 자동', icon: Clock, color: 'cyan' },
            { step: 5, label: '평가', desc: '--evaluate', icon: CheckCircle2, color: 'green' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 flex-1 w-full md:w-auto">
                  <div className={`w-8 h-8 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30 flex items-center justify-center`}>
                    <Icon size={16} className={`text-${s.color}-600 dark:text-${s.color}-400`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Step {s.step}: {s.label}</p>
                    <code className="text-[10px] text-slate-500">{s.desc}</code>
                  </div>
                </div>
                {i < 4 && (
                  <ArrowUpRight size={16} className="hidden md:block text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
