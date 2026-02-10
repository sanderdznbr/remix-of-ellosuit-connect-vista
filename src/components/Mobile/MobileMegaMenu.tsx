import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search,
  MessageSquare, Mail, Users, Phone, Key,
  Calendar, Video, CheckSquare, FolderOpen, Zap, CalendarClock, Bot,
  FileText, Link, Play, Eye, BarChart3,
  Shield, HelpCircle, Settings, CreditCard
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MobileMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const hubs = [
  {
    name: 'Omni',
    color: '#FF4500',
    items: [
      { icon: MessageSquare, label: 'WhatsApp CRM', path: '/dashboard/crm-whatsapp' },
      { icon: Key, label: 'API WhatsApp', path: '/dashboard/api-whatsapp' },
      { icon: Mail, label: 'Email', path: '/dashboard/email' },
      { icon: Users, label: 'Clientes', path: '/dashboard/cadastros' },
      { icon: Phone, label: 'Contatos', path: '/dashboard/contatos' },
    ],
  },
  {
    name: 'Flow',
    color: '#007DE3',
    items: [
      { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda' },
      { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes' },
      { icon: CalendarClock, label: 'Agenda Aberta', path: '/dashboard/agenda-aberta' },
      { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks' },
      { icon: FolderOpen, label: 'Drive', path: '/dashboard/drive' },
      { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos' },
      { icon: Bot, label: 'Agentes', path: '/dashboard/bot-ia' },
    ],
  },
  {
    name: 'Track',
    color: '#00E371',
    items: [
      { icon: FileText, label: 'Rastrear Docs', path: '/dashboard/rastreamento-documento' },
      { icon: Link, label: 'Rastrear Links', path: '/dashboard/rastreamento-link' },
      { icon: Play, label: 'Rastrear Vídeos', path: '/dashboard/rastreamento-video' },
      { icon: Eye, label: 'Ello Vision', path: '/dashboard/ello-vision' },
      { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
    ],
  },
  {
    name: 'Suite',
    color: '#3000E3',
    items: [
      { icon: Users, label: 'Equipe', path: '/dashboard/equipe' },
      { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes' },
      { icon: CreditCard, label: 'Assinatura', path: '/dashboard/assinatura' },
      { icon: Shield, label: 'Segurança', path: '/dashboard/seguranca' },
      { icon: HelpCircle, label: 'Suporte', path: '/dashboard/suporte' },
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Acesso Rápido</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-muted border-0" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {filtered ? (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {filtered.map(item => (
                <button key={item.path} onClick={() => handleNavigate(item.path)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl active:scale-95 transition-all">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: item.hubColor + '18' }}>
                    <item.icon className="h-5 w-5" style={{ color: item.hubColor }} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight">{item.label}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-4 text-center py-8 text-sm text-muted-foreground">Nenhum resultado</div>
              )}
            </div>
          ) : (
            hubs.map(hub => (
              <div key={hub.name} className="mb-5">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hub.color }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: hub.color }}>
                    {hub.name}
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {hub.items.map(item => (
                    <button key={item.path} onClick={() => handleNavigate(item.path)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all">
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: hub.color + '15' }}>
                        <item.icon className="h-5 w-5" style={{ color: hub.color }} />
                      </div>
                      <span className="text-[10px] font-medium text-foreground text-center leading-tight">{item.label}</span>
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
