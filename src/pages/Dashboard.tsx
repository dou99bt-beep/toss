import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';
import { formatCurrency, formatNumber } from '../lib/utils';
import { 
  TrendingDown, TrendingUp, Users, DollarSign, Activity, AlertTriangle, 
  CheckCircle2, Clock, Zap, Target
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

const performanceData = [
  { date: '03-08', cpa: 16500, leads: 85 },
  { date: '03-09', cpa: 15800, leads: 92 },
  { date: '03-10', cpa: 14200, leads: 110 },
  { date: '03-11', cpa: 13500, leads: 125 },
  { date: '03-12', cpa: 14800, leads: 105 },
  { date: '03-13', cpa: 13900, leads: 118 },
  { date: '03-14', cpa: 12500, leads: 142 },
];

const funnelData = [
  { name: 'A_소재_텍스트', 노출: 100000, 클릭: 2500, 리드: 120 },
  { name: 'B_소재_이미지', 노출: 80000, 클릭: 1800, 리드: 85 },
  { name: 'C_소재_영상', 노출: 120000, 클릭: 3200, 리드: 150 },
];

// Hourly CPA Heatmap data (24 hours)
const hourlyHeatmapData = Array.from({ length: 24 }, (_, hour) => {
  const baseMultiplier = 
    hour >= 0 && hour < 6 ? 2.5 :
    hour >= 6 && hour < 9 ? 1.3 :
    hour >= 9 && hour < 12 ? 1.0 :
    hour >= 12 && hour < 14 ? 0.9 :
    hour >= 14 && hour < 18 ? 1.1 :
    hour >= 18 && hour < 20 ? 0.85 :
    hour >= 20 && hour < 23 ? 0.7 : 1.2;
  const noise = 0.85 + Math.random() * 0.3;
  return {
    hour: `${hour}시`,
    hourNum: hour,
    cpa: Math.floor(12000 * baseMultiplier * noise),
    leads: Math.floor(15 / baseMultiplier * noise),
  };
});

// Weekday × Hour heatmap data
const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS_DISPLAY = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const weekdayHourData: { day: string; hour: number; cpa: number; leads: number }[] = [];
DAYS.forEach((day, dayIdx) => {
  for (let hour = 0; hour < 24; hour += 2) {
    const isWeekend = dayIdx >= 5;
    const isEvening = hour >= 20 && hour < 24;
    const isNight = hour >= 0 && hour < 6;
    const baseCpa = isNight ? 22000 : isEvening ? 8500 : 13000;
    const weekendMod = isWeekend ? 1.15 : 1.0;
    const midweekBonus = (dayIdx >= 1 && dayIdx <= 3) ? 0.9 : 1.0;
    const noise = 0.85 + Math.random() * 0.3;
    const cpa = Math.floor(baseCpa * weekendMod * midweekBonus * noise);
    const leads = Math.max(0, Math.floor((isEvening ? 8 : isNight ? 1 : 4) / weekendMod * noise));
    weekdayHourData.push({ day, hour, cpa, leads });
  }
});

// Target segment data
const targetSegmentData = [
  { name: '남 30~39', spend: 420000, leads: 28, cpa: 15000, cvr: 3.2 },
  { name: '남 40~49', spend: 580000, leads: 52, cpa: 11154, cvr: 5.1 },
  { name: '남 50~59', spend: 310000, leads: 35, cpa: 8857, cvr: 6.8 },
  { name: '여 30~39', spend: 350000, leads: 22, cpa: 15909, cvr: 2.8 },
  { name: '여 40~49', spend: 490000, leads: 48, cpa: 10208, cvr: 5.5 },
  { name: '여 50~59', spend: 380000, leads: 42, cpa: 9048, cvr: 7.2 },
];

function getCpaColor(cpa: number): string {
  if (cpa <= 8000) return 'bg-emerald-500 text-white';
  if (cpa <= 10000) return 'bg-emerald-400 text-white';
  if (cpa <= 12000) return 'bg-emerald-300 text-emerald-900';
  if (cpa <= 14000) return 'bg-amber-200 text-amber-900';
  if (cpa <= 16000) return 'bg-amber-400 text-amber-900';
  if (cpa <= 20000) return 'bg-rose-300 text-rose-900';
  return 'bg-rose-500 text-white';
}

export function Dashboard() {
  const { arms, actions, botStatus } = useAppStore();

  const totalSpend = arms.reduce((sum, arm) => sum + arm.spend, 0);
  const totalLeads = arms.reduce((sum, arm) => sum + arm.leads, 0);
  const avgCpa = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const activeArmsCount = arms.filter(a => a.status !== 'PAUSED').length;
  const pendingActionsCount = actions.filter(a => a.status === 'pending' || a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">오늘 소진비</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalSpend)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">오늘 리드 수</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(totalLeads)}건</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">평균 CPA</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(avgCpa)}</h3>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">-12% ▼</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">대기중인 액션</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingActionsCount}건</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>일별 성과 추이 (CPA vs 리드 수)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₩${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [name === 'cpa' ? formatCurrency(value) : formatNumber(value), name === 'cpa' ? 'CPA' : '리드 수']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="cpa" name="CPA" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="leads" name="리드 수" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${botStatus.sessionStatus === 'active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Bot 세션</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{botStatus.sessionStatus === 'active' ? '정상 동작 중' : '오류 발생'}</p>
                </div>
              </div>
              <Badge variant={botStatus.sessionStatus === 'active' ? 'success' : 'danger'}>
                {botStatus.sessionStatus === 'active' ? 'Active' : 'Error'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">마지막 동기화</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">10분 전</p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {new Date(botStatus.lastCrawlTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Target size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">활성 Arm</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">전체 {arms.length}개 중</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {activeArmsCount} / {arms.length}
              </span>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">최근 경고</h4>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">CPA 급등 감지</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">'2030_남성_주말' 세트 CPA 20% 상승</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly CPA Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            시간대별 CPA 히트맵 (오늘)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {hourlyHeatmapData.map((d) => (
              <div
                key={d.hourNum}
                className={`rounded-lg p-2 text-center cursor-default transition-transform hover:scale-105 ${getCpaColor(d.cpa)}`}
                title={`${d.hour}: CPA ${formatCurrency(d.cpa)} / 리드 ${d.leads}건`}
              >
                <div className="text-[10px] font-medium opacity-80">{d.hour}</div>
                <div className="text-xs font-bold">{Math.floor(d.cpa / 1000)}k</div>
                <div className="text-[10px] opacity-70">{d.leads}건</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> ≤8,000</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300" /> ~12,000</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> ~14,000</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> ~16,000</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-300" /> ~20,000</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500" /> 20,000+</div>
          </div>
        </CardContent>
      </Card>

      {/* Weekday × Hour Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown size={18} className="text-indigo-500" />
            요일 × 시간대 CPA 히트맵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-slate-500 dark:text-slate-400 font-medium">요일</th>
                  {HOURS_DISPLAY.map(h => (
                    <th key={h} className="py-2 px-1 text-center text-slate-500 dark:text-slate-400 font-medium">{h}시</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="py-1 px-3 font-medium text-slate-700 dark:text-slate-300">{day}</td>
                    {HOURS_DISPLAY.map(hour => {
                      const cell = weekdayHourData.find(d => d.day === day && d.hour === hour);
                      if (!cell) return <td key={hour} />;
                      return (
                        <td key={hour} className="py-1 px-1">
                          <div
                            className={`rounded px-1.5 py-2 text-center cursor-default transition-transform hover:scale-110 ${getCpaColor(cell.cpa)}`}
                            title={`${day} ${hour}시: CPA ${formatCurrency(cell.cpa)} / 리드 ${cell.leads}건`}
                          >
                            <div className="font-bold">{Math.floor(cell.cpa / 1000)}k</div>
                            <div className="opacity-70">{cell.leads}건</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
            💡 <strong>화~금 20~22시</strong> 구간에서 CPA가 가장 낮고 리드 전환이 집중됩니다.
          </p>
        </CardContent>
      </Card>

      {/* Target Segment Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} className="text-purple-500" />
            타깃 세그먼트별 성과
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {targetSegmentData.map((seg) => (
              <div
                key={seg.name}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">{seg.name}</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">CPA</span>
                    <span className={`text-xs font-bold ${seg.cpa <= 10000 ? 'text-emerald-600 dark:text-emerald-400' : seg.cpa <= 13000 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(seg.cpa)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">리드</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{seg.leads}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">CVR</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{seg.cvr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">소진비</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatCurrency(seg.spend)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funnel Table */}
      <Card>
        <CardHeader>
          <CardTitle>소재별 퍼널 비교</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">소재명</th>
                <th className="px-6 py-3 font-medium text-right">노출</th>
                <th className="px-6 py-3 font-medium text-right">클릭</th>
                <th className="px-6 py-3 font-medium text-right">CTR</th>
                <th className="px-6 py-3 font-medium text-right">리드</th>
                <th className="px-6 py-3 font-medium text-right">CVR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {funnelData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatNumber(row.노출)}</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatNumber(row.클릭)}</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{(row.클릭 / row.노출 * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatNumber(row.리드)}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{(row.리드 / row.클릭 * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
