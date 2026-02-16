import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Settings, User, CreditCard, Shield, LogOut, ChevronRight, HelpCircle, Bug, Palette, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useHubColor } from '@/hooks/useHubColor';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import logoEllo from '@/assets/logoellosuit.png';

const settingsItems = [
  { icon: User, label: 'Meu Perfil', path: '/dashboard/perfil' },
  { icon: CreditCard, label: 'Assinatura', path: '/dashboard/assinatura' },
  { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes' },
  { icon: Palette, label: 'Personalizar', path: '/dashboard/personalizar' },
  { icon: Shield, label: 'Privacidade e Segurança', path: '/dashboard/seguranca' },
  { icon: HelpCircle, label: 'Central de Ajuda', path: '/dashboard/ajuda' },
  { icon: Bug, label: 'Reportar Problema', path: '/dashboard/reportar-problema' },
];

const MobileAppHeader = () => {
  const navigate = useNavigate();
  const { color: hubColor } = useHubColor();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const headerBg = hubColor || 'hsl(var(--primary))';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;

  const handleLogout = async () => {
    setSheetOpen(false);
    await supabase.auth.signOut();
    navigate('/auth');
  };

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
              <button className="p-2 rounded-lg text-white active:bg-white/10 transition-colors relative">
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

          {/* Settings Sheet Trigger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 rounded-lg text-white active:bg-white/10 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 bg-background border-l border-border">
              <div className="flex flex-col h-full">
                {/* User profile header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="h-12 w-12 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Settings items */}
                <div className="flex-1 overflow-y-auto py-2">
                  {settingsItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        setSheetOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </button>
                  ))}
                </div>

                {/* Logout button */}
                <div className="border-t border-border p-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 transition-colors text-sm font-semibold"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Sair da conta
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default MobileAppHeader;
