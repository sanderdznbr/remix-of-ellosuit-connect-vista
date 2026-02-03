import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Home, Calendar, Mail, Users, FolderOpen, Video, FileText, BarChart3, 
  Link, Play, Eye, Shield, HelpCircle, AlertTriangle, Bot, CheckSquare, Workflow, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  category: string;
  color: string;
}

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickActionsModal: React.FC<QuickActionsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const actions: QuickAction[] = [
    // Sistema
    { id: 'home', icon: Home, label: 'Início', path: '/dashboard', category: 'Sistema', color: 'bg-blue-500' },
    { id: 'agenda', icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', category: 'Sistema', color: 'bg-blue-500' },
    { id: 'email', icon: Mail, label: 'Email', path: '/dashboard/email', category: 'Sistema', color: 'bg-blue-500' },
    { id: 'clients', icon: Users, label: 'Clientes', path: '/dashboard/clientes', category: 'Sistema', color: 'bg-blue-500' },
    { id: 'drive', icon: FolderOpen, label: 'Drive', path: '/dashboard/drive', category: 'Sistema', color: 'bg-blue-500' },
    
    // Reuniões
    { id: 'meetings', icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', category: 'Reuniões', color: 'bg-green-500' },
    { id: 'agenda-aberta', icon: CalendarClock, label: 'Agenda Aberta', path: '/dashboard/agenda-aberta', category: 'Reuniões', color: 'bg-green-500' },
    
    // Rastreamento
    { id: 'doc-track', icon: FileText, label: 'Rastrear Docs', path: '/dashboard/rastreamento-documento', category: 'Rastreamento', color: 'bg-orange-500' },
    { id: 'link-track', icon: Link, label: 'Rastrear Links', path: '/dashboard/rastreamento-link', category: 'Rastreamento', color: 'bg-orange-500' },
    { id: 'video-track', icon: Play, label: 'Rastrear Vídeos', path: '/dashboard/rastreamento-video', category: 'Rastreamento', color: 'bg-orange-500' },
    
    // Análise
    { id: 'ello-vision', icon: Eye, label: 'Ello Vision', path: '/dashboard/ello-vision', category: 'Análise', color: 'bg-purple-500' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', category: 'Análise', color: 'bg-purple-500' },
    { id: 'reports', icon: FileText, label: 'Relatórios', path: '/dashboard/relatorios', category: 'Análise', color: 'bg-purple-500' },
    
    // Ferramentas
    { id: 'tasks', icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', category: 'Ferramentas', color: 'bg-pink-500' },
    { id: 'flows', icon: Workflow, label: 'Fluxos', path: '/dashboard/fluxos', category: 'Ferramentas', color: 'bg-pink-500' },
    { id: 'bot-ia', icon: Bot, label: 'Bot IA', path: '/dashboard/bot-ia', category: 'Ferramentas', color: 'bg-pink-500' },
    
    // Suporte
    { id: 'support', icon: HelpCircle, label: 'Suporte', path: '/dashboard/suporte', category: 'Suporte', color: 'bg-gray-500' },
    { id: 'report-bug', icon: AlertTriangle, label: 'Reportar Bug', path: '/dashboard/reportar-problema', category: 'Suporte', color: 'bg-gray-500' },
    { id: 'security', icon: Shield, label: 'Segurança', path: '/dashboard/seguranca', category: 'Suporte', color: 'bg-gray-500' },
  ];

  const filteredActions = actions.filter(action => 
    action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(filteredActions.map(a => a.category))];

  const handleAction = (path: string) => {
    navigate(path);
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu Rápido</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionalidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted border-0"
              autoFocus
            />
          </div>
        </div>

        {/* Actions Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {categories.map((category) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {category}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {filteredActions
                  .filter(a => a.category === category)
                  .map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.path)}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all"
                    >
                      <div className={`p-2.5 rounded-xl ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {action.label}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}

          {filteredActions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsModal;
