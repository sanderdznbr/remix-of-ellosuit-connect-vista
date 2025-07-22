
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  Users, 
  Eye, 
  MousePointer, 
  Calendar,
  FileText,
  Activity,
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Cell } from 'recharts';

interface AnalyticsProps {
  onNavigate: (page: string) => void;
}

const Analytics = ({ onNavigate }: AnalyticsProps) => {
  const emailData = [
    { name: 'Jan', enviados: 400, abertos: 240, cliques: 120 },
    { name: 'Fev', enviados: 300, abertos: 139, cliques: 89 },
    { name: 'Mar', enviados: 500, abertos: 300, cliques: 180 },
    { name: 'Abr', enviados: 780, abertos: 390, cliques: 200 },
    { name: 'Mai', enviados: 890, abertos: 480, cliques: 290 },
    { name: 'Jun', enviados: 690, abertos: 380, cliques: 250 },
  ];

  const deviceData = [
    { name: 'Desktop', value: 60, color: '#3b82f6' },
    { name: 'Mobile', value: 30, color: '#10b981' },
    { name: 'Tablet', value: 10, color: '#f59e0b' },
  ];

  const campaignData = [
    { name: 'Promoção Verão', taxa: 25.5, tendencia: 'increase' },
    { name: 'Newsletter Semanal', taxa: 18.2, tendencia: 'decrease' },
    { name: 'Lançamento Produto', taxa: 32.1, tendencia: 'increase' },
    { name: 'Black Friday', taxa: 45.8, tendencia: 'increase' },
  ];

  const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-full bg-blue-50">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CampaignCard = ({ name, taxa, tendencia }: any) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">Taxa de abertura</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900">{taxa}%</span>
        {tendencia === 'increase' ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análises</h1>
            <p className="text-base text-gray-600 mt-2">
              Acompanhe o desempenho das suas campanhas e atividades
            </p>
          </div>
          <Button 
            onClick={() => onNavigate('campaign-mail')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Target className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="E-mails Enviados"
            value="12.5K"
            change="+12.5%"
            icon={Mail}
            trend="up"
          />
          <MetricCard 
            title="Taxa de Abertura"
            value="24.8%"
            change="+3.2%"
            icon={Eye}
            trend="up"
          />
          <MetricCard 
            title="Taxa de Clique"
            value="4.2%"
            change="-0.8%"
            icon={MousePointer}
            trend="down"
          />
          <MetricCard 
            title="Novos Contatos"
            value="1.8K"
            change="+18.3%"
            icon={Users}
            trend="up"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Desempenho de E-mail */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Desempenho de E-mails</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={emailData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="enviados" fill="#3b82f6" name="Enviados" />
                  <Bar dataKey="abertos" fill="#10b981" name="Abertos" />
                  <Bar dataKey="cliques" fill="#f59e0b" name="Cliques" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Dispositivos */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Dispositivos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance das Campanhas */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Performance das Campanhas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignData.map((campaign, index) => (
                <CampaignCard key={index} {...campaign} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-md"
            onClick={() => onNavigate('mail-tracking')}
          >
            <CardContent className="p-6 text-center">
              <Eye className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rastreamento</h3>
              <p className="text-sm text-gray-600">Ver detalhes dos e-mails enviados</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-md"
            onClick={() => onNavigate('my-calendar')}
          >
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Agenda</h3>
              <p className="text-sm text-gray-600">Gerenciar compromissos</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 shadow-md"
            onClick={() => onNavigate('templates')}
          >
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Modelos</h3>
              <p className="text-sm text-gray-600">Criar novos templates</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
