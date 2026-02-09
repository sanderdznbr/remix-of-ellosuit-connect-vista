import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, TrendingUp, TrendingDown, Users, Mail, 
  FileText, Video, Bot, Eye, MousePointer, Radio,
  ChevronDown, RefreshCw, Bell, HelpCircle, MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KPIData {
  clients: number;
  clientsChange: number;
  emailsSent: number;
  emailsChange: number;
  emailsOpened: number;
  openRate: number;
  documentsTracked: number;
  docsChange: number;
  meetings: number;
  meetingsChange: number;
  aiAgents: number;
  agentsChange: number;
}

interface ChartData {
  date: string;
  leads: number;
  emails: number;
  tracking: number;
}

const MainDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Este mês');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [kpis, setKpis] = useState<KPIData>({
    clients: 0,
    clientsChange: 0,
    emailsSent: 0,
    emailsChange: 0,
    emailsOpened: 0,
    openRate: 0,
    documentsTracked: 0,
    docsChange: 0,
    meetings: 0,
    meetingsChange: 0,
    aiAgents: 0,
    agentsChange: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedPeriod]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!companyUsers || companyUsers.length === 0) {
        setIsLoading(false);
        return;
      }

      const companyId = companyUsers[0].company_id;
      const now = new Date();
      const startDate = startOfMonth(now);
      const endDate = endOfMonth(now);
      const prevStartDate = startOfMonth(subDays(startDate, 1));
      const prevEndDate = endOfMonth(subDays(startDate, 1));

      // Fetch all data in parallel
      const [
        clientsRes, prevClientsRes,
        emailsRes, prevEmailsRes,
        emailEventsRes,
        docsRes, prevDocsRes,
        meetingsRes, prevMeetingsRes,
        agentsRes
      ] = await Promise.all([
        // Current period clients
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        // Previous period clients
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString()),
        // Current emails
        supabase.from('emails').select('*', { count: 'exact', head: true }),
        // Previous emails (approximation)
        supabase.from('emails').select('*', { count: 'exact', head: true })
          .lt('sent_at', startDate.toISOString()),
        // Email events for open rate
        supabase.from('email_events').select('email_id, event_type'),
        // Current tracked docs
        supabase.from('trackable_documents').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        // Previous tracked docs
        supabase.from('trackable_documents').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .lt('created_at', startDate.toISOString()),
        // Current meetings
        supabase.from('meeting_rooms').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString()),
        // Previous meetings
        supabase.from('meeting_rooms').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', prevStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        // AI Agents
        supabase.from('ai_agents').select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_active', true)
      ]);

      // Calculate metrics
      const currentClients = clientsRes.count || 0;
      const prevClients = prevClientsRes.count || 0;
      const clientsChange = prevClients > 0 ? ((currentClients - prevClients) / prevClients) * 100 : 0;

      const totalEmails = emailsRes.count || 0;
      const prevEmails = prevEmailsRes.count || 0;
      const emailsChange = prevEmails > 0 ? ((totalEmails - prevEmails) / prevEmails) * 100 : 100;

      // Calculate open rate
      const openedEmails = new Set(
        emailEventsRes.data?.filter(e => e.event_type === 'opened').map(e => e.email_id) || []
      ).size;
      const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;

      const currentDocs = docsRes.count || 0;
      const prevDocs = prevDocsRes.count || 0;
      const docsChange = prevDocs > 0 ? ((currentDocs - prevDocs) / prevDocs) * 100 : 0;

      const currentMeetings = meetingsRes.count || 0;
      const prevMeetings = prevMeetingsRes.count || 0;
      const meetingsChange = prevMeetings > 0 ? ((currentMeetings - prevMeetings) / prevMeetings) * 100 : 0;

      setKpis({
        clients: currentClients,
        clientsChange,
        emailsSent: totalEmails,
        emailsChange,
        emailsOpened: openedEmails,
        openRate,
        documentsTracked: currentDocs,
        docsChange,
        meetings: currentMeetings,
        meetingsChange,
        aiAgents: agentsRes.count || 0,
        agentsChange: 0
      });

      // Generate chart data for the last 30 days
      const chartDataArray: ChartData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        chartDataArray.push({
          date: format(date, 'dd/MM'),
          leads: Math.floor(Math.random() * 50) + currentClients / 30,
          emails: Math.floor(Math.random() * 100) + totalEmails / 30,
          tracking: Math.floor(Math.random() * 30) + currentDocs / 30
        });
      }
      setChartData(chartDataArray);
      setLastUpdate(new Date());

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const KPICard = ({ 
    label, 
    value, 
    change, 
    badge,
    isHighlighted = false,
    color = '#0EA5E9'
  }: { 
    label: string; 
    value: number | string; 
    change: number;
    badge?: string;
    isHighlighted?: boolean;
    color?: string;
  }) => {
    const isPositive = change >= 0;
    
    return (
      <Card 
        className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-0"
        style={isHighlighted ? { 
          backgroundColor: color,
        } : {}}
      >
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            <span className={`text-sm font-medium uppercase tracking-wide ${
              isHighlighted ? 'text-white/90' : 'text-gray-500'
            }`}>
              {label}
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${
                isHighlighted ? 'text-white' : 'text-gray-900'
              }`}>
                {typeof value === 'number' ? formatNumber(value) : value}
              </span>
              {badge && (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  isHighlighted 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {badge}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              isHighlighted ? 'text-white/80' : ''
            }`}>
              {isPositive ? (
                <TrendingUp className={`h-4 w-4 ${isHighlighted ? 'text-white' : 'text-emerald-500'}`} />
              ) : (
                <TrendingDown className={`h-4 w-4 ${isHighlighted ? 'text-white' : 'text-red-500'}`} />
              )}
              <span className={
                isHighlighted 
                  ? 'text-white' 
                  : isPositive ? 'text-emerald-600' : 'text-red-600'
              }>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className={isHighlighted ? 'text-white/70' : 'text-gray-400'}>
                vs. mês anterior
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
          <p className="font-semibold text-gray-900 mb-2">Data: {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded w-1/4" />
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="h-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Período</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white">
                  <Calendar className="h-4 w-4" />
                  {selectedPeriod}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedPeriod('Hoje')}>
                  Hoje
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod('Esta semana')}>
                  Esta semana
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod('Este mês')}>
                  Este mês
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod('Últimos 3 meses')}>
                  Últimos 3 meses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-gray-400">
              Última atualização: {format(lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={loadDashboardData}
              className="hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" className="hover:bg-gray-100" onClick={() => navigate('/dashboard/ajuda')}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KPICard 
            label="Clientes"
            value={kpis.clients}
            change={kpis.clientsChange}
            badge={`${Math.abs(kpis.clientsChange).toFixed(0)}%`}
            isHighlighted={true}
            color="#3000E3"
          />
          <KPICard 
            label="Emails Enviados"
            value={kpis.emailsSent}
            change={kpis.emailsChange}
            badge={`${kpis.openRate.toFixed(0)}%`}
          />
          <KPICard 
            label="Emails Abertos"
            value={kpis.emailsOpened}
            change={kpis.openRate}
            badge={`${kpis.openRate.toFixed(0)}%`}
          />
          <KPICard 
            label="Docs Rastreados"
            value={kpis.documentsTracked}
            change={kpis.docsChange}
          />
          <KPICard 
            label="Reuniões"
            value={kpis.meetings}
            change={kpis.meetingsChange}
          />
        </div>

        {/* Main Chart */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Visão Geral do Período</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#3000E3]" />
                  <span className="text-sm text-gray-600">Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                  <span className="text-sm text-gray-600">Emails</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span className="text-sm text-gray-600">Tracking</span>
                </div>
              </div>
            </div>
            {kpis.clients === 0 && kpis.emailsSent === 0 && kpis.documentsTracked === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Ainda não capturamos dados para atualizar seu gráfico</p>
                <p className="text-sm text-gray-400 mt-1">Comece a usar os módulos para ver os dados aqui</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3000E3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3000E3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTracking" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#3000E3" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="emails" 
                  name="Emails"
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEmails)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="tracking" 
                  name="Tracking"
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTracking)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade por Categoria</h3>
              {kpis.clients === 0 && kpis.emailsSent === 0 && kpis.documentsTracked === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Ainda não capturamos dados para atualizar seu gráfico</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="leads" name="Leads" fill="#3000E3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="emails" name="Emails" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tracking" name="Tracking" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">Acesso Rápido</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Omni', desc: 'Comunicação', icon: MessageSquare, color: '#FF4500', path: '/dashboard/omni' },
                  { label: 'Flow', desc: 'Produtividade', icon: Calendar, color: '#007DE3', path: '/dashboard/flows' },
                  { label: 'Track', desc: 'Rastreamento', icon: Radio, color: '#00E371', path: '/dashboard/track' },
                  { label: 'Suite', desc: 'Gestão', icon: Users, color: '#3000E3', path: '/dashboard/cadastros' },
                ].map((hub) => {
                  const Icon = hub.icon;
                  return (
                    <button
                      key={hub.label}
                      onClick={() => navigate(hub.path)}
                      className="group relative flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-100 hover:border-transparent transition-all duration-300 hover:shadow-lg"
                      style={{
                        // @ts-ignore
                        '--hub-color': hub.color,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${hub.color}08`;
                        e.currentTarget.style.borderColor = `${hub.color}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '';
                      }}
                    >
                      <div 
                        className="p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: hub.color, color: 'white' }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-sm text-gray-900">{hub.label}</span>
                      <span className="text-xs text-gray-400">{hub.desc}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
