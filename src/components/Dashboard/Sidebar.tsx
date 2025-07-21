
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  Calendar,
  Users,
  Mail,
  FileText,
  PieChart,
  Settings,
  Phone,
  Palette,
  Sparkles,
  Zap,
  MessageSquare,
  Folder,
  Send
} from 'lucide-react';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const navigationItems = [
    { 
      id: 'home', 
      label: 'Início', 
      icon: Home,
      description: 'Dashboard principal'
    },
    { 
      id: 'calendar', 
      label: 'Agenda', 
      icon: Calendar,
      badge: '3',
      description: 'Eventos e reuniões'
    },
    { 
      id: 'clients', 
      label: 'Clientes', 
      icon: Users,
      description: 'Gestão de clientes'
    },
    { 
      id: 'campaigns', 
      label: 'Campanhas', 
      icon: Send,
      description: 'Email marketing'
    },
    { 
      id: 'email', 
      label: 'Emails', 
      icon: Mail,
      badge: '12',
      description: 'Caixa de entrada'
    },
    { 
      id: 'templates', 
      label: 'Design Studio', 
      icon: Palette,
      badge: 'NEW',
      description: 'Editor visual avançado',
      highlight: true
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: PieChart,
      description: 'Relatórios e métricas'
    },
    { 
      id: 'documents', 
      label: 'Documentos', 
      icon: Folder,
      description: 'Gestão de arquivos'
    },
    { 
      id: 'ai-chat', 
      label: 'AI Assistant', 
      icon: Zap,
      badge: 'BETA',
      description: 'Assistente inteligente'
    },
    { 
      id: 'start-meet', 
      label: 'Reuniões', 
      icon: Phone,
      description: 'Zoom e Google Meet'
    },
    { 
      id: 'settings', 
      label: 'Configurações', 
      icon: Settings,
      description: 'Preferências do sistema'
    }
  ];

  return (
    <Card className="h-full w-64 bg-gradient-to-b from-white to-gray-50 border-r shadow-lg">
      <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">ElloSuit</h2>
            <p className="text-blue-100 text-xs">Business Suite</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeItem === item.id ? "default" : "ghost"}
              className={`
                w-full justify-start group transition-all duration-200
                ${activeItem === item.id 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'hover:bg-blue-50 hover:text-blue-700'
                }
                ${item.highlight ? 'ring-2 ring-purple-200 ring-offset-2' : ''}
              `}
              onClick={() => onItemClick(item.id)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <item.icon className={`
                    h-5 w-5 transition-transform group-hover:scale-110
                    ${activeItem === item.id ? 'text-white' : 'text-gray-600'}
                  `} />
                  <div className="text-left">
                    <div className={`
                      font-medium text-sm
                      ${activeItem === item.id ? 'text-white' : 'text-gray-900'}
                    `}>
                      {item.label}
                    </div>
                    <div className={`
                      text-xs opacity-75
                      ${activeItem === item.id ? 'text-blue-100' : 'text-gray-500'}
                    `}>
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.badge && (
                  <Badge 
                    variant={item.badge === 'NEW' || item.badge === 'BETA' ? "secondary" : "default"}
                    className={`
                      text-xs px-2 py-0.5
                      ${item.badge === 'NEW' ? 'bg-green-100 text-green-800' : ''}
                      ${item.badge === 'BETA' ? 'bg-orange-100 text-orange-800' : ''}
                      ${activeItem === item.id ? 'bg-white/20 text-white' : ''}
                    `}
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Ações Rápidas
          </h3>
          <Button 
            size="sm" 
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            onClick={() => onItemClick('templates')}
          >
            <Palette className="h-4 w-4 mr-2" />
            Novo Design
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => onItemClick('campaigns')}
          >
            <Send className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Sidebar;
