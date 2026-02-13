import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Users, BarChart3, Lightbulb, ArrowUp, ArrowDown, Sparkles, Target, Zap, Mail, MessageSquare, FileText, CalendarDays, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InsightData {
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  metric: string;
}

interface VisionData {
  metrics: {
    total_docs: number;
    total_clients: number;
    active_clients: number;
    emails_sent: number;
    email_open_rate: number;
    link_clicks: number;
    doc_views: number;
    events_this_week: number;
    whatsapp_conversations: number;
    unread_messages: number;
    active_habits: number;
    docs_change: number;
    emails_change: number;
  };
  ai: {
    insights: InsightData[];
    summary: string;
    performance: {
      email_engagement: number;
      client_growth: number;
      content_activity: number;
      communication: number;
    };
  };
}

const iconMap: Record<string, React.ElementType> = {
  positive: TrendingUp,
  warning: AlertTriangle,
  info: Info,
};

const ElloVisionDashboard = () => {
  const [data, setData] = useState<VisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVision = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Faça login para ver os insights');
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ello-vision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (res.status === 429) {
        toast.error('Limite de requisições atingido. Tente novamente em alguns segundos.');
        return;
      }
      if (res.status === 402) {
        toast.error('Créditos insuficientes para análise IA.');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
      if (isRefresh) toast.success('Análise atualizada!');
    } catch (err) {
      console.error('Ello Vision error:', err);
      toast.error('Erro ao carregar análise');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVision();
  }, [fetchVision]);

  const metricCards = data ? [
    { label: 'Clientes', value: data.metrics.total_clients, icon: Users, sub: `${data.metrics.active_clients} ativos` },
    { label: 'Documentos', value: data.metrics.total_docs, change: data.metrics.docs_change, icon: FileText },
    { label: 'Emails Enviados', value: data.metrics.emails_sent, change: data.metrics.emails_change, icon: Mail },
    { label: 'Taxa de Abertura', value: `${data.metrics.email_open_rate}%`, icon: Eye },
    { label: 'Cliques em Links', value: data.metrics.link_clicks, icon: Zap },
    { label: 'Visualizações Docs', value: data.metrics.doc_views, icon: BarChart3 },
    { label: 'Agenda (semana)', value: data.metrics.events_this_week, icon: CalendarDays },
    { label: 'WhatsApp', value: data.metrics.whatsapp_conversations, icon: MessageSquare, sub: data.metrics.unread_messages > 0 ? `${data.metrics.unread_messages} não lidas` : undefined },
  ] : [];

  if (loading) {
    return (
      <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Eye className="h-7 w-7 text-primary" />
              Ello Vision
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Analisando seus dados com IA...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border-none shadow-md rounded-xl bg-card">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg rounded-2xl bg-card">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg rounded-2xl bg-card">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-7 w-7 text-primary" />
            Ello Vision
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Insights inteligentes gerados por IA</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fetchVision(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Analisando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="border-none shadow-md rounded-xl bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <p className="text-2xl font-bold text-foreground">
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </p>
                  {'change' in metric && metric.change !== undefined && metric.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {metric.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(metric.change)}%
                    </div>
                  )}
                </div>
                {'sub' in metric && metric.sub && (
                  <p className="text-xs text-muted-foreground mt-0.5">{metric.sub}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data && (
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
              {data.ai.insights.map((insight, idx) => {
                const Icon = iconMap[insight.type] || Info;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'positive'
                        ? 'bg-green-50 border-green-500 dark:bg-green-950'
                        : insight.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950'
                        : 'bg-blue-50 border-blue-500 dark:bg-blue-950'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        insight.type === 'positive' ? 'text-green-600'
                        : insight.type === 'warning' ? 'text-yellow-600'
                        : 'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <span className={`text-sm font-bold ${
                            insight.type === 'positive' ? 'text-green-600'
                            : insight.type === 'warning' ? 'text-yellow-600'
                            : 'text-blue-600'
                          }`}>
                            {insight.metric}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                {[
                  { label: 'Engajamento de Email', value: data.ai.performance.email_engagement },
                  { label: 'Crescimento de Clientes', value: data.ai.performance.client_growth },
                  { label: 'Atividade de Conteúdo', value: data.ai.performance.content_activity },
                  { label: 'Comunicação', value: data.ai.performance.communication },
                ].map((perf, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{perf.label}</span>
                      <span className="font-medium">{perf.value}%</span>
                    </div>
                    <Progress value={perf.value} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Card */}
      {data && (
        <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Resumo Executivo</h3>
                <p className="text-sm text-muted-foreground mt-2">{data.ai.summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ElloVisionDashboard;
