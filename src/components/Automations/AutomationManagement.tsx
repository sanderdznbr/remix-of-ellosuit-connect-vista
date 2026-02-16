import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Workflow, Search, Pencil, BarChart3, Copy, Trash2, Power, Loader2, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const BRAND_COLOR = '#FF4500';

interface AutomationRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  execution_count: number | null;
  created_at: string;
  updated_at: string;
}

const AutomationManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState<AutomationRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      const cid = user.user_metadata?.company_id;
      if (cid) { setCompanyId(cid); return; }
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) setCompanyId(data.company_id);
    };
    getCompanyId();
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      setLoading(true);
      const { data } = await supabase
        .from('automations')
        .select('id, name, description, is_active, trigger_type, execution_count, created_at, updated_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (data) setItems(data as AutomationRow[]);
      setLoading(false);
    };
    load();
  }, [companyId]);

  const openEdit = (item: AutomationRow) => {
    setEditItem(item);
    setEditName(item.name);
    setEditDesc(item.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const { error } = await supabase.from('automations').update({ name: editName, description: editDesc || null }).eq('id', editItem.id);
    if (!error) {
      setItems(prev => prev.map(a => a.id === editItem.id ? { ...a, name: editName, description: editDesc || null } : a));
      toast({ title: 'Salvo', description: 'Automação atualizada' });
      setEditItem(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta automação?')) return;
    await supabase.from('automations').delete().eq('id', id);
    setItems(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Excluída', description: 'Automação removida' });
  };

  const handleToggle = async (item: AutomationRow) => {
    const next = !item.is_active;
    const { error } = await supabase.from('automations').update({ is_active: next }).eq('id', item.id);
    if (!error) {
      setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: next } : a));
      toast({ title: next ? 'Ativada' : 'Desativada' });
    }
  };

  const handleDuplicate = async (item: AutomationRow) => {
    if (!companyId || !user?.id) return;
    // fetch full record for nodes/edges
    const { data: full } = await supabase.from('automations').select('*').eq('id', item.id).single();
    if (!full) return;
    const { data, error } = await supabase
      .from('automations')
      .insert({
        company_id: companyId,
        created_by: user.id,
        name: `${item.name} (cópia)`,
        description: item.description,
        is_active: false,
        nodes: full.nodes as any,
        edges: full.edges as any,
        trigger_type: full.trigger_type,
        trigger_config: full.trigger_config,
      })
      .select('id, name, description, is_active, trigger_type, execution_count, created_at, updated_at')
      .single();
    if (!error && data) {
      setItems(prev => [data as AutomationRow, ...prev]);
      toast({ title: 'Duplicada!' });
    }
  };

  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    if (diff < 7) return `${diff} dias atrás`;
    if (diff < 30) return `${Math.floor(diff / 7)} sem. atrás`;
    return `${Math.floor(diff / 30)} meses atrás`;
  };

  const triggerLabel = (t: string) => {
    const map: Record<string, string> = {
      webhook: 'Webhook',
      new_client: 'Novo Cliente',
      updated_client: 'Cliente Atualizado',
      schedule: 'Agendado',
      manual: 'Manual',
    };
    return map[t] || t;
  };

  const filtered = items
    .filter(a => filter === 'all' || (filter === 'active' ? a.is_active : !a.is_active))
    .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(a => a.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Automações</h1>
          <p className="text-gray-500 mt-1">Crie e gerencie fluxos automatizados para sua organização.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Search + Actions */}
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 bg-gray-50 rounded-xl focus:bg-white"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] rounded-xl border-gray-200">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button
              onClick={() => navigate('/dashboard/automacoes/builder')}
              className="rounded-xl gap-2 text-white"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <Plus className="h-4 w-4" />
              Criar automação
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_140px_140px_140px_100px_120px] gap-4 px-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onCheckedChange={toggleAll}
              />
            </div>
            <div>Nome</div>
            <div>Gatilho</div>
            <div>Criado em</div>
            <div>Atualizado em</div>
            <div>Execuções</div>
            <div className="text-right">Ações</div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Workflow className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma automação encontrada</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Tente uma busca diferente' : 'Crie sua primeira automação para começar'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => navigate('/dashboard/automacoes/builder')}
                  style={{ backgroundColor: BRAND_COLOR }}
                  className="text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Automação
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[40px_1fr_140px_140px_140px_100px_120px] gap-4 px-4 py-4 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    {item.description && <div className="text-xs text-gray-400 truncate">{item.description}</div>}
                  </div>

                  <div>
                    <Badge variant="secondary" className="text-xs rounded-full">
                      {triggerLabel(item.trigger_type)}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-500">{formatDate(item.created_at)}</div>
                  <div className="text-sm text-gray-500">{formatDate(item.updated_at)}</div>
                  <div className="text-sm text-gray-900 font-medium">{item.execution_count || 0}</div>

                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      title="Editar nome/descrição"
                      onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      title="Abrir no builder"
                      onClick={() => navigate(`/dashboard/automacoes/builder?id=${item.id}`)}>
                      <Workflow className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm"
                      className={`h-8 w-8 p-0 ${item.is_active ? 'text-green-600 hover:text-red-600' : 'text-gray-500 hover:text-green-600'}`}
                      title={item.is_active ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggle(item)}>
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      title="Duplicar"
                      onClick={() => handleDuplicate(item)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                      title="Excluir"
                      onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Automação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome da automação" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição (opcional)" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={!editName.trim()} style={{ backgroundColor: BRAND_COLOR }} className="text-white">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AutomationManagement;
