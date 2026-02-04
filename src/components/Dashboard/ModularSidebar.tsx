import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar, Mail, Home, Users, FileText, Settings, Video,
  CheckSquare, MessageSquare, Bot, Zap, BarChart3, Menu, Shield,
  HelpCircle, ChevronRight, FolderOpen, Radio, Sparkles, GripVertical, Eye,
  Search, X, Link2, PlayCircle, Palette, AlertCircle, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ElloLogo } from "@/components/shared/ElloLogo";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import { UserProfileMenu } from "./UserProfileMenu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea } from "@/components/ui/scroll-area";

// Icon mapping
const iconMap: Record<string, any> = {
  Home, Calendar, Mail, Users, FileText, Settings, Video, CheckSquare,
  MessageSquare, Bot, Zap, BarChart3, Shield, HelpCircle, FolderOpen, Radio, 
  Sparkles, Eye, Link2, PlayCircle, Palette, AlertCircle, BookOpen
};

// Menu sections following the mind map structure
const MENU_SECTIONS = [
  {
    id: 'sistema',
    label: 'SISTEMA',
    color: 'bg-amber-500',
    items: [
      { id: 'dashboard', path: '/dashboard', icon: 'Home', label: 'Dashboard', color: 'bg-amber-500' },
      { id: 'usuarios', path: '/dashboard/funcionarios', icon: 'Users', label: 'Usuários', color: 'bg-amber-500' },
      { id: 'clientes', path: '/dashboard/clientes', icon: 'Users', label: 'Clientes', color: 'bg-amber-400' },
      { id: 'fornecedores', path: '/dashboard/fornecedores', icon: 'Users', label: 'Fornecedores', color: 'bg-amber-400' },
      { id: 'prospectos', path: '/dashboard/prospectos', icon: 'Users', label: 'Prospectos', color: 'bg-amber-400' },
      { id: 'agentes-ia', path: '/dashboard/bot-ia', icon: 'Bot', label: 'Agentes Ello IA', color: 'bg-violet-500' },
      { id: 'arquivos', path: '/dashboard/drive', icon: 'FolderOpen', label: 'Arquivos', color: 'bg-amber-500' },
    ]
  },
  {
    id: 'ello-flows',
    label: 'ELLO FLOWS',
    color: 'bg-teal-500',
    items: [
      { id: 'tarefas', path: '/dashboard/tasks', icon: 'CheckSquare', label: 'Tarefas', color: 'bg-teal-500' },
      { id: 'fluxos', path: '/dashboard/fluxos', icon: 'Zap', label: 'Fluxos de Produção', color: 'bg-teal-500' },
      { id: 'agenda', path: '/dashboard/agenda', icon: 'Calendar', label: 'Agenda', color: 'bg-teal-500' },
      { id: 'agenda-online', path: '/dashboard/agenda-aberta', icon: 'Calendar', label: 'Agenda Online', color: 'bg-teal-500' },
      { id: 'ello-meetings', path: '/dashboard/reunioes', icon: 'Video', label: 'Ello Meetings', color: 'bg-teal-500' },
    ]
  },
  {
    id: 'ello-omni',
    label: 'ELLO OMNI',
    color: 'bg-teal-600',
    items: [
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: 'MessageSquare', label: 'CRM WhatsApp', color: 'bg-green-500' },
      { id: 'email-padrao', path: '/dashboard/email', icon: 'Mail', label: 'Email padrão', color: 'bg-blue-500' },
      { id: 'email-marketing', path: '/dashboard/email-marketing', icon: 'Mail', label: 'Email marketing', color: 'bg-blue-600' },
    ]
  },
  {
    id: 'ello-track',
    label: 'ELLO TRACK',
    color: 'bg-teal-500',
    items: [
      { id: 'rastrear-pdf', path: '/dashboard/rastreamento', icon: 'FileText', label: 'Rastreamento de PDF', color: 'bg-teal-500' },
      { id: 'rastrear-link', path: '/dashboard/rastreamento-link', icon: 'Link2', label: 'Rastreamento de Link', color: 'bg-teal-500' },
      { id: 'rastrear-video', path: '/dashboard/rastreamento-video', icon: 'PlayCircle', label: 'Rastreamento de Vídeo', color: 'bg-teal-500' },
    ]
  },
  {
    id: 'analise-relatorio',
    label: 'ANÁLISE & RELATÓRIO',
    color: 'bg-violet-500',
    items: [
      { id: 'ello-vision', path: '/dashboard/ello-vision', icon: 'Eye', label: 'Ello Vision', color: 'bg-violet-500' },
      { id: 'analytics', path: '/dashboard/analytics', icon: 'BarChart3', label: 'Análises', color: 'bg-violet-500' },
      { id: 'relatorios', path: '/dashboard/relatorios', icon: 'FileText', label: 'Relatórios', color: 'bg-violet-500' },
    ]
  },
  {
    id: 'ajuda-suporte',
    label: 'AJUDA & SUPORTE',
    color: 'bg-violet-400',
    items: [
      { id: 'suporte', path: '/dashboard/suporte', icon: 'HelpCircle', label: 'Suporte', color: 'bg-violet-400' },
      { id: 'reportar', path: '/dashboard/reportar-problema', icon: 'AlertCircle', label: 'Reporte um problema', color: 'bg-violet-400' },
      { id: 'termos', path: '/termos', icon: 'BookOpen', label: 'Termos & Políticas', color: 'bg-violet-400' },
    ]
  },
  {
    id: 'configuracoes',
    label: 'CONFIGURAÇÕES & PRIVACIDADE',
    color: 'bg-blue-500',
    items: [
      { id: 'config', path: '/dashboard/configuracoes', icon: 'Settings', label: 'Configurações', color: 'bg-blue-500' },
      { id: 'personalizacao', path: '/dashboard/personalizar', icon: 'Palette', label: 'Personalização', color: 'bg-blue-500' },
      { id: 'seguranca', path: '/dashboard/seguranca', icon: 'Shield', label: 'Segurança & Privacidade', color: 'bg-blue-500' },
    ]
  }
];

