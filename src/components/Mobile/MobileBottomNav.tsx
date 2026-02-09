import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Mail, Users, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import QuickActionsModal from './QuickActionsModal';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const items = [
    { icon: Home, label: 'Início', path: '/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda' },
    { icon: null, label: 'Menu', path: '' },
    { icon: Mail, label: 'Email', path: '/dashboard/email' },
    { icon: Users, label: 'Contatos', path: '/dashboard/cadastros' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="bg-background/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-1">
            {items.map((item, idx) => {
              if (idx === 2) {
                return (
                  <button
                    key="center"
                    onClick={() => setShowQuickActions(true)}
                    className="relative -mt-5 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-90 transition-transform"
                  >
                    <LayoutGrid className="h-6 w-6" />
                  </button>
                );
              }

              const Icon = item.icon!;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors"
                >
                  <Icon className={`h-5 w-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-[10px] transition-colors ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <QuickActionsModal
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </>
  );
};

export default MobileBottomNav;
