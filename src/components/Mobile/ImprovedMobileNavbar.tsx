import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Mail, Users, Plus } from 'lucide-react';
import QuickActionsModal from './QuickActionsModal';
import { useHubColor } from '@/hooks/useHubColor';

const ImprovedMobileNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { color: hubColor } = useHubColor();

  const navItems = [
    { icon: Home, label: 'Início', path: '/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda' },
    { icon: null, label: 'Menu', path: '' }, // Placeholder for center button
    { icon: Mail, label: 'Email', path: '/dashboard/email' },
    { icon: Users, label: 'Clientes', path: '/dashboard/clientes' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-safe z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            // Center button (quick actions)
            if (index === 2) {
              return (
                <button
                  key="quick-actions"
                  onClick={() => setShowQuickActions(true)}
                  className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: hubColor, color: '#fff' }}
                >
                  <Plus className="h-6 w-6" />
                </button>
              );
            }

            const Icon = item.icon!;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                  active ? '' : 'text-muted-foreground'
                }`}
                style={active ? { color: hubColor } : undefined}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5px]' : ''}`} />
                <span className={`text-[10px] ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick Actions Modal */}
      <QuickActionsModal 
        isOpen={showQuickActions} 
        onClose={() => setShowQuickActions(false)} 
      />
    </>
  );
};

export default ImprovedMobileNavbar;
