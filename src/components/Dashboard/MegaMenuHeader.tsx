import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  MessageSquare, Mail, Users, Bot, Calendar, CheckSquare, Video, Zap, Coins,
  FileText, Link2, PlayCircle, Eye, BarChart3, FolderOpen, Settings,
  Shield, HelpCircle, ChevronDown, User, LogOut, CreditCard, Bell, GitBranch,
  Briefcase, Key, Megaphone, Target, FileSignature, Workflow, Moon, Sun, CheckCheck, AlertCircle, CheckCircle, Trash2, Archive, X, Sparkles
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { ElloLogo } from "@/components/shared/ElloLogo";
import { EllosuitOmniLogo } from "@/components/shared/EllosuitOmniLogo";
import { useAuth } from "@/hooks/useAuth";
import { useHubColor } from "@/hooks/useHubColor";
import { useAdminMaster } from "@/hooks/useAdminMaster";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = {
  omni: "#FF4500",
  flow: "#007DE3",
  track: "#3A9A1C",
  suite: "#3000E3",
  config: "#64748B",
};

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  path: string;
}

interface MenuGroup {
  id: string;
  label: string;
  color: string;
  hubPath: string;
  columns: {
    title: string;
    items: MenuItem[];
  }[];
}

const menuGroups: MenuGroup[] = [
  {
    id: "omni",
    label: "Omni",
    color: COLORS.omni,
    hubPath: "/dashboard/omni",
    columns: [
      {
        title: "Comunicação",
        items: [
          { id: "crm", label: "CRM WhatsApp", description: "Gerencie conversas e leads", icon: MessageSquare, path: "/dashboard/crm-whatsapp" },
          { id: "disparos", label: "Disparos em Massa", description: "Envio em massa via WhatsApp", icon: Megaphone, path: "/dashboard/disparos" },
          { id: "chatbot", label: "ChatBot Builder", description: "Fluxos automatizados", icon: GitBranch, path: "/dashboard/chatbot" },
          { id: "email", label: "Email Marketing", description: "Campanhas e automações", icon: Mail, path: "/dashboard/email" },
        ]
      },
      {
        title: "Criadores",
        items: [
          { id: "email-builder", label: "Templates de Email", description: "Editor visual de emails", icon: FileText, path: "/dashboard/email-templates" },
          { id: "agentes", label: "Agentes de IA", description: "Chatbots inteligentes", icon: Bot, path: "/dashboard/bot-ia" },
          { id: "automacoes", label: "Automações", description: "Fluxos automatizados", icon: Workflow, path: "/dashboard/automacoes" },
        ]
      },
      {
        title: "Desenvolvedores",
        items: [
          { id: "api-whatsapp", label: "API WhatsApp", description: "API restrita para integração de sistemas", icon: Key, path: "/dashboard/api-whatsapp" },
        ]
      }
    ]
  },
  {
    id: "flow",
    label: "Flow",
    color: COLORS.flow,
    hubPath: "/dashboard/flows",
    columns: [
      {
        title: "Agenda",
        items: [
          { id: "agenda", label: "Minha Agenda", description: "Compromissos e eventos", icon: Calendar, path: "/dashboard/agenda" },
          { id: "agenda-online", label: "Agenda Online", description: "Links de agendamento", icon: Calendar, path: "/dashboard/agenda-aberta" },
        ]
      },
      {
        title: "Produtividade",
        items: [
          { id: "tasks", label: "Tarefas", description: "Listas e lembretes", icon: CheckSquare, path: "/dashboard/tasks" },
          { id: "fluxos", label: "Fluxos", description: "Kanban e automações", icon: Zap, path: "/dashboard/fluxos" },
        ]
      },
      {
        title: "Reuniões",
        items: [
          { id: "reunioes", label: "Videoconferência", description: "Salas de reunião", icon: Video, path: "/dashboard/reunioes" },
          { id: "gravacoes", label: "Gravações", description: "Histórico e transcrições", icon: Video, path: "/dashboard/reunioes/gravacoes" },
        ]
      }
    ]
  },
  {
    id: "track",
    label: "Track",
    color: COLORS.track,
    hubPath: "/dashboard/track",
    columns: [
      {
      title: "Rastreamento",
        items: [
          { id: "docs", label: "Rastrear Conteúdo", description: "Upload e rastreamento de PDFs, vídeos e imagens", icon: FileText, path: "/dashboard/rastreamento" },
          { id: "links", label: "Encurtador Rastreável", description: "Encurte URLs e acompanhe cliques", icon: Link2, path: "/dashboard/encurtador" },
          { id: "emails", label: "Rastrear Emails", description: "Aberturas rastreadas", icon: Eye, path: "/dashboard/email-tracker" },
        ]
      },
      {
        title: "Captação",
        items: [
          { id: "leads", label: "Captura de Leads", description: "Funis interativos", icon: Users, path: "/dashboard/leads" },
        ]
      }
    ]
  },
  {
    id: "suite",
    label: "Suite",
    color: COLORS.suite,
    hubPath: "/dashboard/suite",
    columns: [
      {
        title: "Dados",
        items: [
          { id: "cadastros", label: "Cadastros", description: "Clientes e contatos", icon: Users, path: "/dashboard/cadastros" },
          { id: "arquivos", label: "Arquivos", description: "Drive de documentos", icon: FolderOpen, path: "/dashboard/drive" },
          { id: "equipe", label: "Equipe", description: "Colaboradores e permissões", icon: Briefcase, path: "/dashboard/equipe" },
        ]
      },
      {
        title: "Cultura",
        items: [
          { id: "habitos", label: "Criar Hábitos", description: "Rotinas automáticas diárias", icon: Target, path: "/dashboard/habitos" },
        ]
      },
      {
        title: "Empresa",
        items: [
          { id: "contratos", label: "Criação de Contratos", description: "Modelos e contratos editáveis", icon: FileSignature, path: "/dashboard/contratos" },
          { id: "propostas", label: "Ordem de Serviço", description: "Ordens de serviço e orçamentos", icon: FileText, path: "/dashboard/propostas" },
          { id: "recibos", label: "Criar Recibos", description: "Recibos de pagamento", icon: FileText, path: "/dashboard/recibos" },
        ]
      },
      {
        title: "Análises",
        items: [
          { id: "analytics", label: "Analytics", description: "Métricas gerais", icon: BarChart3, path: "/dashboard/analytics" },
          { id: "vision", label: "Ello Vision", description: "Insights avançados", icon: BarChart3, path: "/dashboard/ello-vision" },
          { id: "relatorios", label: "Relatórios", description: "Exportar dados", icon: FileText, path: "/dashboard/relatorios" },
        ]
      }
    ]
  }
];

