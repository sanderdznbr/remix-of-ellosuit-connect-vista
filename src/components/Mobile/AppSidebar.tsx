import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Calendar, 
  Mail, 
  Home, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Video,
  CheckSquare,
  MessageSquare,
  Bot,
  Zap
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const menuGroups = [
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { id: 'home', path: '/dashboard', icon: Home, label: 'Dashboard' },
      { id: 'settings', path: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' }
    ]
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    items: [
      { id: 'calendar', path: '/dashboard/agenda', icon: Calendar, label: 'Agendamentos' },
      { id: 'agenda-aberta', path: '/dashboard/agenda-aberta', icon: Calendar, label: 'Agendamento Online' },
      { id: 'meetings', path: '/dashboard/reunioes', icon: Video, label: 'Reuniões Ello' }
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'email', path: '/dashboard/email', icon: Mail, label: 'Email Marketing' },
      { id: 'bot-ia', path: '/dashboard/bot-ia', icon: Bot, label: 'Agentes de IA' }
    ]
  },
  {
    id: 'producao',
    label: 'Produção',
    items: [
      { id: 'clients', path: '/dashboard/clientes', icon: Users, label: 'Contatos' },
      { id: 'documents', path: '/dashboard/drive', icon: FileText, label: 'Arquivos' },
      { id: 'tasks', path: '/dashboard/tasks', icon: CheckSquare, label: 'Tarefas' },
      { id: 'flows', path: '/dashboard/fluxos', icon: Zap, label: 'Fluxos de produção' },
      { id: 'crm-whatsapp', path: '/dashboard/crm-whatsapp', icon: MessageSquare, label: 'Whatsapp CRM' }
    ]
  },
  {
    id: 'rastreamento',
    label: 'Rastreamento',
    items: [
      { id: 'document-tracking', path: '/dashboard/rastreamento-documento', icon: FileText, label: 'Rastreamento de Documento' }
    ]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (active: boolean) => {
    return active 
      ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90" 
      : "hover:bg-gray-100 text-gray-700";
  };

  return (
    <Sidebar
      className={`${isCollapsed ? "w-14" : "w-64"} border-r`}
      style={{ backgroundColor: 'hsl(var(--primary))' }}
      collapsible="icon"
    >
      <SidebarContent className="bg-primary text-white">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          {isCollapsed ? (
            <Link to="/dashboard" className="flex items-center justify-center">
              <img 
                src="/lovable-uploads/331ff3c7-4d10-4f90-bfdf-ec5b94766b0d.png" 
                alt="ElloSuit" 
                className="h-8 w-8 object-contain filter brightness-0 invert"
                onError={(e) => {
                  console.error('Erro ao carregar favicon padrão:', e);
                }}
              />
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center">
              <img 
                src="/lovable-uploads/1ace337d-1080-46b1-b9e6-15dba227814c.png" 
                alt="ElloSuit Logo" 
                className="h-8 w-auto filter brightness-0 invert"
                onError={(e) => {
                  console.error('Erro ao carregar logo padrão:', e);
                }}
              />
            </Link>
          )}
        </div>

        {/* Menu Groups */}
        <div className="flex-1 overflow-y-auto">
          {menuGroups.map((group) => (
            <SidebarGroup key={group.id} className="px-2 py-2">
              {!isCollapsed && (
                <SidebarGroupLabel className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                  {group.label}
                </SidebarGroupLabel>
              )}
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton 
                          asChild 
                          className={`${getNavClassName(active)} transition-colors rounded-lg mx-1`}
                          style={active ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                        >
                          <Link to={item.path} className="flex items-center">
                            <IconComponent className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4 mr-3'} flex-shrink-0`} />
                            {!isCollapsed && <span className="truncate text-white">{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>

        {/* User Profile */}
        <div className="border-t border-white/10 p-3">
          {user && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-2`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {user.email?.substring(0, 2).toUpperCase() || 'US'}
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs text-white/70 truncate">
                    {user.email}
                  </p>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className={`text-white hover:bg-white/10 ${isCollapsed ? 'p-1' : 'p-2'}`}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}