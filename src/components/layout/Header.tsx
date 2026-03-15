import React, { useState } from 'react';
import { Menu, Bell, Search, User, Database } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface HeaderProps {
  title: string;
  setSidebarOpen: (isOpen: boolean) => void;
}

export function Header({ title, setSidebarOpen }: HeaderProps) {
  const { botStatus } = useAppStore();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    if (!window.confirm('기존 데이터가 모두 삭제되고 더미 데이터로 초기화됩니다. 진행하시겠습니까?')) return;
    
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        alert('데이터 초기화가 완료되었습니다. 새로고침합니다.');
        window.location.reload();
      } else {
        alert('데이터 초기화에 실패했습니다.');
      }
    } catch (error) {
      console.error('Seed error:', error);
      alert('데이터 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Seed Data Button */}
        <button
          onClick={handleSeedData}
          disabled={isSeeding}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Database size={16} className={isSeeding ? 'animate-spin' : ''} />
          {isSeeding ? '초기화 중...' : '데이터 초기화'}
        </button>

        {/* Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
          <div className={`w-2 h-2 rounded-full ${botStatus.sessionStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Bot: {botStatus.sessionStatus === 'active' ? '정상' : '오류'}
          </span>
        </div>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="캠페인, Arm 검색..." 
            className="w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
