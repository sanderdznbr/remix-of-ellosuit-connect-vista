import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Zap, Crosshair, Briefcase } from 'lucide-react';
import { useHubColor } from '@/hooks/useHubColor';

const HUB_COLORS = {
  omni: '#FF4500',
  flow: '#007DE3',
  track: '#3A9A1C',
  suite: '#3000E3',
};

const navItems = [
  { id: 'omni', icon: MessageSquare, label: 'Omni', path: '/dashboard/omni', prefix: '/dashboard/omni', color: HUB_COLORS.omni,
    paths: ['/dashboard/omni', '/dashboard/crm-whatsapp', '/dashboard/disparos', '/dashboard/chatbot', '/dashboard/email', '/dashboard/email-templates', '/dashboard/bot-ia', '/dashboard/automacoes', '/dashboard/api-whatsapp'] },
  { id: 'flow', icon: Zap, label: 'Flow', path: '/dashboard/flows', prefix: '/dashboard/flow',  color: HUB_COLORS.flow,
    paths: ['/dashboard/flows', '/dashboard/agenda', '/dashboard/agenda-aberta', '/dashboard/tasks', '/dashboard/fluxos', '/dashboard/reunioes'] },
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard', prefix: '', color: '#3000E3', paths: ['/dashboard'] },
  { id: 'track', icon: Crosshair, label: 'Track', path: '/dashboard/track', prefix: '/dashboard/track', color: HUB_COLORS.track,
    paths: ['/dashboard/track', '/dashboard/rastreamento', '/dashboard/encurtador', '/dashboard/email-tracker', '/dashboard/leads', '/dashboard/ello-vision', '/dashboard/analytics'] },
  { id: 'suite', icon: Briefcase, label: 'Suite', path: '/dashboard/suite', prefix: '/dashboard/suite', color: HUB_COLORS.suite,
    paths: ['/dashboard/suite', '/dashboard/cadastros', '/dashboard/drive', '/dashboard/equipe', '/dashboard/habitos', '/dashboard/contratos', '/dashboard/configuracoes', '/dashboard/assinatura', '/dashboard/seguranca', '/dashboard/suporte'] },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { color: hubColor } = useHubColor();

  const getActiveHub = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/dashboard/') return 'home';
    for (const item of navItems) {
      if (item.id === 'home') continue;
      if (item.paths.some(p => path.startsWith(p))) return item.id;
      if (item.prefix && path.startsWith(item.prefix)) return item.id;
    }
    return null;
  };

  const activeHub = getActiveHub();

  const isOnHome = activeHub === 'home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div
        className={`backdrop-blur-xl border-t pb-[env(safe-area-inset-bottom)] ${
          isOnHome ? 'bg-[#3000E3] border-white/10' : 'bg-background/95 border-border'
        }`}
        style={isOnHome ? { borderColor: 'rgba(255,255,255,0.1)' } : undefined}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHub === item.id;
            const isHome = item.id === 'home';

            if (isHome) {
              if (isOnHome) {
                // Already on home, skip rendering entirely
                return null;
              }
              return (
                <button
                  key="home"
                  onClick={() => navigate('/dashboard')}
                  className="relative -mt-5 flex items-center justify-center w-[54px] h-[54px] rounded-[18px] shadow-lg active:scale-90 transition-transform"
                  style={{ backgroundColor: hubColor, boxShadow: '0 8px 20px -4px rgba(0,0,0,0.25)' }}
                >
                  <Home className="h-6 w-6 text-white" strokeWidth={2.2} />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-all"
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                  style={isActive ? { backgroundColor: (isOnHome ? 'rgba(255,255,255,0.15)' : item.color + '18') } : {}}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${!isActive ? (isOnHome ? 'text-white/60' : 'text-muted-foreground') : ''}`}
                    style={isActive ? { color: isOnHome ? '#fff' : item.color } : undefined}
                  />
                </div>
                <span
                  className={`text-[10px] transition-colors ${isActive ? 'font-semibold' : (isOnHome ? 'font-medium text-white/60' : 'font-medium text-muted-foreground')}`}
                  style={isActive ? { color: isOnHome ? '#fff' : item.color } : undefined}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
