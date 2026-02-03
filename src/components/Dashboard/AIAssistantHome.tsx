import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Mail, 
  Users, 
  Video,
  FileText,
  CheckSquare,
  Bot,
  Zap,
  BarChart3,
  Settings,
  Clock,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MessageSquare,
  Eye,
  MousePointer,
  Activity,
  Target,
  PieChart,
  LineChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isTomorrow, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell } from 'recharts';

const quickAccessItems = [
  { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', color: 'from-blue-500 to-blue-600' },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', color: 'from-blue-400 to-blue-500' },
  { icon: Mail, label: 'Email', path: '/dashboard/email', color: 'from-blue-600 to-indigo-600' },
  { icon: Users, label: 'Cadastros', path: '/dashboard/cadastros', color: 'from-blue-500 to-cyan-500' },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', color: 'from-indigo-500 to-blue-500' },
  { icon: FileText, label: 'Arquivos', path: '/dashboard/drive', color: 'from-blue-400 to-blue-600' },
  { icon: Bot, label: 'IA Agentes', path: '/dashboard/bot-ia', color: 'from-blue-600 to-purple-600' },
  { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos', color: 'from-cyan-500 to-blue-500' },
  { icon: BarChart3, label: 'Análises', path: '/dashboard/analytics', color: 'from-blue-500 to-indigo-500' },
  { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes', color: 'from-slate-500 to-blue-500' }
];

// Demo chart data
const activityData = [
  { name: 'Seg', reunioes: 4, emails: 12, tarefas: 8 },
  { name: 'Ter', reunioes: 3, emails: 19, tarefas: 5 },
  { name: 'Qua', reunioes: 5, emails: 15, tarefas: 12 },
  { name: 'Qui', reunioes: 2, emails: 22, tarefas: 7 },
  { name: 'Sex', reunioes: 6, emails: 18, tarefas: 10 },
  { name: 'Sáb', reunioes: 1, emails: 5, tarefas: 3 },
  { name: 'Dom', reunioes: 0, emails: 2, tarefas: 1 },
];

const performanceData = [
  { name: 'Jan', value: 65 },
  { name: 'Fev', value: 72 },
  { name: 'Mar', value: 68 },
  { name: 'Abr', value: 85 },
  { name: 'Mai', value: 78 },
  { name: 'Jun', value: 92 },
];

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const pieData = [
  { name: 'Clientes', value: 45 },
  { name: 'Prospectos', value: 25 },
  { name: 'Fornecedores', value: 20 },
  { name: 'Outros', value: 10 },
];

const AIAssistantHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    meetingsToday: 0,
    meetingsWeek: 0,
    nextMeeting: null as any,
    nextEvent: null as any,
    totalClients: 0,
    totalDocuments: 0,
    totalTasks: 0,
    activeAgents: 0,
    emailsSent: 0,
    conversionRate: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) return;

    // Get company_id
    const { data: companyUsers } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!companyUsers || companyUsers.length === 0) return;
    const companyId = companyUsers[0].company_id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = subDays(today, 7);

    // Get meetings today
    const { data: meetingsToday } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    // Get meetings this week
    const { data: meetingsWeek } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', weekStart.toISOString());

    // Get next upcoming meeting
    const { data: nextMeeting } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gte('created_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1);

    // Get next event
    const { data: nextEvent } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('company_id', companyId)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(1);

    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get total documents
    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get active agents
    const { count: activeAgents } = await supabase
      .from('ai_agents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);

    setStats({
      meetingsToday: meetingsToday?.length || 0,
      meetingsWeek: meetingsWeek?.length || 0,
      nextMeeting: nextMeeting?.[0] || null,
      nextEvent: nextEvent?.[0] || null,
      totalClients: totalClients || 0,
      totalDocuments: totalDocuments || 0,
      totalTasks: 12, // Demo
      activeAgents: activeAgents || 0,
      emailsSent: 48, // Demo
      conversionRate: 24 // Demo
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
    return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const handleQuickAccess = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Bem-vindo de volta! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Aqui está um resumo do seu dia • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Reuniões Hoje */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Reuniões Hoje
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-xl">
                <Video className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.meetingsToday}</div>
              <div className="flex items-center gap-1 mt-2 text-blue-100 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>{stats.meetingsWeek} esta semana</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Clientes */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-indigo-100">
                Total de Clientes
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalClients}</div>
              <div className="flex items-center gap-1 mt-2 text-indigo-100 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>+12% este mês</span>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-cyan-100">
                Documentos
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.totalDocuments}</div>
              <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
                <Eye className="h-4 w-4" />
                <span>15 visualizações</span>
              </div>
            </CardContent>
          </Card>

          {/* Agentes IA */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Agentes IA Ativos
              </CardTitle>
              <div className="p-2 bg-white/20 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.activeAgents}</div>
              <div className="flex items-center gap-1 mt-2 text-purple-100 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>28 conversas hoje</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.emailsSent}</p>
                <p className="text-sm text-muted-foreground">E-mails Enviados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa Conversão</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <CheckSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTasks}</p>
                <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">98%</p>
                <p className="text-sm text-muted-foreground">Uptime Sistema</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <Card className="border-0 shadow-lg rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Atividade Semanal
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Reuniões
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                    E-mails
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                    Tarefas
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorReunioes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTarefas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="reunioes" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReunioes)" />
                    <Area type="monotone" dataKey="emails" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEmails)" />
                    <Area type="monotone" dataKey="tarefas" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorTarefas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                Distribuição Cadastros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {pieData.map((item, index) => (
                  <span key={item.name} className="flex items-center gap-1 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                    {item.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <LineChart className="h-5 w-5 text-blue-600" />
                Tendência de Performance
              </CardTitle>
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                +18% vs mês anterior
              </div>
            </div>
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
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    onClick={() => handleQuickAccess(item.path)}
                    variant="outline"
                    className="h-auto flex flex-col items-center gap-3 p-6 hover:shadow-md transition-all group rounded-2xl border-2 hover:border-blue-200"
                  >
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${item.color} group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-center">
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Events & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Próximos Eventos */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Próximos Compromissos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.nextEvent ? (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="p-3 bg-blue-500 rounded-xl">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{stats.nextEvent.title}</h4>
                    <p className="text-sm text-muted-foreground">{formatEventDate(stats.nextEvent.start_date)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum evento agendado</p>
                </div>
              )}

              {stats.nextMeeting && (
                <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="p-3 bg-indigo-500 rounded-xl">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{stats.nextMeeting.title}</h4>
                    <p className="text-sm text-muted-foreground">{formatEventDate(stats.nextMeeting.created_at)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-indigo-500" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 rounded-xl hover:bg-blue-50 hover:border-blue-200"
                onClick={() => navigate('/dashboard/reunioes')}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Video className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Criar Reunião</p>
                  <p className="text-xs text-muted-foreground">Inicie uma videoconferência</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 rounded-xl hover:bg-indigo-50 hover:border-indigo-200"
                onClick={() => navigate('/dashboard/bot-ia')}
              >
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Configurar IA</p>
                  <p className="text-xs text-muted-foreground">Gerencie seus agentes</p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 rounded-xl hover:bg-cyan-50 hover:border-cyan-200"
                onClick={() => navigate('/dashboard/crm-whatsapp')}
              >
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">CRM WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Gerencie conversas</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantHome;
