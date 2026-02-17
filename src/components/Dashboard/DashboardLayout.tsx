import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'react-router-dom';
import { MegaMenuHeader } from './MegaMenuHeader';
import MobileAppHeader from '@/components/Mobile/MobileAppHeader';
import MobileBottomNav from '@/components/Mobile/MobileBottomNav';
import { useRoutineExecutor } from '@/hooks/useRoutineExecutor';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  useRoutineExecutor();

  // CRM WhatsApp on mobile: fullscreen, no header/navbar
  const isCrmWhatsApp = isMobile && location.pathname.includes('/crm-whatsapp');

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Desktop: Mega Menu Header | Mobile: App Header (hidden on CRM WhatsApp) */}
      {isCrmWhatsApp ? null : isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}
      
      <main className={`flex-1 min-h-0 w-full ${isMobile && !isCrmWhatsApp ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''} overflow-y-auto overscroll-none flex flex-col`} style={{ scrollbarGutter: 'stable' }}>
        {children}
      </main>

      {/* Mobile Bottom Nav (hidden on CRM WhatsApp) */}
      {isMobile && !isCrmWhatsApp && <MobileBottomNav />}

      {/* Push Notification Permission Prompt */}
      <PushNotificationPrompt />
    </div>
  );
}

export default DashboardLayout;
