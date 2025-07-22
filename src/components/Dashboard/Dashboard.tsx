
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Home from './Home';
import MyCalendar from './MyCalendar';
import EmailList from './EmailList';
import ClientsManager from './ClientsManager';
import DocumentsManager from './DocumentsManager';
import Analytics from './Analytics';
import Settings from './Settings';
import SidebarEditor from './SidebarEditor';

const Dashboard = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agenda" element={<MyCalendar />} />
          <Route path="/email/*" element={<EmailList />} />
          <Route path="/clientes" element={<ClientsManager />} />
          <Route path="/documentos" element={<DocumentsManager />} />
          <Route path="/analises" element={<Analytics />} />
          <Route path="/editar" element={<SidebarEditor />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