// Desktop menu groups for icon strip
const DESKTOP_MENU_GROUPS = [
  {
    id: 'sistema',
    label: 'Sistema',
    icon: 'Home',
    items: [
      { id: 'dashboard', path: '/dashboard', icon: 'Home', label: 'Dashboard' },
      { id: 'usuarios', path: '/dashboard/funcionarios', icon: 'Users', label: 'Usuários' },
      { id: 'clientes', path: '/dashboard/clientes', icon: 'Users', label: 'Clientes' },
      { id: 'fornecedores', path: '/dashboard/fornecedores', icon: 'Users', label: 'Fornecedores' },
      { id: 'prospectos', path: '/dashboard/prospectos', icon: 'Users', label: 'Prospectos' },
      { id: 'agentes-ia', path: '/dashboard/bot-ia', icon: 'Bot', label: 'Agentes Ello IA' },
      { id: 'arquivos', path: '/dashboard/drive', icon: 'FolderOpen', label: 'Arquivos' },
    ]
  },
  {
    id: 'ello-flows',
    label: 'Ello Flows',
    icon: 'Zap',
    items: [
      { id: 'tarefas', path: '/dashboard/tasks', icon: 'CheckSquare', label: 'Tarefas' },
      { id: 'fluxos', path: '/dashboard/fluxos', icon: 'Zap', label: 'Fluxos de Produção' },
      { id: 'agenda', path: '/dashboard/agenda', icon: 'Calendar', label: 'Agenda' },
      { id: 'agenda-online', path: '/dashboard/agenda-aberta', icon: 'Calendar', label: 'Agenda Online' },
      { id: 'ello-meetings', path: '/dashboard/reunioes', icon: 'Video', label: 'Ello Meetings' },
    ]
  },
  {
    id: 'ello-omni',
    label: 'Ello Omni',
    icon: 'MessageSquare',
    items: [
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: 'MessageSquare', label: 'CRM WhatsApp' },
      { id: 'email-padrao', path: '/dashboard/email', icon: 'Mail', label: 'Email padrão' },
      { id: 'email-marketing', path: '/dashboard/email-marketing', icon: 'Mail', label: 'Email marketing' },
    ]
  },
  {
    id: 'ello-track',
    label: 'Ello Track',
    icon: 'Radio',
    items: [
      { id: 'rastrear-pdf', path: '/dashboard/rastreamento', icon: 'FileText', label: 'Rastreamento de PDF' },
      { id: 'rastrear-link', path: '/dashboard/rastreamento-link', icon: 'Link2', label: 'Rastreamento de Link' },
      { id: 'rastrear-video', path: '/dashboard/rastreamento-video', icon: 'PlayCircle', label: 'Rastreamento de Vídeo' },
    ]
  },
  {
    id: 'analise-relatorio',
    label: 'Análise & Relatório',
    icon: 'BarChart3',
    items: [
      { id: 'ello-vision', path: '/dashboard/ello-vision', icon: 'Eye', label: 'Ello Vision' },
      { id: 'analytics', path: '/dashboard/analytics', icon: 'BarChart3', label: 'Análises' },
      { id: 'relatorios', path: '/dashboard/relatorios', icon: 'FileText', label: 'Relatórios' },
    ]
  },
  {
    id: 'ajuda-suporte',
    label: 'Ajuda & Suporte',
    icon: 'HelpCircle',
    items: [
      { id: 'suporte', path: '/dashboard/suporte', icon: 'HelpCircle', label: 'Suporte' },
      { id: 'reportar', path: '/dashboard/reportar-problema', icon: 'AlertCircle', label: 'Reporte um problema' },
      { id: 'termos', path: '/termos', icon: 'BookOpen', label: 'Termos & Políticas' },
    ]
  },
  {
    id: 'configuracoes',
    label: 'Configurações & Privacidade',
    icon: 'Settings',
    items: [
      { id: 'config', path: '/dashboard/configuracoes', icon: 'Settings', label: 'Configurações' },
      { id: 'personalizacao', path: '/dashboard/personalizar', icon: 'Palette', label: 'Personalização' },
      { id: 'seguranca', path: '/dashboard/seguranca', icon: 'Shield', label: 'Segurança & Privacidade' },
    ]
  }
];

