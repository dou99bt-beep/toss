import React from 'react';
import { 
  LayoutDashboard, Network, GitMerge, Zap, Image, 
  Inbox, Bot, ShieldAlert, Settings, LogOut, Moon, Sun, Menu, X, Bell, ClipboardList,
  FlaskConical
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const menus = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'cpa-optimization', label: 'CPA 최적화', icon: FlaskConical },
  { id: 'admin-analysis', label: '어드민 구조 분석', icon: Network },
  { id: 'arm-management', label: 'Arm 실험 관리', icon: GitMerge },
  { id: 'rule-engine', label: 'Rule Engine', icon: Zap },
  { id: 'creative-intelligence', label: 'Creative Intelligence', icon: Image },
  { id: 'action-center', label: 'Action Center', icon: Inbox },
  { id: 'alert-center-page', label: 'Alert Center', icon: Bell },
  { id: 'bot-scheduler', label: 'Bot / Scheduler', icon: Bot },
  { id: 'lead-form', label: '리드 양식', icon: ClipboardList },
  { id: 'audit-log', label: 'Audit Log', icon: ShieldAlert },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeMenu, setActiveMenu, isOpen, setIsOpen }: SidebarProps) {
  const { theme, toggleTheme } = useAppStore();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed lg:sticky top-0 h-screen w-64 flex flex-col z-50 transition-transform duration-300 ease-in-out",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white leading-tight">TossAds Opt</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">CPA Optimization OS</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-500">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isActive = activeMenu === menu.id;
            return (
              <button
                key={menu.id}
                onClick={() => {
                  setActiveMenu(menu.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon size={18} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"} />
                {menu.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'light' ? '다크 모드' : '라이트 모드'}
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
