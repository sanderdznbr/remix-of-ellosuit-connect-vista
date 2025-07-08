import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHeader from './MobileHeader';
import MobileBottomNavigation from './MobileBottomNavigation';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  activeItem: string;
  onItemClick: (item: string) => void;
  showSearch?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  activeItem,
  onItemClick,
  showSearch = false,
  showAddButton = false,
  onAddClick
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader
        title={title}
        showSearch={showSearch}
        showAddButton={showAddButton}
        onAddClick={onAddClick}
      />
      
      <main className="pb-20 pt-4">
        <div className="px-4">
          {children}
        </div>
      </main>
      
      <MobileBottomNavigation
        activeItem={activeItem}
        onItemClick={onItemClick}
      />
    </div>
  );
};

export default MobileLayout;