
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home = ({ onNavigate }: HomeProps) => {
  const quickStats = [
    {
      title: "Emails Hoje",
      value: "0",
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Reuniões Hoje",
      value: "0",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Novos Clientes",
      value: "0",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Documentos",
      value: "0",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const quickActions = [
    {
      title: "Novo Email",
      description: "Enviar email para clientes",
      icon: Mail,
      color: "bg-blue-500",
      page: "campaign-mail"
    },
    {
      title: "Agendar Reunião",
      description: "Criar novo compromisso",
      icon: Calendar,
      color: "bg-green-500",
      page: "my-calendar"
    },
    {
      title: "Adicionar Cliente",
      description: "Gerenciar contatos",
      icon: Users,
      color: "bg-purple-500",
      page: "clients"
    },
    {
      title: "Novo Documento",
      description: "Upload de arquivo",
      icon: FileText,
      color: "bg-orange-500",
      page: "documents"
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🏠 Bem-vindo ao Dashboard
        </h1>
        <p className="text-gray-600 text-base">
          Gerencie seus emails, reuniões e clientes em um só lugar
        </p>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="border-none shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações Rápidas */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Plus className="h-6 w-6 text-blue-600" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className="h-auto p-4 justify-start hover:bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  onClick={() => onNavigate(action.page)}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className={`p-3 rounded-xl ${action.color}`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-base">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Clock className="h-6 w-6 text-green-600" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-base">Nenhuma atividade recente</p>
              <p className="text-sm text-gray-400">Suas ações aparecerão aqui</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              Próximos Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-base">Nenhum compromisso agendado</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 rounded-full"
                onClick={() => onNavigate('my-calendar')}
              >
                Ver Calendário
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status do Sistema */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-base font-medium text-gray-900">Todos os sistemas operacionais</span>
            </div>
            <Badge variant="secondary" className="px-3 py-1 rounded-full">
              ✅ Online
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
