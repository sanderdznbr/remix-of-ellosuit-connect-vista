import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { isMobile } = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with trigger */}
          <header className="h-14 bg-card border-b flex items-center px-4 shadow-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-3 text-foreground" />
            <h1 className="text-lg font-semibold text-foreground">ELLOsuit</h1>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="container mx-auto p-4 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MobileLayout;