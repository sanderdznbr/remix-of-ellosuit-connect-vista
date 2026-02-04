import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, Mail, Home, Users, FileText, Settings, Video,
  CheckSquare, MessageSquare, Bot, Zap, BarChart3, Menu, Shield,
  HelpCircle, FolderOpen, Eye, Search, X, Link2, PlayCircle, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icon mapping
const iconMap: Record<string, any> = {
  Home, Calendar, Mail, Users, FileText, Settings, Video, CheckSquare,
  MessageSquare, Bot, Zap, BarChart3, Shield, HelpCircle, FolderOpen, 
  Eye, Link2, PlayCircle, Palette
};

// Menu sections with colors matching the screenshot
const MENU_SECTIONS = [
  {
    id: 'sistema',
    label: 'SISTEMA',
    items: [
      { id: 'dashboard', path: '/dashboard', icon: 'Home', label: 'Início', color: 'bg-blue-500' },
      { id: 'agenda', path: '/dashboard/agenda', icon: 'Calendar', label: 'Agenda', color: 'bg-blue-500' },
      { id: 'email-padrao', path: '/dashboard/email', icon: 'Mail', label: 'Email', color: 'bg-blue-500' },
      { id: 'clientes', path: '/dashboard/clientes', icon: 'Users', label: 'Clientes', color: 'bg-blue-500' },
      { id: 'arquivos', path: '/dashboard/drive', icon: 'FolderOpen', label: 'Drive', color: 'bg-blue-500' },
    ]
  },
  {
    id: 'reunioes',
    label: 'REUNIÕES',
    items: [
      { id: 'ello-meetings', path: '/dashboard/reunioes', icon: 'Video', label: 'Reuniões', color: 'bg-blue-600' },
      { id: 'agenda-online', path: '/dashboard/agenda-aberta', icon: 'Calendar', label: 'Agenda Aberta', color: 'bg-blue-600' },
    ]
  },
  {
    id: 'rastreamento',
    label: 'RASTREAMENTO',
    items: [
      { id: 'rastrear-pdf', path: '/dashboard/rastreamento', icon: 'FileText', label: 'Rastrear Docs', color: 'bg-orange-500' },
      { id: 'rastrear-link', path: '/dashboard/rastreamento-link', icon: 'Link2', label: 'Rastrear Links', color: 'bg-orange-500' },
      { id: 'rastrear-video', path: '/dashboard/rastreamento-video', icon: 'PlayCircle', label: 'Rastrear Vídeos', color: 'bg-orange-500' },
    ]
  },
  {
    id: 'analise',
    label: 'ANÁLISE',
    items: [
      { id: 'ello-vision', path: '/dashboard/ello-vision', icon: 'Eye', label: 'Ello Vision', color: 'bg-purple-500' },
      { id: 'analytics', path: '/dashboard/analytics', icon: 'BarChart3', label: 'Analytics', color: 'bg-purple-500' },
      { id: 'relatorios', path: '/dashboard/relatorios', icon: 'FileText', label: 'Relatórios', color: 'bg-purple-500' },
    ]
  },
  {
    id: 'ferramentas',
    label: 'FERRAMENTAS',
    items: [
      { id: 'tarefas', path: '/dashboard/tasks', icon: 'CheckSquare', label: 'Tarefas', color: 'bg-green-500' },
      { id: 'fluxos', path: '/dashboard/fluxos', icon: 'Zap', label: 'Fluxos', color: 'bg-green-500' },
      { id: 'agentes-ia', path: '/dashboard/bot-ia', icon: 'Bot', label: 'Agentes IA', color: 'bg-violet-500' },
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: 'MessageSquare', label: 'WhatsApp CRM', color: 'bg-green-600' },
    ]
  },
  {
    id: 'configuracoes',
    label: 'CONFIGURAÇÕES',
    items: [
      { id: 'config', path: '/dashboard/configuracoes', icon: 'Settings', label: 'Config', color: 'bg-gray-500' },
      { id: 'personalizacao', path: '/dashboard/personalizar', icon: 'Palette', label: 'Personalizar', color: 'bg-gray-500' },
      { id: 'seguranca', path: '/dashboard/seguranca', icon: 'Shield', label: 'Segurança', color: 'bg-gray-500' },
      { id: 'suporte', path: '/dashboard/suporte', icon: 'HelpCircle', label: 'Suporte', color: 'bg-gray-500' },
    ]
  }
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Filter items based on search
  const filteredSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="w-full max-w-md p-0 bg-white border-none"
        style={{ zIndex: 100 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Menu Rápido</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar funcionalidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 border-0 rounded-xl h-11 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Menu Sections */}
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="px-4 py-4 space-y-6">
            {filteredSections.map(section => (
              <div key={section.id}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.label}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {section.items.map(item => {
                    const IconComponent = iconMap[item.icon] || Home;
                    const active = isActive(item.path);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.path)}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
                          active 
                            ? `${item.color} shadow-lg scale-105` 
                            : `${item.color} opacity-80 group-hover:opacity-100 group-hover:scale-110`
                        )}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <span className={cn(
                          "text-xs font-medium text-center leading-tight max-w-[70px]",
                          active ? "text-gray-900" : "text-gray-600"
                        )}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
