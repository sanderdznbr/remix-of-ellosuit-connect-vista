
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
    <div className="container mx-auto mobile-container desktop-container space-y-4 sm:space-y-6 lg:space-y-8 bg-gray-50 min-h-screen page-content">
      {/* Frase Inspiradora no Topo */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 lg:p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg flex-shrink-0">
              <Quote className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">
                💡 Inspiração do Momento
              </h3>
              <p className="text-gray-700 text-sm sm:text-lg lg:text-xl italic leading-relaxed">
                "{currentQuote}"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="responsive-grid">
        <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-xl sm:rounded-2xl bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">E-mails Hoje</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.emails}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">vs. ontem</p>
              </div>
              <div className="p-2 sm:p-3 lg:p-4 rounded-full bg-blue-50 flex-shrink-0">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-xl sm:rounded-2xl bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Reuniões Hoje</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.meetings}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">agendadas</p>
              </div>
              <div className="p-2 sm:p-3 lg:p-4 rounded-full bg-green-50 flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-xl sm:rounded-2xl bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.clients}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">cadastrados</p>
              </div>
              <div className="p-2 sm:p-3 lg:p-4 rounded-full bg-purple-50 flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 border-none shadow-lg rounded-xl sm:rounded-2xl bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Produtividade</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.productivity}%</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">do objetivo</p>
              </div>
              <div className="p-2 sm:p-3 lg:p-4 rounded-full bg-orange-50 flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Compromissos e Atividades Recentes */}
      <div className="responsive-flex">
        {/* Próximos Compromissos */}
        <Card className="border-none shadow-lg rounded-xl sm:rounded-2xl bg-white flex-1">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              Próximos Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Calendar className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Nenhum compromisso agendado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 rounded-xl text-xs sm:text-sm"
                    onClick={() => onNavigate('my-calendar')}
                  >
                    Ver Calendário
                  </Button>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 sm:p-4 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{event.title}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {new Date(event.start_date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(event.start_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <Badge variant="secondary" className="mt-1 rounded-full text-xs">
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
        <Card className="border-none shadow-lg rounded-xl sm:rounded-2xl bg-white flex-1">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Activity className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Nenhuma atividade recente</p>
                  <p className="text-xs sm:text-sm mt-1">Comece usando o sistema para ver suas atividades aqui</p>
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 sm:p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="p-2 rounded-lg bg-gray-100 flex-shrink-0">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{activity.title}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      <Badge className={`${getStatusColor(activity.status)} rounded-full text-xs flex-shrink-0`}>
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
