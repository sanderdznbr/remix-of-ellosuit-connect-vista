
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
import EmailTemplates from './EmailTemplates';
import Settings from '../../pages/Settings';
import Team from '../../pages/Team';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/Mobile/MobileLayout';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('mail-tracking');
  const { isMobile, isLoading } = useIsMobile();

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
        return 'Rastreamento de Email';
      case 'campaign-mail':
        return 'Campanhas';
      case 'mail-productivity':
        return 'Produtividade';
      case 'templates':
        return 'Modelos';
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
        return 'Análises';
      case 'settings':
        return 'Configurações';
      case 'team':
        return 'Equipe';
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
      case 'templates':
        return <EmailTemplates />;
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
      case 'settings':
        return <Settings />;
      case 'team':
        return <Team />;
      default:
        return <MailTracking />;
    }
  };

  // Show loading while determining device type
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

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
