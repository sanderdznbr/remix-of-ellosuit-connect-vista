
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Mail, Users, Calendar, FileText, ArrowRight } from 'lucide-react';

interface AnalyticsProps {
  onNavigate: (page: string) => void;
}

const Analytics = ({ onNavigate }: AnalyticsProps) => {
  const analyticsData = [
    {
      title: "Emails Enviados",
      value: "1,234",
      change: "+12.5%",
      trend: "up",
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Taxa de Abertura",
      value: "68.2%",
      change: "+5.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      title: "Reuniões Agendadas",
      value: "87",
      change: "+8.1%",
      trend: "up",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      title: "Novos Clientes",
      value: "23",
      change: "+15.7%",
      trend: "up",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    }
  ];

  const shortcuts = [
    {
      title: "Rastreamento de Email",
      description: "Acompanhe o desempenho dos seus emails",
      icon: Mail,
      color: "bg-blue-500",
      page: "mail-tracking"
    },
    {
      title: "Produtividade",
      description: "Visualize sua produtividade diária",
      icon: BarChart3,
      color: "bg-green-500",
      page: "mail-productivity"
    },
    {
      title: "Calendário",
      description: "Gerencie seus compromissos",
      icon: Calendar,
      color: "bg-purple-500",
      page: "my-calendar"
    },
    {
      title: "Documentos",
      description: "Organize seus arquivos",
      icon: FileText,
      color: "bg-orange-500",
      page: "documents"
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📊 Análises e Relatórios
        </h1>
        <p className="text-gray-600 text-base">
          Acompanhe o desempenho das suas atividades e tome decisões baseadas em dados
        </p>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsData.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index} className={`border-2 ${metric.borderColor} shadow-lg rounded-2xl bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                    <p className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change} este mês
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Atalhos Rápidos */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Acesso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((shortcut, index) => {
              const IconComponent = shortcut.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className="h-auto p-4 justify-start hover:bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200"
                  onClick={() => onNavigate(shortcut.page)}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className={`p-3 rounded-xl ${shortcut.color}`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-base">{shortcut.title}</h3>
                      <p className="text-sm text-gray-600">{shortcut.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Desempenho de Emails (30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-2xl">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-base">Gráfico em desenvolvimento</p>
                <p className="text-sm text-gray-400">Em breve você verá seus dados aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Atividade Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-2xl">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-base">Relatório em desenvolvimento</p>
                <p className="text-sm text-gray-400">Seus insights aparecerão aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
