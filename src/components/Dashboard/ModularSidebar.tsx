import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Calendar, Mail, Home, Users, FileText, Settings, Video,
  CheckSquare, MessageSquare, Bot, Zap, BarChart3, Menu, Shield,
  HelpCircle, ChevronRight, FolderOpen, Radio, Sparkles, GripVertical, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Icon mapping
const iconMap: Record<string, any> = {
  Home, Calendar, Mail, Users, FileText, Settings, Video, CheckSquare,
  MessageSquare, Bot, Zap, BarChart3, Shield, HelpCircle, FolderOpen, Radio, Sparkles, Eye
};

// Default menu groups
const DEFAULT_MENU_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'Home',
    items: [
      { id: 'home', path: '/dashboard', icon: 'Home', label: 'Home' }
    ]
  },
  {
    id: 'inteligencia-artificial',
    label: 'Inteligência Artificial',
    icon: 'Sparkles',
    items: [
      { id: 'agentes-ia', path: '/dashboard/bot-ia', icon: 'Bot', label: 'Agentes de IA' }
    ]
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    icon: 'MessageSquare',
    items: [
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: 'MessageSquare', label: 'CRM WhatsApp' },
      { id: 'email', path: '/dashboard/email', icon: 'Mail', label: 'Email Marketing' },
      { id: 'email-tracker', path: '/dashboard/email-tracker', icon: 'Eye', label: 'Rastrear Emails' }
    ]
  },
  {
    id: 'produtividade',
    label: 'Produtividade',
    icon: 'Calendar',
    items: [
      { id: 'agenda', path: '/dashboard/agenda', icon: 'Calendar', label: 'Agenda' },
      { id: 'agenda-aberta', path: '/dashboard/agenda-aberta', icon: 'Calendar', label: 'Agenda Online' },
      { id: 'tasks', path: '/dashboard/tasks', icon: 'CheckSquare', label: 'Tarefas' },
      { id: 'reunioes', path: '/dashboard/reunioes', icon: 'Video', label: 'Reuniões' },
      { id: 'fluxos', path: '/dashboard/fluxos', icon: 'Zap', label: 'Fluxos' }
    ]
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: 'Users',
    items: [
      { id: 'cadastros', path: '/dashboard/cadastros', icon: 'Users', label: 'Cadastros' },
      { id: 'arquivos', path: '/dashboard/drive', icon: 'FolderOpen', label: 'Arquivos' },
      { id: 'rastreamento', path: '/dashboard/rastreamento', icon: 'Radio', label: 'Rastreamento' }
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: 'BarChart3',
    items: [
      { id: 'analytics', path: '/dashboard/analytics', icon: 'BarChart3', label: 'Analytics' },
      { id: 'ello-vision', path: '/dashboard/ello-vision', icon: 'BarChart3', label: 'Ello Vision' },
      { id: 'relatorios', path: '/dashboard/relatorios', icon: 'FileText', label: 'Relatórios' }
    ]
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: 'Settings',
    items: [
      { id: 'preferencias', path: '/dashboard/configuracoes', icon: 'Settings', label: 'Preferências' },
      { id: 'seguranca', path: '/dashboard/seguranca', icon: 'Shield', label: 'Segurança' },
      { id: 'suporte', path: '/dashboard/suporte', icon: 'HelpCircle', label: 'Suporte' }
    ]
  }
];

interface SortableMenuGroupProps {
  group: typeof DEFAULT_MENU_GROUPS[0];
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

interface ModularSidebarProps {
  isMobile: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModularSidebar({ isMobile, isOpen = false, onOpenChange }: ModularSidebarProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [menuGroups, setMenuGroups] = useState(DEFAULT_MENU_GROUPS);
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
        .map(id => DEFAULT_MENU_GROUPS.find(g => g.id === id))
        .filter(Boolean) as typeof DEFAULT_MENU_GROUPS;
      
      // Add any missing groups at the end
      DEFAULT_MENU_GROUPS.forEach(group => {
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

  const hasActiveItemInGroup = (group: typeof DEFAULT_MENU_GROUPS[0]) => {
    return group.items.some(item => isActive(item.path));
  };

  const sidebarContent = (
    <div className="h-full flex" onMouseLeave={handleMouseLeave}>
      {/* Main icon strip */}
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

      {/* Expandable Panel */}
      <div 
        className={cn(
          "bg-primary/95 backdrop-blur-sm border-l border-white/10 overflow-hidden transition-all duration-200 ease-out",
          hoveredGroup ? "w-56 opacity-100" : "w-0 opacity-0"
        )}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
        }}
      >
        {hoveredGroup && (
          <div className="w-56 h-full flex flex-col animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="h-14 px-4 flex items-center border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">
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
                          ? "bg-white text-primary shadow-sm" 
                          : "text-white/80 hover:bg-white/10 hover:text-white"
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

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-auto p-0 bg-transparent border-none" style={{ zIndex: 100 }}>
          <div className="h-full">{sidebarContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="h-screen sticky top-0 flex">
      {sidebarContent}
    </div>
  );
}

export default ModularSidebar;
