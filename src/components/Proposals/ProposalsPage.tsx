
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, MoreVertical, Trash2, Eye, Copy, Download, ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import ServicesManager from './ServicesManager';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6' },
  enviada: { label: 'Enviada', color: '#2563EB', bg: '#DBEAFE' },
  aprovada: { label: 'Aprovada', color: '#16A34A', bg: '#DCFCE7' },
  recusada: { label: 'Recusada', color: '#DC2626', bg: '#FEE2E2' },
  expirada: { label: 'Expirada', color: '#D97706', bg: '#FEF3C7' },
};

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'propostas' | 'servicos'>('propostas');

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('proposals')
        .select('*, clients(name, company_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta excluída' });
    },
  });

  const filtered = proposals.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.proposal_number?.toLowerCase().includes(search.toLowerCase()) ||
    (p.clients as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: proposals.length,
    aprovadas: proposals.filter((p: any) => p.status === 'aprovada').length,
    pendentes: proposals.filter((p: any) => p.status === 'enviada').length,
    valorTotal: proposals.filter((p: any) => p.status === 'aprovada').reduce((s: number, p: any) => s + (p.total || 0), 0),
  };

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
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Propostas & Orçamentos</h1>
              <p className="text-sm text-gray-500">Crie propostas profissionais para seus clientes</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard/propostas/editor')}
            className="rounded-xl h-11 gap-2 text-white shadow-lg"
            style={{ background: '#3000E3' }}
          >
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('propostas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'propostas' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-1.5" />
            Propostas
          </button>
          <button
            onClick={() => setActiveTab('servicos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'servicos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="h-4 w-4 inline mr-1.5" />
            Serviços & Produtos
          </button>
        </div>

        {activeTab === 'servicos' ? (
          <ServicesManager companyId={companyId} />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total', value: stats.total, color: '#3000E3' },
                { label: 'Aprovadas', value: stats.aprovadas, color: '#16A34A' },
                { label: 'Pendentes', value: stats.pendentes, color: '#2563EB' },
                { label: 'Valor Aprovado', value: `R$ ${stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#D97706' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar proposta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl border-gray-200"
              />
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
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#3000E312' }}>
                  <FileText className="h-7 w-7" style={{ color: '#3000E3' }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma proposta ainda</h3>
                <p className="text-sm text-gray-500 mb-4">Crie sua primeira proposta profissional</p>
                <Button
                  onClick={() => navigate('/dashboard/propostas/editor')}
                  className="rounded-xl text-white"
                  style={{ background: '#3000E3' }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar Proposta
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((p: any) => {
                  const status = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate(`/dashboard/propostas/editor?id=${p.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">{p.proposal_number}</span>
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: status.color, backgroundColor: status.bg }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {(p.clients as any)?.name || 'Sem cliente'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(new Date(p.created_at), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900 hidden md:block">
                            R$ {(p.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className="p-1.5 rounded-lg hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/propostas/editor?id=${p.id}`); }}>
                                <Eye className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }} className="text-red-600">
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
          </>
        )}
      </div>
    </div>
  );
}
