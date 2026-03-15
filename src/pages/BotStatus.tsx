import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../components/ui';
import { Bot, RefreshCw, LogIn, AlertTriangle, Image as ImageIcon, Terminal, CheckCircle2 } from 'lucide-react';

export function BotStatus() {
  const { botStatus } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bot / Scheduler 상태</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">토스애즈 데이터 수집 봇 및 액션 실행 스케줄러의 헬스 체크를 수행합니다.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw size={16} /> 수동 동기화
          </Button>
          <Button variant="primary" className="gap-2">
            <LogIn size={16} /> 재로그인
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot size={20} className="text-indigo-500" />
              세션 및 동기화 상태
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">세션 상태</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${botStatus.sessionStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {botStatus.sessionStatus === 'active' ? '정상 연결됨' : '연결 끊김'}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">마지막 로그인</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {new Date(botStatus.lastLoginTime).toLocaleString('ko-KR')}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">마지막 데이터 수집</div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {new Date(botStatus.lastCrawlTime).toLocaleString('ko-KR')}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal size={16} className="text-slate-500" />
                최근 시스템 로그
              </h4>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <div className="space-y-1">
                  <div className="flex gap-3"><span className="text-slate-500">[15:30:00]</span><span className="text-emerald-400">INFO</span><span>Data sync completed successfully. (245 rows)</span></div>
                  <div className="flex gap-3"><span className="text-slate-500">[15:29:45]</span><span className="text-blue-400">DEBUG</span><span>Evaluating Rule Engine for 12 active arms...</span></div>
                  <div className="flex gap-3"><span className="text-slate-500">[15:29:10]</span><span className="text-emerald-400">INFO</span><span>Navigating to TossAds Dashboard...</span></div>
                  <div className="flex gap-3"><span className="text-slate-500">[15:29:05]</span><span className="text-emerald-400">INFO</span><span>Session validated. Token expires in 12h.</span></div>
                  {botStatus.selectorErrors.map((err, i) => (
                    <div key={i} className="flex gap-3"><span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span><span className="text-rose-400">ERROR</span><span className="text-rose-300">{err}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle size={16} className="text-amber-500" />
                셀렉터 오류 모니터링
              </CardTitle>
            </CardHeader>
            <CardContent>
              {botStatus.selectorErrors.length > 0 ? (
                <ul className="space-y-2 text-sm text-rose-600 dark:text-rose-400">
                  {botStatus.selectorErrors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 flex-shrink-0">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 size={32} className="text-emerald-500 mb-2 opacity-50" />
                  <p className="text-sm">감지된 셀렉터 오류가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ImageIcon size={16} className="text-blue-500" />
                최근 수집 스크린샷
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img 
                  src={botStatus.recentScreenshotUrl} 
                  alt="Recent Crawl Screenshot" 
                  className="w-full h-full object-cover opacity-80 mix-blend-multiply dark:mix-blend-screen"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Button variant="outline" className="text-white border-white hover:bg-white/20">
                    크게 보기
                  </Button>
                </div>
              </div>
              <div className="p-3 text-xs text-center text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                캡처 시각: {new Date(botStatus.lastCrawlTime).toLocaleString('ko-KR')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
