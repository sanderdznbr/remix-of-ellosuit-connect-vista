import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  Mail, 
  Users, 
  Target,
  BarChart3,
  PieChart,
  Download,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Metric {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ElementType;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Mock data
  const metrics: Metric[] = [
    {
      title: 'Reuniões Realizadas',
      value: '47',
      change: 12.5,
      changeType: 'increase',
      icon: CalendarIcon,
      color: 'text-blue-600'
    },
    {
      title: 'E-mails Enviados',
      value: '1.2K',
      change: 8.3,
      changeType: 'increase',
      icon: Mail,
      color: 'text-green-600'
    },
    {
      title: 'Taxa de Abertura',
      value: '68%',
      change: -2.1,
      changeType: 'decrease',
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: 'Novos Clientes',
      value: '23',
      change: 15.7,
      changeType: 'increase',
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  const meetingsData: ChartData[] = [
    { name: 'Jan', value: 12 },
    { name: 'Fev', value: 19 },
    { name: 'Mar', value: 15 },
    { name: 'Abr', value: 22 },
    { name: 'Mai', value: 18 },
    { name: 'Jun', value: 25 },
    { name: 'Jul', value: 28 },
    { name: 'Ago', value: 31 },
    { name: 'Set', value: 35 },
    { name: 'Out', value: 29 },
    { name: 'Nov', value: 42 },
    { name: 'Dez', value: 47 }
  ];

  const emailStatusData: ChartData[] = [
    { name: 'Entregues', value: 850, color: '#22c55e' },
    { name: 'Abertos', value: 578, color: '#3b82f6' },
    { name: 'Clicados', value: 234, color: '#8b5cf6' },
    { name: 'Não Entregues', value: 45, color: '#ef4444' }
  ];

  const clientStatusData: ChartData[] = [
    { name: 'Ativos', value: 45, color: '#22c55e' },
    { name: 'Leads', value: 28, color: '#eab308' },
    { name: 'Convertidos', value: 15, color: '#3b82f6' },
    { name: 'Inativos', value: 8, color: '#64748b' }
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'meeting',
      title: 'Reunião com Cliente ABC finalizada',
      time: '2 horas atrás',
      status: 'completed'
    },
    {
      id: '2',
      type: 'email',
      title: 'Campanha "Novidades Janeiro" enviada',
      time: '4 horas atrás',
      status: 'sent'
    },
    {
      id: '3',
      type: 'client',
      title: 'Novo cliente "Empresa XYZ" adicionado',
      time: '1 dia atrás',
      status: 'new'
    },
    {
      id: '4',
      type: 'meeting',
      title: 'Reunião com Cliente DEF agendada',
      time: '2 dias atrás',
      status: 'scheduled'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <CalendarIcon className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'new':
        return 'bg-purple-100 text-purple-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Acompanhe o desempenho do seu negócio</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <div className="flex items-center mt-1">
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        vs mês anterior
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-accent/10`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meetings Chart */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reuniões por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetingsData.slice(-6).map((month) => (
                <div key={month.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month.name}</span>
                  <div className="flex items-center gap-3 flex-1 mx-4">
                    <div className="flex-1 bg-accent rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(month.value / 50) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold min-w-[2rem] text-right">
                      {month.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Performance */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Performance de E-mails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emailStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{item.value}</span>
                    <div className="text-xs text-muted-foreground">
                      {((item.value / 1200) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Status */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Status dos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <div className="p-2 rounded-lg bg-accent/10">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge className={`${getActivityColor(activity.status)} border-0 text-xs`}>
                    {activity.status === 'completed' && 'Concluído'}
                    {activity.status === 'sent' && 'Enviado'}
                    {activity.status === 'new' && 'Novo'}
                    {activity.status === 'scheduled' && 'Agendado'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <Tabs defaultValue="meetings" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="meetings">Reuniões</TabsTrigger>
              <TabsTrigger value="emails">E-mails</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="meetings" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-900">Total de Reuniões</h3>
                  <p className="text-2xl font-bold text-blue-600">284</p>
                  <p className="text-sm text-blue-700">+12% este mês</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Taxa de Comparecimento</h3>
                  <p className="text-2xl font-bold text-green-600">89%</p>
                  <p className="text-sm text-green-700">+3% este mês</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-900">Duração Média</h3>
                  <p className="text-2xl font-bold text-purple-600">45min</p>
                  <p className="text-sm text-purple-700">-5min este mês</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="emails" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-900">E-mails Enviados</h3>
                  <p className="text-2xl font-bold text-blue-600">1,247</p>
                  <p className="text-sm text-blue-700">+8% este mês</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Taxa de Abertura</h3>
                  <p className="text-2xl font-bold text-green-600">68%</p>
                  <p className="text-sm text-green-700">-2% este mês</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-orange-900">Taxa de Cliques</h3>
                  <p className="text-2xl font-bold text-orange-600">18%</p>
                  <p className="text-sm text-orange-700">+1% este mês</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="clients" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Novos Clientes</h3>
                  <p className="text-2xl font-bold text-green-600">23</p>
                  <p className="text-sm text-green-700">+15% este mês</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-900">Taxa de Conversão</h3>
                  <p className="text-2xl font-bold text-blue-600">34%</p>
                  <p className="text-sm text-blue-700">+7% este mês</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-900">Clientes Ativos</h3>
                  <p className="text-2xl font-bold text-purple-600">96</p>
                  <p className="text-sm text-purple-700">+4% este mês</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;