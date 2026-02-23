import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search,
  MessageSquare, Mail, Users, Key, Megaphone, GitBranch, Workflow,
  Calendar, Video, CheckSquare, FolderOpen, Zap, CalendarClock, Bot,
  FileText, Link2, Eye, BarChart3, Play,
  Shield, HelpCircle, Settings, CreditCard, Target, Briefcase,
  FileSignature, AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MobileMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const hubs = [
  {
    name: 'Omni',
    emoji: '🟠',
    color: '#FF4500',
    items: [
      { icon: MessageSquare, label: 'CRM WhatsApp', path: '/dashboard/crm-whatsapp' },
      { icon: Megaphone, label: 'Disparos', path: '/dashboard/disparos' },
      { icon: GitBranch, label: 'ChatBot', path: '/dashboard/chatbot' },
      { icon: Mail, label: 'Email', path: '/dashboard/email' },
      { icon: FileText, label: 'Templates Email', path: '/dashboard/email-templates' },
      { icon: Bot, label: 'Agentes IA', path: '/dashboard/bot-ia' },
      { icon: Workflow, label: 'Automações', path: '/dashboard/automacoes' },
      { icon: Key, label: 'API WhatsApp', path: '/dashboard/api-whatsapp' },
    ],
  },
  {
    name: 'Flow',
    emoji: '🔵',
    color: '#007DE3',
    items: [
      { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda' },
      { icon: CalendarClock, label: 'Agenda Online', path: '/dashboard/agenda-aberta' },
      { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks' },
      { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos' },
      { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes' },
      { icon: Video, label: 'Gravações', path: '/dashboard/reunioes/gravacoes' },
    ],
  },
  {
    name: 'Track',
    emoji: '🟢',
    color: '#3A9A1C',
    items: [
      { icon: FileText, label: 'Rastrear Conteúdo', path: '/dashboard/rastreamento' },
      { icon: Link2, label: 'Encurtador', path: '/dashboard/encurtador' },
      { icon: Eye, label: 'Rastrear Emails', path: '/dashboard/email-tracker' },
      { icon: Users, label: 'Captura Leads', path: '/dashboard/leads' },
    ],
  },
  {
    name: 'Suite',
    emoji: '🟣',
    color: '#3000E3',
    items: [
      { icon: Users, label: 'Cadastros', path: '/dashboard/cadastros' },
      { icon: FolderOpen, label: 'Arquivos', path: '/dashboard/drive' },
      { icon: Briefcase, label: 'Equipe', path: '/dashboard/equipe' },
      { icon: Target, label: 'Hábitos', path: '/dashboard/habitos' },
      { icon: FileSignature, label: 'Contratos', path: '/dashboard/contratos' },
      { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes' },
      { icon: CreditCard, label: 'Assinatura', path: '/dashboard/assinatura' },
      { icon: Shield, label: 'Segurança', path: '/dashboard/seguranca' },
      { icon: HelpCircle, label: 'Suporte', path: '/dashboard/suporte' },
      { icon: AlertTriangle, label: 'Reportar Bug', path: '/dashboard/reportar-problema' },
    ],
  },
];

const MobileMegaMenu: React.FC<MobileMegaMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
    setSearch('');
  };

  if (!isOpen) return null;

  const allItems = hubs.flatMap(h => h.items.map(i => ({ ...i, hubColor: h.color, hubName: h.name })));
  const filtered = search
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[28px] animate-in slide-in-from-bottom duration-300 max-h-[88vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-xl font-bold text-foreground">Acesso Rápido</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar funcionalidade..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-2xl bg-muted/60 border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-10 overscroll-contain">
          {filtered ? (
            <div className="grid grid-cols-4 gap-3 mt-1">
              {filtered.map(item => (
                <button key={item.path} onClick={() => handleNavigate(item.path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl active:scale-95 transition-all hover:bg-muted/50">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" 
                    style={{ backgroundColor: item.hubColor + '14' }}>
                    <item.icon className="h-5 w-5" style={{ color: item.hubColor }} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">{item.label}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-4 text-center py-12 text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          ) : (
            hubs.map(hub => (
              <div key={hub.name} className="mb-6">
                {/* Hub header */}
                <div className="flex items-center gap-2 mb-3 px-0.5">
                  <span className="text-sm">{hub.emoji}</span>
                  <h3 className="text-[13px] font-bold uppercase tracking-widest text-foreground">
                    {hub.name}
                  </h3>
                  <div className="flex-1 h-px ml-1" style={{ backgroundColor: hub.color + '20' }} />
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-4 gap-2">
                  {hub.items.map(item => (
                    <button key={item.path} onClick={() => handleNavigate(item.path)}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-2xl active:scale-95 transition-all hover:bg-muted/50">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" 
                        style={{ backgroundColor: hub.color + '12' }}>
                        <item.icon className="h-[22px] w-[22px]" style={{ color: hub.color }} />
                      </div>
                      <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMegaMenu;
