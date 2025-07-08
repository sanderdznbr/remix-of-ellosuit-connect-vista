
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
import StartMeet from './StartMeet';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/Mobile/MobileLayout';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('mail-tracking');
  const isMobile = useIsMobile();

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleItemClick = (item: string) => {
    console.log('🔄 Mudando para item:', item);
    setActiveItem(item);
  };

  const getPageTitle = () => {
    switch (activeItem) {
      case 'mail-tracking':
        return 'Email Tracking';
      case 'campaign-mail':
        return 'Campanhas';
      case 'mail-productivity':
        return 'Produtividade';
      case 'my-calendar':
        return 'Calendário';
      case 'my-meetings':
        return 'Reuniões';
      case 'start-meet':
        return 'Iniciar Meet';
      case 'documents':
        return 'Documentos';
      case 'clients':
        return 'Clientes';
      case 'analytics':
        return 'Analytics';
      default:
        return 'Dashboard';
    }
  };

  const renderContent = () => {
    console.log('📋 Renderizando conteúdo para:', activeItem);
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
      case 'start-meet':
        return <StartMeet />;
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

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileLayout
        title={getPageTitle()}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        showSearch={['mail-tracking', 'clients', 'documents'].includes(activeItem)}
        showAddButton={['my-calendar', 'clients', 'documents'].includes(activeItem)}
        onAddClick={() => {
          // Handle add button click based on current page
          console.log('Add button clicked for:', activeItem);
        }}
      >
        {renderContent()}
      </MobileLayout>
    );
  }

  // Desktop Layout
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
