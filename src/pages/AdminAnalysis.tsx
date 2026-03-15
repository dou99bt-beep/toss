import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui';
import { Network, Search, Filter, ChevronRight, ChevronDown, BarChart3, Users, Clock, AlertTriangle, Copy, FileWarning, Settings2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/utils';

const treeData = [
  {
    id: 'c1', type: 'campaign', name: '명율1차 0105', status: 'active',
    spend: 6070000, leads: 473, cpa: 12832,
    settings: { objective: '전환 최대화', budget: '300,000원/일' },
    children: [
      {
        id: 'as1', type: 'adset', name: '여45-59_수금_야간_자동입찰',
        status: 'active', spend: 2100000, leads: 210, cpa: 10000,
        settings: { bidStrategy: '자동입찰 (전환 최대화)', targetCpa: '타겟 CPA 5,000원', target: '여성 45-59세', schedule: '수~금 20:00-23:00', state: 'ON' },
        children: [
          { id: 'cr1', type: 'creative', name: '문구강조_해결형_A', status: 'active', spend: 1200000, leads: 130, cpa: 9231,
            settings: { format: '문구 강조형', copy: '"개인회생 가능 여부를 확인하세요"', state: 'ON' } },
          { id: 'cr2', type: 'creative', name: '문구강조_공포형_B', status: 'active', spend: 900000, leads: 80, cpa: 11250,
            settings: { format: '문구 강조형', copy: '"빚 독촉 시달리고 있다면"', state: 'ON' } },
        ]
      },
      {
        id: 'as2', type: 'adset', name: '남45-54_화금_야간_CPC200',
        status: 'active', spend: 1800000, leads: 140, cpa: 12857,
        settings: { bidStrategy: '직접입찰 (CPC)', targetCpa: 'CPC 200원', target: '남성 45-54세', schedule: '화~금 20:00-23:00', state: 'ON' },
        children: [
          { id: 'cr3', type: 'creative', name: '문구강조_해결형_A', status: 'active', spend: 1800000, leads: 140, cpa: 12857,
            settings: { format: '문구 강조형', copy: '"개인회생 가능 여부를 확인하세요"', state: 'ON' } },
        ]
      },
      {
        id: 'as3', type: 'adset', name: '남45-54_화금_야간_CPC600',
        status: 'paused', spend: 580000, leads: 28, cpa: 20714,
        settings: { bidStrategy: '직접입찰 (CPC)', targetCpa: 'CPC 600원', target: '남성 45-54세', schedule: '화~금 20:00-23:00', state: 'OFF' },
        children: [
          { id: 'cr4', type: 'creative', name: '문구강조_해결형_A', status: 'paused', spend: 580000, leads: 28, cpa: 20714,
            settings: { format: '문구 강조형', copy: '"개인회생 가능 여부를 확인하세요"', state: 'OFF' } },
        ]
      },
      {
        id: 'as4', type: 'adset', name: '여45-59_항상노출_타겟CPA6000',
        status: 'active', spend: 1590000, leads: 95, cpa: 16737,
        settings: { bidStrategy: '자동입찰 (전환 최대화)', targetCpa: '타겟 CPA 6,000원', target: '여성 45-59세', schedule: '항상 노출', state: 'ON' },
        children: [
          { id: 'cr5', type: 'creative', name: '문구강조_행동유도_C', status: 'active', spend: 1590000, leads: 95, cpa: 16737,
            settings: { format: '문구 강조형', copy: '"무료 상담 지금 바로 신청"', state: 'ON' } },
        ]
      }
    ]
  },
];

// Duplicate detection logic
interface DuplicateGroup {
  type: string;
  description: string;
  nodes: { id: string; name: string; parentName: string }[];
}

function detectDuplicates(data: typeof treeData): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  
  // Check for same target + different bid strategy (same creative)
  const targetBidMap = new Map<string, { id: string; name: string; bid: string; parentName: string }[]>();
  data.forEach(campaign => {
    campaign.children?.forEach((adset: any) => {
      const key = `${adset.settings?.target}`;
      if (!targetBidMap.has(key)) targetBidMap.set(key, []);
      targetBidMap.get(key)!.push({ id: adset.id, name: adset.name, bid: adset.settings?.targetCpa, parentName: campaign.name });
    });
  });
  targetBidMap.forEach((nodes, target) => {
    if (nodes.length > 1) {
      groups.push({
        type: '동일 타깃 — 입찰만 다름',
        description: `타깃 "${target}"에 대해 ${nodes.length}개 광고세트가 서로 다른 입찰전략으로 운용 중`,
        nodes: nodes.map(n => ({ id: n.id, name: `${n.name} (${n.bid})`, parentName: n.parentName })),
      });
    }
  });

  // Check for same creative across ad sets
  const creativeMap = new Map<string, { id: string; name: string; parentName: string }[]>();
  data.forEach(campaign => {
    campaign.children?.forEach((adset: any) => {
      adset.children?.forEach((cr: any) => {
        const key = cr.settings?.copy || cr.name;
        if (!creativeMap.has(key)) creativeMap.set(key, []);
        creativeMap.get(key)!.push({ id: cr.id, name: cr.name, parentName: adset.name });
      });
    });
  });
  creativeMap.forEach((nodes, copy) => {
    if (nodes.length > 1) {
      groups.push({
        type: '동일 소재 — 세트만 다름',
        description: `소재 "${copy}"가 ${nodes.length}개 광고세트에서 중복 사용 중`,
        nodes,
      });
    }
  });

  return groups;
}

