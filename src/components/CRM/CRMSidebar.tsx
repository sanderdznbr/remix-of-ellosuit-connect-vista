import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Bot, 
  Users, 
  GitBranch, 
  LayoutGrid, 
  List, 
  Tag, 
  Megaphone, 
  Home,
  Settings,
  LogOut
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ElloLogo } from '@/components/shared/ElloLogo';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CRMSidebarProps {
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Dashboard', path: '/dashboard' },
  { id: 'crm', icon: MessageSquare, label: 'CRM WhatsApp', path: '/dashboard/crm-whatsapp', active: true },
  { id: 'chatbot', icon: GitBranch, label: 'Chatbot Builder', path: '/dashboard/chatbot' },
  { id: 'agents', icon: Bot, label: 'Agentes de IA', path: '/dashboard/bot-ia' },
  { id: 'contacts', icon: Users, label: 'Contatos', path: '/dashboard/cadastros' },
  { id: 'disparos', icon: Megaphone, label: 'Disparos em Massa', path: '/dashboard/disparos' },
  { id: 'automacoes', icon: Settings, label: 'Automações', path: '/dashboard/automacoes' },
];

const CRMSidebar: React.FC<CRMSidebarProps> = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-16 h-full flex flex-col bg-[#FF4500] shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-white/10">
        <Link to="/dashboard">
          <ElloLogo className="h-7 w-auto" color="white" />
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-3 flex flex-col items-center gap-1">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
                      item.active
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* User & Logout */}
      <div className="py-3 flex flex-col items-center border-t border-white/10">
        {user && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 mb-2 cursor-pointer">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {user.email?.substring(0, 2).toUpperCase() || 'US'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" className="rounded-lg">
                <p className="font-medium">{user.user_metadata?.full_name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="rounded-lg">
              Sair
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default CRMSidebar;
