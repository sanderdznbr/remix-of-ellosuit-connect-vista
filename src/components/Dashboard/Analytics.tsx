
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

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Dados reais serão carregados aqui posteriormente
  const metrics = [
    {
      title: 'Reuniões Realizadas',
      value: '0',
      change: 0,
      changeType: 'increase' as const,
      icon: CalendarIcon,
      color: 'text-blue-600'
    },
    {
      title: 'E-mails Enviados',
      value: '0',
      change: 0,
      changeType: 'increase' as const,
      icon: Mail,
      color: 'text-green-600'
    },
    {
      title: 'Taxa de Abertura',
      value: '0%',
      change: 0,
      changeType: 'increase' as const,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: 'Novos Clientes',
      value: '0',
      change: 0,
      changeType: 'increase' as const,
      icon: Users,
      color: 'text-orange-600'
    }
  ];

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
                      {metric.change !== 0 ? (
                        <>
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
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem dados do período anterior
                        </span>
                      )}
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

      {/* Mensagem de Dados em Desenvolvimento */}
      <Card className="rounded-2xl border-2 border-dashed border-muted">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analytics em Desenvolvimento</h3>
          <p className="text-muted-foreground mb-4">
            Os dados analíticos serão coletados conforme você utiliza o sistema. 
            Comece enviando e-mails, agendando reuniões e gerenciando clientes para ver suas métricas aqui.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Enviar E-mail
            </Button>
            <Button variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Agendar Reunião
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Adicionar Cliente
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-blue-700">Aguardando dados</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Taxa de Comparecimento</h3>
                  <p className="text-2xl font-bold text-green-600">0%</p>
                  <p className="text-sm text-green-700">Aguardando dados</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-900">Duração Média</h3>
                  <p className="text-2xl font-bold text-purple-600">0min</p>
                  <p className="text-sm text-purple-700">Aguardando dados</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="emails" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-900">E-mails Enviados</h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                  <p className="text-sm text-blue-700">Aguardando dados</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Taxa de Abertura</h3>
                  <p className="text-2xl font-bold text-green-600">0%</p>
                  <p className="text-sm text-green-700">Aguardando dados</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-orange-900">Taxa de Cliques</h3>
                  <p className="text-2xl font-bold text-orange-600">0%</p>
                  <p className="text-sm text-orange-700">Aguardando dados</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="clients" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-900">Novos Clientes</h3>
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-sm text-green-700">Aguardando dados</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-900">Taxa de Conversão</h3>
                  <p className="text-2xl font-bold text-blue-600">0%</p>
                  <p className="text-sm text-blue-700">Aguardando dados</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-purple-900">Clientes Ativos</h3>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                  <p className="text-sm text-purple-700">Aguardando dados</p>
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
