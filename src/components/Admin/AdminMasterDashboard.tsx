import React, { useEffect, useState } from 'react';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, Users, CreditCard, DollarSign, Shield, HeadphonesIcon, 
  Activity, ChevronRight, TrendingUp, UserPlus, AlertCircle, Bug,
  BarChart3, Clock
} from 'lucide-react';

const AdminMasterDashboard = () => {
  const { isAdminMaster, loading: authLoading, callAdminApi } = useAdminMaster();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isAdminMaster || authLoading) return;
    callAdminApi('stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, [isAdminMaster, authLoading]);

  if (authLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  const kpis = [
    { label: 'Empresas', value: stats?.totalCompanies || 0, icon: Building2, color: 'bg-blue-50 text-blue-600' },
    { label: 'Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Assinaturas Ativas', value: stats?.activeSubscriptions || 0, icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
    { label: 'Receita Mensal', value: `R$ ${(stats?.monthlyRevenue || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-orange-50 text-orange-600' },
    { label: 'Em Trial', value: stats?.trialingSubscriptions || 0, icon: Clock, color: 'bg-sky-50 text-sky-600' },
    { label: 'Novos (30d)', value: stats?.recentSignups || 0, icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Tickets Abertos', value: stats?.openTickets || 0, icon: AlertCircle, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Bugs Abertos', value: stats?.openBugs || 0, icon: Bug, color: 'bg-red-50 text-red-600' },
  ];

  const panels = [
    { label: 'Empresas & Usuários', desc: 'Gerenciar empresas, ver detalhes, impersonar, alterar roles', icon: Users, path: '/dashboard/admin/users' },
    { label: 'Assinaturas & Planos', desc: 'Status de pagamentos, modificar planos, ativar/desativar módulos', icon: CreditCard, path: '/dashboard/admin/subs' },
    { label: 'Saúde do Sistema', desc: 'Edge functions, APIs, erros recentes', icon: Activity, path: '/dashboard/admin/system' },
    { label: 'Suporte & Bugs', desc: 'Tickets abertos, relatórios de bugs, respostas', icon: HeadphonesIcon, path: '/dashboard/admin/support' },
  ];

  // Plan breakdown chart (simple bars)
  const planBreakdown = stats?.planBreakdown || {};
  const planColors: Record<string, string> = {
    base: 'bg-gray-400',
    pro: 'bg-blue-500',
    business: 'bg-purple-500',
    enterprise: 'bg-orange-500',
    custom: 'bg-emerald-500',
  };
  const totalSubs = Object.values(planBreakdown).reduce((a: number, b: any) => a + b, 0) as number;

  // Registration trend
  const trend = stats?.registrationTrend || {};
  const trendValues = Object.values(trend) as number[];
  const maxTrend = Math.max(...trendValues, 1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-50">
          <Shield className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Master</h1>
          <p className="text-sm text-muted-foreground">Painel administrativo da plataforma</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                {loadingStats ? <Skeleton className="h-6 w-16" /> : (
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-3">
                {Object.entries(planBreakdown).map(([plan, count]: [string, any]) => (
                  <div key={plan} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-20 capitalize">{plan}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${planColors[plan] || 'bg-gray-400'} transition-all`}
                        style={{ width: `${totalSubs ? (count / totalSubs) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(planBreakdown).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Cadastros (últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-32 w-full" /> : (
              <div className="flex items-end gap-2 h-32">
                {Object.entries(trend).map(([date, count]: [string, any]) => {
                  const day = new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-foreground">{count}</span>
                      <div className="w-full bg-muted rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
                        <div 
                          className="w-full bg-primary rounded-t-lg transition-all"
                          style={{ height: `${maxTrend ? (count / maxTrend) * 100 : 0}%`, marginTop: 'auto' }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">{day}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {panels.map(panel => (
          <Card 
            key={panel.label} 
            className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm" 
            onClick={() => navigate(panel.path)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <panel.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{panel.label}</p>
                  <p className="text-xs text-muted-foreground">{panel.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Subscriptions */}
      {stats?.subscriptions?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Assinaturas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.subscriptions.slice(0, 10).map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{sub.plan_type}</Badge>
                    <Badge 
                      variant="secondary" 
                      className={
                        sub.status === 'active' ? 'bg-green-100 text-green-700' :
                        sub.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                        sub.status === 'canceled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">R$ {Number(sub.monthly_price || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMasterDashboard;
