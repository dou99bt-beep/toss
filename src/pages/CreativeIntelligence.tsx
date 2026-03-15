import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { Image as ImageIcon, Type, TrendingDown, AlertTriangle, Sparkles, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const creativeData = [
  { id: 'CR-001', name: '문구강조_해결형_A', type: 'text', copy: '"개인회생 가능 여부를 확인하세요"', ctr: 2.8, cvr: 6.2, cpa: 9500, fatigue: 35, validLeadRate: 88, consultRate: 72, status: 'good' },
  { id: 'CR-002', name: '문구강조_공포형_B', type: 'text', copy: '"빚 독촉 시달리고 있다면"', ctr: 5.2, cvr: 1.1, cpa: 28000, fatigue: 75, validLeadRate: 42, consultRate: 18, status: 'bad' },
  { id: 'CR-003', name: '이미지_안내형_C', type: 'image', copy: '"무료 상담으로 빚 탕감 확인"', ctr: 1.9, cvr: 5.8, cpa: 10200, fatigue: 45, validLeadRate: 82, consultRate: 65, status: 'good' },
  { id: 'CR-004', name: '문구강조_행동유도_D', type: 'text', copy: '"지금 바로 무료 상담 신청"', ctr: 3.5, cvr: 3.2, cpa: 14800, fatigue: 60, validLeadRate: 68, consultRate: 45, status: 'warning' },
  { id: 'CR-005', name: '이미지_사례형_E', type: 'image', copy: '"3억 빚 → 월 80만원으로 해결"', ctr: 4.8, cvr: 0.8, cpa: 32000, fatigue: 90, validLeadRate: 35, consultRate: 12, status: 'bad' },
  { id: 'CR-006', name: '문구강조_정보형_F', type: 'text', copy: '"개인회생 자격요건 3분 체크"', ctr: 2.1, cvr: 7.1, cpa: 8200, fatigue: 25, validLeadRate: 91, consultRate: 78, status: 'good' },
];

const fatigueData = [
  { day: 'D-6', ctr: 2.5, fatigue: 10 },
  { day: 'D-5', ctr: 2.4, fatigue: 20 },
  { day: 'D-4', ctr: 2.2, fatigue: 35 },
  { day: 'D-3', ctr: 1.9, fatigue: 50 },
  { day: 'D-2', ctr: 1.5, fatigue: 70 },
  { day: 'D-1', ctr: 1.2, fatigue: 85 },
  { day: 'Today', ctr: 0.9, fatigue: 95 },
];

// Detect low-quality click bait creatives
const lowQualityCreatives = creativeData.filter(c => c.ctr > 3.5 && c.cvr < 2.0);

// Similar creative suggestions
const suggestedCreatives = [
  { original: 'CR-001', suggestion: '"개인회생 자격, 30초면 확인됩니다"', reason: '해결형 CR-001의 높은 CVR(6.2%) 패턴 기반 변형' },
  { original: 'CR-006', suggestion: '"내 빚, 얼마나 줄일 수 있을까?"', reason: '정보형 CR-006의 높은 유효리드율(91%) 패턴 기반 변형' },
  { original: 'CR-003', suggestion: '"개인회생 전문 변호사 무료 상담"', reason: '안내형 CR-003의 상담연결률(65%) 기반 신뢰 강조 변형' },
];

export function CreativeIntelligence() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Creative Intelligence</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">소재별 피로도, CTR/CVR 추이 및 리드 품질 지표를 분석합니다.</p>
      </div>

      {/* Low Quality Click Bait Warning */}
      {lowQualityCreatives.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-900/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-2">⚠️ 저품질 클릭 유도 의심 소재 ({lowQualityCreatives.length}건)</h4>
                <div className="space-y-2">
                  {lowQualityCreatives.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                      <Badge variant="danger">{c.id}</Badge>
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{c.name}</span>
                      <span className="text-xs text-rose-600 dark:text-rose-400">
                        CTR {c.ctr}% (높음) / CVR {c.cvr}% (매우 낮음) — 호기심 유발형 / 과장 소재일 가능성
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  CTR이 높으나 CVR이 극히 낮은 소재는 어그로성 문구로 클릭만 유도하고 실제 상담으로 이어지지 않을 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fatigue Analysis Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown size={18} className="text-orange-500" />
              소재 피로도 추이 (평균)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fatigueData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar yAxisId="left" dataKey="ctr" name="CTR (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar yAxisId="right" dataKey="fatigue" name="피로도 지수" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attribute Performance */}
        <Card>
          <CardHeader>
            <CardTitle>속성별 성과 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Type size={16} className="text-blue-500" /> 텍스트형 소재
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Avg CPA: {formatCurrency(17500)}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <ImageIcon size={16} className="text-purple-500" /> 이미지형 소재
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Avg CPA: {formatCurrency(12750)}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">인사이트</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span>정보형·해결형 카피가 공포형 대비 유효리드율이 2배 이상 높습니다.</li>
                <li className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">•</span>공포형 소재는 CTR은 높으나 상담연결률이 극히 낮아 비용만 소모됩니다.</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>CVR 5% 이상인 소재만 필터하면 CPA가 40% 이상 절감됩니다.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creative Detail Table - Enhanced */}
      <Card>
        <CardHeader>
          <CardTitle>소재별 상세 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 uppercase">
                <tr>
                  <th className="px-4 py-3">소재명</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">CVR</th>
                  <th className="px-4 py-3 text-right">CPA</th>
                  <th className="px-4 py-3 text-right">유효리드율</th>
                  <th className="px-4 py-3 text-right">상담연결률</th>
                  <th className="px-4 py-3 text-center">피로도</th>
                  <th className="px-4 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {creativeData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.copy}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'text' ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><Type size={12} className="mr-1"/> 텍스트</Badge>
                      ) : (
                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50"><ImageIcon size={12} className="mr-1"/> 이미지</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{item.ctr}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${item.cvr >= 5 ? 'text-emerald-600 dark:text-emerald-400' : item.cvr >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.cvr}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.cpa)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${item.validLeadRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : item.validLeadRate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.validLeadRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${item.consultRate >= 60 ? 'text-emerald-600 dark:text-emerald-400' : item.consultRate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.consultRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${item.fatigue > 80 ? 'bg-rose-500' : item.fatigue > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${item.fatigue}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{item.fatigue}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'good' && <Badge variant="success">양호</Badge>}
                      {item.status === 'warning' && <Badge variant="warning">주의</Badge>}
                      {item.status === 'bad' && <Badge variant="danger">교체 권장</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Similar Creative Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            유사 소재 추천
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestedCreatives.map((s, i) => (
              <div key={i} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex-shrink-0">
                    <Sparkles size={16} className="text-purple-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50/50">{s.original} 기반</Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{s.suggestion}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
            💡 성과 우수 소재의 패턴(해결형, 정보형, 신뢰형)을 기반으로 AI가 유사 변형을 제안합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
