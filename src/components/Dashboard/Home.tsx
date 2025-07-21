
import React from 'react';
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
  BarChart3
} from 'lucide-react';

interface QuickAccessItem {
  title: string;
  description: string;
  icon: React.ElementType;
  action: string;
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

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  // Estatísticas em tempo real (estas serão conectadas aos dados reais posteriormente)
  const stats = [
    {
      title: 'E-mails Hoje',
      value: '0',
      change: '0%',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Reuniões Agendadas',
      value: '0',
      change: '0%',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Novos Clientes',
      value: '0',
      change: '0%',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Produtividade',
      value: '0%',
      change: '0%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const quickActions: QuickAccessItem[] = [
    {
      title: 'Novo E-mail',
      description: 'Compose e envie um e-mail',
      icon: Mail,
      action: 'Enviar',
      color: 'bg-blue-500',
      onClick: () => onNavigate('mail-tracking')
    },
    {
      title: 'Agendar Reunião',
      description: 'Marque um novo compromisso',
      icon: Calendar,
      action: 'Agendar',
      color: 'bg-green-500',
      onClick: () => onNavigate('my-calendar')
    },
    {
      title: 'Adicionar Cliente',
      description: 'Cadastre um novo cliente',
      icon: Users,
      action: 'Adicionar',
      color: 'bg-purple-500',
      onClick: () => onNavigate('clients')
    },
    {
      title: 'Criar Template',
      description: 'Novo modelo de e-mail',
      icon: FileText,
      action: 'Criar',
      color: 'bg-orange-500',
      onClick: () => onNavigate('templates')
    },
    {
      title: 'Iniciar Meet',
      description: 'Comece uma reunião agora',
      icon: Video,
      action: 'Iniciar',
      color: 'bg-red-500',
      onClick: () => onNavigate('start-meet')
    },
    {
      title: 'Ver Análises',
      description: 'Relatórios e métricas',
      icon: BarChart3,
      action: 'Visualizar',
      color: 'bg-indigo-500',
      onClick: () => onNavigate('analytics')
    }
  ];

  const recentActivities: RecentActivity[] = [
    // Atividades recentes serão carregadas dos dados reais
  ];

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
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

  return (
    <div className="p-6 space-y-8">
      {/* Header de Boas-vindas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {getTimeOfDay()}! 👋
            </h1>
            <p className="text-xl text-gray-600 mt-2">
              Vamos tornar seu dia mais produtivo
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      vs. ontem
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                  onClick={action.onClick}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${action.color} shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {action.description}
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full group-hover:shadow-md transition-shadow duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {action.action}
                    </Button>
                  </div>
                </div>
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
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum compromisso agendado para hoje</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => onNavigate('my-calendar')}
                >
                  Ver Calendário
                </Button>
              </div>
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
              {recentActivities.length === 0 ? (
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
                        <p className="font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status === 'completed' && 'Concluído'}
                        {activity.status === 'pending' && 'Pendente'}
                        {activity.status === 'scheduled' && 'Agendado'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dicas e Sugestões */}
      <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                💡 Dica de Produtividade
              </h3>
              <p className="text-gray-700 mb-4">
                Organize seu dia criando templates de e-mail para respostas frequentes. 
                Isso pode economizar até 30% do seu tempo diário com comunicações.
              </p>
              <Button 
                variant="outline" 
                onClick={() => onNavigate('templates')}
                className="bg-white hover:bg-gray-50"
              >
                Criar Template
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
