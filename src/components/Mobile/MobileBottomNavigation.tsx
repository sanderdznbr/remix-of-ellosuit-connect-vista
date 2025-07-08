import React from 'react';
import { Calendar, Mail, Users, BarChart3, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavigationProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeItem,
  onItemClick
}) => {
  const navItems = [
    { 
      id: 'my-calendar', 
      icon: Calendar, 
      label: 'Agenda',
      color: 'text-blue-500'
    },
    { 
      id: 'mail-tracking', 
      icon: Mail, 
      label: 'Email',
      color: 'text-green-500'
    },
    { 
      id: 'start-meet', 
      icon: Video, 
      label: 'Meet',
      color: 'text-purple-500'
    },
    { 
      id: 'clients', 
      icon: Users, 
      label: 'Clientes',
      color: 'text-orange-500'
    },
    { 
      id: 'analytics', 
      icon: BarChart3, 
      label: 'Análises',
      color: 'text-red-500'
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "bg-primary/10 scale-105" 
                  : "hover:bg-gray-100 active:scale-95"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 mb-1 transition-colors",
                  isActive ? "text-primary" : "text-gray-500"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-gray-500"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNavigation;