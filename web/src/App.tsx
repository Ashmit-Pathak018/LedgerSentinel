import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, openLoginModal, openResetPasswordModal } = useAuth();
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');

  // Handle URL hashes and protected route enforcement
  useEffect(() => {
    if (isLoading) return;

    const checkRoute = () => {
      const hash = window.location.hash;

      if (hash === '#reset-password' || hash === '#recovery') {
        setViewMode('landing');
        openResetPasswordModal();
        return;
      }

      if (hash === '#app' || hash === '#console' || hash === '#dashboard') {
        if (isAuthenticated) {
          setViewMode('app');
        } else {
          // Unauthenticated attempt to access console: redirect to landing and open login modal
          setViewMode('landing');
          window.location.hash = '';
          openLoginModal();
        }
      } else {
        setViewMode('landing');
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [isAuthenticated, isLoading, openLoginModal, openResetPasswordModal]);

  const launchApp = () => {
    if (isAuthenticated) {
      setViewMode('app');
      window.location.hash = 'app';
    } else {
      openLoginModal();
    }
  };

  const backToLanding = () => {
    setViewMode('landing');
    window.location.hash = '';
  };

  // If user signs out while in app mode, redirect back to landing
  useEffect(() => {
    if (!isLoading && !isAuthenticated && viewMode === 'app') {
      setViewMode('landing');
      window.location.hash = '';
    }
  }, [isAuthenticated, isLoading, viewMode]);

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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
