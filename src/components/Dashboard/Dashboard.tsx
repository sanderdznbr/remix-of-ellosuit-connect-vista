
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MailTracking from './MailTracking';
import CampaignMail from './CampaignMail';
import MailProductivity from './MailProductivity';
import MyCalendar from './MyCalendar';
import MyMeetings from './MyMeetings';
import DocumentsManager from './DocumentsManager';
import ClientsManager from './ClientsManager';
import Analytics from './Analytics';
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
      case 'mail-productivity':
        return <MailProductivity />;
      case 'my-calendar':
        return <MyCalendar />;
      case 'my-meetings':
        return <MyMeetings />;
      case 'documents':
        return <DocumentsManager />;
      case 'clients':
        return <ClientsManager />;
      case 'analytics':
        return <Analytics />;
      default:
        return <MailTracking />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
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
