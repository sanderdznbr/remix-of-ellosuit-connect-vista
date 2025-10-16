import { useState } from "react";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const menuGroups = [
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { id: 'home', path: '/dashboard', icon: Home, label: 'Dashboard' },
      { id: 'users', path: '/dashboard/funcionarios', icon: Users, label: 'Usuários' },
      { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Clientes' },
      { id: 'suppliers', path: '/dashboard/fornecedores', icon: Users, label: 'Fornecedores' },
      { id: 'prospects', path: '/dashboard/prospectos', icon: Users, label: 'Prospectos' },
      { id: 'bot-ia', path: '/dashboard/bot-ia', icon: Bot, label: 'Agentes Ello IA' },
      { id: 'documents', path: '/dashboard/drive', icon: FileText, label: 'Arquivos' }
    ]
  },
  {
    id: 'ello-flows',
    label: 'Ello Flows',
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
    items: [
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: MessageSquare, label: 'CRM WhatsApp' },
      { id: 'email', path: '/dashboard/email', icon: Mail, label: 'Email Marketing' }
    ]
  },
  {
    id: 'ello-track',
    label: 'Ello Track',
    items: [
      { id: 'document-tracking', path: '/dashboard/rastreamento-documento', icon: FileText, label: 'Rastreamento de PDF' },
      { id: 'link-tracking', path: '/dashboard/rastreamento-link', icon: FileText, label: 'Rastreamento de Link' },
      { id: 'video-tracking', path: '/dashboard/rastreamento-video', icon: Video, label: 'Rastreamento de Vídeo' }
    ]
  },
  {
    id: 'analise-relatorio',
    label: 'Análise & Relatório',
    items: [
      { id: 'vision', path: '/dashboard/ello-vision', icon: BarChart3, label: 'Ello Vision' },
      { id: 'analytics', path: '/dashboard/analytics', icon: BarChart3, label: 'Análises' },
      { id: 'reports', path: '/dashboard/relatorios', icon: FileText, label: 'Relatórios' }
    ]
  },
  {
    id: 'ajuda-suporte',
    label: 'Ajuda & Suporte',
    items: [
      { id: 'support', path: '/dashboard/suporte', icon: MessageSquare, label: 'Suporte' },
      { id: 'report-problem', path: '/dashboard/reportar-problema', icon: FileText, label: 'Reporte um problema' },
      { id: 'terms', path: '/termos', icon: FileText, label: 'Termos & Políticas' }
    ]
  },
  {
    id: 'config-privacidade',
    label: 'Configurações & Privacidade',
    items: [
      { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' },
      { id: 'customize', path: '/dashboard/personalizar', icon: Settings, label: 'Personalização' },
      { id: 'security', path: '/dashboard/seguranca', icon: Settings, label: 'Segurança & Privacidade' }
    ]
  }
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-primary/10 hover:bg-primary/20 text-primary"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="w-[280px] p-0 bg-primary overflow-y-auto"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Link to="/dashboard" onClick={handleLinkClick}>
            <img 
              src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
              alt="ElloSuit Logo" 
              className="h-8 w-auto filter brightness-0 invert"
              onError={(e) => {
                console.error('Erro ao carregar logo padrão:', e);
              }}
            />
          </Link>
        </div>

        {/* Menu Groups */}
        <div className="flex-1 py-4">
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-6 px-3">
              <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 px-3">
                {group.label}
              </h3>
              
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                        ${active 
                          ? 'bg-white/20 text-white' 
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      <IconComponent className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="border-t border-white/10 p-4">
          {user && (
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-white/20 text-white text-sm">
                  {user.email?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.user_metadata?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              handleLinkClick();
            }}
            className="w-full justify-start text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
