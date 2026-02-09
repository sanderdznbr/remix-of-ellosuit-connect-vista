import React, { useEffect, useState } from 'react';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  canceled: 'bg-red-100 text-red-700',
  past_due: 'bg-yellow-100 text-yellow-700',
};

const AdminSubscriptionsPanel = () => {
  const { isAdminMaster, loading: authLoading, callAdminApi } = useAdminMaster();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isAdminMaster || authLoading) return;
    callAdminApi('stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAdminMaster, authLoading]);

  if (authLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  const subs = (stats?.subscriptions || []).filter((s: any) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.plan_type?.toLowerCase().includes(search.toLowerCase()) && !s.company_id?.includes(search)) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Assinaturas</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por plano..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="canceled">Cancelado</SelectItem>
            <SelectItem value="past_due">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <Skeleton className="h-64 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Renova em</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.plan_type}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[s.status] || ''}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>R$ {(s.monthly_price || 0).toFixed(2)}</TableCell>
                    <TableCell>{s.current_period_start ? new Date(s.current_period_start).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell className="text-xs">{s.payment_method || s.pagarme_subscription_id ? 'Pagar.me' : '—'}</TableCell>
                  </TableRow>
                ))}
                {subs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma assinatura encontrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscriptionsPanel;
