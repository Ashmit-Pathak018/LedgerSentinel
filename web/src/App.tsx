import React from 'react';
import { FraudProvider, useFraud } from './context/FraudContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DemoController } from './components/demo/DemoController';

// Views
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { InvestigationView } from './views/InvestigationView';
import { CommunicationAnalysisView } from './views/CommunicationAnalysisView';
import { CaseManagementView } from './views/CaseManagementView';
import { StepUpVerificationView } from './views/StepUpVerificationView';
import { PrivacyConsentView } from './views/PrivacyConsentView';
import { AuditTrailView } from './views/AuditTrailView';

const MainContent: React.FC = () => {
  const { currentScreen } = useFraud();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'investigation':
        return <InvestigationView />;
      case 'communications':
        return <CommunicationAnalysisView />;
      case 'cases':
        return <CaseManagementView />;
      case 'stepup':
        return <StepUpVerificationView />;
      case 'privacy':
        return <PrivacyConsentView />;
      case 'audit':
        return <AuditTrailView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F8FAFC]">
      <TopBar />
      <main className="flex-1 p-8 overflow-y-auto no-scrollbar scroll-smooth">
        {renderScreen()}
      </main>
      <DemoController />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <FraudProvider>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
        <Sidebar />
        <MainContent />
      </div>
    </FraudProvider>
  );
};

export default App;
