import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Mail, Users, Video, FileText, CheckSquare, Bot, Zap, 
  BarChart3, Settings, Clock, CalendarDays, TrendingUp, ArrowRight,
  MessageSquare, FolderOpen, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const quickAccessItems = [
  { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', color: 'from-blue-500 to-blue-600' },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', color: 'from-indigo-500 to-indigo-600' },
  { icon: Mail, label: 'Email', path: '/dashboard/email', color: 'from-sky-500 to-sky-600' },
  { icon: Users, label: 'Clientes', path: '/dashboard/clientes', color: 'from-cyan-500 to-cyan-600' },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', color: 'from-blue-400 to-blue-500' },
  { icon: FolderOpen, label: 'Arquivos', path: '/dashboard/drive', color: 'from-indigo-400 to-indigo-500' },
  { icon: Bot, label: 'IA Agentes', path: '/dashboard/bot-ia', color: 'from-violet-500 to-violet-600' },
  { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos', color: 'from-purple-500 to-purple-600' },
  { icon: BarChart3, label: 'Análises', path: '/dashboard/analytics', color: 'from-blue-600 to-blue-700' },
  { icon: Settings, label: 'Config.', path: '/dashboard/configuracoes', color: 'from-slate-500 to-slate-600' },
];

// Demo data for charts
const weeklyActivityData = [
  { name: 'Seg', reunioes: 4, emails: 12, tarefas: 8 },
  { name: 'Ter', reunioes: 6, emails: 18, tarefas: 12 },
  { name: 'Qua', reunioes: 3, emails: 15, tarefas: 6 },
  { name: 'Qui', reunioes: 8, emails: 22, tarefas: 14 },
  { name: 'Sex', reunioes: 5, emails: 20, tarefas: 10 },
  { name: 'Sáb', reunioes: 1, emails: 5, tarefas: 3 },
  { name: 'Dom', reunioes: 0, emails: 2, tarefas: 1 },
];

const distributionData = [
  { name: 'Reuniões', value: 30, color: '#3b82f6' },
  { name: 'Emails', value: 35, color: '#6366f1' },
  { name: 'Tarefas', value: 20, color: '#8b5cf6' },
  { name: 'Clientes', value: 15, color: '#0ea5e9' },
];

const performanceData = [
  { name: 'Jan', valor: 65 },
  { name: 'Fev', valor: 72 },
  { name: 'Mar', valor: 68 },
  { name: 'Abr', valor: 85 },
  { name: 'Mai', valor: 78 },
  { name: 'Jun', valor: 92 },
];

const AIAssistantHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Video className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-3xl font-bold text-blue-600">{stats.meetingsToday}</span>
              </div>
              <p className="text-sm font-medium text-foreground">Reuniões Hoje</p>
              <p className="text-xs text-muted-foreground">{stats.meetingsToday === 0 ? 'Nenhuma' : 'agendadas'}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-3xl font-bold text-indigo-600">{stats.totalClients}</span>
              </div>
              <p className="text-sm font-medium text-foreground">Clientes</p>
              <p className="text-xs text-muted-foreground">cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-violet-100 rounded-xl">
                  <FolderOpen className="h-5 w-5 text-violet-600" />
                </div>
                <span className="text-3xl font-bold text-violet-600">{stats.totalDocuments}</span>
              </div>
              <p className="text-sm font-medium text-foreground">Documentos</p>
              <p className="text-xs text-muted-foreground">no drive</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-3xl font-bold text-purple-600">{stats.activeAgents}</span>
              </div>
              <p className="text-sm font-medium text-foreground">Agentes IA</p>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl col-span-1 md:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-xl">
                  <Clock className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Próximo Compromisso</p>
                  {stats.nextEvent ? (
                    <>
                      <p className="text-base font-bold text-cyan-600 truncate">{stats.nextEvent.title}</p>
                      <p className="text-xs text-muted-foreground">{formatEventDate(stats.nextEvent.start_date)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum agendado</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Activity Chart */}
          <Card className="bg-white border-0 shadow-lg rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Atividade Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyActivityData}>
                    <defs>
                      <linearGradient id="colorReunioes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }} 
                    />
                    <Area type="monotone" dataKey="reunioes" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReunioes)" name="Reuniões" />
                    <Area type="monotone" dataKey="emails" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorEmails)" name="Emails" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={distributionData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={40} 
                      outerRadius={70} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {distributionData.map((item) => (
                  <span key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    {item.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Desempenho Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }} 
                  />
                  <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Produtividade" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickAccessItems.map(item => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    onClick={() => handleQuickAccess(item.path)}
                    variant="outline"
                    className="h-auto flex flex-col items-center gap-3 p-5 hover:shadow-md transition-all group rounded-xl border-blue-100 hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} group-hover:scale-110 transition-transform shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-center text-foreground">
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/reunioes')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Criar Reunião</h3>
                  <p className="text-sm text-blue-100">
                    Inicie uma videoconferência
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/agenda')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Ver Agenda</h3>
                  <p className="text-sm text-indigo-100">
                    Confira seus compromissos
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-violet-500 to-violet-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group rounded-2xl" 
            onClick={() => navigate('/dashboard/clientes')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Gerenciar Clientes</h3>
                  <p className="text-sm text-violet-100">
                    Acesse sua base de clientes
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantHome;
