
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import AgendaMenu from '@/pages/AgendaMenu';
import AgendaCalendar from '@/pages/AgendaCalendar';
import AgendaStartMeet from '@/pages/AgendaStartMeet';
import AgendaHorarios from '@/pages/AgendaHorarios';
import Tarefas from '@/pages/Tarefas';
import ClientsManager from '@/components/Dashboard/ClientsManager';
import EmailDashboard from '@/components/Dashboard/EmailDashboard';
import Settings from '@/components/Dashboard/Settings';
import BookingPage from '@/pages/BookingPage';
import Team from '@/pages/Team';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/agenda" element={
                  <ProtectedRoute>
                    <AgendaMenu />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/agenda/calendario" element={
                  <ProtectedRoute>
                    <AgendaCalendar />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/agenda/start-meet" element={
                  <ProtectedRoute>
                    <AgendaStartMeet />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/agenda/horarios" element={
                  <ProtectedRoute>
                    <AgendaHorarios />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/tarefas" element={
                  <ProtectedRoute>
                    <Tarefas />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/clientes" element={
                  <ProtectedRoute>
                    <ClientsManager />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/email" element={
                  <ProtectedRoute>
                    <EmailDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/configuracoes" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/booking/:userId" element={<BookingPage />} />
                <Route path="/team" element={<Team />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
