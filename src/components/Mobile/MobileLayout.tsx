import React from 'react';
import { MobileSidebar } from './MobileSidebar';
import Sidebar from '@/components/Dashboard/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();

  // DESKTOP: Mostrar sidebar lateral azul sempre
  if (!isMobile) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar azul lateral - sempre visível no desktop */}
        <Sidebar />
        
        {/* Conteúdo principal */}
        <main className="flex-1 overflow-x-hidden bg-background">
          {children}
        </main>
      </div>
    );
  }

  // MOBILE: Layout mobile com navbar superior
  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Mobile Top Navbar - Fixed */}
      <div className="mobile-top-navbar bg-primary" style={{ zIndex: 50 }}>
        <MobileSidebar />
        <Link to="/dashboard">
          <img 
            src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
            alt="ElloSuit Logo" 
            className="h-6 w-auto filter brightness-0 invert"
          />
        </Link>
        <div className="w-10" /> {/* Spacer for center alignment */}
      </div>
      
      {/* Main content with padding for navbar */}
      <main className="mobile-content-with-navbar w-full bg-background">
        {children}
      </main>
    </div>
  );
};

export default MobileLayout;