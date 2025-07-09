
import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  TrendingUp, 
  FileText, 
  Users, 
  FolderOpen,
  Calendar,
  Video,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onItemClick: (item: string) => void;
}

const Sidebar = ({ isCollapsed, onToggle, activeItem, onItemClick }: SidebarProps) => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Extrair dados do usuário
  const userEmail = user?.email || '';
  const userMetadata = user?.user_metadata || {};
  const username = userMetadata.username || userMetadata.company_name || userEmail.split('@')[0];
  const displayName = username.length > 15 ? username.substring(0, 15) + '...' : username;
  const initials = username.substring(0, 2).toUpperCase();

  const menuSections = [
    {
      title: 'Email',
      items: [
        { id: 'mail-tracking', label: 'Rastreamento', icon: Mail },
        { id: 'campaign-mail', label: 'Campanhas', icon: Send },
        { id: 'mail-productivity', label: 'Produtividade', icon: TrendingUp },
        { id: 'templates', label: 'Modelos', icon: FileText },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'documents', label: 'Documentos', icon: FolderOpen },
      ]
    },
    {
      title: 'Agenda',
      items: [
        { id: 'my-calendar', label: 'Meu Calendário', icon: Calendar },
        { id: 'start-meet', label: 'Iniciar Meet', icon: Video },
        { id: 'my-meetings', label: 'Minhas Reuniões', icon: Calendar },
        { id: 'analytics', label: 'Análises', icon: BarChart3 },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'team', label: 'Equipe', icon: Users },
        { id: 'whatsapp-api', label: 'API WhatsApp', icon: MessageCircle },
        { id: 'settings', label: 'Configurações', icon: Settings },
        { id: 'test-secrets', label: '🔍 Teste Secrets', icon: Settings },
      ]
    }
  ];

  const handleItemClick = (itemId: string) => {
    console.log('🖱️ Item clicado na sidebar:', itemId);
    
    // Itens que têm páginas implementadas
    const implementedItems = [
      'mail-tracking', 
      'campaign-mail', 
      'mail-productivity', 
      'templates',
      'my-calendar', 
      'my-meetings',
      'start-meet',
      'documents', 
      'clients', 
      'analytics',
      'settings',
      'team',
      'test-secrets'
    ];
    
    if (implementedItems.includes(itemId)) {
      console.log('✅ Navegando para:', itemId);
      onItemClick(itemId);
    } else {
      console.log('⚠️ Função em desenvolvimento para:', itemId);
      alert('Função em desenvolvimento');
    }
  };

  const handleLogout = async () => {
    // Prevenir múltiplas chamadas
    if (isLoggingOut) {
      console.log('⏳ Logout já em andamento, ignorando clique');
      return;
    }

    setIsLoggingOut(true);
    
    try {
      console.log('👋 Iniciando logout...');
      const { error } = await signOut();
      
      if (error) {
        console.error('❌ Erro no logout:', error);
        toast({
          title: "Erro",
          description: "Erro ao fazer logout: " + error.message,
          variant: "destructive"
        });
      } else {
        console.log('✅ Logout realizado com sucesso');
        toast({
          title: "Sucesso",
          description: "Logout realizado com sucesso!"
        });
      }
    } catch (error) {
      console.error('💥 Erro inesperado no logout:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer logout",
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`bg-[#3600FF] text-white transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <img 
            src="/lovable-uploads/78d0576b-d7ba-4f41-b1ac-30929441fa41.png" 
            alt="Ellosuit Logo" 
            className="h-8 w-auto"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-white/10"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Menu Sections */}
      <div className="flex-1 px-2">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className="mb-6">
            {!isCollapsed && (
              <h3 className="text-sm font-medium text-white/70 mb-3 px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#3200EA] text-white' 
                        : 'text-white/80 hover:bg-[#3200EA] hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Section */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{initials}</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={username}>{displayName}</p>
              <p className="text-xs text-white/70 truncate" title={userEmail}>{userEmail}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 disabled:opacity-50"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isLoggingOut ? "Fazendo logout..." : "Logout"}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
