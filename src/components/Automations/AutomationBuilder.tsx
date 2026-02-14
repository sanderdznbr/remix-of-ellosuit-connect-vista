
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Workflow, Save, Play, ArrowLeft, Plus, BarChart3,
  Pause, Settings, ChevronDown, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AutomationSidebar from './AutomationSidebar';
import AutomationCanvas from './AutomationCanvas';
import AutomationPropertiesPanel from './AutomationPropertiesPanel';
import { AutomationNode, AutomationEdge, AutomationBlockDefinition, Automation, AUTOMATION_BLOCKS } from './types';

const BRAND_COLOR = '#3000E3';

export default function AutomationBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useAuth();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [current, setCurrent] = useState<Automation | null>(null);
  const [nodes, setNodes] = useState<AutomationNode[]>([]);
  const [edges, setEdges] = useState<AutomationEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('Nova Automação');
  const [isSaving, setIsSaving] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastDraggedBlock, setLastDraggedBlock] = useState<AutomationBlockDefinition | null>(null);

  // Get company
  useEffect(() => {
    const get = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data?.company_id) setCompanyId(data.company_id);
    };
    get();
  }, [user?.id]);

  // Load automations
  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const typed = data.map(a => ({
          ...a,
          nodes: (Array.isArray(a.nodes) ? a.nodes : []) as unknown as AutomationNode[],
          edges: (Array.isArray(a.edges) ? a.edges : []) as unknown as AutomationEdge[],
          trigger_config: (a.trigger_config || {}) as Record<string, any>,
          actions: (Array.isArray(a.actions) ? a.actions : []) as Record<string, any>[],
        })) as Automation[];
        setAutomations(typed);
        if (editId) {
          const target = typed.find(a => a.id === editId);
          if (target) selectAutomation(target);
        } else if (typed.length > 0 && !current) {
          selectAutomation(typed[0]);
        }
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const selectAutomation = (a: Automation) => {
    setCurrent(a);
    setFlowName(a.name);
    setNodes(a.nodes || []);
    setEdges(a.edges || []);
    setSelectedNodeId(null);
  };

  const handleDragStart = useCallback((block: AutomationBlockDefinition) => {
    setLastDraggedBlock(block);
  }, []);

  const handleNodeSelect = useCallback((node: AutomationNode | null) => {
    setSelectedNodeId(node?.id || null);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<AutomationNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  // Override canvas onNodesChange to set the block type on drop
  const handleNodesChange = useCallback((newNodes: AutomationNode[]) => {
    if (lastDraggedBlock && newNodes.length > nodes.length) {
      const lastNode = newNodes[newNodes.length - 1];
      if (lastNode.type === 'unknown') {
        lastNode.type = lastDraggedBlock.type;
        lastNode.label = lastDraggedBlock.label;
        lastNode.config = { ...lastDraggedBlock.defaultConfig };
      }
      setLastDraggedBlock(null);
    }
    setNodes(newNodes);
  }, [lastDraggedBlock, nodes.length]);

  const saveAutomation = async () => {
    if (!companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const triggerNode = nodes.find(n => {
        const block = AUTOMATION_BLOCKS.find(b => b.type === n.type);
        return block?.category === 'trigger';
      });

      if (current) {
        const { error } = await supabase
          .from('automations')
          .update({
            name: flowName,
            nodes: nodes as any,
            edges: edges as any,
            trigger_type: triggerNode?.type || 'manual',
            trigger_config: triggerNode?.config || {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id);
        if (error) throw error;
        setAutomations(prev => prev.map(a => a.id === current.id ? { ...a, name: flowName, nodes, edges, updated_at: new Date().toISOString() } : a));
      } else {
        const { data, error } = await supabase
          .from('automations')
          .insert({
            company_id: companyId,
            created_by: user.id,
            name: flowName,
            nodes: nodes as any,
            edges: edges as any,
            trigger_type: triggerNode?.type || 'manual',
            trigger_config: triggerNode?.config || {},
          })
          .select()
          .single();
        if (error) throw error;
        const newA = { ...data, nodes: nodes, edges: edges, trigger_config: data.trigger_config || {}, actions: [] } as unknown as Automation;
        setAutomations(prev => [newA, ...prev]);
        setCurrent(newA);
      }
      toast({ title: 'Salvo!', description: 'Automação salva com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const createNew = async () => {
    if (!newName.trim() || !companyId || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('automations')
        .insert({ company_id: companyId, created_by: user.id, name: newName, nodes: [], edges: [] })
        .select()
        .single();
      if (error) throw error;
      const newA = { ...data, nodes: [] as AutomationNode[], edges: [] as AutomationEdge[], trigger_config: {}, actions: [] } as unknown as Automation;
      setAutomations(prev => [newA, ...prev]);
      selectAutomation(newA);
      setShowNewDialog(false);
      setNewName('');
      toast({ title: 'Criado!', description: 'Nova automação criada' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async () => {
    if (!current) return;
    try {
      const { error } = await supabase.from('automations').update({ is_active: !current.is_active }).eq('id', current.id);
      if (error) throw error;
      setCurrent(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      setAutomations(prev => prev.map(a => a.id === current.id ? { ...a, is_active: !a.is_active } : a));
      toast({ title: current.is_active ? 'Desativada' : 'Ativada' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const deleteAutomation = async () => {
    if (!current) return;
    if (!confirm(`Excluir "${current.name}"?`)) return;
    try {
      const { error } = await supabase.from('automations').delete().eq('id', current.id);
      if (error) throw error;
      const remaining = automations.filter(a => a.id !== current.id);
      setAutomations(remaining);
      if (remaining.length > 0) selectAutomation(remaining[0]);
      else { setCurrent(null); setNodes([]); setEdges([]); setFlowName('Nova Automação'); }
      toast({ title: 'Excluída' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_COLOR }} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/automacoes')} className="rounded-xl hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_COLOR}dd)` }}>
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <div>
              <Input
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
                className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
                placeholder="Nome da automação"
              />
              <div className="flex items-center gap-2 mt-0.5">
                {current?.is_active ? (
                  <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 rounded-full">Ativa</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">Inativa</Badge>
                )}
                {current && (
                  <span className="text-[10px] text-gray-400">{current.execution_count || 0} execuções</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flow Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <span className="max-w-[100px] truncate">{current?.name || 'Selecionar'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={() => setShowNewDialog(true)} className="rounded-lg">
                <Plus className="h-4 w-4 mr-2" /> Nova Automação
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {automations.map(a => (
                <DropdownMenuItem key={a.id} onClick={() => selectAutomation(a)}
                  className={`rounded-lg ${current?.id === a.id ? 'bg-gray-100' : ''}`}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{a.name}</span>
                    {a.is_active && <div className="w-2 h-2 rounded-full bg-green-500" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {current && (
            <>
              <Button variant="outline" size="sm" onClick={toggleActive} className="gap-2 rounded-xl">
                {current.is_active ? <><Pause className="h-4 w-4" />Pausar</> : <><Play className="h-4 w-4" />Ativar</>}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem className="rounded-lg">
                    <BarChart3 className="h-4 w-4 mr-2" /> Ver Execuções
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={deleteAutomation} className="text-red-600 rounded-lg">
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Button onClick={saveAutomation} disabled={isSaving}
            className="gap-2 rounded-xl text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_COLOR}dd)` }}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <AutomationSidebar onDragStart={handleDragStart} />
        <AutomationCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={setEdges}
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
          isActive={current?.is_active || false}
        />
        {selectedNode && (
          <AutomationPropertiesPanel
            node={selectedNode}
            automationId={current?.id || null}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleNodeUpdate}
          />
        )}
      </div>

      {/* New Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Criar Nova Automação</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da automação"
              className="rounded-xl" onKeyDown={e => e.key === 'Enter' && createNew()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={createNew} disabled={!newName.trim()} className="rounded-xl text-white"
              style={{ backgroundColor: BRAND_COLOR }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
