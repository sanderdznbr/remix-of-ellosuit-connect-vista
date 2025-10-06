import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MobileCard from './MobileCard';
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
  Quote,
  CheckSquare,
  MessageSquare,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

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

interface MobileHomeScreenProps {
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
  "A persistência realiza o impossível."
];

const MobileHomeScreen: React.FC<MobileHomeScreenProps> = ({ onNavigate }) => {
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
    const randomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
    setCurrentQuote(randomQuote);
    
    const interval = setInterval(() => {
      const newRandomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
      setCurrentQuote(newRandomQuote);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Mock stats for now since we don't have calendar_events table
        setStats({
          emails: Math.floor(Math.random() * 50) + 10,
          meetings: Math.floor(Math.random() * 5) + 1,
          clients: Math.floor(Math.random() * 20) + 5,
          productivity: Math.floor(Math.random() * 30) + 70
        });

        // Mock recent activities
        setRecentActivities([
          {
            id: '1',
            type: 'email',
            title: 'Email enviado',
            description: 'Campanha promocional enviada',
            time: '2 horas atrás',
            status: 'completed'
          },
          {
            id: '2',
            type: 'meeting',
            title: 'Reunião agendada',
            description: 'Reunião com cliente importante',
            time: '4 horas atrás',
            status: 'scheduled'
          }
        ]);

      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quickActions = [
    { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', color: 'bg-blue-500' },
    { icon: Calendar, label: 'Ag. Online', path: '/dashboard/agenda-aberta', color: 'bg-cyan-500' },
    { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', color: 'bg-indigo-500' },
    { icon: Mail, label: 'Email', path: '/dashboard/email', color: 'bg-green-500' },
    { icon: Users, label: 'Contatos', path: '/dashboard/clientes', color: 'bg-purple-500' },
    { icon: FileText, label: 'Arquivos', path: '/dashboard/drive', color: 'bg-orange-500' },
    { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', color: 'bg-pink-500' },
    { icon: TrendingUp, label: 'Fluxos', path: '/dashboard/fluxos', color: 'bg-red-500' },
    { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/crm-whatsapp', color: 'bg-emerald-500' },
    { icon: Activity, label: 'Bot IA', path: '/dashboard/bot-ia', color: 'bg-violet-500' },
    { icon: BarChart3, label: 'Rastreio', path: '/dashboard/rastreamento-documento', color: 'bg-amber-500' },
    { icon: Settings, label: 'Config', path: '/dashboard/configuracoes', color: 'bg-slate-500' }
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Welcome Section */}
      <MobileCard>
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Olá, {user?.user_metadata?.full_name || 'Usuário'}! 👋
          </h2>
          <div className="flex items-center justify-center mb-4">
            <Quote className="h-5 w-5 text-primary mr-2" />
            <p className="text-sm text-gray-600 italic max-w-sm">
              "{currentQuote}"
            </p>
          </div>
        </div>
      </MobileCard>

      {/* Quick Actions */}
      <MobileCard title="Ações Rápidas" icon={<Target className="h-5 w-5 text-primary" />}>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.path} className="group">
              <div className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary/30 transition-all duration-200 group-active:scale-95">
                <div className={`${action.color} p-2.5 rounded-full mb-1.5`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </MobileCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MobileCard>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.emails}</p>
            <p className="text-sm text-gray-600">Emails hoje</p>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Video className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.meetings}</p>
            <p className="text-sm text-gray-600">Reuniões hoje</p>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.clients}</p>
            <p className="text-sm text-gray-600">Novos contatos</p>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.productivity}%</p>
            <p className="text-sm text-gray-600">Produtividade</p>
          </div>
        </MobileCard>
      </div>

      {/* Recent Activities */}
      <MobileCard title="Atividades Recentes" icon={<Activity className="h-5 w-5 text-primary" />}>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                <p className="text-xs text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
              <Badge className={`${getStatusColor(activity.status)} text-xs`}>
                {activity.status}
              </Badge>
            </div>
          ))}
        </div>
      </MobileCard>
    </div>
  );
};

export default MobileHomeScreen;