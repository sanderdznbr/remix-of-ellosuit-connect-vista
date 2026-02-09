import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MegaMenuHeader } from './MegaMenuHeader';
import MobileAppHeader from '@/components/Mobile/MobileAppHeader';
import MobileBottomNav from '@/components/Mobile/MobileBottomNav';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();

  return (
    <div className={`min-h-screen ${isMobile ? 'bg-background' : 'bg-muted/30'}`}>
      {/* Desktop: Mega Menu Header | Mobile: App Header */}
      {isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}
      
      <main className={`w-full ${isMobile ? 'pb-24' : ''}`}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}

export default DashboardLayout;
