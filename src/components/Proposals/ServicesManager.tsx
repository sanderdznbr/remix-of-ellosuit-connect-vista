
import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit_label: string;
  category: string | null;
  is_active: boolean;
}

interface Props {
  companyId: string | null;
}

export default function ServicesManager({ companyId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', description: '', unit_price: '', unit_label: 'unidade', category: '' });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['company-services', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_services')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) return;
      const payload = {
        company_id: companyId,
        created_by: user.id,
        name: form.name,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price) || 0,
        unit_label: form.unit_label || 'unidade',
        category: form.category || null,
      };
      if (editing) {
        const { error } = await supabase.from('company_services').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-services'] });
      toast({ title: editing ? 'Serviço atualizado' : 'Serviço cadastrado' });
      closeForm();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_services').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-services'] });
      toast({ title: 'Serviço removido' });
    },
  });

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || '', unit_price: s.unit_price.toString(), unit_label: s.unit_label || 'unidade', category: s.category || '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', description: '', unit_price: '', unit_label: 'unidade', category: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Catálogo de Serviços & Produtos</h2>
          <p className="text-sm text-gray-500">Cadastre itens para usar nas propostas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl h-10 gap-2 text-white" style={{ background: '#3000E3' }}>
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Novo Item</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#3000E312' }}>
            <Package className="h-6 w-6" style={{ color: '#3000E3' }} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Nenhum serviço cadastrado</h3>
          <p className="text-sm text-gray-500 mb-4">Cadastre seus serviços ou produtos</p>
          <Button onClick={() => setShowForm(true)} className="rounded-xl text-white" style={{ background: '#3000E3' }}>
            <Plus className="h-4 w-4 mr-1.5" /> Cadastrar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between hover:border-gray-200 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{s.name}</h3>
                  {s.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{s.category}</span>}
                </div>
                {s.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{s.description}</p>}
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  R$ {Number(s.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-xs text-gray-400 font-normal ml-1">/{s.unit_label}</span>
                </span>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => !v && closeForm()}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Item' : 'Novo Serviço / Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Consultoria Financeira" className="rounded-xl" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição breve do serviço" className="rounded-xl min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Preço Unitário *</label>
                <Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} placeholder="0,00" className="rounded-xl" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Unidade</label>
                <Input value={form.unit_label} onChange={e => setForm(p => ({ ...p, unit_label: e.target.value }))} placeholder="hora, unidade, mês" className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Ex: Marketing, TI, Design" className="rounded-xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm} className="flex-1 rounded-xl">Cancelar</Button>
              <Button type="submit" className="flex-1 rounded-xl text-white" style={{ background: '#3000E3' }} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
