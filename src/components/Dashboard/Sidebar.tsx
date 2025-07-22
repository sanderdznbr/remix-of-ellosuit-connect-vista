
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Mail, 
  Home, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarSettings } from '@/hooks/useSidebarSettings';

const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings, loading, isColorDark } = useSidebarSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const defaultMenuItems = [
    { id: 'home', path: '/dashboard', icon: Home, label: 'Home' },
    { id: 'calendar', path: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
    { id: 'email', path: '/dashboard/email', icon: Mail, label: 'Email' },
    { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Clientes' },
    { id: 'documents', path: '/dashboard/documentos', icon: FileText, label: 'Documentos' },
    { id: 'analytics', path: '/dashboard/analises', icon: BarChart3, label: 'Análises' },
    { id: 'edit', path: '/dashboard/editar', icon: Edit3, label: 'Editar' },
    { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' }
  ];

  const orderedMenuItems = () => {
    if (settings.menu_order && settings.menu_order.length > 0) {
      const ordered = settings.menu_order
        .map(id => defaultMenuItems.find(item => item.id === id))
        .filter(Boolean) as typeof defaultMenuItems;
      
      // Add any new items that weren't in the saved order
      const remaining = defaultMenuItems.filter(
        item => !settings.menu_order.includes(item.id)
      );
      
      return [...ordered, ...remaining];
    }
    return defaultMenuItems;
  };

  const menuItems = orderedMenuItems();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  // Determinar cor do texto baseado na cor de fundo
  const backgroundColor = settings.sidebar_background_color || '#3600FF';
  const textColor = isColorDark(backgroundColor) ? 'text-white' : 'text-gray-900';
  const subtleTextColor = isColorDark(backgroundColor) ? 'text-gray-200' : 'text-gray-600';

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
      className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-gray-200 flex flex-col transition-all duration-300 relative`}
      style={{ backgroundColor }}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-6 z-10 w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center transition-colors ${
          isColorDark(backgroundColor) ? 'bg-white text-gray-600 hover:bg-gray-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center space-x-3">
          {isCollapsed ? (
            // Exibe favicon 1:1 quando recolhida
            <img 
              src={settings.custom_favicon_url || "/lovable-uploads/6dc50aee-0855-403f-91a2-dce507fedef9.png"} 
              alt="Logo" 
              className="h-12 w-12 object-contain transition-all duration-300"
              onError={(e) => {
                e.currentTarget.src = "/lovable-uploads/6dc50aee-0855-403f-91a2-dce507fedef9.png";
              }}
            />
          ) : (
            // Exibe logo completa quando expandida
            <>
              {settings.custom_logo_url ? (
                <img 
                  src={settings.custom_logo_url} 
                  alt="Logo" 
                  className="h-10 w-auto transition-all duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "/lovable-uploads/46bd0cbc-7f70-4ed3-96f2-c376b107d40c.png";
                  }}
                />
              ) : (
                // Logo padrão ElloSuit sempre visível quando não há custom_logo_url
                <>
                  <img 
                    src="/lovable-uploads/46bd0cbc-7f70-4ed3-96f2-c376b107d40c.png" 
                    alt="ElloSuit Logo" 
                    className="h-10 w-auto transition-all duration-300"
                    onError={(e) => {
                      console.error('Erro ao carregar logo padrão:', e);
                    }}
                  />
                  <span className={`text-xl font-bold ${textColor} transition-opacity duration-300`}>
                    ElloSuit
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                active
                  ? `${textColor} shadow-lg transform scale-105`
                  : `${subtleTextColor} hover:bg-black/10 hover:${textColor}`
              }`}
              style={active ? { 
                backgroundColor: settings.sidebar_color || '#3000E3',
                boxShadow: `0 4px 14px 0 ${settings.sidebar_color || '#3000E3'}40`
              } : {}}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="transition-opacity duration-300">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4">
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${textColor} truncate`}>
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className={`text-xs ${subtleTextColor} truncate`}>
                  {user?.email}
                </p>
              </div>
            </div>

            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className={`w-full flex items-center justify-center space-x-2 ${subtleTextColor} hover:${textColor} rounded-xl border-0 hover:border-0 bg-transparent hover:bg-transparent`}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 ${subtleTextColor} hover:${textColor} rounded border-0 hover:border-0 bg-transparent hover:bg-transparent`}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
