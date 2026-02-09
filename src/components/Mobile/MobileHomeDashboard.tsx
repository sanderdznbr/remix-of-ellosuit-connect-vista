import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Mail, Users, Video, FileText, CheckSquare, MessageSquare,
  Bot, Zap, BarChart3, Clock, CalendarDays, TrendingUp, ArrowRight,
  FolderOpen, Eye, Link2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const quickActions = [
  { icon: Video, label: 'Reunião', path: '/dashboard/reunioes', color: '#6366F1' },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', color: '#007DE3' },
  { icon: Mail, label: 'Email', path: '/dashboard/email', color: '#10B981' },
  { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/crm-whatsapp', color: '#25D366' },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', color: '#EC4899' },
  { icon: FolderOpen, label: 'Arquivos', path: '/dashboard/drive', color: '#F59E0B' },
  { icon: Bot, label: 'IA', path: '/dashboard/bot-ia', color: '#8B5CF6' },
  { icon: BarChart3, label: 'Análises', path: '/dashboard/analytics', color: '#F97316' },
];

const hubCards = [
  { 
    label: 'Ello Omni', 
    description: 'Comunicação e CRM',
    path: '/dashboard/omni', 
    color: '#FF4500',
    icon: MessageSquare 
  },
  { 
    label: 'Ello Flow', 
    description: 'Produtividade',
    path: '/dashboard/flows', 
    color: '#007DE3',
    icon: Zap 
  },
  { 
    label: 'Ello Track', 
    description: 'Rastreamento',
    path: '/dashboard/track', 
    color: '#00E371',
    icon: Eye 
  },
  { 
    label: 'Ello Suite', 
    description: 'Gestão e Dados',
    path: '/dashboard/suite', 
    color: '#3000E3',
    icon: Users 
  },
];

interface MobileHomeDashboardProps {
  onNavigate: (item: string) => void;
}

const MobileHomeDashboard: React.FC<MobileHomeDashboardProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    meetingsToday: 0,
    nextEvent: null as any,
    totalClients: 0,
    pendingTasks: 0,
  });

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const { data: cu } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1);
    if (!cu?.length) return;
    const companyId = cu[0].company_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [meetingsRes, nextEventRes, clientsRes] = await Promise.all([
      supabase.from('meeting_rooms').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('is_active', true)
        .gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
      supabase.from('calendar_events').select('*')
        .eq('company_id', companyId).gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true }).limit(1),
      supabase.from('clients').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
    ]);

    setStats({
      meetingsToday: meetingsRes.count || 0,
      nextEvent: nextEventRes.data?.[0] || null,
      totalClients: clientsRes.count || 0,
      pendingTasks: 0,
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return `Hoje, ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Amanhã, ${format(date, 'HH:mm')}`;
    return format(date, "dd MMM, HH:mm", { locale: ptBR });
  };

  return (
    <div className="px-4 pt-4 pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground">{getGreeting()} 👋</p>
        <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
      </div>

      {/* Next Event Banner */}
      {stats.nextEvent && (
        <button
          onClick={() => navigate('/dashboard/agenda')}
          className="w-full p-4 rounded-2xl bg-primary text-primary-foreground text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs opacity-80">Próximo compromisso</p>
                <p className="font-semibold text-sm truncate max-w-[200px]">{stats.nextEvent.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{formatEventDate(stats.nextEvent.start_date)}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-60" />
          </div>
        </button>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-3 border border-border text-center">
          <Video className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.meetingsToday}</p>
          <p className="text-[10px] text-muted-foreground">Reuniões hoje</p>
        </div>
        <div className="bg-card rounded-2xl p-3 border border-border text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.totalClients}</p>
          <p className="text-[10px] text-muted-foreground">Clientes</p>
        </div>
        <div className="bg-card rounded-2xl p-3 border border-border text-center">
          <CheckSquare className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{stats.pendingTasks}</p>
          <p className="text-[10px] text-muted-foreground">Tarefas</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border active:scale-95 transition-transform"
              >
                <div className="p-2 rounded-xl" style={{ backgroundColor: action.color + '15' }}>
                  <Icon className="h-5 w-5" style={{ color: action.color }} />
                </div>
                <span className="text-[10px] font-medium text-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hub Cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Módulos</h2>
        <div className="grid grid-cols-2 gap-3">
          {hubCards.map((hub) => {
            const Icon = hub.icon;
            return (
              <button
                key={hub.path}
                onClick={() => navigate(hub.path)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left active:scale-[0.97] transition-transform"
              >
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: hub.color + '15' }}>
                  <Icon className="h-5 w-5" style={{ color: hub.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{hub.label}</p>
                  <p className="text-[10px] text-muted-foreground">{hub.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileHomeDashboard;
