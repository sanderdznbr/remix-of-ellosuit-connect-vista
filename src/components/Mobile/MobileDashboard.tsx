
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileHome from './MobileHome';
import MobileCalendarView from './MobileCalendarView';
import MobileEmailDashboard from './MobileEmailDashboard';
import MobileClientsManager from './MobileClientsManager';
import MobileAnalytics from './MobileAnalytics';
import MobileSettings from './MobileSettings';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';

const MobileDashboard = () => {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [activeItem, setActiveItem] = useState('home');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isMobile) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleNavigation = (item: string) => {
    setActiveItem(item);
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'home':
        return <MobileHome onNavigate={handleNavigation} />;
      case 'calendar':
        return <MobileCalendarView />;
      case 'email':
        return <MobileEmailDashboard />;
      case 'clients':
        return <MobileClientsManager />;
      case 'analytics':
        return <MobileAnalytics />;
      case 'settings':
        return <MobileSettings />;
      case 'tasks':
        return <TarefasMobile />;
      default:
        return <MobileHome onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20">
        {renderContent()}
      </main>
      <MobileBottomNavigation
        activeItem={activeItem}
        onItemClick={handleNavigation}
      />
    </div>
  );
};

export default MobileDashboard;
