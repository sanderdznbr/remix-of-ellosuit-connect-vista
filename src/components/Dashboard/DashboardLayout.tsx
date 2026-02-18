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

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { isFree, isLoading } = useSubscription();
  useRoutineExecutor();

  // CRM WhatsApp on mobile: fullscreen, no header/navbar
  const isCrmWhatsApp = isMobile && location.pathname.includes('/crm-whatsapp');
  const isOnActivatePage = location.pathname.includes('/ativar');

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Desktop: Mega Menu Header | Mobile: App Header (hidden on CRM WhatsApp) */}
      {isCrmWhatsApp ? null : isMobile ? <MobileAppHeader /> : <MegaMenuHeader />}
      
      {/* Free plan banner */}
      {isFree && !isLoading && !isOnActivatePage && (
        <div 
          className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard/ativar')}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">
            Você está no plano gratuito. Ative o Business com 7 dias grátis!
          </span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}

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
