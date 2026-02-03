import { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Calendar, 
  Mail, 
  Home, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Video,
  CheckSquare,
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  Menu,
  Shield,
  HelpCircle,
  Layers,
  Radio,
  ChevronRight,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Define menu groups with their icons and items
const menuGroups = [
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Home,
    items: [
      { id: 'home', path: '/dashboard', icon: Home, label: 'Dashboard' },
      { id: 'bot-ia', path: '/dashboard/bot-ia', icon: Bot, label: 'Agentes Ello IA' },
      { id: 'documents', path: '/dashboard/drive', icon: FileText, label: 'Arquivos' }
    ]
  },
  {
    id: 'banco-dados',
    label: 'Banco de Dados',
    icon: Database,
    items: [
      { id: 'users', path: '/dashboard/funcionarios', icon: Users, label: 'Usuários' },
      { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Clientes' },
      { id: 'suppliers', path: '/dashboard/fornecedores', icon: Users, label: 'Fornecedores' },
      { id: 'prospects', path: '/dashboard/prospectos', icon: Users, label: 'Prospectos' }
    ]
  },
  {
    id: 'ello-flows',
    label: 'Ello Flows',
    icon: Zap,
    items: [
      { id: 'tasks', path: '/dashboard/tasks', icon: CheckSquare, label: 'Tarefas' },
      { id: 'flows', path: '/dashboard/fluxos', icon: Zap, label: 'Fluxos de Produção' },
      { id: 'calendar', path: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
      { id: 'agenda-aberta', path: '/dashboard/agenda-aberta', icon: Calendar, label: 'Agenda Online' },
      { id: 'meetings', path: '/dashboard/reunioes', icon: Video, label: 'Ello Meetings' }
    ]
  },
  {
    id: 'ello-omni',
    label: 'Ello Omni',
    icon: MessageSquare,
    items: [
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: MessageSquare, label: 'CRM WhatsApp' },
      { id: 'email-default', path: '/dashboard/email', icon: Mail, label: 'Email padrão' },
      { id: 'email-marketing', path: '/dashboard/email-marketing', icon: Mail, label: 'Email marketing' }
    ]
  },
  {
    id: 'ello-track',
    label: 'Ello Track',
    icon: Radio,
    items: [
      { id: 'document-tracking', path: '/dashboard/rastreamento-documento', icon: FileText, label: 'Rastreamento de PDF' },
      { id: 'link-tracking', path: '/dashboard/rastreamento-link', icon: FileText, label: 'Rastreamento de Link' },
      { id: 'video-tracking', path: '/dashboard/rastreamento-video', icon: Video, label: 'Rastreamento de Vídeo' }
    ]
  },
  {
    id: 'analise-relatorio',
    label: 'Análise & Relatório',
    icon: BarChart3,
    items: [
      { id: 'vision', path: '/dashboard/ello-vision', icon: BarChart3, label: 'Ello Vision' },
      { id: 'analytics', path: '/dashboard/analytics', icon: BarChart3, label: 'Análises' },
      { id: 'reports', path: '/dashboard/relatorios', icon: FileText, label: 'Relatórios' }
    ]
  },
  {
    id: 'ajuda-suporte',
    label: 'Ajuda & Suporte',
    icon: HelpCircle,
    items: [
      { id: 'support', path: '/dashboard/suporte', icon: MessageSquare, label: 'Suporte' },
      { id: 'report-problem', path: '/dashboard/reportar-problema', icon: FileText, label: 'Reporte um problema' },
      { id: 'terms', path: '/terms', icon: FileText, label: 'Termos & Políticas' }
    ]
  },
  {
    id: 'config-privacidade',
    label: 'Configurações',
    icon: Settings,
    items: [
      { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' },
      { id: 'customize', path: '/dashboard/personalizar', icon: Layers, label: 'Personalização' },
      { id: 'security', path: '/dashboard/seguranca', icon: Shield, label: 'Segurança & Privacidade' }
    ]
  }
];

interface UnifiedSidebarProps {
  isMobile: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UnifiedSidebar({ isMobile, isOpen = false, onOpenChange }: UnifiedSidebarProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    setHoveredGroup(null);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleMouseEnter = (groupId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredGroup(groupId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 150);
  };

  const hasActiveItemInGroup = (group: typeof menuGroups[0]) => {
    return group.items.some(item => isActive(item.path));
  };

  const sidebarContent = (
    <div className="h-full flex" onMouseLeave={handleMouseLeave}>
      {/* Main icon strip */}
      <div className="w-16 bg-primary flex flex-col h-full">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-white/10">
          <Link to="/dashboard" onClick={handleLinkClick}>
            <img 
              src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
              alt="ElloSuit Logo" 
              className="h-6 w-auto filter brightness-0 invert"
            />
          </Link>
        </div>

        {/* Menu Group Icons */}
        <div className="flex-1 py-2 flex flex-col items-center">
          <TooltipProvider delayDuration={0}>
            {menuGroups.map((group) => {
              const IconComponent = group.icon;
              const isHovered = hoveredGroup === group.id;
              const hasActive = hasActiveItemInGroup(group);
              
              return (
                <div
                  key={group.id}
                  onMouseEnter={() => handleMouseEnter(group.id)}
                  className="relative"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 mb-1",
                          isHovered 
                            ? "bg-white text-primary shadow-lg scale-105" 
                            : hasActive 
                              ? "bg-white/20 text-white" 
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    {!isHovered && (
                      <TooltipContent side="right" className="rounded-lg font-medium">
                        {group.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </TooltipProvider>
        </div>

        {/* User Avatar & Logout */}
        <div className="py-3 flex flex-col items-center border-t border-white/10">
          {user && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 mb-2 cursor-pointer">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-white/20 text-white text-xs">
                      {user.email?.substring(0, 2).toUpperCase() || 'US'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg">
                  <p className="font-medium">{user.user_metadata?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    signOut();
                    handleLinkClick();
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="rounded-lg">
                Sair
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Expandable Panel - appears on hover */}
      <div 
        className={cn(
          "bg-primary/95 backdrop-blur-sm border-l border-white/10 overflow-hidden transition-all duration-200 ease-out",
          hoveredGroup ? "w-56 opacity-100" : "w-0 opacity-0"
        )}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
        }}
      >
        {hoveredGroup && (
          <div className="w-56 h-full flex flex-col animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Panel Header */}
            <div className="h-14 px-4 flex items-center border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">
                {menuGroups.find(g => g.id === hoveredGroup)?.label}
              </h3>
            </div>

            {/* Panel Items */}
            <div className="flex-1 py-2 px-2">
              <nav className="space-y-1">
                {menuGroups.find(g => g.id === hoveredGroup)?.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        active 
                          ? "bg-white text-primary shadow-sm" 
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <ItemIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: Render as Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 rounded-xl"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent 
          side="left" 
          className="w-auto p-0 bg-transparent border-none"
          style={{ zIndex: 100 }}
        >
          <div className="h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render as fixed div
  return (
    <div className="h-screen sticky top-0 flex">
      {sidebarContent}
    </div>
  );
}
