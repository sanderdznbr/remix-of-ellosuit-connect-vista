
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from './MobileLayout';
import MobileHome from './MobileHome';
import MobileCalendarView from './MobileCalendarView';
import MobileEmailDashboard from './MobileEmailDashboard';
import MobileClientsManager from './MobileClientsManager';

const MobileDashboard = () => {
  const [activeItem, setActiveItem] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();

  // Mapear rotas para items da navegação mobile
  const routeToItem = {
    '/dashboard': 'home',
    '/dashboard/': 'home',
    '/dashboard/agenda': 'agenda',
    '/dashboard/email': 'email',
    '/dashboard/clientes': 'clientes'
  };

  useEffect(() => {
    const currentItem = routeToItem[location.pathname] || 'home';
    setActiveItem(currentItem);
  }, [location.pathname]);

  const handleItemClick = (item: string) => {
    setActiveItem(item);
    
    const itemToRoute = {
      'home': '/dashboard',
      'agenda': '/dashboard/agenda',
      'email': '/dashboard/email',
      'clientes': '/dashboard/clientes'
    };
    
    navigate(itemToRoute[item] || '/dashboard');
  };

  const getTitleForItem = (item: string) => {
    const titles = {
      'home': 'Dashboard',
      'agenda': 'Minha Agenda',
      'email': 'Email Marketing',
      'clientes': 'Clientes'
    };
    return titles[item] || 'Dashboard';
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'home':
        return <MobileHome />;
      case 'agenda':
        return <MobileCalendarView />;
      case 'email':
        return <MobileEmailDashboard />;
      case 'clientes':
        return <MobileClientsManager />;
      default:
        return <MobileHome />;
    }
  };

  if (!isMobile) {
    return null;
  }

  return (
    <MobileLayout
      title={getTitleForItem(activeItem)}
      activeItem={activeItem}
      onItemClick={handleItemClick}
      showSearch={['home', 'clientes', 'email'].includes(activeItem)}
      showAddButton={['agenda', 'clientes'].includes(activeItem)}
      onAddClick={() => {
        console.log('Add clicked for:', activeItem);
      }}
    >
      {renderContent()}
    </MobileLayout>
  );
};

export default MobileDashboard;