const configMenu: MenuGroup = {
  id: "config",
  label: "Configurações",
  color: COLORS.config,
  hubPath: "/dashboard/configuracoes",
  columns: [
    {
      title: "Sistema",
      items: [
        { id: "prefs", label: "Preferências", description: "Configurações gerais", icon: Settings, path: "/dashboard/configuracoes" },
        { id: "security", label: "Segurança", description: "Senha e acesso", icon: Shield, path: "/dashboard/seguranca" },
        { id: "support", label: "Suporte", description: "Ajuda e tutoriais", icon: HelpCircle, path: "/dashboard/suporte" },
      ]
    }
  ]
};

export function MegaMenuHeader() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { color: hubColor } = useHubColor();
  const { isAdminMaster, loading: adminLoading } = useAdminMaster();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, archiveNotification } = useNotifications();

  const handleMouseEnter = (menuId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menuId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const handleMenuClick = (hubPath: string) => {
    navigate(hubPath);
    setActiveMenu(null);
  };

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname === path.split('?')[0];
    }
    return location.pathname.startsWith(path);
  };

  const getActiveGroup = () => {
    let bestMatch: { groupId: string; pathLen: number } | null = null;
    for (const group of menuGroups) {
      for (const col of group.columns) {
        for (const item of col.items) {
          const itemPath = item.path.includes('?') ? item.path.split('?')[0] : item.path;
          if (location.pathname.startsWith(itemPath) && (!bestMatch || itemPath.length > bestMatch.pathLen)) {
            bestMatch = { groupId: group.id, pathLen: itemPath.length };
          }
        }
      }
    }
    return bestMatch?.groupId || null;
  };

  const activeGroupId = getActiveGroup();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "US";

  return (
    <header 
      className="sticky top-0 z-50"
      data-mega-header
      style={{ 
        backgroundColor: hubColor,
        transition: 'background-color 0.5s ease-in-out',
      }}
    >
      <div className="h-16 px-6 flex items-center justify-between relative">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <ElloLogo className="h-8 w-auto" color="white" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEarlyAccessModal(true); }}
            className="text-[10px] font-medium text-white/70 bg-white/15 px-1.5 py-0.5 rounded-full leading-none tracking-wide uppercase hover:bg-white/25 transition-colors cursor-pointer"
          >
            Acesso Antecipado
          </button>
        </Link>

        {/* Early Access Modal */}
        {showEarlyAccessModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowEarlyAccessModal(false)}>
            <div className="bg-gradient-to-b from-[#1a0a3e] to-[#0d0527] rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#3000E3]/40 blur-[80px] rounded-full" />
              
              <button onClick={() => setShowEarlyAccessModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10">
                <X className="h-4 w-4 text-white/60" />
              </button>

              <div className="relative z-10 px-6 pt-8 pb-6 text-center space-y-5">
                {/* Logo */}
                <div className="flex justify-center">
                  <ElloLogo className="h-10 w-auto" color="white" />
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Acesso Antecipado</span>
                </div>

                <h3 className="text-lg font-bold text-white">Você é um usuário privilegiado!</h3>
                
                <p className="text-sm text-white/70 leading-relaxed">
                  Você faz parte do nosso grupo seleto de <strong className="text-white">early adopters</strong> que estão usando a Ellosuit antes do lançamento oficial. A plataforma está em <strong className="text-white">beta-test</strong>.
                </p>

                {/* Benefits */}
                <div className="space-y-2.5 text-left">
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-lg">💰</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Valores Reduzidos</p>
                      <p className="text-xs text-white/50">Preços exclusivos por ter entrado cedo na plataforma</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-lg">⚡</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Suporte Prioritário</p>
                      <p className="text-xs text-white/50">Canal direto com a equipe para ajuda imediata</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Novidades Semanais</p>
                      <p className="text-xs text-white/50">Melhorias contínuas com base no seu feedback</p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-white/30">
                  Estamos em fase de testes. Funcionalidades podem evoluir com o seu feedback.
                </p>

                <button
                  onClick={() => setShowEarlyAccessModal(false)}
                  className="w-full py-2.5 bg-white text-[#1a0a3e] font-semibold text-sm rounded-xl hover:bg-white/90 transition-colors"
                >
                  Entendi!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex items-center gap-0.5 h-full">
          {/* Dashboard link */}
          <div className="relative flex items-center" style={{ height: '64px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative px-4 flex items-center gap-1.5 text-sm font-medium transition-all duration-300 z-10"
              style={{
                backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: location.pathname === '/dashboard' ? 'white' : 'rgba(255,255,255,0.75)',
                borderRadius: '10px',
                height: '36px',
              }}
            >
              <span>Dashboard</span>
            </button>
          </div>

          {menuGroups.map((group) => {
            const isOpen = activeMenu === group.id;
            const isCurrentHub = activeGroupId === group.id;
            return (
              <div
                key={group.id}
                className="relative flex items-end"
                style={{ height: '64px', paddingBottom: 0 }}
                onMouseEnter={() => handleMouseEnter(group.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleMenuClick(group.hubPath)}
                  className="relative px-5 flex items-center gap-1.5 text-sm font-medium transition-all duration-300 z-10"
                  style={{
                    backgroundColor: isOpen ? 'white' : isCurrentHub ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: isOpen ? '#1f2937' : isCurrentHub ? 'white' : 'rgba(255,255,255,0.75)',
                    borderRadius: isOpen ? '10px 10px 0 0' : '10px',
                    height: isOpen ? '40px' : '36px',
                    marginBottom: isOpen ? '0' : '14px',
                  }}
                >
                  <span>{group.label}</span>
                  <ChevronDown 
                    className="h-4 w-4 transition-transform duration-300" 
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: isOpen ? 0.5 : 0.6,
                    }}
                  />
                </button>
              </div>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Admin Panel Button */}
          {!adminLoading && isAdminMaster && (
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium"
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          )}
          {/* Theme Toggle - hidden on dashboard home */}
          {location.pathname !== '/dashboard' && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-white" />}
            </button>
          )}
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors relative">
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 border-b">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Notificações</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full dark:bg-red-500/20 dark:text-red-400">
                          {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                        </span>
                        <button onClick={() => markAllAsRead()} className="text-muted-foreground hover:text-foreground">
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.slice(0, 10).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => {
                    const CAT_COLORS: Record<string, string> = {
                      system: '#6366f1', calendar: '#007DE3', crm: '#FF4500',
                      task: '#22c55e', meeting: '#8b5cf6', email: '#f59e0b', drive: '#3000E3',
                    };
                    const dotColor = CAT_COLORS[notif.category] || '#6366f1';
                    return (
                      <DropdownMenuItem
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                          if (notif.action_url) navigate(notif.action_url);
                        }}
                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted group ${!notif.is_read ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
                            <span className="font-medium text-sm">{notif.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 pl-3">{notif.message}</p>
                          <span className="text-[10px] text-muted-foreground/70 pl-3 block mt-0.5">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); archiveNotification(notif.id); }}
                            className="p-1 rounded hover:bg-muted-foreground/10"
                            title="Arquivar"
                          >
                            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="p-1 rounded hover:bg-destructive/10"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="justify-center text-primary cursor-pointer font-medium"
                    onClick={() => navigate('/dashboard/notificacoes')}
                  >
                    Ver todas as notificações
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('config')}
            onMouseLeave={handleMouseLeave}
          >
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Settings className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Conta pessoal</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/perfil" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/assinatura" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Assinatura
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/creditos-ia" className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Créditos de IA
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mega Menu Dropdown */}
      {activeMenu && (
        <div 
          className="absolute left-0 right-0 bg-popover shadow-xl overflow-hidden"
          style={{
            borderRadius: '0 0 16px 16px',
            top: '100%',
            animation: 'megamenu-slide-down 0.25s ease-out forwards',
          }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            {(() => {
              const currentGroup = activeMenu === 'config' ? configMenu : menuGroups.find(g => g.id === activeMenu);
              if (!currentGroup) return null;

              return (
                <div className="flex gap-12">
                  {/* Columns */}
                  <div className="flex gap-10 flex-1">
                    {currentGroup.columns.map((column, idx) => (
                      <div key={idx} className="min-w-[200px]">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {column.title}
                        </h4>
                        <div className="space-y-1">
                        {column.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <Link
                                key={item.id}
                                to={item.path}
                                onClick={() => setActiveMenu(null)}
                                className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-muted group"
                                style={{
                                  backgroundColor: active ? `${currentGroup.color}10` : 'transparent',
                                }}
                              >
                                <div 
                                  className="p-2.5 rounded-xl transition-all"
                                  style={{
                                    backgroundColor: currentGroup.color,
                                    color: 'white',
                                  }}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <span 
                                    className="text-sm font-medium block text-foreground"
                                    style={{ color: active ? currentGroup.color : undefined }}
                                  >
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {item.description}
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </header>
  );
}