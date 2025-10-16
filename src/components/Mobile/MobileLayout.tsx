import React from 'react';
import { MobileSidebar } from './MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();

  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Mobile Hamburger Menu */}
      {isMobile && <MobileSidebar />}
      
      {/* Main content */}
      <main className="flex-1 w-full bg-background">
        {children}
      </main>
    </div>
  );
};

export default MobileLayout;