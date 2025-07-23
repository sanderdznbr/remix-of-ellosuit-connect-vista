
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  CheckSquare,
  Users,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  Link
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarSettings } from '@/hooks/useSidebarSettings';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const { settings, isColorDark } = useSidebarSettings();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', hasSubmenu: true },
    { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tarefas' },
    { icon: Users, label: 'Clientes', path: '/dashboard/clientes' },
    { icon: Mail, label: 'E-mail', path: '/dashboard/email' },
    { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes' },
  ];

  const agendaSubmenuItems = [
    { icon: Calendar, label: 'Calendário', path: '/dashboard/agenda/calendario' },
    { icon: Video, label: 'Start Meet', path: '/dashboard/agenda/start-meet' },
    { icon: Clock, label: 'Meus Horários', path: '/dashboard/agenda/horarios' },
  ];

  const currentPath = location.pathname;
  const isAgendaPath = currentPath.startsWith('/dashboard/agenda');

  const handleLogout = async () => {
    await signOut();
  };

  const sidebarStyle = {
    backgroundColor: settings.sidebar_background_color || '#3600FF',
    color: isColorDark(settings.sidebar_color || '#3000E3') ? '#ffffff' : '#000000',
  };

  const linkStyle = (isActive: boolean) => ({
    color: isActive ? '#ffffff' : (isColorDark(settings.sidebar_color || '#3000E3') ? '#e5e7eb' : '#6b7280'),
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  });

  const handleAgendaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Se já está na agenda, não faz nada, deixa o submenu visível
    if (!isAgendaPath) {
      // Se não está na agenda, navega para a primeira opção do submenu
      window.location.href = '/dashboard/agenda/calendario';
    }
  };

  return (
    <div
      className={cn(
        "h-screen flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={sidebarStyle}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              {settings.custom_logo_url ? (
                <img 
                  src={settings.custom_logo_url} 
                  alt="Logo" 
                  className="w-8 h-8 rounded"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário'}
                </span>
                <span className="text-xs opacity-70">
                  {user?.email}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/dashboard/agenda' ? isAgendaPath : currentPath === item.path;
          
          return (
            <div key={item.path}>
              {item.hasSubmenu && item.path === '/dashboard/agenda' ? (
                <button
                  onClick={handleAgendaClick}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-white/10"
                  )}
                  style={linkStyle(isActive)}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-white/10"
                  )}
                  style={linkStyle(isActive)}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              )}
              
              {/* Submenu da Agenda */}
              {item.hasSubmenu && item.path === '/dashboard/agenda' && isAgendaPath && !isCollapsed && (
                <div className="ml-6 mt-2 space-y-1">
                  {agendaSubmenuItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = currentPath === subItem.path;
                    
                    return (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm",
                          "hover:bg-white/10"
                        )}
                        style={linkStyle(isSubActive)}
                      >
                        <SubIcon size={16} />
                        <span>{subItem.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
            "hover:bg-white/10"
          )}
          style={linkStyle(false)}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
