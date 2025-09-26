import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Mail, 
  Home, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Video,
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Bot,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarSettings, MenuItem, MenuGroup } from '@/hooks/useSidebarSettings';

const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings, loading, isColorDark } = useSidebarSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const defaultMenuItems = [
    { id: 'home', path: '/dashboard', icon: Home, label: 'Dashboard' },
    { id: 'calendar', path: '/dashboard/agenda', icon: Calendar, label: 'Agendamentos' },
    { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Contatos' },
    { id: 'documents', path: '/dashboard/drive', icon: FileText, label: 'Arquivos' },
    { id: 'tasks', path: '/dashboard/tasks', icon: CheckSquare, label: 'Tarefas' },
    { id: 'flows', path: '/dashboard/fluxos', icon: Zap, label: 'Fluxos de produção' },
    { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: MessageSquare, label: 'Whatsapp CRM' },
    { id: 'email', path: '/dashboard/email', icon: Mail, label: 'Email Marketing' },
    { id: 'agenda-aberta', path: '/dashboard/agenda-aberta', icon: Calendar, label: 'Agendamento Online' },
    { id: 'meetings', path: '/dashboard/reunioes', icon: Video, label: 'Reuniões Ello' },
    { id: 'bot-ia', path: '/dashboard/bot-ia', icon: Bot, label: 'Agentes de IA' },
    { id: 'document-tracking', path: '/dashboard/rastreamento-documento', icon: FileText, label: 'Rastreamento de Documento' },
    { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' }
  ];

  const defaultGroups: MenuGroup[] = [
    {
      id: 'sistema',
      label: 'Sistema',
      color: '#64748B',
      items: [
        { id: 'home', path: '/dashboard', icon: Home, label: 'Dashboard' },
        { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' }
      ]
    },
    {
      id: 'agendamentos',
      label: 'Agendamentos',
      color: '#3B82F6',
      items: [
        { id: 'calendar', path: '/dashboard/agenda', icon: Calendar, label: 'Agendamentos' },
        { id: 'agenda-aberta', path: '/dashboard/agenda-aberta', icon: Calendar, label: 'Agendamento Online' },
        { id: 'meetings', path: '/dashboard/reunioes', icon: Video, label: 'Reuniões Ello' }
      ]
    },
    {
      id: 'marketing',
      label: 'Marketing',
      color: '#10B981',
      items: [
        { id: 'email', path: '/dashboard/email', icon: Mail, label: 'Email Marketing' },
        { id: 'bot-ia', path: '/dashboard/bot-ia', icon: Bot, label: 'Agentes de IA' }
      ]
    },
    {
      id: 'producao',
      label: 'Produção',
      color: '#F59E0B',
      items: [
        { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Contatos' },
        { id: 'documents', path: '/dashboard/drive', icon: FileText, label: 'Arquivos' },
        { id: 'tasks', path: '/dashboard/tasks', icon: CheckSquare, label: 'Tarefas' },
        { id: 'flows', path: '/dashboard/fluxos', icon: Zap, label: 'Fluxos de produção' },
        { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: MessageSquare, label: 'Whatsapp CRM' }
      ]
    },
    {
      id: 'rastreamento',
      label: 'Rastreamento',
      color: '#8B5CF6',
      items: [
        { id: 'document-tracking', path: '/dashboard/rastreamento-documento', icon: FileText, label: 'Rastreamento de Documento' }
      ]
    }
  ];

  const getMenuGroups = (): MenuGroup[] => {
    if (settings.menu_groups && settings.menu_groups.length > 0) {
      return settings.menu_groups.map(group => ({
        ...group,
        items: group.items.map(item => ({
          ...item,
          icon: defaultMenuItems.find(defaultItem => defaultItem.id === item.id)?.icon || Home
        }))
      }));
    }
    return defaultGroups;
  };

  const menuGroups = getMenuGroups();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  // Escutar mudanças nas configurações para atualização em tempo real
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      // Não fazer nada aqui, o hook já atualiza automaticamente
      console.log('Configurações da sidebar atualizadas em tempo real:', event.detail);
    };

    window.addEventListener('sidebarSettingsUpdated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('sidebarSettingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // Sempre usar texto branco como padrão
  const backgroundColor = settings.sidebar_background_color || '#3600FF';
  const textColor = 'text-white';
  const subtleTextColor = 'text-gray-200';

  if (loading) {
    return (
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-gray-200 flex flex-col transition-all duration-300`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-gray-200 flex flex-col transition-all duration-300`}
      style={{ backgroundColor }}
      data-sidebar="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {/* Logo/Brand */}
        {isCollapsed ? (
          <Link 
            to="/dashboard"
            className="text-2xl font-bold flex items-center justify-center"
            style={{ color: settings.sidebar_color }}
          >
            {settings.custom_favicon_url ? (
              <img 
                src={settings.custom_favicon_url} 
                alt="Logo" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  console.error('Erro ao carregar favicon personalizado:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <img 
                src="/lovable-uploads/331ff3c7-4d10-4f90-bfdf-ec5b94766b0d.png" 
                alt="ElloSuit" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  console.error('Erro ao carregar favicon padrão:', e);
                }}
              />
            )}
          </Link>
        ) : (
          <Link 
            to="/dashboard"
            className="flex items-center space-x-3"
          >
            <>
              <img 
                src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
                alt="ElloSuit Logo" 
                className="h-10 w-auto"
                onError={(e) => {
                  console.error('Erro ao carregar logo padrão:', e);
                }}
              />
              <span className={`text-xl font-bold ${textColor}`}>ElloSuit</span>
            </>
          </Link>
        )}
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`${textColor} hover:bg-white/10`}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Menu Groups */}
        <div className="flex-1 px-2 pt-4">
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-4">
              {/* Group Header */}
              {!isCollapsed && (
                <div className="px-1 mb-1">
                  <h3 
                    className="text-xs font-semibold uppercase tracking-wider opacity-75 text-white"
                  >
                    {group.label}
                  </h3>
                </div>
              )}
              
              {/* Group Items */}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${active 
                          ? `text-white` 
                          : `${textColor} hover:bg-white/10`
                        }
                      `}
                      style={active ? { backgroundColor: settings.sidebar_color } : {}}
                      title={isCollapsed ? item.label : ''}
                    >
                      <IconComponent className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4 mr-3'} flex-shrink-0`} />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="border-t border-white/10 p-3">

          {/* User Profile */}
          {user && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-2`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {user.email?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${textColor} truncate`}>
                    {user.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className={`text-xs ${subtleTextColor} truncate`}>
                    {user.email}
                  </p>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={`${textColor} hover:bg-white/10 ${isCollapsed ? 'p-1' : 'p-2'}`}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;