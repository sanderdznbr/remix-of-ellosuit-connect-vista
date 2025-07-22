
import React from 'react';
import { Home, Calendar, Mail, Users } from 'lucide-react';
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
      id: 'home', 
      icon: Home, 
      label: 'Início',
      color: 'text-blue-600'
    },
    { 
      id: 'agenda', 
      icon: Calendar, 
      label: 'Agenda',
      color: 'text-blue-600'
    },
    { 
      id: 'email', 
      icon: Mail, 
      label: 'Email',
      color: 'text-blue-600'
    },
    { 
      id: 'clientes', 
      icon: Users, 
      label: 'Clientes',
      color: 'text-blue-600'
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 mobile-safe-bottom md:hidden">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 min-w-[70px] mobile-touch-feedback",
                isActive 
                  ? "bg-blue-50 scale-105" 
                  : "hover:bg-gray-50"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 mb-1 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400"
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
