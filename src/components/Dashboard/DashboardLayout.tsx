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
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Desktop: Mega Menu Header | Mobile: App Header */}
      {isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}
      
      <main className={`flex-1 min-h-0 w-full ${isMobile ? 'pb-16' : ''}`}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}

export default DashboardLayout;
