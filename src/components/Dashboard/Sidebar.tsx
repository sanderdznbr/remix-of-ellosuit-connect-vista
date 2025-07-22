
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Mail, 
  Calendar, 
  Users, 
  BarChart3,
  Settings,
  FileText,
  Briefcase,
  Video,
  ChevronLeft,
  ChevronRight,
  Target,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onItemClick: (item: string) => void;
}

const Sidebar = ({ isCollapsed, onToggle, activeItem, onItemClick }: SidebarProps) => {
  console.log('🖱️ Item clicado na sidebar:', activeItem);

  const handleItemClick = (item: string) => {
    console.log('✅ Navegando para:', item);
    onItemClick(item);
  };

  const handleLogoClick = () => {
    console.log('🏠 Logo clicado - navegando para home');
    onItemClick('home');
  };

  const menuItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'mail-tracking', label: 'Rastreamento', icon: Mail },
    { id: 'campaign-mail', label: 'Campanhas', icon: MessageSquare },
    { id: 'mail-productivity', label: 'Produtividade', icon: Target },
    { id: 'templates', label: 'Modelos', icon: FileText },
    { id: 'my-calendar', label: 'Calendário', icon: Calendar },
    { id: 'my-meetings', label: 'Reuniões', icon: Video },
    { id: 'start-meet', label: 'Iniciar Meet', icon: Zap },
    { id: 'documents', label: 'Documentos', icon: Briefcase },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'analytics', label: 'Análises', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  return (
    <div 
      className={`
        ${isCollapsed ? 'w-20' : 'w-72'} 
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-lg
      `}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-[#3600FF] to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">ElloSuit</h1>
                <p className="text-xs text-gray-500">Business Suite</p>
              </div>
            )}
          </button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-2 h-8 w-8 rounded-lg hover:bg-gray-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-[#3600FF] text-white shadow-lg shadow-[#3600FF]/25' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
              
              {!isCollapsed && item.id === 'templates' && (
                <Badge className="ml-auto bg-green-100 text-green-800 text-xs">
                  Novo
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        {!isCollapsed && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
            <p className="text-sm font-medium text-gray-900 mb-1">
              🚀 Plano Gratuito
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Aproveite todos os recursos disponíveis
            </p>
            <Button 
              size="sm" 
              className="w-full bg-[#3600FF] hover:bg-[#3600FF]/90 text-white rounded-lg text-xs"
            >
              Explorar Recursos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
