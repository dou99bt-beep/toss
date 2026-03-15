import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ArmManagement } from './pages/ArmManagement';
import { RuleEngine } from './pages/RuleEngine';
import { ActionCenter } from './pages/ActionCenter';
import { BotStatus } from './pages/BotStatus';
import { AdminAnalysis } from './pages/AdminAnalysis';
import { CreativeIntelligence } from './pages/CreativeIntelligence';
import { AuditLog } from './pages/AuditLog';
import { AlertCenter } from './pages/AlertCenter';
import { LeadFormPreview } from './pages/LeadFormPreview';
import { Settings } from './pages/Settings';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const { fetchArms, fetchActions } = useAppStore();

  useEffect(() => {
    fetchArms();
    fetchActions();
  }, [fetchArms, fetchActions]);

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'admin-analysis':
        return <AdminAnalysis />;
      case 'arm-management':
        return <ArmManagement />;
      case 'rule-engine':
        return <RuleEngine />;
      case 'creative-intelligence':
        return <CreativeIntelligence />;
      case 'action-center':
        return <ActionCenter />;
      case 'bot-scheduler':
        return <BotStatus />;
      case 'alert-center-page':
        return <AlertCenter />;
      case 'audit-log':
        return <AuditLog />;
      case 'lead-form':
        return <LeadFormPreview />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 dark:text-slate-400">
            <h2 className="text-2xl font-bold mb-2">준비 중인 페이지입니다.</h2>
            <p>선택하신 메뉴({activeMenu})는 현재 개발 중입니다.</p>
          </div>
        );
    }
  };

  return (
    <Layout activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
      {renderContent()}
    </Layout>
  );
}