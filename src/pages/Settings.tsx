import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui';
import { Key, Bell, Shield, Database, Save } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">시스템 연동 및 알림 설정을 관리합니다.</p>
      </div>

      <div className="grid gap-6">
        {/* API Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key size={18} className="text-blue-500" />
              토스애즈 API 연동
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Access Token</label>
              <input 
                type="password" 
                value="••••••••••••••••••••••••••••••" 
                readOnly
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ad Account ID</label>
              <input 
                type="text" 
                defaultValue="ACT-987654321" 
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <div className="pt-2">
              <Button variant="outline">토큰 재발급 / 변경</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              알림 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: 'n1', title: '자동 액션 실행 알림', desc: 'Rule Engine에 의해 자동 액션이 실행되었을 때 알림을 받습니다.' },
              { id: 'n2', title: '수동 승인 대기 알림', desc: '운영자의 승인이 필요한 액션이 발생했을 때 알림을 받습니다.' },
              { id: 'n3', title: '시스템 오류 알림', desc: 'Bot 크롤링 실패 또는 API 오류 발생 시 알림을 받습니다.' },
            ].map(item => (
              <div key={item.id} className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
            <div className="pt-4 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Slack Webhook URL</label>
              <input 
                type="text" 
                placeholder="https://hooks.slack.com/services/..." 
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={18} className="text-emerald-500" />
              데이터 수집 주기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bot 크롤링 간격</label>
              <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="5">5분</option>
                <option value="10" selected>10분</option>
                <option value="30">30분</option>
                <option value="60">1시간</option>
              </select>
              <p className="text-xs text-slate-500">간격이 짧을수록 실시간성이 높아지나 계정 블록 위험이 증가할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button className="gap-2">
            <Save size={16} />
            설정 저장
          </Button>
        </div>
      </div>
    </div>
  );
}
