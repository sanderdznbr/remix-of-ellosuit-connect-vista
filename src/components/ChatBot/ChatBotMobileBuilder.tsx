import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  Settings, Play, Pause, MessageSquare, GitBranch, Clock,
  Zap, Phone, Mail, Hash, Globe, Tag, UserPlus, Database,
  Send, Image, FileText, List, ToggleLeft, Bot, GripVertical,
  Pencil, MoreVertical, Sparkles, MessageCircle, Power, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { FlowNode, FlowEdge, BlockDefinition } from './types';
import ChatBotPropertiesPanel from './ChatBotPropertiesPanel';

const BRAND_COLOR = '#FF4500';

const iconMap: Record<string, React.ComponentType<any>> = {
  Phone, Mail, Hash, MessageSquare, Clock, Globe, ToggleLeft, Bot,
  List, Image, FileText, GitBranch, Database, Tag, UserPlus, Send, Zap
};

const nodeTypeLabels: Record<string, string> = {
  trigger: 'Gatilho',
  message: 'Mensagem',
  condition: 'Condição',
  action: 'Ação',
  delay: 'Delay',
};

const nodeTypeColors: Record<string, string> = {
  trigger: '#3B82F6',
  message: '#22C55E',
  condition: '#F59E0B',
  action: '#8B5CF6',
  delay: '#6B7280',
};

const BLOCK_CATEGORIES = [
  {
    id: 'start', label: 'Início', icon: Play,
    blocks: [
      { type: 'trigger' as const, subType: 'whatsapp_channel', label: 'Iniciar por canal', description: 'Inicia pelo WhatsApp', icon: 'Phone', defaultConfig: { sessionId: '', triggerWhen: 'any_message' } },
      { type: 'trigger' as const, subType: 'manual', label: 'Iniciar manualmente', description: 'Atendente ativa', icon: 'Zap', defaultConfig: {} },
    ]
  },
  {
    id: 'messages', label: 'Mensagens', icon: MessageSquare,
    blocks: [
      { type: 'message' as const, subType: 'text', label: 'Enviar mensagem', description: 'Texto simples', icon: 'MessageSquare', defaultConfig: { content: '' } },
      { type: 'message' as const, subType: 'buttons', label: 'Pedir escolha', description: 'Botões de opção', icon: 'List', defaultConfig: { content: '', buttons: [] } },
      { type: 'message' as const, subType: 'image', label: 'Enviar mídia', description: 'Imagem/vídeo/arquivo', icon: 'Image', defaultConfig: { url: '', caption: '' } },
    ]
  },
  {
    id: 'conditions', label: 'Condições', icon: GitBranch,
    blocks: [
      { type: 'condition' as const, subType: 'if_else', label: 'Definir condição', description: 'Regra if/else', icon: 'GitBranch', defaultConfig: { conditionType: 'user_response', operator: 'contains', value: '' } },
      { type: 'condition' as const, subType: 'check_time', label: 'Horários', description: 'Verificar horário', icon: 'Clock', defaultConfig: { startHour: 9, endHour: 18 } },
      { type: 'condition' as const, subType: 'multi', label: 'Multi-condicional', description: 'Múltiplas regras', icon: 'GitBranch', defaultConfig: { conditions: [{ id: 'cond_1', label: 'Condição 1', operator: 'contains', value: '' }] } },
    ]
  },
  {
    id: 'actions', label: 'Ações', icon: Zap,
    blocks: [
      { type: 'action' as const, subType: 'assign_tag', label: 'Atribuir Tag', description: 'Adicionar etiqueta', icon: 'Tag', defaultConfig: { tag: '' } },
      { type: 'action' as const, subType: 'transfer_human', label: 'Transferir Humano', description: 'Atendimento humano', icon: 'UserPlus', defaultConfig: { departmentName: '' } },
      { type: 'action' as const, subType: 'transfer_ai_agent', label: 'Transferir IA', description: 'Ativar agente IA', icon: 'Bot', defaultConfig: { agentId: '' } },
      { type: 'action' as const, subType: 'save_crm', label: 'Salvar no CRM', description: 'Salvar como lead', icon: 'Database', defaultConfig: { nameField: '{{nome}}' } },
      { type: 'action' as const, subType: 'call_api', label: 'Chamar API', description: 'Requisição externa', icon: 'Globe', defaultConfig: { url: '', method: 'POST' } },
    ]
  },
  {
    id: 'delays', label: 'Delays', icon: Clock,
    blocks: [
      { type: 'delay' as const, subType: 'wait_interval', label: 'Aguardar intervalo', description: 'Pausar por tempo', icon: 'Clock', defaultConfig: { seconds: 5 } },
      { type: 'delay' as const, subType: 'wait_until', label: 'Aguardar até', description: 'Pausar até data', icon: 'Clock', defaultConfig: { datetime: '' } },
    ]
  },
];

interface ChatBotMobileBuilderProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  flowName: string;
  isActive: boolean;
  isSaving: boolean;
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onFlowNameChange: (name: string) => void;
  onSave: () => void;
  onToggleActive: () => void;
  onBack: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<FlowNode>) => void;
}

const ChatBotMobileBuilder: React.FC<ChatBotMobileBuilderProps> = ({
  nodes,
  edges,
  flowName,
  isActive,
  isSaving,
  onNodesChange,
  onEdgesChange,
  onFlowNameChange,
  onSave,
  onToggleActive,
  onBack,
  onNodeUpdate,
}) => {
  const { toast } = useToast();
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [addAfterNodeId, setAddAfterNodeId] = useState<string | null>(null);

  const getNodeDescription = (node: FlowNode): string => {
    const config = node.data.config || {};
    switch (node.type) {
      case 'trigger':
        if (node.subType === 'whatsapp_channel') return config.sessionName || 'Selecione o canal';
        if (node.subType === 'keyword') return (config.keywords || []).slice(0, 2).join(', ') || 'Configure palavras-chave';
        return 'Configure o gatilho';
      case 'message':
        if (config.content) return config.content.length > 40 ? config.content.substring(0, 40) + '...' : config.content;
        return 'Configure a mensagem';
      case 'condition':
        if (node.subType === 'check_time') return `${config.startHour || 9}h - ${config.endHour || 18}h`;
        return 'Configure a condição';
      case 'action':
        if (node.subType === 'assign_tag') return config.tag ? `🏷️ ${config.tag}` : 'Configure a tag';
        if (node.subType === 'transfer_human') return config.departmentName || 'Transferir atendimento';
        if (node.subType === 'transfer_ai_agent') return 'Agente IA';
        return 'Configure a ação';
      case 'delay':
        if (node.subType === 'wait_interval') return `⏱️ ${config.seconds || 5}s`;
        return 'Configure o delay';
      default: return 'Configurar';
    }
  };

  // Build ordered list from edges
  const getOrderedNodes = (): FlowNode[] => {
    if (nodes.length === 0) return [];
    
    // Find root nodes (triggers or nodes with no incoming edges)
    const targetIds = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !targetIds.has(n.id));
    
    if (roots.length === 0) return nodes;

    const visited = new Set<string>();
    const ordered: FlowNode[] = [];
    const queue = [...roots];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      ordered.push(node);
      
      const nextEdges = edges.filter(e => e.source === node.id);
      for (const edge of nextEdges) {
        const target = nodes.find(n => n.id === edge.target);
        if (target && !visited.has(target.id)) queue.push(target);
      }
    }

    // Add any unconnected nodes
    nodes.forEach(n => {
      if (!visited.has(n.id)) ordered.push(n);
    });

    return ordered;
  };

  const handleAddBlock = (block: typeof BLOCK_CATEGORIES[0]['blocks'][0]) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: block.type,
      subType: block.subType,
      position: { x: 100, y: (nodes.length + 1) * 120 },
      data: { label: block.label, config: { ...block.defaultConfig, icon: block.icon } }
    };

    const updatedNodes = [...nodes, newNode];
    onNodesChange(updatedNodes);

    // Auto-connect to previous node
    if (addAfterNodeId) {
      const newEdge: FlowEdge = {
        id: `edge-${Date.now()}`,
        source: addAfterNodeId,
        target: newNode.id,
      };
      onEdgesChange([...edges, newEdge]);
    } else if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      const newEdge: FlowEdge = {
        id: `edge-${Date.now()}`,
        source: lastNode.id,
        target: newNode.id,
      };
      onEdgesChange([...edges, newEdge]);
    }

    setShowAddBlock(false);
    setAddAfterNodeId(null);
    setEditingNodeId(newNode.id);
    toast({ title: 'Bloco adicionado', description: block.label });
  };

  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (editingNodeId === nodeId) setEditingNodeId(null);
  };

  const handleMoveNode = (nodeId: string, direction: 'up' | 'down') => {
    const ordered = getOrderedNodes();
    const idx = ordered.findIndex(n => n.id === nodeId);
    if (idx < 0) return;
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= ordered.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = ordered[idx];
    ordered[idx] = ordered[swapIdx];
    ordered[swapIdx] = temp;

    // Rebuild edges
    const newEdges: FlowEdge[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      newEdges.push({
        id: `edge-${Date.now()}-${i}`,
        source: ordered[i].id,
        target: ordered[i + 1].id,
      });
    }

    onNodesChange(ordered);
    onEdgesChange(newEdges);
  };

  const orderedNodes = getOrderedNodes();
  const editingNode = nodes.find(n => n.id === editingNodeId) || null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-3 py-2.5 flex items-center gap-2 flex-shrink-0 safe-area-top">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <Input
            value={flowName}
            onChange={(e) => onFlowNameChange(e.target.value)}
            className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
          />
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] px-1.5 py-0 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleActive}
          className="h-8 rounded-lg gap-1 text-xs shrink-0"
        >
          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isActive ? 'Pausar' : 'Ativar'}
        </Button>

        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
          className="h-8 rounded-lg text-white text-xs shrink-0"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {isSaving ? '...' : 'Salvar'}
        </Button>
      </div>

      {/* Flow list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2 pb-24">
          {orderedNodes.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">Nenhum bloco no fluxo</p>
              <Button
                onClick={() => { setAddAfterNodeId(null); setShowAddBlock(true); }}
                className="rounded-xl text-white gap-2"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <Plus className="h-4 w-4" />
                Adicionar primeiro bloco
              </Button>
            </div>
          ) : (
            <>
              {orderedNodes.map((node, index) => {
                const Icon = iconMap[node.data.config?.icon] || MessageSquare;
                const typeColor = nodeTypeColors[node.type] || '#6B7280';

                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div
                      className={`bg-white rounded-xl border-2 transition-all ${
                        editingNodeId === node.id ? 'border-blue-400 shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 p-3">
                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0" onClick={() => setEditingNodeId(node.id)}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 truncate">{node.data.label}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                              style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                            >
                              {nodeTypeLabels[node.type]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{getNodeDescription(node)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400"
                            onClick={() => setEditingNodeId(node.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => handleMoveNode(node.id, 'up')} disabled={index === 0}>
                                <ChevronUp className="h-4 w-4 mr-2" /> Mover para cima
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMoveNode(node.id, 'down')} disabled={index === orderedNodes.length - 1}>
                                <ChevronDown className="h-4 w-4 mr-2" /> Mover para baixo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteNode(node.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Add between connector */}
                    {index < orderedNodes.length - 1 && (
                      <div className="flex items-center justify-center py-0.5">
                        <div className="w-px h-3 bg-gray-300" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 mx-1"
                          onClick={() => { setAddAfterNodeId(node.id); setShowAddBlock(true); }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <div className="w-px h-3 bg-gray-300" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Add at end */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setAddAfterNodeId(orderedNodes[orderedNodes.length - 1]?.id || null); setShowAddBlock(true); }}
                  className="rounded-xl gap-2 border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar bloco
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Block Sheet */}
      <Sheet open={showAddBlock} onOpenChange={setShowAddBlock}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="text-left">Adicionar Bloco</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 max-h-[55vh]">
            <div className="space-y-5 pb-6">
              {BLOCK_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <CatIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.blocks.map(block => {
                        const Icon = iconMap[block.icon] || MessageSquare;
                        return (
                          <button
                            key={`${block.type}-${block.subType}`}
                            onClick={() => handleAddBlock(block)}
                            className="p-3 rounded-xl border border-gray-200 bg-white text-left hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${BRAND_COLOR}15`, color: BRAND_COLOR }}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900 block leading-tight">{block.label}</span>
                                <span className="text-[10px] text-gray-500 block mt-0.5">{block.description}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit Node Sheet */}
      <Sheet open={!!editingNodeId} onOpenChange={(open) => { if (!open) setEditingNodeId(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] p-0">
          {editingNode && (
            <ChatBotPropertiesPanel
              node={editingNode}
              onClose={() => setEditingNodeId(null)}
              onUpdate={onNodeUpdate}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatBotMobileBuilder;
