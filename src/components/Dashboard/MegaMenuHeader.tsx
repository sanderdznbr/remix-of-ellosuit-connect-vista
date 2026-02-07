import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  MessageSquare, Mail, Users, Bot, Calendar, CheckSquare, Video, Zap,
  FileText, Link2, PlayCircle, Eye, BarChart3, FolderOpen, Settings,
  Shield, HelpCircle, ChevronDown, User, LogOut, CreditCard, Bell
} from "lucide-react";
import { ElloLogo } from "@/components/shared/ElloLogo";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = {
  omni: "#E34800",
  flow: "#007DE3",
  track: "#00E371",
  gestao: "#8B5CF6",
  insights: "#EC4899",
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
          { id: "email", label: "Email Marketing", description: "Campanhas e automações", icon: Mail, path: "/dashboard/email" },
        ]
      },
      {
        title: "Inteligência",
        items: [
          { id: "agentes", label: "Agentes de IA", description: "Chatbots inteligentes", icon: Bot, path: "/dashboard/bot-ia" },
          { id: "clientes", label: "Banco de Clientes", description: "Base de contatos", icon: Users, path: "/dashboard/cadastros" },
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
          { id: "docs", label: "Documentos", description: "PDFs rastreados", icon: FileText, path: "/dashboard/rastreamento?tab=documents" },
          { id: "links", label: "Links", description: "URLs rastreadas", icon: Link2, path: "/dashboard/rastreamento?tab=links" },
          { id: "videos", label: "Vídeos", description: "Visualizações rastreadas", icon: PlayCircle, path: "/dashboard/rastreamento?tab=videos" },
          { id: "emails", label: "Emails", description: "Aberturas rastreadas", icon: Eye, path: "/dashboard/email-tracker" },
        ]
      }
    ]
  },
  {
    id: "gestao",
    label: "Gestão",
    color: COLORS.gestao,
    hubPath: "/dashboard/cadastros",
    columns: [
      {
        title: "Dados",
        items: [
          { id: "cadastros", label: "Cadastros", description: "Clientes e contatos", icon: Users, path: "/dashboard/cadastros" },
          { id: "arquivos", label: "Arquivos", description: "Drive de documentos", icon: FolderOpen, path: "/dashboard/drive" },
        ]
      }
    ]
  },
  {
    id: "insights",
    label: "Insights",
    color: COLORS.insights,
    hubPath: "/dashboard/analytics",
    columns: [
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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
    for (const group of menuGroups) {
      for (const col of group.columns) {
        for (const item of col.items) {
          if (isActive(item.path)) return group.id;
        }
      }
    }
    return null;
  };

  const activeGroupId = getActiveGroup();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "US";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3">
          <ElloLogo className="h-8 w-auto" color="#3000E3" />
        </Link>

        {/* Main Navigation */}
        <nav className="flex items-center gap-1">
          {menuGroups.map((group) => (
            <div
              key={group.id}
              className="relative"
              onMouseEnter={() => handleMouseEnter(group.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => handleMenuClick(group.hubPath)}
                className="px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeMenu === group.id || activeGroupId === group.id ? `${group.color}10` : 'transparent',
                  color: activeMenu === group.id || activeGroupId === group.id ? group.color : '#374151',
                }}
              >
                <span>{group.label}</span>
                <ChevronDown 
                  className="h-4 w-4 transition-transform" 
                  style={{
                    transform: activeMenu === group.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
            </div>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="h-5 w-5 text-gray-500" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                  3
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 border-b">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Notificações</p>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">3 novas</span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-medium text-sm">Novo cliente cadastrado</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-4">Maria Silva foi adicionada à sua base</p>
                  <span className="text-[10px] text-gray-400 pl-4">Há 5 minutos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium text-sm">Email aberto</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-4">João Pereira abriu seu email de proposta</p>
                  <span className="text-[10px] text-gray-400 pl-4">Há 15 minutos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="font-medium text-sm">Reunião agendada</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-4">Nova reunião com Empresa ABC às 14h</p>
                  <span className="text-[10px] text-gray-400 pl-4">Há 1 hora</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="justify-center text-blue-600 cursor-pointer font-medium"
                onClick={() => navigate('/dashboard/notificacoes')}
              >
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('config')}
            onMouseLeave={handleMouseLeave}
          >
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
                <p className="text-xs text-gray-500">Conta pessoal</p>
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
          className="absolute left-0 right-0 bg-white border-b border-gray-100 shadow-xl"
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
                  {/* Hub Link */}
                  <div className="w-64">
                    <Link
                      to={currentGroup.hubPath}
                      onClick={() => setActiveMenu(null)}
                      className="block p-4 rounded-xl transition-all hover:shadow-lg"
                      style={{ 
                        backgroundColor: `${currentGroup.color}10`,
                        borderLeft: `4px solid ${currentGroup.color}`
                      }}
                    >
                      <h3 
                        className="font-bold text-lg mb-1"
                        style={{ color: currentGroup.color }}
                      >
                        Ellosuit {currentGroup.label}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Visão geral e KPIs
                      </p>
                    </Link>
                  </div>

                  {/* Columns */}
                  <div className="flex gap-10 flex-1">
                    {currentGroup.columns.map((column, idx) => (
                      <div key={idx} className="min-w-[200px]">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                                className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-gray-50/80 group"
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
                                    className="text-sm font-medium block text-gray-800 group-hover:text-gray-900"
                                    style={{ color: active ? currentGroup.color : undefined }}
                                  >
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-gray-500">
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

export default MegaMenuHeader;
