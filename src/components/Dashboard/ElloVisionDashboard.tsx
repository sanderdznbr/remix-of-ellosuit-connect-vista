import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Users, BarChart3, Lightbulb, ArrowUp, ArrowDown, Sparkles, Target, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const ElloVisionDashboard = () => {
  const insights = [
    {
      id: '1',
      type: 'positive',
      title: 'Engajamento em Alta',
      description: 'Seus documentos PDF tiveram 45% mais visualizações esta semana.',
      metric: '+45%',
      icon: TrendingUp,
    },
    {
      id: '2',
      type: 'warning',
      title: 'Baixa Retenção em Vídeos',
      description: 'A taxa de conclusão dos vídeos está abaixo da média. Considere encurtá-los.',
      metric: '32%',
      icon: Target,
    },
    {
      id: '3',
      type: 'positive',
      title: 'Melhor Horário Identificado',
      description: 'Seus links têm 3x mais cliques entre 14h e 16h.',
      metric: '3x',
      icon: Zap,
    },
  ];

  const metrics = [
    { label: 'Documentos Visualizados', value: 1234, change: 12, trend: 'up' },
    { label: 'Links Clicados', value: 5678, change: 8, trend: 'up' },
    { label: 'Vídeos Assistidos', value: 892, change: -3, trend: 'down' },
    { label: 'Visitantes Únicos', value: 3456, change: 15, trend: 'up' },
  ];

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-7 w-7 text-primary" />
            Ello Vision
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Insights inteligentes sobre seu conteúdo</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Atualizar Análise
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="border-none shadow-md rounded-xl bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <div className="flex items-end justify-between mt-1">
                <p className="text-2xl font-bold text-foreground">{metric.value.toLocaleString()}</p>
                <div className={`flex items-center gap-1 text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                  {metric.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            {insights.map((insight) => (
              <div 
                key={insight.id} 
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'positive' 
                    ? 'bg-green-50 border-green-500 dark:bg-green-950' 
                    : 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <insight.icon className={`h-5 w-5 mt-0.5 ${insight.type === 'positive' ? 'text-green-600' : 'text-yellow-600'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <span className={`text-sm font-bold ${insight.type === 'positive' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {insight.metric}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Performance Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-5">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Engajamento de Documentos</span>
                  <span className="font-medium">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Taxa de Cliques em Links</span>
                  <span className="font-medium">65%</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Retenção de Vídeos</span>
                  <span className="font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Visitantes Retornantes</span>
                  <span className="font-medium">52%</span>
                </div>
                <Progress value={52} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Resumo Executivo</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Seu conteúdo teve um desempenho <strong className="text-green-600">acima da média</strong> esta semana. 
                Os documentos PDF continuam sendo seu formato mais engajado, com uma taxa de visualização completa de 78%. 
                Recomendamos focar na melhoria dos vídeos, onde há oportunidade de crescimento significativo.
              </p>
              <div className="flex gap-3 mt-4">
                <Button size="sm">Ver Relatório Completo</Button>
                <Button size="sm" variant="outline">Exportar Dados</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ElloVisionDashboard;