interface SortableMenuGroupProps {
  group: typeof DESKTOP_MENU_GROUPS[0];
  isHovered: boolean;
  hasActive: boolean;
  onHover: (id: string) => void;
  isEditMode: boolean;
}

function SortableMenuGroup({ group, isHovered, hasActive, onHover, isEditMode }: SortableMenuGroupProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = iconMap[group.icon] || Home;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
      onMouseEnter={() => onHover(group.id)}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 mb-1",
                isHovered 
                  ? "bg-white text-primary shadow-lg scale-105" 
                  : hasActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                isDragging && "cursor-grabbing"
              )}
              {...(isEditMode ? { ...attributes, ...listeners } : {})}
            >
              {isEditMode ? (
                <GripVertical className="h-5 w-5" />
              ) : (
                <IconComponent className="h-5 w-5" />
              )}
            </button>
          </TooltipTrigger>
          {!isHovered && (
            <TooltipContent side="right" className="rounded-lg font-medium">
              {group.label}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
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

  // Filter items based on search
  const filteredSections = MENU_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

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

        {/* Search */}
        <div className="p-4">
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
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="px-4 pb-6 space-y-6">
            {filteredSections.map(section => (
              <div key={section.id}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                          active 
                            ? `${item.color} shadow-lg` 
                            : `${item.color} opacity-90 group-hover:opacity-100 group-hover:scale-105`
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

interface ModularSidebarProps {
  isMobile: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModularSidebar({ isMobile, isOpen = false, onOpenChange }: ModularSidebarProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [menuGroups, setMenuGroups] = useState(DESKTOP_MENU_GROUPS);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  const { user } = useAuth();
  const { settings, updateSettings } = useSidebarSettings();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved order from settings
  useEffect(() => {
    if (settings.menu_order && settings.menu_order.length > 0) {
      const orderedGroups = settings.menu_order
        .map(id => DESKTOP_MENU_GROUPS.find(g => g.id === id))
        .filter(Boolean) as typeof DESKTOP_MENU_GROUPS;
      
      // Add any missing groups at the end
      DESKTOP_MENU_GROUPS.forEach(group => {
        if (!orderedGroups.find(g => g.id === group.id)) {
          orderedGroups.push(group);
        }
      });
      
      setMenuGroups(orderedGroups);
    }
  }, [settings.menu_order]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMenuGroups((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save new order
        updateSettings({ menu_order: newOrder.map(g => g.id) });
        
        return newOrder;
      });
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    setHoveredGroup(null);
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleMouseEnter = (groupId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredGroup(groupId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 150);
  };

  const hasActiveItemInGroup = (group: typeof DESKTOP_MENU_GROUPS[0]) => {
    return group.items.some(item => isActive(item.path));
  };

  // Mobile: Use new quick menu
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

  // Desktop: Keep icon strip sidebar
  const sidebarContent = (
    <div className="h-full flex" onMouseLeave={handleMouseLeave}>
      {/* Main icon strip - BLUE */}
      <div className="w-16 bg-primary flex flex-col h-full">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-white/10">
          <Link to="/dashboard" onClick={handleLinkClick}>
            <ElloLogo className="h-7 w-auto" color="white" />
          </Link>
        </div>

        {/* Menu Group Icons with DnD */}
        <div className="flex-1 py-2 flex flex-col items-center overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={menuGroups.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {menuGroups.map((group) => (
                <SortableMenuGroup
                  key={group.id}
                  group={group}
                  isHovered={hoveredGroup === group.id}
                  hasActive={hasActiveItemInGroup(group)}
                  onHover={handleMouseEnter}
                  isEditMode={isEditMode}
                />
              ))}
            </SortableContext>
          </DndContext>
          
          {/* Edit mode toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center mt-2 transition-colors",
              isEditMode 
                ? "bg-white text-primary" 
                : "text-white/50 hover:bg-white/10 hover:text-white"
            )}
            title={isEditMode ? "Salvar ordem" : "Reordenar menu"}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        {/* User Avatar with Profile Menu */}
        <div className="py-3 flex flex-col items-center border-t border-white/10">
          <UserProfileMenu onLinkClick={handleLinkClick} />
        </div>
      </div>

      {/* Expandable Panel - Light */}
      <div 
        className={cn(
          "bg-white border-l border-gray-200 overflow-hidden transition-all duration-200 ease-out shadow-lg",
          hoveredGroup ? "w-60 opacity-100" : "w-0 opacity-0"
        )}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
        }}
      >
        {hoveredGroup && (
          <div className="w-60 h-full flex flex-col animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="h-14 px-4 flex items-center border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">
                {menuGroups.find(g => g.id === hoveredGroup)?.label}
              </h3>
            </div>

            <div className="flex-1 py-2 px-2">
              <nav className="space-y-1">
                {menuGroups.find(g => g.id === hoveredGroup)?.items.map((item) => {
                  const ItemIcon = iconMap[item.icon] || Home;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        active 
                          ? "bg-primary text-white shadow-sm" 
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <ItemIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen sticky top-0 flex">
      {sidebarContent}
    </div>
  );
}

export default ModularSidebar;
