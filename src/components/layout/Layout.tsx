import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export function Layout({ children, activeMenu, setActiveMenu }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useAppStore();

  return (
    <div className={cn(
      "min-h-screen flex w-full font-sans transition-colors duration-200",
      theme === 'dark' ? 'dark bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
    )}>
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          title={activeMenu.replace('-', ' ').toUpperCase()} 
          setSidebarOpen={setIsSidebarOpen} 
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
