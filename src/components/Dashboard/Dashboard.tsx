
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
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
import MobileDashboard from '@/components/Mobile/MobileDashboard';
import FluxosBoard from '@/components/Fluxos/FluxosBoard';
import TarefasWeb from '@/components/Tarefas/TarefasWeb';
import WhatsAppCRM from '@/components/CRM/WhatsAppCRM';
import DocumentTrackingDashboard from '@/components/DocumentTracking/DocumentTrackingDashboard';
import DriveManager from './DriveManager';
import ImprovedAgendaAberta from './ImprovedAgendaAberta';
import MeetingRecordings from './MeetingRecordings';

const Dashboard = () => {
  const { isMobile } = useIsMobile();
  const { user, loading } = useAuth();

  const handleNavigate = (page: string) => {
    // Navigation logic can be implemented here if needed
    console.log('Navigate to:', page);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Usar layout mobile se estiver em dispositivo móvel
  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-container desktop-container">
      <div className="responsive-flex">
        <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="p-2 sm:p-4 md:p-6">
            <Routes>
          <Route path="/" element={<Home onNavigate={handleNavigate} />} />
          <Route path="/agenda" element={<MyCalendar />} />
          <Route path="/reunioes" element={<MeetingRooms />} />
          <Route path="/reunioes/gravacoes" element={<MeetingRecordings />} />
          <Route path="/email/*" element={<EmailDashboard />} />
          <Route path="/clientes" element={<ClientsManager />} />
          <Route path="/drive" element={<DriveManager />} />
          <Route path="/agenda-aberta" element={<ImprovedAgendaAberta />} />
          <Route path="/analises" element={<Navigate to="/dashboard/email" replace />} />
          <Route path="/editar" element={<GroupedSidebarEditor />} />
          <Route path="/configuracoes" element={<GroupedSidebarEditor />} />
          <Route path="/fluxos" element={<FluxosBoard />} />
          <Route path="/tasks" element={<TarefasWeb />} />
          <Route path="/crm-whatsapp" element={<WhatsAppCRM />} />
          <Route path="/rastreamento-documento" element={<DocumentTrackingDashboard />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
