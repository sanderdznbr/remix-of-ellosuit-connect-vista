import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, Users, Video, FileText, CheckSquare, Bot, Zap, BarChart3, Settings, Clock, CalendarDays, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const quickAccessItems = [{
  icon: Video,
  label: 'Reuniões',
  path: '/dashboard/reunioes',
  color: 'from-blue-500 to-blue-600'
}, {
  icon: Calendar,
  label: 'Agenda',
  path: '/dashboard/agenda',
  color: 'from-purple-500 to-purple-600'
}, {
  icon: Mail,
  label: 'Email',
  path: '/dashboard/email',
  color: 'from-red-500 to-red-600'
}, {
  icon: Users,
  label: 'Clientes',
  path: '/dashboard/clientes',
  color: 'from-green-500 to-green-600'
}, {
  icon: CheckSquare,
  label: 'Tarefas',
  path: '/dashboard/tasks',
  color: 'from-orange-500 to-orange-600'
}, {
  icon: FileText,
  label: 'Arquivos',
  path: '/dashboard/drive',
  color: 'from-indigo-500 to-indigo-600'
}, {
  icon: Bot,
  label: 'IA Agentes',
  path: '/dashboard/bot-ia',
  color: 'from-pink-500 to-pink-600'
}, {
  icon: Zap,
  label: 'Fluxos',
  path: '/dashboard/fluxos',
  color: 'from-yellow-500 to-yellow-600'
}, {
  icon: BarChart3,
  label: 'Análises',
  path: '/dashboard/analytics',
  color: 'from-cyan-500 to-cyan-600'
}, {
  icon: Settings,
  label: 'Configurações',
  path: '/dashboard/configuracoes',
  color: 'from-gray-500 to-gray-600'
}];
const AIAssistantHome = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [stats, setStats] = useState({
    meetingsToday: 0,
    nextMeeting: null as any,
    nextEvent: null as any,
    totalClients: 0
  });
  useEffect(() => {
    loadDashboardStats();
  }, [user]);
  const loadDashboardStats = async () => {
    if (!user) return;

    // Get company_id
    const {
      data: companyUsers
    } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1);
    if (!companyUsers || companyUsers.length === 0) return;
    const companyId = companyUsers[0].company_id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get meetings today
    const {
      data: meetingsToday
    } = await supabase.from('meeting_rooms').select('*').eq('company_id', companyId).eq('is_active', true).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString());

    // Get next upcoming meeting
    const {
      data: nextMeeting
    } = await supabase.from('meeting_rooms').select('*').eq('company_id', companyId).eq('is_active', true).gte('created_at', new Date().toISOString()).order('created_at', {
      ascending: true
    }).limit(1);

    // Get next event
    const {
      data: nextEvent
    } = await supabase.from('calendar_events').select('*').eq('company_id', companyId).gte('start_date', new Date().toISOString()).order('start_date', {
      ascending: true
    }).limit(1);

    // Get total clients
    const {
      count: totalClients
    } = await supabase.from('clients').select('*', {
      count: 'exact',
      head: true
    }).eq('company_id', companyId);
    setStats({
      meetingsToday: meetingsToday?.length || 0,
      nextMeeting: nextMeeting?.[0] || null,
      nextEvent: nextEvent?.[0] || null,
      totalClients: totalClients || 0
    });
  };
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã às ${format(date, 'HH:mm')}`;
    }
    return format(date, "dd 'de' MMMM 'às' HH:mm", {
      locale: ptBR
    });
  };
  const handleQuickAccess = (path: string) => {
    navigate(path);
  };
  return <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Bem-vindo de volta! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Aqui está um resumo do seu dia
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reuniões Hoje */}
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reuniões Hoje
              </CardTitle>
              <Video className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.meetingsToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.meetingsToday === 0 ? 'Nenhuma reunião hoje' : 'reuniões agendadas'}
              </p>
            </CardContent>
          </Card>

          {/* Próxima Reunião */}
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próxima Reunião
              </CardTitle>
              <Clock className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              {stats.nextMeeting ? <>
                  <div className="text-xl font-bold text-foreground truncate">
                    {stats.nextMeeting.title}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatEventDate(stats.nextMeeting.created_at)}
                  </p>
                </> : <div className="text-sm text-muted-foreground">
                  Nenhuma reunião agendada
                </div>}
            </CardContent>
          </Card>

          {/* Próximo Evento */}
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximo Evento
              </CardTitle>
              <CalendarDays className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              {stats.nextEvent ? <>
                  <div className="text-xl font-bold text-foreground truncate">
                    {stats.nextEvent.title}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatEventDate(stats.nextEvent.start_date)}
                  </p>
                </> : <div className="text-sm text-muted-foreground">
                  Nenhum evento agendado
                </div>}
            </CardContent>
          </Card>

          {/* Total de Clientes */}
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Clientes
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                clientes cadastrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickAccessItems.map(item => {
              const Icon = item.icon;
              return <Button key={item.path} onClick={() => handleQuickAccess(item.path)} variant="outline" className="h-auto flex flex-col items-center gap-3 p-6 hover:shadow-md transition-all group">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${item.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-center">
                      {item.label}
                    </span>
                  </Button>;
            })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate('/dashboard/reunioes')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Criar Reunião</h3>
                  <p className="text-sm text-muted-foreground">
                    Inicie uma videoconferência agora
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate('/dashboard/agenda')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Ver Agenda</h3>
                  <p className="text-sm text-muted-foreground">
                    Confira seus compromissos
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate('/dashboard/clientes')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Gerenciar Clientes</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesse sua base de clientes
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default AIAssistantHome;