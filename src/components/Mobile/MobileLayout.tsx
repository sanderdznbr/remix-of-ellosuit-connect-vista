import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/Dashboard/UnifiedSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop view - mostrar a sidebar azul completa fixa
  if (!isMobile) {
    return (
      <div className="flex min-h-screen w-full">
        <UnifiedSidebar isMobile={false} />
        <main className="flex-1 w-full bg-background">
          {children}
        </main>
      </div>
    );
  }

  // Mobile view - sidebar como Sheet
  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Mobile Top Navbar - Fixed */}
      <div className="mobile-top-navbar bg-primary" style={{ zIndex: 50 }}>
        <UnifiedSidebar 
          isMobile={true} 
          isOpen={sidebarOpen} 
          onOpenChange={setSidebarOpen} 
        />
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