
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
  RefreshCw,
  Eye,
  MousePointer,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsProps {
  onNavigate: (item: string) => void;
}

const Analytics = ({ onNavigate }: AnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Dados zerados (aguardando implementação real)
  const metrics = [
    {
      title: 'Reuniões Realizadas',
      value: '0',
      change: 0,
      changeType: 'neutral' as const,
      icon: CalendarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'E-mails Enviados',
      value: '0',
      change: 0,
      changeType: 'neutral' as const,
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Taxa de Abertura',
      value: '0%',
      change: 0,
      changeType: 'neutral' as const,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Novos Clientes',
      value: '0',
      change: 0,
      changeType: 'neutral' as const,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const detailedMetrics = [
    { label: 'Taxa de Cliques', value: '0%', target: '5%', progress: 0 },
    { label: 'Taxa de Resposta', value: '0%', target: '15%', progress: 0 },
    { label: 'Tempo Médio de Resposta', value: '0h', target: '2h', progress: 0 },
    { label: 'Conversões', value: '0', target: '10', progress: 0 }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Acompanhe o desempenho detalhado do seu negócio</p>
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

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="rounded-2xl border-none shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                  {metric.change !== 0 && (
                    <div className="flex items-center gap-1">
                      {metric.changeType === 'increase' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : metric.changeType === 'decrease' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : null}
                      <span className={`text-sm font-medium ${
                        metric.changeType === 'increase' ? 'text-green-600' : 
                        metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {metric.change !== 0 && (metric.change > 0 ? '+' : '')}{metric.change}%
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metric.change === 0 ? 'Aguardando dados' : 'vs período anterior'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <Card className="lg:col-span-2 rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Métricas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {detailedMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{metric.value}</span>
                    <span className="text-xs text-gray-500">/ {metric.target}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metric.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start rounded-xl"
              onClick={() => onNavigate('mail-tracking')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Ver E-mails
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start rounded-xl"
              onClick={() => onNavigate('my-calendar')}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Abrir Calendário
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start rounded-xl"
              onClick={() => onNavigate('clients')}
            >
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Clientes
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start rounded-xl"
              onClick={() => onNavigate('templates')}
            >
              <PieChart className="h-4 w-4 mr-2" />
              Ver Templates
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Card className="rounded-2xl border-none shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl mb-6">
              <TabsTrigger value="email" className="rounded-xl">E-mail Marketing</TabsTrigger>
              <TabsTrigger value="meetings" className="rounded-xl">Reuniões</TabsTrigger>
              <TabsTrigger value="clients" className="rounded-xl">Clientes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">E-mails Enviados</h3>
                      <p className="text-2xl font-bold text-blue-600">0</p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">Nenhum e-mail enviado ainda</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Eye className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Taxa de Abertura</h3>
                      <p className="text-2xl font-bold text-green-600">0%</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-700">Aguardando dados</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <MousePointer className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-900">Taxa de Cliques</h3>
                      <p className="text-2xl font-bold text-purple-600">0%</p>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700">Aguardando dados</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="meetings" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarIcon className="h-8 w-8 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-orange-900">Total de Reuniões</h3>
                      <p className="text-2xl font-bold text-orange-600">0</p>
                    </div>
                  </div>
                  <p className="text-sm text-orange-700">Nenhuma reunião agendada</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl border border-cyan-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-8 w-8 text-cyan-600" />
                    <div>
                      <h3 className="font-semibold text-cyan-900">Taxa de Comparecimento</h3>
                      <p className="text-2xl font-bold text-cyan-600">0%</p>
                    </div>
                  </div>
                  <p className="text-sm text-cyan-700">Aguardando dados</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl border border-pink-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-8 w-8 text-pink-600" />
                    <div>
                      <h3 className="font-semibold text-pink-900">Duração Média</h3>
                      <p className="text-2xl font-bold text-pink-600">0min</p>
                    </div>
                  </div>
                  <p className="text-sm text-pink-700">Aguardando dados</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="clients" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-8 w-8 text-emerald-600" />
                    <div>
                      <h3 className="font-semibold text-emerald-900">Novos Clientes</h3>
                      <p className="text-2xl font-bold text-emerald-600">0</p>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-700">Nenhum cliente cadastrado</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h3 className="font-semibold text-indigo-900">Taxa de Conversão</h3>
                      <p className="text-2xl font-bold text-indigo-600">0%</p>
                    </div>
                  </div>
                  <p className="text-sm text-indigo-700">Aguardando dados</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-8 w-8 text-amber-600" />
                    <div>
                      <h3 className="font-semibold text-amber-900">Clientes Ativos</h3>
                      <p className="text-2xl font-bold text-amber-600">0</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-700">Aguardando dados</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="rounded-2xl border-2 border-dashed border-gray-300 bg-white">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">Comece a Coletar Dados</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Suas métricas aparecerão aqui conforme você usar o sistema. 
            Comece enviando e-mails, agendando reuniões e gerenciando clientes para ver insights detalhados.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => onNavigate('campaign-mail')} className="rounded-xl">
              <Mail className="h-4 w-4 mr-2" />
              Enviar E-mail
            </Button>
            <Button variant="outline" onClick={() => onNavigate('my-calendar')} className="rounded-xl">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Agendar Reunião
            </Button>
            <Button variant="outline" onClick={() => onNavigate('clients')} className="rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Adicionar Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
