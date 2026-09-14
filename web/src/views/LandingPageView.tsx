import React from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { LandingHero } from '../components/landing/LandingHero';
import { TheProblemSection } from '../components/landing/TheProblemSection';
import { TheProductSection } from '../components/landing/TheProductSection';
import { BoundedAiSection } from '../components/landing/BoundedAiSection';
import { PrivacySection } from '../components/landing/PrivacySection';
import { DecisionStorySection } from '../components/landing/DecisionStorySection';
import { ExplainabilitySection } from '../components/landing/ExplainabilitySection';
import { LandingCta } from '../components/landing/LandingCta';
import { LandingFooter } from '../components/landing/LandingFooter';

interface LandingPageViewProps {
  onLaunchApp: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onLaunchApp }) => {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0F1B33] selection:bg-blue-100 selection:text-blue-900 scroll-smooth">
      {/* 1. Sticky Navigation Bar */}
      <LandingNav onLaunchApp={onLaunchApp} />

      <main>
        {/* 2. Hero Section with 3D Central Core & Multi-Channel Cards */}
        <LandingHero onLaunchApp={onLaunchApp} />

        {/* 3. Section 2 — The Problem (Context vs Transaction) */}
        <div id="how-it-works">
          <TheProblemSection />
        </div>

        {/* 4. Section 3 — The Product (Operations Console Mockup) */}
        <TheProductSection onLaunchApp={onLaunchApp} />

        {/* 5. Section 4 — Bounded AI (Autonomy Spectrum) */}
        <BoundedAiSection />

        {/* 6. Section 5 — Privacy By Design (3D Phone & On-Device Processing) */}
        <PrivacySection />

        {/* 7. Section 6 — Interactive Decision Story (4-Step Progression) */}
        <DecisionStorySection onLaunchApp={onLaunchApp} />

        {/* 8. Section 7 — Explainability (Policy Gate & Decision Record) */}
        <ExplainabilitySection />

        {/* 9. Section 8 — Final CTA with 3D Shield */}
        <LandingCta onLaunchApp={onLaunchApp} />
      </main>

      {/* 10. Footer */}
      <LandingFooter onLaunchApp={onLaunchApp} />
    </div>
  );
};

export default LandingPageView;
