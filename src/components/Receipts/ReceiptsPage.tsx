import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, MoreVertical, Trash2, Eye, ArrowLeft, Receipt, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6' },
  enviado: { label: 'Enviado', color: '#2563EB', bg: '#DBEAFE' },
  pago: { label: 'Pago', color: '#16A34A', bg: '#DCFCE7' },
  cancelado: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2' },
};

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito',
  'Transferência Bancária', 'Boleto', 'Cheque', 'Outro',
];

const RECEIPT_COLOR = '#059669';

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('receipts')
        .select('*, clients(name, email, phone, company_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('clients').select('id, name, company_name, email, phone, cnpj_cpf').eq('company_id', companyId).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Recibo excluído' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('receipts').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const handleCreate = async () => {
    if (!companyId || !user || !title.trim() || !amount) {
      toast({ title: 'Preencha título e valor', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const selectedClient = clients.find((c: any) => c.id === clientId);
      const { error } = await supabase.from('receipts').insert({
        company_id: companyId,
        created_by: user.id,
        title: title.trim(),
        amount: parseFloat(amount),
        description: description || null,
        payment_method: paymentMethod,
        client_id: clientId,
        client_name: selectedClient?.name || null,
        client_document: selectedClient?.cnpj_cpf || null,
        notes: notes || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Recibo criado com sucesso!' });
      resetForm();
      setShowCreateDialog(false);
    } catch {
      toast({ title: 'Erro ao criar recibo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDescription('');
    setPaymentMethod('PIX');
    setClientId(null);
    setNotes('');
  };

  const filtered = receipts.filter((r: any) => {
    const matchesSearch = r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.clients as any)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const stats = {
    total: receipts.length,
    pagos: receipts.filter((r: any) => r.status === 'pago').length,
    enviados: receipts.filter((r: any) => r.status === 'enviado').length,
    valorTotal: receipts.filter((r: any) => r.status === 'pago').reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0),
  };

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const selectedClient = clients.find((c: any) => c.id === clientId);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard/suite')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Recibos</h1>
              <p className="text-sm text-gray-500">Gere e gerencie recibos de pagamento</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-xl h-11 gap-2 text-white shadow-lg"
            style={{ background: RECEIPT_COLOR }}
          >
            <Plus className="h-4 w-4" />
            Novo Recibo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: RECEIPT_COLOR },
            { label: 'Pagos', value: stats.pagos, color: '#16A34A' },
            { label: 'Enviados', value: stats.enviados, color: '#2563EB' },
            { label: 'Valor Recebido', value: fmtBRL(stats.valorTotal), color: '#D97706' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar recibo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl border-gray-200" />
        </div>
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'rascunho', label: 'Rascunho' },
            { key: 'enviado', label: 'Enviados' },
            { key: 'pago', label: 'Pagos' },
            { key: 'cancelado', label: 'Cancelados' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.key ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={statusFilter === f.key ? { background: RECEIPT_COLOR } : {}}
            >
              {f.label}
              {f.key !== 'all' && <span className="ml-1 opacity-60">{receipts.filter((r: any) => r.status === f.key).length}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: RECEIPT_COLOR + '12' }}>
              <Receipt className="h-7 w-7" style={{ color: RECEIPT_COLOR }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum recibo ainda</h3>
            <p className="text-sm text-gray-500 mb-4">Crie seu primeiro recibo</p>
            <Button onClick={() => setShowCreateDialog(true)} className="rounded-xl text-white" style={{ background: RECEIPT_COLOR }}>
              <Plus className="h-4 w-4 mr-1.5" /> Criar Recibo
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r: any) => {
              const status = STATUS_MAP[r.status] || STATUS_MAP.rascunho;
              const clientName = r.client_name || (r.clients as any)?.name || 'Sem cliente';
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{r.receipt_number}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: status.bg }}>{status.label}</span>
                        {r.payment_method && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{r.payment_method}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{r.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{clientName}</span>
                        <span className="text-xs text-gray-400">{format(new Date(r.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                      </div>
                      {r.description && <p className="text-xs text-gray-400 mt-1 truncate">{r.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold hidden md:block" style={{ color: RECEIPT_COLOR }}>
                        {fmtBRL(Number(r.amount) || 0)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Alterar Status</p>
                            <div className="flex flex-col gap-0.5">
                              {Object.entries(STATUS_MAP).map(([key, val]) => (
                                <button
                                  key={key}
                                  onClick={() => updateStatusMutation.mutate({ id: r.id, status: key })}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${r.status === key ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ background: val.color }} />
                                  {val.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(r.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Receipt Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={v => { setShowCreateDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" style={{ color: RECEIPT_COLOR }} />
              Novo Recibo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Título / Referência *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Serviço de manutenção" className="rounded-xl" />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor (R$) *</label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl text-lg font-bold" />
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Forma de Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente</label>
              {selectedClient ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{selectedClient.name}</p>
                    <p className="text-xs text-gray-500">{(selectedClient as any).cnpj_cpf || (selectedClient as any).email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setClientId(null)} className="rounded-lg text-xs h-7">Alterar</Button>
                </div>
              ) : (
                <div>
                  <Input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..." className="rounded-xl mb-2" />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredClients.slice(0, 5).map((c: any) => (
                      <button key={c.id} onClick={() => { setClientId(c.id); setClientSearch(''); }}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <p className="text-xs font-medium text-gray-900">{c.name}</p>
                        <p className="text-[10px] text-gray-500">{c.cnpj_cpf || c.email}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Descrição do Serviço</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o serviço prestado..." className="rounded-xl min-h-[80px]" />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Observações</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações adicionais..." className="rounded-xl min-h-[60px]" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving || !title.trim() || !amount}
                className="flex-1 rounded-xl text-white gap-2" style={{ background: RECEIPT_COLOR }}>
                {saving ? 'Salvando...' : 'Criar Recibo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
