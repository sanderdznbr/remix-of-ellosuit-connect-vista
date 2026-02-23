import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { MegaMenuHeader } from './MegaMenuHeader';
import MobileAppHeader from '@/components/Mobile/MobileAppHeader';
import MobileBottomNav from '@/components/Mobile/MobileBottomNav';
import { useRoutineExecutor } from '@/hooks/useRoutineExecutor';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { useSubscription } from '@/hooks/useSubscription';
import { Sparkles, ArrowRight } from 'lucide-react';
import CRMSidebar from '@/components/CRM/CRMSidebar';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { isFree, isLoading } = useSubscription();
  useRoutineExecutor();

  // CRM hub detection: CRM WhatsApp page OR any page accessed from CRM sidebar (?hub=crm)
  const searchParams = new URLSearchParams(location.search);
  const isCrmHub = searchParams.get('hub') === 'crm';
  const isCrmWhatsApp = location.pathname.includes('/crm-whatsapp');
  const isCrmContext = isCrmWhatsApp || isCrmHub;
  const isCrmWhatsAppMobile = isMobile && isCrmWhatsApp;
  const isCrmContextDesktop = !isMobile && isCrmContext;
  const isOnActivatePage = location.pathname.includes('/ativar');

  // Desktop CRM context: full-screen with sidebar, no header
  if (isCrmContextDesktop) {
    return (
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <CRMSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
        <PushNotificationPrompt />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Free plan banner - above header */}
      {isFree && !isLoading && !isOnActivatePage && (
        <div 
          className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
          onClick={() => navigate('/checkout/ativar')}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">
            Você está no plano gratuito. Ative o Business com 7 dias grátis!
          </span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}

      {/* Desktop: Mega Menu Header | Mobile: App Header (hidden on CRM WhatsApp) */}
      {isCrmWhatsAppMobile ? null : isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}

      <main className={`flex-1 min-h-0 w-full ${isMobile && !isCrmWhatsAppMobile ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''} overflow-y-auto overscroll-none flex flex-col`} style={{ scrollbarGutter: 'stable' }}>
        {children}
      </main>

      {/* Mobile Bottom Nav (hidden on CRM WhatsApp) */}
      {isMobile && !isCrmWhatsAppMobile && <MobileBottomNav />}

      {/* Push Notification Permission Prompt */}
      <PushNotificationPrompt />
    </div>
  );
}

export default DashboardLayout;
