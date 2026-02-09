import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, Save, Play, ArrowLeft, Plus, BarChart3,
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
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ChatBotSidebar from './ChatBotSidebar';
import ChatBotCanvas from './ChatBotCanvas';
import ChatBotPropertiesPanel from './ChatBotPropertiesPanel';
import { FlowNode, FlowEdge, BlockDefinition, ChatBotFlow } from './types';

const BRAND_COLOR = '#FF4500';

const ChatBotBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [flows, setFlows] = useState<ChatBotFlow[]>([]);
  const [currentFlow, setCurrentFlow] = useState<ChatBotFlow | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [isSaving, setIsSaving] = useState(false);
  const [showNewFlowDialog, setShowNewFlowDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [loading, setLoading] = useState(true);

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    getCompanyId();
  }, [user?.id]);

  // Load flows
  useEffect(() => {
    const loadFlows = async () => {
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from('chatbot_flows')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        // Cast the data to ChatBotFlow type with proper unknown intermediate
        const typedFlows = data.map(flow => ({
          ...flow,
          nodes: (Array.isArray(flow.nodes) ? flow.nodes : []) as unknown as FlowNode[],
          edges: (Array.isArray(flow.edges) ? flow.edges : []) as unknown as FlowEdge[],
          trigger_config: flow.trigger_config as Record<string, any> | undefined
        })) as ChatBotFlow[];
        setFlows(typedFlows);
        
        // Load first flow if exists
        if (typedFlows.length > 0 && !currentFlow) {
          selectFlow(typedFlows[0]);
        }
      }
      setLoading(false);
    };
    
    loadFlows();
  }, [companyId]);

  const selectFlow = (flow: ChatBotFlow) => {
    setCurrentFlow(flow);
    setFlowName(flow.name);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setSelectedNodeId(null);
  };

  const handleDragStart = useCallback((block: BlockDefinition) => {
    // Optional: track drag state
  }, []);

  const handleNodeSelect = useCallback((node: FlowNode | null) => {
    setSelectedNodeId(node?.id || null);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  }, []);

  const saveFlow = async () => {
    if (!companyId || !user?.id) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (currentFlow) {
        // Update existing flow
        const { error } = await supabase
          .from('chatbot_flows')
          .update({
            name: flowName,
            nodes: nodes as any,
            edges: edges as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentFlow.id);
        
        if (error) throw error;
        
        setFlows(prev => prev.map(f => 
          f.id === currentFlow.id 
            ? { ...f, name: flowName, nodes, edges, updated_at: new Date().toISOString() }
            : f
        ));
      } else {
        // Create new flow
        const { data, error } = await supabase
          .from('chatbot_flows')
          .insert({
            company_id: companyId,
            created_by: user.id,
            name: flowName,
            nodes: nodes as any,
            edges: edges as any
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const newFlow = {
          ...data,
          nodes: (Array.isArray(data.nodes) ? data.nodes : []) as unknown as FlowNode[],
          edges: (Array.isArray(data.edges) ? data.edges : []) as unknown as FlowEdge[]
        } as ChatBotFlow;
        
        setFlows(prev => [newFlow, ...prev]);
        setCurrentFlow(newFlow);
      }
      
      toast({ title: 'Salvo!', description: 'Fluxo salvo com sucesso' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar fluxo', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const createNewFlow = async () => {
    if (!newFlowName.trim() || !companyId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('chatbot_flows')
        .insert({
          company_id: companyId,
          created_by: user.id,
          name: newFlowName,
          nodes: [],
          edges: []
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newFlow = {
        ...data,
        nodes: [] as FlowNode[],
        edges: [] as FlowEdge[]
      } as ChatBotFlow;
      
      setFlows(prev => [newFlow, ...prev]);
      selectFlow(newFlow);
      setShowNewFlowDialog(false);
      setNewFlowName('');
      toast({ title: 'Criado!', description: 'Novo fluxo criado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const toggleFlowActive = async () => {
    if (!currentFlow) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_flows')
        .update({ is_active: !currentFlow.is_active })
        .eq('id', currentFlow.id);
      
      if (error) throw error;
      
      setCurrentFlow(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      setFlows(prev => prev.map(f => 
        f.id === currentFlow.id ? { ...f, is_active: !f.is_active } : f
      ));
      
      toast({ 
        title: currentFlow.is_active ? 'Desativado' : 'Ativado',
        description: `Fluxo ${currentFlow.is_active ? 'desativado' : 'ativado'} com sucesso`
      });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const deleteFlow = async () => {
    if (!currentFlow) return;
    
    if (!confirm(`Excluir o fluxo "${currentFlow.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chatbot_flows')
        .delete()
        .eq('id', currentFlow.id);
      
      if (error) throw error;
      
      const remaining = flows.filter(f => f.id !== currentFlow.id);
      setFlows(remaining);
      
      if (remaining.length > 0) {
        selectFlow(remaining[0]);
      } else {
        setCurrentFlow(null);
        setNodes([]);
        setEdges([]);
        setFlowName('Novo Fluxo');
      }
      
      toast({ title: 'Excluído', description: 'Fluxo removido com sucesso' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/omni')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
                placeholder="Nome do fluxo"
              />
              <div className="flex items-center gap-2 mt-0.5">
                {currentFlow?.is_active ? (
                  <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Inativo
                  </Badge>
                )}
                {currentFlow && (
                  <span className="text-[10px] text-gray-400">
                    {currentFlow.execution_count} execuções
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flow Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <span className="max-w-[100px] truncate">{currentFlow?.name || 'Selecionar'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowNewFlowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Fluxo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {flows.map(flow => (
                <DropdownMenuItem 
                  key={flow.id} 
                  onClick={() => selectFlow(flow)}
                  className={currentFlow?.id === flow.id ? 'bg-gray-100' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{flow.name}</span>
                    {flow.is_active && (
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {currentFlow && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleFlowActive}
                className="gap-2"
              >
                {currentFlow.is_active ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Ativar
                  </>
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Estatísticas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={deleteFlow} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Fluxo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Button 
            onClick={saveFlow} 
            disabled={isSaving}
            className="gap-2"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ChatBotSidebar onDragStart={handleDragStart} />
        
        <ChatBotCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
        
        {selectedNode && (
          <ChatBotPropertiesPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleNodeUpdate}
          />
        )}
      </div>

      {/* New Flow Dialog */}
      <Dialog open={showNewFlowDialog} onOpenChange={setShowNewFlowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Nome do fluxo"
              onKeyDown={(e) => e.key === 'Enter' && createNewFlow()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFlowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createNewFlow} disabled={!newFlowName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatBotBuilder;
