import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown,
  Settings, Play, Pause, MessageSquare, GitBranch, Clock,
  Zap, Phone, Mail, Hash, Globe, Tag, UserPlus, Database,
  Send, Image, FileText, List, ToggleLeft, Bot, GripVertical,
  X, Sparkles, MessageCircle, Search, Check, XCircle, Copy
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
import { FlowNode, FlowEdge, BlockDefinition, BlockCategory } from './types';
import ChatBotPropertiesPanel from './ChatBotPropertiesPanel';
import { cn } from '@/lib/utils';

const BRAND_COLOR = '#FF4500';
const NODE_WIDTH = 220;

const iconMap: Record<string, React.ComponentType<any>> = {
  Phone, Mail, Hash, MessageSquare, Clock, Globe, ToggleLeft, Bot,
  List, Image, FileText, GitBranch, Database, Tag, UserPlus, Send, Zap
};

const nodeColors: Record<string, string> = {
  trigger: '#3B82F6',
  message: '#22C55E',
  condition: '#F59E0B',
  action: '#8B5CF6',
  delay: '#6B7280',
};

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'start', label: 'INÍCIO', color: BRAND_COLOR,
    blocks: [
      { type: 'trigger', subType: 'whatsapp_channel', label: 'Iniciar por canal', description: 'Inicia pelo WhatsApp', icon: 'Phone', defaultConfig: { sessionId: '', triggerWhen: 'any_message' } },
      { type: 'trigger', subType: 'manual', label: 'Iniciar manualmente', description: 'Atendente ativa', icon: 'Zap', defaultConfig: {} },
    ]
  },
  {
    id: 'messages', label: 'MENSAGENS', color: BRAND_COLOR,
    blocks: [
      { type: 'message', subType: 'text', label: 'Enviar mensagem', description: 'Texto simples', icon: 'MessageSquare', defaultConfig: { content: '' } },
      { type: 'message', subType: 'buttons', label: 'Pedir escolha', description: 'Botões de opção', icon: 'List', defaultConfig: { content: '', buttons: [] } },
      { type: 'message', subType: 'image', label: 'Enviar mídia', description: 'Imagem/vídeo/arquivo', icon: 'Image', defaultConfig: { url: '', caption: '' } },
    ]
  },
  {
    id: 'conditions', label: 'CONDIÇÃO', color: BRAND_COLOR,
    blocks: [
      { type: 'condition', subType: 'if_else', label: 'Definir condição', description: 'Regra if/else', icon: 'GitBranch', defaultConfig: { conditionType: 'user_response', operator: 'contains', value: '' } },
      { type: 'condition', subType: 'time', label: 'Horários', description: 'Verificar horário', icon: 'Clock', defaultConfig: { startHour: 9, endHour: 18 } },
      { type: 'condition', subType: 'multi', label: 'Multi-condicional', description: 'Múltiplas regras', icon: 'GitBranch', defaultConfig: { conditions: [{ id: 'cond_1', label: 'Condição 1', operator: 'contains', value: '' }] } },
    ]
  },
  {
    id: 'actions', label: 'AÇÕES', color: BRAND_COLOR,
    blocks: [
      { type: 'action', subType: 'assign_tag', label: 'Atribuir Tag', description: 'Adicionar etiqueta', icon: 'Tag', defaultConfig: { tag: '' } },
      { type: 'action', subType: 'transfer_human', label: 'Transferir Humano', description: 'Atendimento humano', icon: 'UserPlus', defaultConfig: { departmentName: '' } },
      { type: 'action', subType: 'transfer_ai_agent', label: 'Transferir IA', description: 'Ativar agente IA', icon: 'Bot', defaultConfig: { agentId: '' } },
      { type: 'action', subType: 'save_crm', label: 'Salvar no CRM', description: 'Salvar como lead', icon: 'Database', defaultConfig: { nameField: '{{nome}}' } },
      { type: 'action', subType: 'call_api', label: 'Chamar API', description: 'Requisição externa', icon: 'Globe', defaultConfig: { url: '', method: 'POST' } },
    ]
  },
  {
    id: 'delays', label: 'DELAYS', color: BRAND_COLOR,
    blocks: [
      { type: 'delay', subType: 'wait_interval', label: 'Aguardar intervalo', description: 'Pausar por tempo', icon: 'Clock', defaultConfig: { seconds: 5 } },
      { type: 'delay', subType: 'wait_until', label: 'Aguardar até', description: 'Pausar até data', icon: 'Clock', defaultConfig: { datetime: '' } },
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
  nodes, edges, flowName, isActive, isSaving,
  onNodesChange, onEdgesChange, onFlowNameChange,
  onSave, onToggleActive, onBack, onNodeUpdate,
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas state
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 40, y: 20 });

  // Touch state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Connection state
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handle?: string } | null>(null);

  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const editingNode = nodes.find(n => n.id === editingNodeId) || null;

  // --- Touch handlers ---
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (draggingNode) return;
    if (e.touches.length === 2) {
      setLastTouchDist(getTouchDist(e.touches));
      return;
    }
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    }
  }, [offset, draggingNode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Pinch-to-zoom
    if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = getTouchDist(e.touches);
      if (dist !== null) {
        const delta = dist / lastTouchDist;
        setScale(prev => Math.min(Math.max(prev * delta, 0.3), 2));
        setLastTouchDist(dist);
      }
      return;
    }

    // Node dragging
    if (draggingNode && e.touches.length === 1 && canvasRef.current) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.touches[0].clientX - rect.left - offset.x) / scale - dragOffset.x;
      const newY = (e.touches[0].clientY - rect.top - offset.y) / scale - dragOffset.y;
      onNodesChange(nodes.map(n =>
        n.id === draggingNode ? { ...n, position: { x: newX, y: newY } } : n
      ));
      return;
    }

    // Panning
    if (isPanning && e.touches.length === 1) {
      setOffset({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
    }
  }, [isPanning, panStart, draggingNode, dragOffset, nodes, onNodesChange, scale, offset, lastTouchDist]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
    setLastTouchDist(null);
  }, []);

  // Node drag start (from grip)
  const handleNodeGripTouch = (e: React.TouchEvent, nodeId: string, nodePos: { x: number; y: number }) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.touches[0].clientX - rect.left - offset.x) / scale;
    const mouseY = (e.touches[0].clientY - rect.top - offset.y) / scale;
    setDraggingNode(nodeId);
    setDragOffset({ x: mouseX - nodePos.x, y: mouseY - nodePos.y });
  };

  // Connection: tap output → tap input
  const handleOutputTap = (nodeId: string, handle?: string) => {
    if (connectingFrom) {
      // Already connecting, cancel
      setConnectingFrom(null);
      return;
    }
    setConnectingFrom({ nodeId, handle });
    toast({ title: 'Conectando...', description: 'Toque no ponto de entrada do bloco de destino' });
  };

  const handleInputTap = (nodeId: string) => {
    if (!connectingFrom || connectingFrom.nodeId === nodeId) {
      setConnectingFrom(null);
      return;
    }
    const exists = edges.some(e => e.source === connectingFrom.nodeId && e.target === nodeId && e.sourceHandle === connectingFrom.handle);
    if (!exists) {
      onEdgesChange([...edges, {
        id: `edge-${Date.now()}`,
        source: connectingFrom.nodeId,
        target: nodeId,
        sourceHandle: connectingFrom.handle,
      }]);
      toast({ title: 'Conectado!' });
    }
    setConnectingFrom(null);
  };

  // Add block from sidebar
  const handleAddBlock = (block: BlockDefinition) => {
    const centerX = (-offset.x + 160) / scale;
    const centerY = (-offset.y + 300) / scale;
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: block.type,
      subType: block.subType,
      position: { x: centerX, y: centerY + nodes.length * 120 },
      data: { label: block.label, config: { ...block.defaultConfig, icon: block.icon } }
    };
    onNodesChange([...nodes, newNode]);
    setShowSidebar(false);
    setEditingNodeId(newNode.id);
    toast({ title: 'Bloco adicionado', description: block.label });
  };

  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (editingNodeId === nodeId) setEditingNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    onEdgesChange(edges.filter(e => e.id !== edgeId));
  };

  // --- Node description ---
  const getNodeDescription = (node: FlowNode): string => {
    const config = node.data.config || {};
    switch (node.type) {
      case 'trigger':
        if (node.subType === 'whatsapp_channel') return config.sessionName || 'Selecione o canal';
        return 'Configure o gatilho';
      case 'message':
        if (config.content) return config.content.length > 25 ? config.content.substring(0, 25) + '...' : config.content;
        return 'Configure a mensagem';
      case 'condition':
        if (node.subType === 'time') return `${config.startHour || 9}h - ${config.endHour || 18}h`;
        return 'Configure a condição';
      case 'action':
        if (node.subType === 'assign_tag') return config.tag ? `🏷️ ${config.tag}` : 'Configure a tag';
        if (node.subType === 'transfer_human') return config.departmentName || 'Transferir atendimento';
        return 'Configure a ação';
      case 'delay':
        if (node.subType === 'wait_interval') return `⏱️ ${config.seconds || 5}s`;
        return 'Configure o delay';
      default: return 'Configurar';
    }
  };

  // --- Render edge ---
  const renderEdge = (edge: FlowEdge) => {
    const src = nodes.find(n => n.id === edge.source);
    const tgt = nodes.find(n => n.id === edge.target);
    if (!src || !tgt) return null;

    const srcX = src.position.x + NODE_WIDTH;
    let srcY = src.position.y + 35;
    if (edge.sourceHandle === 'yes') srcY = src.position.y + 50;
    if (edge.sourceHandle === 'no') srcY = src.position.y + 75;

    const tgtX = tgt.position.x;
    const tgtY = tgt.position.y + 35;
    const midX = (srcX + tgtX) / 2;
    const path = `M ${srcX} ${srcY} C ${midX} ${srcY}, ${midX} ${tgtY}, ${tgtX} ${tgtY}`;

    const handleColors: Record<string, string> = { yes: '#22C55E', no: '#EF4444', else: '#94A3B8' };
    const edgeColor = handleColors[edge.sourceHandle || ''] || '#94A3B8';

    return (
      <g key={edge.id}>
        <path d={path} fill="none" stroke="transparent" strokeWidth={20}
          onClick={() => handleDeleteEdge(edge.id)} style={{ cursor: 'pointer' }} />
        <path d={path} fill="none" stroke={edgeColor} strokeWidth={2} markerEnd="url(#arrowhead-mobile)" className="pointer-events-none" />
      </g>
    );
  };

  // Filtered sidebar blocks
  const filteredCategories = BLOCK_CATEGORIES.map(cat => ({
    ...cat,
    blocks: cat.blocks.filter(b =>
      b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.blocks.length > 0);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-3 py-2 flex items-center gap-2 flex-shrink-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <Input
            value={flowName}
            onChange={(e) => onFlowNameChange(e.target.value)}
            className="h-6 text-xs font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
          />
          <Badge className={`text-[9px] px-1 py-0 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <Button variant="outline" size="sm" onClick={onToggleActive} className="h-7 text-[10px] px-2 shrink-0">
          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>

        <Button onClick={onSave} disabled={isSaving} size="sm"
          className="h-7 text-white text-[10px] px-2 shrink-0" style={{ backgroundColor: BRAND_COLOR }}>
          <Save className="h-3 w-3" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden touch-none"
        style={{ background: '#f8fafc' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`
          }}
        />

        {/* Transformed content */}
        <div
          className="absolute inset-0"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
            <defs>
              <marker id="arrowhead-mobile" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
              </marker>
            </defs>
            <g style={{ pointerEvents: 'auto' }}>
              {edges.map(renderEdge)}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const color = nodeColors[node.type] || '#6B7280';
            const Icon = iconMap[node.data.config?.icon] || MessageSquare;
            const isCondition = node.type === 'condition' && (node.subType === 'if_else' || node.subType === 'time' || node.subType === 'weekday');
            const isMulti = node.type === 'condition' && node.subType === 'multi';
            const multiConds = isMulti ? (node.data.config?.conditions || []) : [];
            const isButtons = node.subType === 'buttons';
            const btnOpts = isButtons ? (node.data.config?.buttons || []) : [];

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  width: NODE_WIDTH,
                  pointerEvents: 'auto',
                }}
                className={cn(
                  'bg-white rounded-xl shadow-md border-2 transition-all select-none',
                  editingNodeId === node.id ? 'border-blue-400 shadow-lg' : 'border-gray-200',
                  connectingFrom ? 'border-dashed' : '',
                  draggingNode === node.id ? 'opacity-70' : ''
                )}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl"
                  style={{ backgroundColor: `${color}12` }}
                >
                  <div
                    className="cursor-grab p-0.5 rounded"
                    onTouchStart={(e) => handleNodeGripTouch(e, node.id, node.position)}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color }}>{node.data.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    className="p-1 rounded hover:bg-red-100"
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                </div>

                {/* Content - tap to edit */}
                <div className="px-3 py-2" onClick={() => setEditingNodeId(node.id)}>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{getNodeDescription(node)}</p>
                  {isButtons && btnOpts.length > 0 && (
                    <div className="mt-1.5 space-y-1 border-t pt-1.5">
                      {btnOpts.map((btn: string, i: number) => (
                        <div key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 truncate">{btn}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input point (left) */}
                <div
                  className={cn(
                    'absolute -left-2.5 top-1/2 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center',
                    connectingFrom ? 'border-blue-400 bg-blue-50 animate-pulse' : 'border-gray-300'
                  )}
                  style={{ transform: 'translateY(-50%)' }}
                  onClick={() => handleInputTap(node.id)}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                </div>

                {/* Output points (right) */}
                {isCondition ? (
                  <>
                    <div
                      className="absolute -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-green-500 flex items-center justify-center"
                      style={{ top: 40 }}
                      onClick={() => handleOutputTap(node.id, 'yes')}
                    >
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    </div>
                    <div
                      className="absolute -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-red-500 flex items-center justify-center"
                      style={{ top: 65 }}
                      onClick={() => handleOutputTap(node.id, 'no')}
                    >
                      <XCircle className="h-2.5 w-2.5 text-red-500" />
                    </div>
                  </>
                ) : isMulti && multiConds.length > 0 ? (
                  <>
                    {multiConds.map((c: any, i: number) => {
                      const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
                      return (
                        <div key={c.id}
                          className="absolute -right-2.5 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center"
                          style={{ top: 40 + i * 22, borderColor: colors[i % colors.length] }}
                          onClick={() => handleOutputTap(node.id, c.id)}
                        >
                          <span className="text-[8px] font-bold" style={{ color: colors[i % colors.length] }}>{i + 1}</span>
                        </div>
                      );
                    })}
                    <div
                      className="absolute -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-gray-400 flex items-center justify-center"
                      style={{ top: 40 + multiConds.length * 22 }}
                      onClick={() => handleOutputTap(node.id, 'else')}
                    >
                      <span className="text-[8px] font-bold text-gray-400">✕</span>
                    </div>
                  </>
                ) : isButtons && btnOpts.length > 0 ? (
                  <>
                    {btnOpts.map((_: string, i: number) => {
                      const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
                      return (
                        <div key={i}
                          className="absolute -right-2.5 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center"
                          style={{ top: 70 + i * 24, borderColor: colors[i % colors.length] }}
                          onClick={() => handleOutputTap(node.id, `btn_${i}`)}
                        >
                          <span className="text-[8px] font-bold" style={{ color: colors[i % colors.length] }}>{i + 1}</span>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div
                    className={cn(
                      'absolute -right-2.5 top-1/2 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center',
                      connectingFrom?.nodeId === node.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    )}
                    style={{ transform: 'translateY(-50%)' }}
                    onClick={() => handleOutputTap(node.id)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <GitBranch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">Canvas vazio</p>
              <Button
                onClick={() => setShowSidebar(true)}
                className="rounded-xl text-white gap-1.5 pointer-events-auto"
                size="sm"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <Plus className="h-4 w-4" /> Adicionar bloco
              </Button>
            </div>
          </div>
        )}

        {/* Connecting mode indicator */}
        {connectingFrom && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Toque no destino
            <button onClick={() => setConnectingFrom(null)} className="ml-1"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white rounded-lg shadow p-1 border z-10">
          <button onClick={() => setScale(s => Math.min(s * 1.2, 2))} className="p-1.5 hover:bg-gray-100 rounded text-xs font-bold">+</button>
          <span className="text-[10px] text-gray-500 min-w-[32px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(s * 0.8, 0.3))} className="p-1.5 hover:bg-gray-100 rounded text-xs font-bold">−</button>
        </div>

        {/* FAB: Add block */}
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute bottom-3 left-3 w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white z-10"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar Sheet */}
      <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
        <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
          <div className="p-4 border-b">
            <SheetTitle className="text-left mb-3">Blocos</SheetTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 rounded-xl"
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-130px)]">
            <div className="p-4 space-y-5">
              {filteredCategories.map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.blocks.map(block => {
                      const BIcon = iconMap[block.icon] || MessageSquare;
                      return (
                        <button
                          key={`${block.type}-${block.subType}`}
                          onClick={() => handleAddBlock(block)}
                          className="p-2.5 rounded-xl border border-gray-200 bg-white text-left hover:border-gray-300 hover:shadow-sm active:scale-[0.97] transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${BRAND_COLOR}15`, color: BRAND_COLOR }}>
                              <BIcon className="h-3 w-3" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-gray-900 block leading-tight">{block.label}</span>
                              <span className="text-[9px] text-gray-500 block mt-0.5">{block.description}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Properties Sheet */}
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
