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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Search, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  canceled: 'bg-red-100 text-red-700',
  past_due: 'bg-yellow-100 text-yellow-700',
};

const AdminSubscriptionsPanel = () => {
  const { isAdminMaster, loading: authLoading, callAdminApi } = useAdminMaster();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editModal, setEditModal] = useState<any>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdminMaster || authLoading) return;
    loadData();
  }, [isAdminMaster, authLoading]);

  const loadData = async () => {
    try {
      const data = await callAdminApi('all-companies');
      setCompanies(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (company: any) => {
    const sub = company.subscription;
    setEditModal(company);
    setEditPlan(sub?.plan_type || 'base');
    setEditStatus(sub?.status || 'trialing');
    setEditModules([]);
    // Load current modules
    if (company.id) {
      callAdminApi('company-details', { companyId: company.id })
        .then(details => {
          const activeModules = (details.modules || [])
            .filter((m: any) => m.is_active)
            .map((m: any) => m.module_type);
          setEditModules(activeModules);
        })
        .catch(console.error);
    }
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await callAdminApi('modify-subscription', undefined, {
        companyId: editModal.id,
        planType: editPlan,
        status: editStatus,
        modules: editModules,
      });
      toast.success('Assinatura atualizada com sucesso');
      setEditModal(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (mod: string) => {
    setEditModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  if (authLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  const filtered = companies.filter(c => {
    const sub = c.subscription;
    if (statusFilter !== 'all' && sub?.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name?.toLowerCase().includes(s) || c.domain?.toLowerCase().includes(s) || sub?.plan_type?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Assinaturas & Planos</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar empresa ou plano..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => {
                  const sub = c.subscription;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.domain || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{sub?.plan_type || 'base'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[sub?.status] || ''}>
                          {sub?.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">R$ {Number(sub?.monthly_price || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-foreground">{c.userCount}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Settings2 className="h-4 w-4 mr-1" /> Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Subscription Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar: {editModal?.name}</DialogTitle>
            <DialogDescription>Altere o plano, status e módulos desta empresa.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Plano</label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                  <SelectItem value="past_due">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Módulos Ativos</label>
              <div className="space-y-2">
                {[
                  { id: 'omni', label: 'Omni — CRM, Email, IA', color: '#FF4500' },
                  { id: 'flow', label: 'Flow — Agenda, Tarefas, Reuniões', color: '#007DE3' },
                  { id: 'track', label: 'Track — Rastreamento', color: '#3A9A1C' },
                ].map(mod => (
                  <label key={mod.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <Checkbox 
                      checked={editModules.includes(mod.id)} 
                      onCheckedChange={() => toggleModule(mod.id)} 
                    />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mod.color }} />
                    <span className="text-sm text-foreground">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionsPanel;
