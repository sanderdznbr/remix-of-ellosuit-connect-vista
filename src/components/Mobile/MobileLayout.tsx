import React, { useState } from 'react';
import { ModularSidebar } from '@/components/Dashboard/ModularSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import ImprovedMobileNavbar from './ImprovedMobileNavbar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AIOnboardingWizard } from '@/components/Onboarding/AIOnboardingWizard';
import { GuidedTour } from '@/components/Onboarding/GuidedTour';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { 
    hasCompletedOnboarding, 
    hasSeenTour, 
    loading,
    completeOnboarding, 
    completeTour,
    skipOnboarding 
  } = useOnboarding();

  // Show onboarding wizard for new users
  if (!loading && !hasCompletedOnboarding) {
    return (
      <AIOnboardingWizard 
        onComplete={(preferences) => {
          completeOnboarding(preferences);
        }}
        onSkip={skipOnboarding}
      />
    );
  }

  // Desktop view - mostrar a sidebar azul completa fixa
  if (!isMobile) {
    return (
      <div className="flex min-h-screen w-full">
        <ModularSidebar isMobile={false} />
        <main className="flex-1 w-full bg-background">
          {children}
        </main>
        
        {/* Guided tour for new users */}
        {!hasSeenTour && (
          <GuidedTour 
            onComplete={completeTour}
            onSkip={completeTour}
          />
        )}
      </div>
    );
  }

  // Mobile view - com nova navbar inferior
  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Mobile Top Navbar - Fixed */}
      <div className="fixed top-0 left-0 right-0 bg-primary h-14 flex items-center justify-center px-4 z-50">
        {/* Menu Hambúrguer - Posição Absoluta Esquerda */}
        <div className="absolute left-4">
          <ModularSidebar 
            isMobile={true} 
            isOpen={sidebarOpen} 
            onOpenChange={setSidebarOpen} 
          />
        </div>
        
        {/* Logo Centralizada */}
        <Link to="/dashboard" className="flex items-center justify-center">
          <img 
            src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
            alt="ElloSuit Logo" 
            className="h-6 w-auto filter brightness-0 invert"
          />
        </Link>
      </div>
      
      {/* Spacer para compensar o header fixo */}
      <div className="h-14" />
      
      {/* Main content - com padding inferior para a navbar */}
      <main className="w-full bg-background px-4 pt-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <ImprovedMobileNavbar />
      
      {/* Guided tour for new users */}
      {!hasSeenTour && (
        <GuidedTour 
          onComplete={completeTour}
          onSkip={completeTour}
        />
      )}
    </div>
  );
};

export default MobileLayout;