import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Mail, Users, Video, FileText, CheckSquare, Bot, Zap, 
  BarChart3, Settings, Clock, ArrowRight, FolderOpen, Pencil, Radio,
  MessageSquare, TrendingUp, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardEditor from './DashboardEditor';

const quickAccessItems = [
  { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', color: 'bg-blue-500' },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', color: 'bg-blue-600' },
  { icon: Mail, label: 'Email', path: '/dashboard/email', color: 'bg-blue-500' },
  { icon: Users, label: 'Cadastros', path: '/dashboard/cadastros', color: 'bg-gray-800' },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', color: 'bg-blue-400' },
  { icon: FolderOpen, label: 'Arquivos', path: '/dashboard/drive', color: 'bg-gray-700' },
  { icon: Bot, label: 'IA Agentes', path: '/dashboard/bot-ia', color: 'bg-blue-600' },
  { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos', color: 'bg-gray-800' },
  { icon: Radio, label: 'Rastreamento', path: '/dashboard/rastreamento', color: 'bg-blue-500' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', color: 'bg-gray-900' },
];

const AIAssistantHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [stats, setStats] = useState({
    meetingsToday: 0,
    nextMeeting: null as any,
    nextEvent: null as any,
    totalClients: 0,
    totalDocuments: 0,
    activeAgents: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) return;

    const { data: companyUsers } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!companyUsers || companyUsers.length === 0) return;
    const companyId = companyUsers[0].company_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [meetingsRes, nextMeetingRes, nextEventRes, clientsRes, docsRes, agentsRes] = await Promise.all([
      supabase.from('meeting_rooms').select('*').eq('company_id', companyId).eq('is_active', true).gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString()),
      supabase.from('meeting_rooms').select('*').eq('company_id', companyId).eq('is_active', true).gte('created_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(1),
      supabase.from('calendar_events').select('*').eq('company_id', companyId).gte('start_date', new Date().toISOString()).order('start_date', { ascending: true }).limit(1),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('ai_agents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true)
    ]);

    setStats({
      meetingsToday: meetingsRes.data?.length || 0,
      nextMeeting: nextMeetingRes.data?.[0] || null,
      nextEvent: nextEventRes.data?.[0] || null,
      totalClients: clientsRes.count || 0,
      totalDocuments: docsRes.count || 0,
      activeAgents: agentsRes.count || 0
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return `Hoje às ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Amanhã às ${format(date, 'HH:mm')}`;
    return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const handleQuickAccess = (path: string) => navigate(path);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Bem-vindo ao seu painel de controle</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(true)}
            className="rounded-xl gap-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
          >
            <Pencil className="h-4 w-4" />
            Personalizar
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500 rounded-xl">
                  <Video className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.meetingsToday}</p>
                  <p className="text-xs text-gray-500">Reuniões Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-900 rounded-xl">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                  <p className="text-xs text-gray-500">Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl">
                  <FolderOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
                  <p className="text-xs text-gray-500">Documentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-800 rounded-xl">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAgents}</p>
                  <p className="text-xs text-gray-500">Agentes IA</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500 rounded-xl">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Próximo Compromisso</p>
                  {stats.nextEvent ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 truncate">{stats.nextEvent.title}</p>
                      <p className="text-xs text-blue-500">{formatEventDate(stats.nextEvent.start_date)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Nenhum agendado</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Access */}
          <Card className="bg-white border border-gray-100 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Acesso Rápido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {quickAccessItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.path}
                      onClick={() => handleQuickAccess(item.path)}
                      variant="ghost"
                      className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-gray-50 transition-all group rounded-xl border border-transparent hover:border-gray-200"
                    >
                      <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-105 transition-transform`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {item.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <Card className="bg-gray-900 border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button 
                onClick={() => navigate('/dashboard/reunioes')}
                className="w-full p-3 bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Nova Reunião</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/dashboard/agenda')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Ver Agenda</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/dashboard/tasks')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Minhas Tarefas</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => navigate('/dashboard/cadastros')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Cadastros</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/crm-whatsapp')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-white/70 font-medium">Ellosuit Omni</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">CRM WhatsApp</h3>
                  <p className="text-sm text-white/80">Gerencie conversas</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-gray-800 to-gray-900 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/rastreamento')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-gray-400 font-medium">Ellosuit Track</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Rastreamento</h3>
                  <p className="text-sm text-gray-400">Monitore tudo</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/fluxos')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-white/70 font-medium">Ellosuit Flow</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Automações</h3>
                  <p className="text-sm text-white/80">Crie fluxos</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dashboard Editor Modal */}
      <DashboardEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={() => loadDashboardStats()}
      />
    </div>
  );
};

export default AIAssistantHome;
