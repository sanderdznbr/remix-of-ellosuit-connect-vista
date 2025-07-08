import React, { useState } from 'react';
import { Menu, Bell, Search, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface MobileHeaderProps {
  title: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  onMenuClick?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showSearch = false,
  showNotifications = true,
  showAddButton = false,
  onAddClick,
  onMenuClick
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Header Principal */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Lado Esquerdo */}
          <div className="flex items-center space-x-3">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[80vh]">
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                  <DrawerDescription>
                    Navegue pelas funcionalidades do app
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-8">
                  <MobileMenuContent />
                </div>
              </DrawerContent>
            </Drawer>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </p>
            </div>
          </div>

          {/* Lado Direito */}
          <div className="flex items-center space-x-2">
            {showSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                {isSearchOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            )}
            
            {showNotifications && (
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
                  3
                </Badge>
              </Button>
            )}
            
            {showAddButton && (
              <Button 
                size="sm" 
                className="h-10 w-10 p-0 bg-primary rounded-full"
                onClick={onAddClick}
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Pesquisa */}
        {isSearchOpen && (
          <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
            <Input
              placeholder="Buscar..."
              className="w-full rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Spacer para o header fixo */}
      <div className="h-16 md:hidden" />
    </>
  );
};

const MobileMenuContent = () => {
  const menuItems = [
    { icon: '📧', title: 'Email Tracking', description: 'Rastreamento de emails' },
    { icon: '📊', title: 'Campanhas', description: 'Gerenciar campanhas de email' },
    { icon: '⚡', title: 'Produtividade', description: 'Métricas e produtividade' },
    { icon: '📅', title: 'Calendário', description: 'Agenda e eventos' },
    { icon: '🤝', title: 'Reuniões', description: 'Gerenciar reuniões' },
    { icon: '📄', title: 'Documentos', description: 'Arquivos e documentos' },
    { icon: '👥', title: 'Clientes', description: 'Base de clientes' },
    { icon: '📈', title: 'Analytics', description: 'Relatórios e métricas' },
  ];

  return (
    <div className="space-y-3">
      {menuItems.map((item, index) => (
        <div
          key={index}
          className="flex items-center space-x-4 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <div className="text-2xl">{item.icon}</div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileHeader;