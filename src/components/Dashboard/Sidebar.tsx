
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Calendar, Users, Mail, BarChart3, Settings, 
  Video, FileText, Megaphone, Layout, PlusCircle
} from 'lucide-react';
import { UserProfile } from './UserProfile';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'email', label: 'E-mails', icon: Mail },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'templates', label: 'Modelos', icon: Layout },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'start-meet', label: 'Iniciar Meet', icon: Video },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  return (
    <div className="bg-white h-screen w-64 min-w-[16rem] max-w-[16rem] flex flex-col flex-shrink-0 border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">ElloSuit</h1>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={`
                  w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg
                  transition-colors duration-200
                  ${activeItem === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 px-3">
          <div className="border-t border-gray-200 pt-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ações Rápidas
            </h3>
            <div className="mt-2 space-y-1">
              <button
                onClick={() => onItemClick('templates')}
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <PlusCircle className="mr-3 h-4 w-4" />
                <span>Novo Modelo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <UserProfile />
    </div>
  );
};

export default Sidebar;
