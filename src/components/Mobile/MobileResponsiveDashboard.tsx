import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MobileLayout from './MobileLayout';

// Import components
import Home from '@/components/Dashboard/Home';
import MyCalendar from '@/components/Dashboard/MyCalendar';
import EmailDashboard from '@/components/Dashboard/EmailDashboard';
import Analytics from '@/components/Dashboard/Analytics';
import GroupedSidebarEditor from '@/components/Dashboard/GroupedSidebarEditor';
import MeetingRooms from '@/components/Dashboard/MeetingRooms';
import FluxosBoard from '@/components/Fluxos/FluxosBoard';
import TarefasWeb from '@/components/Tarefas/TarefasWeb';
import WhatsAppCRM from '@/components/CRM/WhatsAppCRM';
import DriveManager from '@/components/Dashboard/DriveManager';
import ImprovedAgendaAberta from '@/components/Dashboard/ImprovedAgendaAberta';
import ImprovedDashboardCustomizer from '@/components/Dashboard/ImprovedDashboardCustomizer';
import MeetingRecordings from '@/components/Dashboard/MeetingRecordings';
import BotIADashboard from '@/components/BotIA/BotIADashboard';

// New unified pages
import UnifiedCadastros from '@/components/Dashboard/UnifiedCadastros';
import UnifiedTracking from '@/components/Dashboard/UnifiedTracking';

// Additional dashboard pages
import ElloVisionDashboard from '@/components/Dashboard/ElloVisionDashboard';
import ReportsDashboard from '@/components/Dashboard/ReportsDashboard';
import SupportDashboard from '@/components/Dashboard/SupportDashboard';
import ReportProblemForm from '@/components/Dashboard/ReportProblemForm';
import SecuritySettings from '@/components/Dashboard/SecuritySettings';

const MobileResponsiveDashboard = () => {
  const { user, loading } = useAuth();

  const handleNavigate = (page: string) => {
    console.log('Navigate to:', page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MobileLayout>
      <div className="min-h-full">
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Home onNavigate={handleNavigate} />} />
          
          {/* Inteligência Artificial */}
          <Route path="/bot-ia" element={<BotIADashboard />} />
          
          {/* Comunicação */}
          <Route path="/crm-whatsapp" element={<WhatsAppCRM />} />
          <Route path="/email/*" element={<EmailDashboard />} />
          
          {/* Produtividade */}
          <Route path="/agenda" element={<MyCalendar />} />
          <Route path="/agenda-aberta" element={<ImprovedAgendaAberta />} />
          <Route path="/tasks" element={<TarefasWeb />} />
          <Route path="/reunioes" element={<MeetingRooms />} />
          <Route path="/reunioes/gravacoes" element={<MeetingRecordings />} />
          <Route path="/fluxos" element={<FluxosBoard />} />
          
          {/* Gestão - Unified pages */}
          <Route path="/cadastros" element={<UnifiedCadastros />} />
          <Route path="/drive" element={<DriveManager />} />
          <Route path="/rastreamento" element={<UnifiedTracking />} />
          
          {/* Legacy routes - redirect to unified pages */}
          <Route path="/clientes" element={<Navigate to="/dashboard/cadastros" replace />} />
          <Route path="/fornecedores" element={<Navigate to="/dashboard/cadastros" replace />} />
          <Route path="/prospectos" element={<Navigate to="/dashboard/cadastros" replace />} />
          <Route path="/funcionarios" element={<Navigate to="/dashboard/cadastros" replace />} />
          <Route path="/rastreamento-documento" element={<Navigate to="/dashboard/rastreamento" replace />} />
          <Route path="/rastreamento-link" element={<Navigate to="/dashboard/rastreamento" replace />} />
          <Route path="/rastreamento-video" element={<Navigate to="/dashboard/rastreamento" replace />} />
          
          {/* Insights */}
          <Route path="/analytics" element={<Analytics onNavigate={handleNavigate} />} />
          <Route path="/ello-vision" element={<ElloVisionDashboard />} />
          <Route path="/relatorios" element={<ReportsDashboard />} />
          
          {/* Configurações */}
          <Route path="/configuracoes" element={<GroupedSidebarEditor />} />
          <Route path="/personalizar" element={<ImprovedDashboardCustomizer />} />
          <Route path="/seguranca" element={<SecuritySettings />} />
          <Route path="/suporte" element={<SupportDashboard />} />
          <Route path="/reportar-problema" element={<ReportProblemForm />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </MobileLayout>
  );
};

export default MobileResponsiveDashboard;
