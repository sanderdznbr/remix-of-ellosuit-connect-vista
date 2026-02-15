import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, Bell, X, ChevronDown,
  MessageSquare, Mail, Users, Bot, Calendar, CheckSquare, Video, Zap,
  FileText, Link2, Eye, BarChart3, FolderOpen, Settings, Shield, HelpCircle,
  GitBranch, Briefcase, Home, LogOut, User, CreditCard, Moon, Sun
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useHubColor } from '@/hooks/useHubColor';
import logoEllo from '@/assets/logoellosuit.png';

const menuGroups = [
  {
    id: "omni", label: "Ello Omni", color: "#FF4500", icon: MessageSquare,
    items: [
      { label: "CRM WhatsApp", icon: MessageSquare, path: "/dashboard/crm-whatsapp" },
      { label: "ChatBot Builder", icon: GitBranch, path: "/dashboard/chatbot" },
      { label: "Email Marketing", icon: Mail, path: "/dashboard/email" },
      { label: "Templates de Email", icon: FileText, path: "/dashboard/email-templates" },
      { label: "Agentes de IA", icon: Bot, path: "/dashboard/bot-ia" },
    ]
  },
  {
    id: "flow", label: "Ello Flow", color: "#007DE3", icon: Zap,
    items: [
      { label: "Minha Agenda", icon: Calendar, path: "/dashboard/agenda" },
      { label: "Agenda Online", icon: Calendar, path: "/dashboard/agenda-aberta" },
      { label: "Tarefas", icon: CheckSquare, path: "/dashboard/tasks" },
      { label: "Fluxos", icon: Zap, path: "/dashboard/fluxos" },
      { label: "Videoconferência", icon: Video, path: "/dashboard/reunioes" },
      { label: "Gravações", icon: Video, path: "/dashboard/reunioes/gravacoes" },
    ]
  },
  {
    id: "track", label: "Ello Track", color: "#3A9A1C", icon: Eye,
    items: [
      { label: "Rastrear Conteúdo", icon: FileText, path: "/dashboard/rastreamento" },
      { label: "Encurtador", icon: Link2, path: "/dashboard/encurtador" },
      { label: "Rastrear Emails", icon: Eye, path: "/dashboard/email-tracker" },
      { label: "Captura de Leads", icon: Users, path: "/dashboard/leads" },
    ]
  },
  {
    id: "suite", label: "Ello Suite", color: "#3000E3", icon: Briefcase,
    items: [
      { label: "Cadastros", icon: Users, path: "/dashboard/cadastros" },
      { label: "Arquivos", icon: FolderOpen, path: "/dashboard/drive" },
      { label: "Equipe", icon: Briefcase, path: "/dashboard/equipe" },
      { label: "Contratos", icon: FileText, path: "/dashboard/contratos" },
      { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
      { label: "Ello Vision", icon: BarChart3, path: "/dashboard/ello-vision" },
      { label: "Relatórios", icon: FileText, path: "/dashboard/relatorios" },
    ]
  },
  {
    id: "config", label: "Configurações", color: "#64748B", icon: Settings,
    items: [
      { label: "Preferências", icon: Settings, path: "/dashboard/configuracoes" },
      { label: "Segurança", icon: Shield, path: "/dashboard/seguranca" },
      { label: "Suporte", icon: HelpCircle, path: "/dashboard/suporte" },
    ]
  }
];

const MobileAppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { color: hubColor } = useHubColor();
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'US';

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroup(prev => prev === id ? null : id);
  };

  // Use hub color for header, fallback to primary
  const headerBg = hubColor || 'hsl(var(--primary))';

  return (
    <>
      <header
        className="sticky top-0 z-50 md:hidden transition-colors duration-500"
        style={{ backgroundColor: headerBg }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -ml-2 rounded-lg text-white active:bg-white/10 transition-colors">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 border-0">
              <div className="flex flex-col h-full bg-background">
                {/* Drawer Header */}
                <div className="p-4 border-b border-border" style={{ backgroundColor: headerBg }}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-white/20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{userName}</p>
                      <p className="text-xs text-white/70 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="py-2">
                    <button
                      onClick={() => handleNav('/dashboard')}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                        isActive('/dashboard') && location.pathname === '/dashboard'
                          ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Home className="h-5 w-5" />
                      <span>Dashboard</span>
                    </button>

                    {menuGroups.map((group) => {
                      const isExpanded = expandedGroup === group.id;
                      const GroupIcon = group.icon;
                      const hasActiveItem = group.items.some(item => isActive(item.path));

                      return (
                        <div key={group.id}>
                          <button
                            onClick={() => toggleGroup(group.id)}
                            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                              hasActiveItem ? 'text-foreground' : 'text-foreground hover:bg-muted'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: group.color + '18' }}>
                              <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                            </div>
                            <span className="flex-1 text-left">{group.label}</span>
                            <ChevronDown
                              className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          </button>

                          {isExpanded && (
                            <div className="bg-muted/50 py-1">
                              {group.items.map((item) => {
                                const ItemIcon = item.icon;
                                const active = isActive(item.path);
                                return (
                                  <button
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    className={`flex items-center gap-3 w-full pl-12 pr-4 py-2.5 text-sm transition-colors ${
                                      active ? 'text-primary font-medium bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                  >
                                    <ItemIcon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="border-t border-border p-3 space-y-1">
                  <button onClick={() => handleNav('/dashboard/perfil')} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors">
                    <User className="h-4 w-4" /><span>Meu Perfil</span>
                  </button>
                  <button onClick={() => handleNav('/dashboard/assinatura')} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors">
                    <CreditCard className="h-4 w-4" /><span>Assinatura</span>
                  </button>
                  <button onClick={() => { signOut(); setOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                    <LogOut className="h-4 w-4" /><span>Sair</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <button onClick={() => navigate('/dashboard')} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img src={logoEllo} alt="ElloSuit" className="h-7 w-auto brightness-0 invert" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-white active:bg-white/10 transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="p-2 -mr-2 rounded-lg text-white active:bg-white/10 transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileAppHeader;
