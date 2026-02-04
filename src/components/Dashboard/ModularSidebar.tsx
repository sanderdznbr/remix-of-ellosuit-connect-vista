import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, Mail, Home, Users, FileText, Settings, Video,
  CheckSquare, MessageSquare, Bot, Zap, BarChart3, Menu, Shield,
  HelpCircle, ChevronRight, FolderOpen, Radio, Sparkles, Eye,
  Search, X, Link2, PlayCircle, Palette, AlertCircle, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ElloLogo } from "@/components/shared/ElloLogo";
import { UserProfileMenu } from "./UserProfileMenu";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icon mapping
const iconMap: Record<string, any> = {
  Home, Calendar, Mail, Users, FileText, Settings, Video, CheckSquare,
  MessageSquare, Bot, Zap, BarChart3, Shield, HelpCircle, FolderOpen, Radio, 
  Sparkles, Eye, Link2, PlayCircle, Palette, AlertCircle, BookOpen
};

// Menu sections with colors
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

// Quick access icons for collapsed state
const QUICK_ICONS = [
  { id: 'home', path: '/dashboard', icon: 'Home' },
  { id: 'agenda', path: '/dashboard/agenda', icon: 'Calendar' },
  { id: 'email', path: '/dashboard/email', icon: 'Mail' },
  { id: 'meetings', path: '/dashboard/reunioes', icon: 'Video' },
  { id: 'tasks', path: '/dashboard/tasks', icon: 'CheckSquare' },
  { id: 'analytics', path: '/dashboard/analytics', icon: 'BarChart3' },
  { id: 'settings', path: '/dashboard/configuracoes', icon: 'Settings' },
];

// Shared Quick Menu Content Component
function QuickMenuContent({ 
  searchQuery, 
  setSearchQuery, 
  onNavigate, 
  isActive 
}: { 
  searchQuery: string; 
  setSearchQuery: (q: string) => void;
  onNavigate: (path: string) => void;
  isActive: (path: string) => boolean;
}) {
  // Filter items based on search
  const filteredSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <>
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
      <ScrollArea className="flex-1">
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
                      onClick={() => onNavigate(item.path)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                        active 
                          ? `${item.color} shadow-lg ring-2 ring-offset-2 ring-${item.color.replace('bg-', '')}` 
                          : `${item.color} opacity-80 group-hover:opacity-100 group-hover:scale-110`
                      )}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium text-center leading-tight max-w-[60px]",
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
    </>
  );
}

// Mobile Quick Menu Component
function MobileQuickMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full max-w-md p-0 bg-white border-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Menu Rápido</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <QuickMenuContent 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigate={handleNavigate}
          isActive={isActive}
        />
      </SheetContent>
    </Sheet>
  );
}

interface ModularSidebarProps {
  isMobile: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModularSidebar({ isMobile, isOpen = false, onOpenChange }: ModularSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsHovered(false);
    setSearchQuery('');
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setSearchQuery('');
    }, 200);
  };

  // Mobile: Use sheet menu
  if (isMobile) {
    return (
      <>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10 rounded-xl"
          onClick={() => onOpenChange?.(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <MobileQuickMenu isOpen={isOpen} onClose={() => onOpenChange?.(false)} />
      </>
    );
  }

  // Desktop: Expandable sidebar
  return (
    <div 
      className="h-screen sticky top-0 flex z-40"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed Icon Strip */}
      <div className={cn(
        "w-16 bg-primary flex flex-col h-full transition-all duration-300",
        isHovered && "opacity-0 pointer-events-none absolute"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-white/10">
          <Link to="/dashboard">
            <ElloLogo className="h-7 w-auto" color="white" />
          </Link>
        </div>

        {/* Quick Icons */}
        <div className="flex-1 py-3 flex flex-col items-center gap-1">
          {QUICK_ICONS.map((item) => {
            const IconComponent = iconMap[item.icon] || Home;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                  active 
                    ? "bg-white text-primary shadow-lg" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <IconComponent className="h-5 w-5" />
              </Link>
            );
          })}
        </div>

        {/* User Avatar */}
        <div className="py-3 flex flex-col items-center border-t border-white/10">
          <UserProfileMenu onLinkClick={() => {}} />
        </div>
      </div>

      {/* Expanded Panel - Quick Menu Style */}
      <div 
        className={cn(
          "bg-white shadow-2xl overflow-hidden transition-all duration-300 ease-out flex flex-col",
          isHovered ? "w-80 opacity-100" : "w-16 opacity-100"
        )}
      >
        {/* Header with Logo */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 bg-primary">
          <Link to="/dashboard" className="flex items-center gap-2">
            <ElloLogo className="h-7 w-auto" color="white" />
          </Link>
          {isHovered && (
            <span className="text-white/90 text-sm font-medium">Menu Rápido</span>
          )}
        </div>

        {isHovered ? (
          <QuickMenuContent 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNavigate={handleNavigate}
            isActive={isActive}
          />
        ) : (
          // Collapsed state - show icons only
          <div className="flex-1 py-3 flex flex-col items-center gap-1">
            {QUICK_ICONS.map((item) => {
              const IconComponent = iconMap[item.icon] || Home;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                    active 
                      ? "bg-primary text-white shadow-lg" 
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        )}

        {/* User Profile at bottom */}
        <div className={cn(
          "py-3 border-t border-gray-100 flex items-center justify-center",
          isHovered ? "px-4" : ""
        )}>
          {isHovered ? (
            <div className="flex items-center gap-3 w-full">
              <UserProfileMenu onLinkClick={() => setIsHovered(false)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <UserProfileMenu onLinkClick={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ModularSidebar;
