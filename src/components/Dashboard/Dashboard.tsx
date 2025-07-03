
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import MyCalendar from './MyCalendar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('mail-tracking');
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleItemClick = (item: string) => {
    setActiveItem(item);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'mail-tracking':
        return <MailTracking />;
      case 'campaign-mail':
        return <CampaignMail />;
      case 'my-calendar':
        return <MyCalendar />;
      default:
        return <MailTracking />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />
      <div className="flex-1 flex flex-col">
        {/* Header with user info and logout */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </Button>
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
