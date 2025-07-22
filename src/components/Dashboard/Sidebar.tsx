
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
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarSettings } from '@/hooks/useSidebarSettings';

const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings, loading } = useSidebarSettings();
  
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

  // Order menu items based on user settings
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

  if (loading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
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
      className="w-64 bg-white border-r border-gray-200 flex flex-col"
      style={{ backgroundColor: settings.sidebar_color ? `${settings.sidebar_color}15` : undefined }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {settings.custom_logo_url ? (
            <img 
              src={settings.custom_logo_url} 
              alt="Logo" 
              className="h-10 w-auto"
            />
          ) : (
            <>
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: settings.sidebar_color || '#3600FF' }}
              >
                E
              </div>
              <span className="text-xl font-bold text-gray-900">ElloSuit</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? 'text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              style={isActive(item.path) ? { 
                backgroundColor: settings.sidebar_color || '#3600FF',
                boxShadow: `0 4px 14px 0 ${settings.sidebar_color || '#3600FF'}40`
              } : {}}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gray-100 text-gray-600">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <Button
          onClick={signOut}
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 rounded-xl"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
