import React, { useEffect, useState } from 'react';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, CreditCard, DollarSign, Shield, HeadphonesIcon, Activity, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
    { label: 'Empresas', value: stats?.totalCompanies || 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Assinaturas Ativas', value: stats?.activeSubscriptions || 0, icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
    { label: 'Receita Mensal', value: `R$ ${(stats?.monthlyRevenue || 0).toFixed(2)}`, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
  ];

  const panels = [
    { label: 'Empresas & Usuários', desc: 'Gerenciar empresas, ver detalhes, impersonar', icon: Users, path: '/dashboard/admin/users' },
    { label: 'Assinaturas', desc: 'Status de pagamentos, planos e renovações', icon: CreditCard, path: '/dashboard/admin/subs' },
    { label: 'Saúde do Sistema', desc: 'Edge functions, APIs, erros recentes', icon: Activity, path: '/dashboard/admin/system' },
    { label: 'Suporte & Bugs', desc: 'Tickets abertos, relatórios de bugs', icon: HeadphonesIcon, path: '/dashboard/admin/support' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold">Admin Master</h1>
          <p className="text-sm text-muted-foreground">Painel administrativo da plataforma</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                {loadingStats ? <Skeleton className="h-6 w-16" /> : (
                  <p className="text-xl font-bold">{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {panels.map(panel => (
          <Card key={panel.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(panel.path)}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <panel.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{panel.label}</p>
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
        <Card>
          <CardHeader><CardTitle className="text-base">Assinaturas Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.subscriptions.slice(0, 10).map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{sub.plan_type}</p>
                    <p className="text-xs text-muted-foreground">Status: {sub.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">R$ {(sub.monthly_price || 0).toFixed(2)}</p>
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
