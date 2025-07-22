
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Mail, Users, FileText, Clock, CheckCircle } from 'lucide-react';

interface HomeProps {
  onNavigate: (item: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const upcomingTasks = [
    {
      id: 1,
      title: 'Revisar propostas de clientes',
      time: '14:00',
      priority: 'Alta',
      type: 'review'
    },
    {
      id: 2,
      title: 'Reunião com equipe de marketing',
      time: '16:30',
      priority: 'Média',
      type: 'meeting'
    },
    {
      id: 3,
      title: 'Enviar relatório mensal',
      time: 'Amanhã',
      priority: 'Baixa',
      type: 'report'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: 'Novo cliente cadastrado',
      time: '2 horas atrás',
      icon: Users,
      color: 'text-green-600'
    },
    {
      id: 2,
      action: 'Email enviado para 15 contatos',
      time: '4 horas atrás',
      icon: Mail,
      color: 'text-blue-600'
    },
    {
      id: 3,
      action: 'Reunião agendada para sexta-feira',
      time: '1 dia atrás',
      icon: Calendar,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen ml-4">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-gray-600 text-base">
          Aqui está um resumo do que está acontecendo hoje
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Emails Hoje</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Reuniões</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Modelos</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks for Today */}
        <Card className="lg:col-span-2 border-none shadow-lg rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <CheckCircle className="h-5 w-5 text-[#3600FF]" />
              Tarefas de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#3600FF] rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{task.time}</span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={task.priority === 'Alta' ? 'destructive' : task.priority === 'Média' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-gray-50 ${activity.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-r from-[#3600FF] to-purple-600 text-white">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Bem-vindo ao ElloSuit! 🎉</h2>
          <p className="text-blue-100 mb-4 text-sm">
            Sua plataforma completa para gerenciar emails, reuniões e clientes de forma eficiente
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge className="bg-white/20 text-white border-0 text-xs">Email Marketing</Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs">Gestão de Clientes</Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs">Calendário Inteligente</Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs">Análises Detalhadas</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
