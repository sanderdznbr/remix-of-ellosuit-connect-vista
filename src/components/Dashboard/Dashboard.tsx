
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import Sidebar from './Sidebar';
import Home from './Home';
import MyCalendar from './MyCalendar';
import EmailDashboard from './EmailDashboard';
import ClientsManager from './ClientsManager';
import DocumentsManager from './DocumentsManager';
import Analytics from './Analytics';
import Settings from './Settings';
import GroupedSidebarEditor from './GroupedSidebarEditor';
import MeetingRooms from './MeetingRooms';
import MobileResponsiveDashboard from '@/components/Mobile/MobileResponsiveDashboard';
import FluxosBoard from '@/components/Fluxos/FluxosBoard';
import TarefasWeb from '@/components/Tarefas/TarefasWeb';
import WhatsAppCRM from '@/components/CRM/WhatsAppCRM';
import DocumentTrackingDashboard from '@/components/DocumentTracking/DocumentTrackingDashboard';
import DriveManager from './DriveManager';
import ImprovedAgendaAberta from './ImprovedAgendaAberta';
import MeetingRecordings from './MeetingRecordings';

const Dashboard = () => {
  const { isMobile } = useIsMobile();

  const handleNavigate = (page: string) => {
    // Navigation logic can be implemented here if needed
    console.log('Navigate to:', page);
  };

  // Sempre usar o novo layout responsivo
  return <MobileResponsiveDashboard />;

};

export default Dashboard;
