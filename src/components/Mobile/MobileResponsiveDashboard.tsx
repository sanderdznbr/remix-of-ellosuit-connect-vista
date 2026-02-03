import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from './MobileLayout';
import { 
  Link, Video, Eye, FileText, HelpCircle, AlertTriangle, Shield, 
  Truck, Users, Bot, Mail, BarChart3 
} from 'lucide-react';

// Import components
import Home from '@/components/Dashboard/Home';
import MyCalendar from '@/components/Dashboard/MyCalendar';
import EmailDashboard from '@/components/Dashboard/EmailDashboard';
import ClientsManager from '@/components/Dashboard/ClientsManager';
import Analytics from '@/components/Dashboard/Analytics';
import GroupedSidebarEditor from '@/components/Dashboard/GroupedSidebarEditor';
import MeetingRooms from '@/components/Dashboard/MeetingRooms';
import FluxosBoard from '@/components/Fluxos/FluxosBoard';
import TarefasWeb from '@/components/Tarefas/TarefasWeb';
import WhatsAppCRM from '@/components/CRM/WhatsAppCRM';
import DocumentTrackingDashboard from '@/components/DocumentTracking/DocumentTrackingDashboard';
import DriveManager from '@/components/Dashboard/DriveManager';
import ImprovedAgendaAberta from '@/components/Dashboard/ImprovedAgendaAberta';
import EmployeeManagement from '@/components/Dashboard/EmployeeManagement';
import ImprovedDashboardCustomizer from '@/components/Dashboard/ImprovedDashboardCustomizer';
import MeetingRecordings from '@/components/Dashboard/MeetingRecordings';
import BotIADashboard from '@/components/BotIA/BotIADashboard';
import PlaceholderPage from '@/components/Dashboard/PlaceholderPage';

const MobileResponsiveDashboard = () => {
  const { user, loading } = useAuth();
  const { isMobile } = useIsMobile();

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

  // Sempre usar o novo layout mobile-first responsivo
  return (
    <MobileLayout>
      <div className="min-h-full">
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
          <Route path="/funcionarios" element={<EmployeeManagement />} />
          <Route path="/personalizar-dashboard" element={<ImprovedDashboardCustomizer />} />
          <Route path="/personalizar" element={<ImprovedDashboardCustomizer />} />
          
          {/* Rotas adicionais da sidebar */}
          <Route path="/fornecedores" element={<ClientsManager />} />
          <Route path="/prospectos" element={<ClientsManager />} />
          <Route path="/bot-ia" element={<BotIADashboard />} />
          <Route path="/email-marketing" element={<EmailDashboard />} />
          <Route path="/analytics" element={<Analytics onNavigate={handleNavigate} />} />
          
          {/* Placeholders para páginas em desenvolvimento */}
          <Route 
            path="/rastreamento-link" 
            element={
              <PlaceholderPage 
                title="Rastreamento de Links" 
                description="Acompanhe cliques e engajamento dos seus links compartilhados."
                icon={Link}
              />
            } 
          />
          <Route 
            path="/rastreamento-video" 
            element={
              <PlaceholderPage 
                title="Rastreamento de Vídeos" 
                description="Analise visualizações e engajamento dos seus vídeos."
                icon={Video}
              />
            } 
          />
          <Route 
            path="/ello-vision" 
            element={
              <PlaceholderPage 
                title="Ello Vision" 
                description="Visualização avançada com inteligência artificial."
                icon={Eye}
              />
            } 
          />
          <Route 
            path="/relatorios" 
            element={
              <PlaceholderPage 
                title="Relatórios" 
                description="Gere relatórios detalhados sobre suas atividades."
                icon={FileText}
              />
            } 
          />
          <Route 
            path="/suporte" 
            element={
              <PlaceholderPage 
                title="Suporte" 
                description="Central de ajuda e suporte ao cliente."
                icon={HelpCircle}
              />
            } 
          />
          <Route 
            path="/reportar-problema" 
            element={
              <PlaceholderPage 
                title="Reportar Problema" 
                description="Relate bugs ou problemas encontrados na plataforma."
                icon={AlertTriangle}
              />
            } 
          />
          <Route 
            path="/seguranca" 
            element={
              <PlaceholderPage 
                title="Segurança" 
                description="Configurações de segurança e privacidade da sua conta."
                icon={Shield}
              />
            } 
          />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </MobileLayout>
  );
};

export default MobileResponsiveDashboard;
