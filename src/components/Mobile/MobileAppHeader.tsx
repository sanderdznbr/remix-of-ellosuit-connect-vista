import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useHubColor } from '@/hooks/useHubColor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoEllo from '@/assets/logoellosuit.png';

const MobileAppHeader = () => {
  const navigate = useNavigate();
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 -mr-2 rounded-lg text-white active:bg-white/10 transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 z-[100] bg-popover border border-border shadow-xl">
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full dark:bg-red-500/20 dark:text-red-400">3 novas</span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-sm text-foreground">Novo cliente cadastrado</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">Maria Silva foi adicionada à sua base</p>
                  <span className="text-[10px] text-muted-foreground pl-4">Há 5 minutos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium text-sm text-foreground">Email aberto</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">João Pereira abriu seu email de proposta</p>
                  <span className="text-[10px] text-muted-foreground pl-4">Há 15 minutos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="font-medium text-sm text-foreground">Reunião agendada</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">Nova reunião com Empresa ABC às 14h</p>
                  <span className="text-[10px] text-muted-foreground pl-4">Há 1 hora</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-primary cursor-pointer font-medium"
                onClick={() => navigate('/dashboard/suporte')}
              >
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default MobileAppHeader;
