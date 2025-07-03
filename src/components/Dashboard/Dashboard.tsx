
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import MyCalendar from './MyCalendar';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('mail-tracking');

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleItemClick = (item: string) => {
    setActiveItem(item);
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
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