// Naming rule check
interface NamingIssue { id: string; name: string; issue: string; }
function checkNamingRules(data: typeof treeData): NamingIssue[] {
  const issues: NamingIssue[] = [];
  data.forEach(campaign => {
    campaign.children?.forEach((adset: any) => {
      if (!adset.name.includes('_')) {
        issues.push({ id: adset.id, name: adset.name, issue: '구분자(_) 미사용: 타깃/요일/시간대/입찰 구분이 어려움' });
      }
      if (adset.name.length > 40) {
        issues.push({ id: adset.id, name: adset.name, issue: '이름이 40자를 초과하여 UI에서 잘릴 수 있음' });
      }
    });
  });
  return issues;
}

const TreeNode: React.FC<{ node: any, level?: number }> = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'campaign': return <Network size={16} className="text-blue-500" />;
      case 'adset': return <Users size={16} className="text-indigo-500" />;
      case 'creative': return <BarChart3 size={16} className="text-emerald-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-emerald-500' : 'bg-slate-300';
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors ${level === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        <div className="flex items-center gap-2 w-1/4 min-w-[250px]">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 ${!hasChildren && 'invisible'}`}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {getTypeIcon(node.type)}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(node.status)}`} />
            <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{node.name}</span>
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-4 gap-4 text-right text-sm">
          <div className="text-slate-600 dark:text-slate-400">{formatCurrency(node.spend)}</div>
          <div className="text-slate-600 dark:text-slate-400">{formatNumber(node.leads)}</div>
          <div className="font-medium text-slate-900 dark:text-white">{formatCurrency(node.cpa)}</div>
          <div>
            {node.settings && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
              >
                <Settings2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && node.settings && (
        <div 
          className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-slate-100 dark:border-slate-800 px-4 py-3"
          style={{ paddingLeft: `${level * 2 + 3.5}rem` }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
            {Object.entries(node.settings).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                  {key === 'bidStrategy' ? '입찰전략' : key === 'targetCpa' ? '입찰가' : key === 'target' ? '타깃' : key === 'schedule' ? '스케줄' : key === 'state' ? '상태' : key === 'objective' ? '목표' : key === 'budget' ? '예산' : key === 'format' ? '포맷' : key === 'copy' ? '카피' : key}:
                </span>
                <span className={`font-medium ${key === 'state' ? (value === 'ON' ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-700 dark:text-slate-300'}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export function AdminAnalysis() {
  const duplicates = detectDuplicates(treeData);
  const namingIssues = checkNamingRules(treeData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">어드민 구조 분석</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">토스애즈 계정의 캠페인 계층 구조와 성과를 한눈에 파악합니다.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="캠페인, 세트, 소재 검색..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Duplicate Detection Alerts */}
      {duplicates.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="bg-amber-50 dark:bg-amber-900/20 border-b-amber-200 dark:border-b-amber-900/50">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Copy size={18} /> 중복 조합 탐지 ({duplicates.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicates.map((group, i) => (
              <div key={i} className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning">{group.type}</Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{group.description}</p>
                <div className="flex flex-wrap gap-2">
                  {group.nodes.map(n => (
                    <span key={n.id} className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {n.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Naming Rule Check */}
      {namingIssues.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <FileWarning size={18} /> 네이밍 규칙 검사 ({namingIssues.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {namingIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <AlertTriangle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">{issue.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">— {issue.issue}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tree */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>계층별 성과 트리</CardTitle>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5"><Network size={14} /> 캠페인</div>
              <div className="flex items-center gap-1.5"><Users size={14} /> 광고세트</div>
              <div className="flex items-center gap-1.5"><BarChart3 size={14} /> 소재</div>
              <div className="flex items-center gap-1.5"><Settings2 size={14} /> 설정 보기</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="flex items-center py-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400">
              <div className="w-1/4 min-w-[250px] pl-8">구조명</div>
              <div className="flex-1 grid grid-cols-4 gap-4 text-right">
                <div>소진비</div>
                <div>리드 수</div>
                <div>CPA</div>
                <div>설정</div>
              </div>
            </div>
            <div className="flex flex-col">
              {treeData.map(node => (
                <TreeNode key={node.id} node={node} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
