
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import Home from './Home';
import MyCalendar from './MyCalendar';
import ClientsManager from './ClientsManager';
import EmailList from './EmailList';
import Analytics from './Analytics';
import Settings from './Settings';
import StartMeet from './StartMeet';
import DocumentsManager from './DocumentsManager';
import CampaignList from './CampaignList';
import AdvancedTemplates from '@/pages/AdvancedTemplates';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeItem, setActiveItem] = useState('home');

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeItem) {
      case 'home':
        return <Home />;
      case 'calendar':
        return <MyCalendar />;
      case 'clients':
        return <ClientsManager />;
      case 'email':
        return <EmailList />;
      case 'campaigns':
        return <CampaignList />;
      case 'templates':
        return <AdvancedTemplates />;
      case 'analytics':
        return <Analytics />;
      case 'documents':
        return <DocumentsManager />;
      case 'start-meet':
        return <StartMeet />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
