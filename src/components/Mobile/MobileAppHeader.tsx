import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useHubColor } from '@/hooks/useHubColor';
import logoEllo from '@/assets/logoellosuit.png';

const MobileAppHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { color: hubColor } = useHubColor();
  const { theme, toggleTheme } = useTheme();

  const headerBg = hubColor || 'hsl(var(--primary))';

  return (
    <header
      className="sticky top-0 z-50 md:hidden transition-colors duration-500"
      style={{ backgroundColor: headerBg }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <button onClick={() => navigate('/dashboard')} className="flex items-center">
          <img src={logoEllo} alt="ElloSuit" className="h-7 w-auto brightness-0 invert" />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-white active:bg-white/10 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => navigate('/dashboard/suporte')}
            className="p-2 -mr-2 rounded-lg text-white active:bg-white/10 transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileAppHeader;
