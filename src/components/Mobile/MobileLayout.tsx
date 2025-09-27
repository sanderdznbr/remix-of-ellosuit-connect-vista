import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-lg font-semibold text-gray-900">ELLOsuit</h1>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MobileLayout;