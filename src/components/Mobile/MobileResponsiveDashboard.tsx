import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ModuleGate from '@/components/shared/ModuleGate';

// Import components
import Home from '@/components/Dashboard/Home';
import MyCalendar from '@/components/Dashboard/MyCalendar';
import CleanEmailMarketing from '@/components/Dashboard/CleanEmailMarketing';
import EmailTemplateBuilder from '@/components/Dashboard/EmailTemplateBuilder';
import EmailTemplatesManager from '@/components/Dashboard/EmailTemplatesManager';
import SentEmailTracker from '@/components/Dashboard/SentEmailTracker';
import Analytics from '@/components/Dashboard/Analytics';
import GroupedSidebarEditor from '@/components/Dashboard/GroupedSidebarEditor';
import MeetingRooms from '@/components/Dashboard/MeetingRooms';
import FluxosBoard from '@/components/Fluxos/FluxosBoard';
import TarefasWeb from '@/components/Tarefas/TarefasWeb';
import WhatsAppCRM from '@/components/CRM/WhatsAppCRM';
import DriveManager from '@/components/Dashboard/DriveManager';
import ImprovedAgendaAberta from '@/components/Dashboard/ImprovedAgendaAberta';
import BookingThemeBuilder from '@/components/Dashboard/BookingThemeBuilder';
import ImprovedDashboardCustomizer from '@/components/Dashboard/ImprovedDashboardCustomizer';
import MeetingRecordings from '@/components/Dashboard/MeetingRecordings';
import BotIADashboard from '@/components/BotIA/BotIADashboard';
import CreateAgentPage from '@/components/BotIA/CreateAgentPage';
import EditAgentPage from '@/components/BotIA/EditAgentPage';
import ChatBotBuilder from '@/components/ChatBot/ChatBotBuilder';
import ChatbotManagement from '@/components/BotIA/ChatbotManagement';

// New unified pages
import UnifiedDatabase from '@/components/Dashboard/UnifiedDatabase';
import UnifiedTracking from '@/components/Dashboard/UnifiedTracking';
import TrackUploadPage from '@/components/Dashboard/TrackUploadPage';
import LinkShortenerPage from '@/components/Dashboard/LinkShortenerPage';
import TeamManagement from '@/components/Dashboard/TeamManagement';
import HabitsPage from '@/components/Dashboard/HabitsPage';
import HabitFlowBuilder from '@/components/Habits/HabitFlowBuilder';
import ContractsPage from '@/components/Contracts/ContractsPage';
import ContractEditor from '@/components/Contracts/ContractEditor';
import ContractViewer from '@/components/Contracts/ContractViewer';
import ProposalsPage from '@/components/Proposals/ProposalsPage';
import ProposalEditor from '@/components/Proposals/ProposalEditor';
import ReceiptsPage from '@/components/Receipts/ReceiptsPage';
import AutomationBuilder from '@/components/Automations/AutomationBuilder';
import AutomationManagement from '@/components/Automations/AutomationManagement';

// Hub pages
import OmniHub from '@/components/Dashboard/OmniHub';
import FlowsHub from '@/components/Dashboard/FlowsHub';
import TrackHub from '@/components/Dashboard/TrackHub';
import SuiteHub from '@/components/Dashboard/SuiteHub';

// Additional dashboard pages
import ElloVisionDashboard from '@/components/Dashboard/ElloVisionDashboard';
import ReportsDashboard from '@/components/Dashboard/ReportsDashboard';
import SupportDashboard from '@/components/Dashboard/SupportDashboard';
import ReportProblemForm from '@/components/Dashboard/ReportProblemForm';
import SecuritySettings from '@/components/Dashboard/SecuritySettings';
import NotificationsPage from '@/components/Dashboard/NotificationsPage';

// User profile and subscription pages
import UserProfilePage from '@/components/Dashboard/UserProfilePage';
import SubscriptionPage from '@/components/Dashboard/SubscriptionPage';
import HelpCenter from '@/components/Dashboard/HelpCenter';

