
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Home from './Home';
import MyCalendar from './MyCalendar';
import EmailDashboard from './EmailDashboard';
import ClientsManager from './ClientsManager';
import DocumentsManager from './DocumentsManager';
import Analytics from './Analytics';
import Settings from './Settings';
import SidebarEditor from './SidebarEditor';

const Dashboard = () => {
  const handleNavigate = (page: string) => {
    // Navigation logic can be implemented here if needed
    console.log('Navigate to:', page);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Home onNavigate={handleNavigate} />} />
          <Route path="/agenda" element={<MyCalendar />} />
          <Route path="/email/*" element={<EmailDashboard />} />
          <Route path="/clientes" element={<ClientsManager />} />
          <Route path="/documentos" element={<DocumentsManager />} />
          <Route path="/analises" element={<Analytics onNavigate={handleNavigate} />} />
          <Route path="/editar" element={<SidebarEditor />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
