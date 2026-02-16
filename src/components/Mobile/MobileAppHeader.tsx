import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Settings, User, CreditCard, Shield, LogOut, ChevronRight, HelpCircle, Bug, Palette, CheckCheck, Calendar, MessageSquare, CheckCircle, Video, Mail, FolderOpen, AlertCircle, Trash2, Archive } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useHubColor } from '@/hooks/useHubColor';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import logoEllo from '@/assets/logoellosuit.png';

const settingsItems = [
  { icon: User, label: 'Meu Perfil', path: '/dashboard/perfil' },
  { icon: CreditCard, label: 'Assinatura', path: '/dashboard/assinatura' },
  { icon: Shield, label: 'Privacidade e Segurança', path: '/dashboard/seguranca' },
  { icon: HelpCircle, label: 'Central de Ajuda', path: '/dashboard/ajuda' },
  { icon: Bug, label: 'Reportar Problema', path: '/dashboard/reportar-problema' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  system: AlertCircle,
  calendar: Calendar,
  crm: MessageSquare,
  task: CheckCircle,
  meeting: Video,
  email: Mail,
  drive: FolderOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  system: '#6366f1',
  calendar: '#007DE3',
  crm: '#FF4500',
  task: '#22c55e',
  meeting: '#8b5cf6',
  email: '#f59e0b',
  drive: '#3000E3',
};

const MobileAppHeader = () => {
  const navigate = useNavigate();
  const { color: hubColor } = useHubColor();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, archiveNotification } = useNotifications();
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

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 md:hidden transition-colors duration-500"
      style={{ backgroundColor: headerBg, paddingTop: 'env(safe-area-inset-top)' }}
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

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg text-white active:bg-white/10 transition-colors relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-0.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 z-[100] bg-popover border border-border shadow-xl">
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full dark:bg-red-500/20 dark:text-red-400">
                          {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                        </span>
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                ) : (
                  recentNotifications.map((notif) => {
                    const Icon = CATEGORY_ICONS[notif.category] || AlertCircle;
                    const dotColor = CATEGORY_COLORS[notif.category] || '#6366f1';
                    return (
                      <DropdownMenuItem
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex items-start gap-3 p-3 cursor-pointer group ${!notif.is_read ? 'bg-primary/5' : ''}`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${dotColor}15` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: dotColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!notif.is_read && (
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                            )}
                            <span className="font-medium text-sm text-foreground truncate">{notif.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }}
                                className="p-1 rounded hover:bg-muted-foreground/10"
                              >
                                <Archive className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                className="p-1 rounded hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
              {recentNotifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="justify-center text-primary cursor-pointer font-medium text-xs"
                    onClick={() => navigate('/dashboard/suporte')}
                  >
                    Ver todas
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Sheet */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 rounded-lg text-white active:bg-white/10 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 bg-background border-l border-border">
              <div className="flex flex-col h-full">
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

                <div className="border-t border-border p-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 transition-colors text-sm font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
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
