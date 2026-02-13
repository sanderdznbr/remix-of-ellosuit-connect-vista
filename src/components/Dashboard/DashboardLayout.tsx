import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MegaMenuHeader } from './MegaMenuHeader';
import MobileAppHeader from '@/components/Mobile/MobileAppHeader';
import MobileBottomNav from '@/components/Mobile/MobileBottomNav';
import { useRoutineExecutor } from '@/hooks/useRoutineExecutor';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();
  useRoutineExecutor();
  return (
    <div className="min-h-screen bg-background">
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
