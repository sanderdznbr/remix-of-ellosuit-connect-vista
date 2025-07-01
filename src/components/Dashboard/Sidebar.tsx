
import React from 'react';
import { 
  Mail, 
  Send, 
  TrendingUp, 
  FileText, 
  Users, 
  FolderOpen,
  Calendar,
  Video,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onItemClick: (item: string) => void;
}

const Sidebar = ({ isCollapsed, onToggle, activeItem, onItemClick }: SidebarProps) => {
  const menuSections = [
    {
      title: 'Email',
      items: [
        { id: 'mail-tracking', label: 'Mail Tracking', icon: Mail },
        { id: 'campaign-mail', label: 'Campaign Mail', icon: Send },
        { id: 'mail-productivity', label: 'Mail Productivity', icon: TrendingUp },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'documents', label: 'Documents', icon: FolderOpen },
      ]
    },
    {
      title: 'Calendar',
      items: [
        { id: 'my-calendar', label: 'My Calendar', icon: Calendar },
        { id: 'start-meet', label: 'Start Meet', icon: Video },
        { id: 'my-meetings', label: 'My Meetings', icon: Calendar },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'team', label: 'Team', icon: Users },
        { id: 'whatsapp-api', label: 'Whatsapp API', icon: MessageCircle },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const handleItemClick = (itemId: string) => {
    if (itemId === 'mail-tracking' || itemId === 'campaign-mail') {
      onItemClick(itemId);
    } else {
      alert('Função em desenvolvimento');
    }
  };

  return (
    <div className={`bg-[#3600FF] text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <img 
            src="/lovable-uploads/78d0576b-d7ba-4f41-b1ac-30929441fa41.png" 
            alt="Ellosuit Logo" 
            className="h-8 w-auto"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Menu Sections */}
      <div className="flex-1 px-2">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className="mb-6">
            {!isCollapsed && (
              <h3 className="text-sm font-medium text-white/70 mb-3 px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#3200EA] text-white' 
                        : 'text-white/80 hover:bg-[#3200EA] hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Section */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">SC</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium">Sander Colombes</p>
              <p className="text-xs text-white/70">Basic Plan</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => alert('Função em desenvolvimento')}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
