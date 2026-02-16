import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Zap, Crosshair, Briefcase } from 'lucide-react';

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
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard', prefix: '', color: HUB_COLORS.flow, paths: ['/dashboard'] },
  { id: 'track', icon: Crosshair, label: 'Track', path: '/dashboard/track', prefix: '/dashboard/track', color: HUB_COLORS.track,
    paths: ['/dashboard/track', '/dashboard/rastreamento', '/dashboard/encurtador', '/dashboard/email-tracker', '/dashboard/leads', '/dashboard/ello-vision', '/dashboard/analytics'] },
  { id: 'suite', icon: Briefcase, label: 'Suite', path: '/dashboard/suite', prefix: '/dashboard/suite', color: HUB_COLORS.suite,
    paths: ['/dashboard/suite', '/dashboard/cadastros', '/dashboard/drive', '/dashboard/equipe', '/dashboard/habitos', '/dashboard/contratos', '/dashboard/configuracoes', '/dashboard/assinatura', '/dashboard/seguranca', '/dashboard/suporte'] },
];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-background/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHub === item.id;
            const isHome = item.id === 'home';

            if (isHome) {
              return (
                <button
                  key="home"
                  onClick={() => navigate('/dashboard')}
                  className="relative -mt-5 flex items-center justify-center w-[52px] h-[52px] rounded-2xl shadow-lg active:scale-90 transition-transform"
                  style={{ backgroundColor: HUB_COLORS.flow, boxShadow: `0 10px 15px -3px ${HUB_COLORS.flow}4D` }}
                >
                  <Home className="h-6 w-6 text-white" />
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
                  style={isActive ? { backgroundColor: item.color + '18' } : {}}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${!isActive ? 'text-muted-foreground' : ''}`}
                    style={isActive ? { color: item.color } : undefined}
                  />
                </div>
                <span
                  className={`text-[10px] transition-colors ${isActive ? 'font-semibold' : 'font-medium text-muted-foreground'}`}
                  style={isActive ? { color: item.color } : undefined}
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
