import React from 'react';
import { MobileSidebar } from './MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();

  if (!isMobile) {
    return (
      <main className="flex-1 w-full bg-background">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Mobile Top Navbar - Fixed */}
      <div className="mobile-top-navbar">
        <MobileSidebar />
        <Link to="/dashboard">
          <img 
            src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
            alt="ElloSuit Logo" 
            className="h-6 w-auto"
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