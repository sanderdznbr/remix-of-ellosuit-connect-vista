import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, Bell, Search, X, ChevronRight,
  MessageSquare, Mail, Users, Bot, Calendar, CheckSquare, Video, Zap,
  FileText, Link2, Eye, BarChart3, FolderOpen, Settings, Shield, HelpCircle,
  GitBranch, PlayCircle, Briefcase, Home, LogOut, User, CreditCard, ChevronDown
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import logoEllo from '@/assets/logoellosuit.png';

const COLORS = {
  omni: "#FF4500",
  flow: "#007DE3",
  track: "#00E371",
  suite: "#3000E3",
  config: "#64748B",
};

const menuGroups = [
  {
    id: "omni",
    label: "Ello Omni",
    color: COLORS.omni,
    icon: MessageSquare,
    items: [
      { label: "CRM WhatsApp", icon: MessageSquare, path: "/dashboard/crm-whatsapp" },
      { label: "ChatBot Builder", icon: GitBranch, path: "/dashboard/chatbot" },
      { label: "Email Marketing", icon: Mail, path: "/dashboard/email" },
      { label: "Templates de Email", icon: FileText, path: "/dashboard/email-templates" },
      { label: "Agentes de IA", icon: Bot, path: "/dashboard/bot-ia" },
    ]
  },
  {
    id: "flow",
    label: "Ello Flow",
    color: COLORS.flow,
    icon: Zap,
    items: [
      { label: "Minha Agenda", icon: Calendar, path: "/dashboard/agenda" },
      { label: "Agenda Online", icon: Calendar, path: "/dashboard/agenda-aberta" },
      { label: "Tarefas", icon: CheckSquare, path: "/dashboard/tasks" },
      { label: "Fluxos", icon: Zap, path: "/dashboard/fluxos" },
      { label: "Captura de Leads", icon: Users, path: "/dashboard/leads" },
      { label: "Videoconferência", icon: Video, path: "/dashboard/reunioes" },
      { label: "Gravações", icon: Video, path: "/dashboard/reunioes/gravacoes" },
    ]
  },
  {
    id: "track",
    label: "Ello Track",
    color: COLORS.track,
    icon: Eye,
    items: [
      { label: "Rastrear Conteúdo", icon: FileText, path: "/dashboard/rastreamento" },
      { label: "Encurtador", icon: Link2, path: "/dashboard/encurtador" },
      { label: "Rastrear Emails", icon: Eye, path: "/dashboard/email-tracker" },
    ]
  },
  {
    id: "suite",
    label: "Ello Suite",
    color: COLORS.suite,
    icon: Briefcase,
    items: [
      { label: "Cadastros", icon: Users, path: "/dashboard/cadastros" },
      { label: "Arquivos", icon: FolderOpen, path: "/dashboard/drive" },
      { label: "Equipe", icon: Briefcase, path: "/dashboard/equipe" },
      { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
      { label: "Ello Vision", icon: BarChart3, path: "/dashboard/ello-vision" },
      { label: "Relatórios", icon: FileText, path: "/dashboard/relatorios" },
    ]
  },
  {
    id: "config",
    label: "Configurações",
    color: COLORS.config,
    icon: Settings,
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
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -ml-2 rounded-lg text-primary-foreground active:bg-white/10 transition-colors">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 border-0">
              <div className="flex flex-col h-full bg-background">
                {/* Drawer Header */}
                <div className="p-4 border-b border-border bg-primary">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-white/20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-white/20 text-primary-foreground text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-foreground truncate">{userName}</p>
                      <p className="text-xs text-primary-foreground/70 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1">
                  <div className="py-2">
                    {/* Dashboard Home */}
                    <button
                      onClick={() => handleNav('/dashboard')}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                        isActive('/dashboard') && location.pathname === '/dashboard'
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Home className="h-5 w-5" />
                      <span>Dashboard</span>
                    </button>

                    {/* Groups */}
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
                            <div
                              className="p-1.5 rounded-lg"
                              style={{ backgroundColor: group.color + '18' }}
                            >
                              <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                            </div>
                            <span className="flex-1 text-left">{group.label}</span>
                            <ChevronDown
                              className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          </button>

                          {/* Sub-items */}
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
                                      active
                                        ? 'text-primary font-medium bg-primary/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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

                {/* Bottom Actions */}
                <div className="border-t border-border p-3 space-y-1">
                  <button
                    onClick={() => handleNav('/dashboard/perfil')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Meu Perfil</span>
                  </button>
                  <button
                    onClick={() => handleNav('/dashboard/assinatura')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Assinatura</span>
                  </button>
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo Center */}
          <button onClick={() => navigate('/dashboard')} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img src={logoEllo} alt="ElloSuit" className="h-7 w-auto brightness-0 invert" />
          </button>

          {/* Right - Notifications */}
          <button className="p-2 -mr-2 rounded-lg text-primary-foreground active:bg-white/10 transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              3
            </span>
          </button>
        </div>
      </header>
    </>
  );
};

export default MobileAppHeader;