// Lead Capture
import LeadFunnelsManager from '@/components/LeadCapture/LeadFunnelsManager';
import LeadFunnelBuilder from '@/components/LeadCapture/LeadFunnelBuilder';
import LeadFunnelAnalytics from '@/pages/LeadFunnelAnalytics';
import LeadTrackingDashboard from '@/pages/LeadTrackingDashboard';
import WhatsAppApiPage from '@/pages/WhatsAppApiPage';
import DisparosPage from '@/components/Disparos/DisparosPage';

// Admin
import AdminLayout from '@/components/Admin/AdminLayout';
import AdminMasterDashboard from '@/components/Admin/AdminMasterDashboard';
import AdminUsersPanel from '@/components/Admin/AdminUsersPanel';
import AdminSubscriptionsPanel from '@/components/Admin/AdminSubscriptionsPanel';
import AdminSystemHealth from '@/components/Admin/AdminSystemHealth';
import AdminSupportPanel from '@/components/Admin/AdminSupportPanel';
import AdminNotificationsLog from '@/components/Admin/AdminNotificationsLog';

const MobileResponsiveDashboard = () => {
  const { user, loading } = useAuth();
  const { isAdminMaster, loading: adminLoading } = useAdminMaster();

  const handleNavigate = (page: string) => {
    console.log('Navigate to:', page);
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      {/* Admin Master - layout exclusivo sem MegaMenu */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminMasterDashboard />} />
        <Route path="users" element={<AdminUsersPanel />} />
        <Route path="subs" element={<AdminSubscriptionsPanel />} />
        <Route path="notifications" element={<AdminNotificationsLog />} />
        <Route path="system" element={<AdminSystemHealth />} />
        <Route path="support" element={<AdminSupportPanel />} />
      </Route>

      {/* Dashboard padrão com MegaMenu */}
      <Route path="*" element={
        <DashboardLayout>
          <Routes>
            {/* Dashboard - adminmaster pode ver dashboard normal também */}
            <Route path="/" element={<Home onNavigate={handleNavigate} />} />
            
            {/* Hub Pages */}
            <Route path="/omni" element={<ModuleGate module="omni"><OmniHub /></ModuleGate>} />
            <Route path="/flows" element={<ModuleGate module="flow"><FlowsHub /></ModuleGate>} />
            <Route path="/track" element={<ModuleGate module="track"><TrackHub /></ModuleGate>} />
            <Route path="/suite" element={<SuiteHub />} />
            
            {/* Inteligência Artificial - Omni */}
            <Route path="/bot-ia" element={<ModuleGate module="omni"><BotIADashboard /></ModuleGate>} />
            <Route path="/bot-ia/novo" element={<ModuleGate module="omni"><CreateAgentPage /></ModuleGate>} />
            <Route path="/bot-ia/editar/:id" element={<ModuleGate module="omni"><EditAgentPage /></ModuleGate>} />
            <Route path="/chatbot" element={<ModuleGate module="omni"><ChatbotManagement /></ModuleGate>} />
            <Route path="/chatbot-builder" element={<ModuleGate module="omni"><ChatBotBuilder /></ModuleGate>} />
            <Route path="/automacoes" element={<AutomationManagement />} />
            <Route path="/automacoes/builder" element={<AutomationBuilder />} />
            
            {/* Comunicação - Omni */}
            <Route path="/crm-whatsapp" element={<ModuleGate module="omni"><WhatsAppCRM /></ModuleGate>} />
            <Route path="/api-whatsapp" element={<ModuleGate module="omni"><WhatsAppApiPage /></ModuleGate>} />
            <Route path="/disparos" element={<ModuleGate module="omni"><DisparosPage /></ModuleGate>} />
            <Route path="/email" element={<ModuleGate module="omni"><CleanEmailMarketing /></ModuleGate>} />
            <Route path="/email/builder" element={<ModuleGate module="omni"><EmailTemplateBuilder /></ModuleGate>} />
            <Route path="/email-builder" element={<ModuleGate module="omni"><EmailTemplateBuilder /></ModuleGate>} />
            <Route path="/email-templates" element={<ModuleGate module="omni"><EmailTemplatesManager /></ModuleGate>} />
            <Route path="/email-tracker" element={<ModuleGate module="omni"><SentEmailTracker /></ModuleGate>} />
            <Route path="/leads" element={<ModuleGate module="omni"><LeadFunnelsManager /></ModuleGate>} />
            <Route path="/leads/builder" element={<ModuleGate module="omni"><LeadFunnelBuilder /></ModuleGate>} />
            <Route path="/leads/analytics/:funnelId" element={<ModuleGate module="omni"><LeadFunnelAnalytics /></ModuleGate>} />
            
            {/* Produtividade - Flow */}
            <Route path="/agenda" element={<ModuleGate module="flow"><MyCalendar /></ModuleGate>} />
            <Route path="/agenda-aberta" element={<ModuleGate module="flow"><ImprovedAgendaAberta /></ModuleGate>} />
            <Route path="/agenda-aberta/editor" element={<ModuleGate module="flow"><BookingThemeBuilder /></ModuleGate>} />
            <Route path="/tasks" element={<ModuleGate module="flow"><TarefasWeb /></ModuleGate>} />
            <Route path="/reunioes" element={<ModuleGate module="flow"><MeetingRooms /></ModuleGate>} />
            <Route path="/reunioes/gravacoes" element={<ModuleGate module="flow"><MeetingRecordings /></ModuleGate>} />
            <Route path="/fluxos" element={<ModuleGate module="flow"><FluxosBoard /></ModuleGate>} />
            
            {/* Rastreamento - Track */}
            <Route path="/rastreamento" element={<ModuleGate module="track"><TrackUploadPage /></ModuleGate>} />
            <Route path="/encurtador" element={<ModuleGate module="track"><LinkShortenerPage /></ModuleGate>} />
            <Route path="/track/leads" element={<ModuleGate module="track"><LeadTrackingDashboard /></ModuleGate>} />
            
            {/* Gestão - Suite (sempre acessível) */}
            <Route path="/cadastros" element={<UnifiedDatabase />} />
            <Route path="/drive" element={<DriveManager />} />
            <Route path="/equipe" element={<TeamManagement />} />
            <Route path="/habitos" element={<HabitsPage />} />
            <Route path="/habitos/builder" element={<HabitFlowBuilder />} />
            <Route path="/contratos" element={<ContractsPage />} />
            <Route path="/contratos/editor" element={<ContractEditor />} />
            <Route path="/contratos/visualizar" element={<ContractViewer />} />
            <Route path="/propostas" element={<ProposalsPage />} />
            <Route path="/propostas/editor" element={<ProposalEditor />} />
            <Route path="/recibos" element={<ReceiptsPage />} />
            
            {/* Legacy routes */}
            <Route path="/clientes" element={<Navigate to="/dashboard/cadastros" replace />} />
            <Route path="/fornecedores" element={<Navigate to="/dashboard/cadastros" replace />} />
            <Route path="/prospectos" element={<Navigate to="/dashboard/cadastros" replace />} />
            <Route path="/funcionarios" element={<Navigate to="/dashboard/cadastros" replace />} />
            <Route path="/rastreamento-documento" element={<Navigate to="/dashboard/rastreamento" replace />} />
            <Route path="/rastreamento-link" element={<Navigate to="/dashboard/rastreamento" replace />} />
            <Route path="/rastreamento-video" element={<Navigate to="/dashboard/rastreamento" replace />} />
            
            {/* Insights - Suite (sempre acessível) */}
            <Route path="/analytics" element={<Analytics onNavigate={handleNavigate} />} />
            <Route path="/ello-vision" element={<ElloVisionDashboard />} />
            <Route path="/relatorios" element={<ReportsDashboard />} />
            
            {/* Configurações - Suite (sempre acessível) */}
            <Route path="/configuracoes" element={<GroupedSidebarEditor />} />
            <Route path="/personalizar" element={<ImprovedDashboardCustomizer />} />
            <Route path="/seguranca" element={<SecuritySettings />} />
            <Route path="/suporte" element={<SupportDashboard />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route path="/reportar-problema" element={<ReportProblemForm />} />
            <Route path="/ajuda" element={<HelpCenter />} />
            
            {/* User Profile & Subscription - sempre acessível */}
            <Route path="/perfil" element={<UserProfilePage />} />
            <Route path="/assinatura" element={<SubscriptionPage />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      } />
    </Routes>
  );
};

export default MobileResponsiveDashboard;
