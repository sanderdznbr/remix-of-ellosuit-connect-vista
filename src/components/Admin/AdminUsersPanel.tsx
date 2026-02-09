import React, { useEffect, useState } from 'react';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, Users, Search, LogIn, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const AdminUsersPanel = () => {
  const { isAdminMaster, loading: authLoading, callAdminApi } = useAdminMaster();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [impersonateModal, setImpersonateModal] = useState<{ userId: string; email: string } | null>(null);
  const [reason, setReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    if (!isAdminMaster || authLoading) return;
    callAdminApi('all-companies')
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAdminMaster, authLoading]);

  const viewCompany = async (company: any) => {
    setSelectedCompany(company);
    setLoadingDetails(true);
    try {
      const details = await callAdminApi('company-details', { companyId: company.id });
      setCompanyDetails(details);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateModal) return;
    setImpersonating(true);
    try {
      const result = await callAdminApi('impersonate', undefined, {
        targetUserId: impersonateModal.userId,
        reason,
      });
      if (result.link) {
        window.open(result.link, '_blank');
        toast.success('Link de impersonação gerado');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImpersonating(false);
      setImpersonateModal(null);
      setReason('');
    }
  };

  if (authLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => selectedCompany ? (setSelectedCompany(null), setCompanyDetails(null)) : navigate('/dashboard/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{selectedCompany ? selectedCompany.name : 'Empresas & Usuários'}</h1>
      </div>

      {!selectedCompany ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? <Skeleton className="h-64 w-full" /> : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Domínio</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.domain || '—'}</TableCell>
                        <TableCell>{c.userCount}</TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => viewCompany(c)}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        loadingDetails ? <Skeleton className="h-64 w-full" /> : companyDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Usuários', value: companyDetails.users?.length || 0 },
                { label: 'Clientes', value: companyDetails.clientsCount || 0 },
                { label: 'Eventos', value: companyDetails.eventsCount || 0 },
                { label: 'Agentes IA', value: companyDetails.agents?.length || 0 },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Usuários</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(companyDetails.users || []).map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">{u.user_id}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => setImpersonateModal({ userId: u.user_id, email: u.user_id })}>
                            <LogIn className="h-4 w-4 mr-1" /> Logar como
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {companyDetails.agents?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Agentes IA</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {companyDetails.agents.map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="text-sm">{a.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {companyDetails.flows?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Fluxos de Chatbot</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {companyDetails.flows.map((f: any) => (
                      <div key={f.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="text-sm">{f.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {f.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}

      {/* Impersonate Modal */}
      <Dialog open={!!impersonateModal} onOpenChange={() => setImpersonateModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logar como usuário</DialogTitle>
            <DialogDescription>Um link será gerado para acessar a conta. Esta ação será registrada.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Motivo da impersonação..." value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateModal(null)}>Cancelar</Button>
            <Button onClick={handleImpersonate} disabled={impersonating}>
              {impersonating ? 'Gerando...' : 'Gerar Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPanel;
