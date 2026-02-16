import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MegaMenuHeader } from './MegaMenuHeader';
import MobileAppHeader from '@/components/Mobile/MobileAppHeader';
import MobileBottomNav from '@/components/Mobile/MobileBottomNav';
import { useRoutineExecutor } from '@/hooks/useRoutineExecutor';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();
  useRoutineExecutor();
  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Desktop: Mega Menu Header | Mobile: App Header */}
      {isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}
      
      <main className={`flex-1 min-h-0 w-full ${isMobile ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''} overflow-y-auto`}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <MobileBottomNav />}

      {/* Push Notification Permission Prompt */}
      <PushNotificationPrompt />
    </div>
  );
}

export default DashboardLayout;
