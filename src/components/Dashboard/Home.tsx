import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Mail, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Plus,
  ArrowRight,
  Activity,
  FileText,
  Video,
  BarChart3,
  Quote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface QuickActionItem {
  title: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

interface RecentActivity {
  id: string;
  type: 'email' | 'meeting' | 'client' | 'template';
  title: string;
  description: string;
  time: string;
  status: 'completed' | 'pending' | 'scheduled';
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
}

interface HomeProps {
  onNavigate: (item: string) => void;
}

const inspirationalQuotes = [
  "Grandes negócios nascem de grandes sonhos.",
  "Não tenha medo de começar pequeno. Grandes impérios começaram com uma ideia.",
  "O sucesso é a soma de pequenos esforços repetidos diariamente.",
  "Empreender é transformar problemas em oportunidades.",
  "Quem ousa, conquista.",
  "A inovação distingue os líderes dos seguidores. – Steve Jobs",
  "Não espere por oportunidades. Crie-as.",
  "Empresas fortes são feitas de pessoas fortes.",
  "Os desafios de hoje são as vitórias de amanhã.",
  "A persistência realiza o impossível.",
  "Seja o líder que você gostaria de seguir.",
  "Sucesso é a habilidade de ir de fracasso em fracasso sem perder o entusiasmo. – Winston Churchill",
  "Sonhar grande e sonhar pequeno dá o mesmo trabalho. Então sonhe grande!",
  "Nunca é sobre ideias. É sobre fazer as ideias acontecerem.",
  "O cliente satisfeito é o melhor negócio.",
  "O único limite para o seu sucesso é você mesmo.",
  "Lidere pelo exemplo, inspire pela ação.",
  "A disciplina é o atalho para o sucesso.",
  "Empreender é cair sete vezes e levantar oito.",
  "Grandes líderes criam mais líderes, não seguidores.",
  "Pessoas comuns focam em problemas, líderes focam em soluções.",
  "Não venda produtos. Construa relacionamentos.",
  "O sucesso acontece quando a preparação encontra a oportunidade.",
  "A melhor maneira de prever o futuro é criá-lo. – Peter Drucker",
  "Coragem é a chave para abrir portas que o medo mantém fechadas.",
  "Toda crise carrega dentro de si a semente de uma grande oportunidade.",
  "Empresários de sucesso não desistem; eles se reinventam.",
  "Não se trata do quão grande é a sua empresa, mas do quão grande é a sua visão.",
  "Seu cliente pode esquecer o que você disse, mas nunca como você o fez sentir.",
  "Comece onde você está. Use o que você tem. Faça o que você pode. – Arthur Ashe"
];

const Home = ({ onNavigate }: HomeProps) => {
  const { user } = useAuth();
  const [currentQuote, setCurrentQuote] = useState('');
  const [stats, setStats] = useState({
    emails: 0,
    meetings: 0,
    clients: 0,
    productivity: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const quickActions: QuickActionItem[] = [
    {
      title: 'E-mail',
      icon: Mail,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => onNavigate('mail-tracking')
    },
    {
      title: 'Reunião',
      icon: Calendar,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => onNavigate('my-calendar')
    },
    {
      title: 'Cliente',
      icon: Users,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => onNavigate('clients')
    },
    {
      title: 'Template',
      icon: FileText,
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => onNavigate('templates')
    },
    {
      title: 'Meet',
      icon: Video,
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => onNavigate('start-meet')
    },
    {
      title: 'Análises',
      icon: BarChart3,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      onClick: () => onNavigate('analytics')
    }
  ];

  useEffect(() => {
    // Set random quote on component mount
    const randomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
    setCurrentQuote(randomQuote);
    
    // Change quote every 30 seconds
    const interval = setInterval(() => {
      const newRandomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
      setCurrentQuote(newRandomQuote);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) return;

      // Load upcoming events (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, start_date, event_type')
        .eq('company_id', companyUser.company_id)
        .gte('start_date', today.toISOString())
        .lte('start_date', nextWeek.toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      setUpcomingEvents(events || []);

      // Load stats
      const { data: clientsCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .eq('company_id', companyUser.company_id);

      const { data: todayEvents } = await supabase
        .from('calendar_events')
        .select('id', { count: 'exact' })
        .eq('company_id', companyUser.company_id)
        .gte('start_date', today.toISOString().split('T')[0])
        .lt('start_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: templatesCount } = await supabase
        .from('email_templates')
        .select('id', { count: 'exact' })
        .eq('company_id', companyUser.company_id);

      setStats({
        emails: 0, // Email tracking não implementado ainda
        meetings: todayEvents?.length || 0,
        clients: clientsCount?.length || 0,
        productivity: Math.min(100, ((todayEvents?.length || 0) + (templatesCount?.length || 0)) * 10)
      });

      // Create recent activities from events
      const recentEventActivities: RecentActivity[] = (events || []).slice(0, 3).map(event => ({
        id: event.id,
        type: event.event_type === 'meeting' ? 'meeting' : 'meeting',
        title: event.title,
        description: `Agendado para ${new Date(event.start_date).toLocaleDateString('pt-BR')}`,
        time: new Date(event.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'scheduled' as const
      }));

      setRecentActivities(recentEventActivities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'client': return Users;
      case 'template': return FileText;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'pending': return 'Pendente';
      case 'scheduled': return 'Agendado';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Frase Inspiradora no Topo */}
      <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
              <Quote className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                💡 Inspiração do Momento
              </h3>
              <p className="text-gray-700 text-lg italic">
                "{currentQuote}"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Simples */}
      <div className="text-center">
        <p className="text-2xl text-gray-600">
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">E-mails Hoje</p>
                <p className="text-3xl font-bold text-gray-900">{stats.emails}</p>
                <p className="text-sm text-gray-500 mt-1">vs. ontem</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Reuniões Hoje</p>
                <p className="text-3xl font-bold text-gray-900">{stats.meetings}</p>
                <p className="text-sm text-gray-500 mt-1">agendadas</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clients}</p>
                <p className="text-sm text-gray-500 mt-1">cadastrados</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Produtividade</p>
                <p className="text-3xl font-bold text-gray-900">{stats.productivity}%</p>
                <p className="text-sm text-gray-500 mt-1">do objetivo</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas - Apenas Ícones Minimalistas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="group flex flex-col items-center p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200"
                >
                  <div className={`p-3 rounded-full ${action.color} mb-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{action.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Próximos Compromissos e Atividades Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Compromissos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum compromisso agendado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => onNavigate('my-calendar')}
                  >
                    Ver Calendário
                  </Button>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.start_date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(event.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma atividade recente</p>
                  <p className="text-sm mt-1">Comece usando o sistema para ver suas atividades aqui</p>
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                        <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
