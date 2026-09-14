import React, { useState, useEffect } from 'react';
import { FraudProvider, useFraud } from './context/FraudContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DemoController } from './components/demo/DemoController';
import { LandingPageView } from './views/LandingPageView';

// Views
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { InvestigationView } from './views/InvestigationView';
import { CommunicationAnalysisView } from './views/CommunicationAnalysisView';
import { CaseManagementView } from './views/CaseManagementView';
import { StepUpVerificationView } from './views/StepUpVerificationView';
import { PrivacyConsentView } from './views/PrivacyConsentView';
import { AuditTrailView } from './views/AuditTrailView';
import { PrismObservabilityView } from './views/PrismObservabilityView';

interface MainContentProps {
  onBackToLanding: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ onBackToLanding }) => {
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
      case 'prism':
        return <PrismObservabilityView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F8FAFC]">
      <TopBar onBackToLanding={onBackToLanding} />
      <main className="flex-1 p-8 overflow-y-auto no-scrollbar scroll-smooth">
        {renderScreen()}
      </main>
      <DemoController />
    </div>
  );
};

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#app' || window.location.hash === '#console')) {
      return 'app';
    }
    return 'landing';
  });

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#app' || window.location.hash === '#console') {
        setViewMode('app');
      } else if (window.location.hash === '#landing' || window.location.hash === '') {
        setViewMode('landing');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const launchApp = () => {
    setViewMode('app');
    window.location.hash = 'app';
  };

  const backToLanding = () => {
    setViewMode('landing');
    window.location.hash = '';
  };

  return (
    <FraudProvider>
      {viewMode === 'landing' ? (
        <LandingPageView onLaunchApp={launchApp} />
      ) : (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
          <Sidebar />
          <MainContent onBackToLanding={backToLanding} />
        </div>
      )}
    </FraudProvider>
  );
};

export default App;

