import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  MessageSquare, Phone, Mail, Hash, Clock, Globe, GitBranch, 
  Tag, UserPlus, Database, Send, Image, FileText, List, ToggleLeft,
  X, GripVertical, Check, XCircle
} from 'lucide-react';
import { FlowNode, FlowEdge, BlockDefinition } from './types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<any>> = {
  Phone, Mail, Hash, MessageSquare, Clock, Globe, ToggleLeft, 
  List, Image, FileText, GitBranch, Database, Tag, UserPlus, Send
};

const nodeColors: Record<string, string> = {
  trigger: '#3600FF',
  message: '#3600FF',
  condition: '#3600FF',
  action: '#3600FF',
  delay: '#3600FF',
};

interface ChatBotCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (node: FlowNode | null) => void;
  selectedNodeId: string | null;
}

interface ConnectingLine {
  sourceId: string;
  sourceHandle?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const ChatBotCanvas: React.FC<ChatBotCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  selectedNodeId
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  
  // Canvas panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Node dragging state
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Connection state
  const [connectingLine, setConnectingLine] = useState<ConnectingLine | null>(null);
  const [hoveredInputNode, setHoveredInputNode] = useState<string | null>(null);

  // Handle drop from sidebar
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockData = e.dataTransfer.getData('block');
    if (!blockData || !canvasRef.current) return;

    const block: BlockDefinition = JSON.parse(blockData);
    const rect = canvasRef.current.getBoundingClientRect();
    
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: block.type,
      subType: block.subType,
      position: { x, y },
      data: {
        label: block.label,
        config: { ...block.defaultConfig, icon: block.icon }
      }
    };

    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange, scale, offset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Canvas panning handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only start panning if clicking directly on canvas (not on a node)
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      onNodeSelect(null);
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle canvas panning
    if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Handle node dragging
    if (draggingNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - offset.x) / scale - dragOffset.x;
      const newY = (e.clientY - rect.top - offset.y) / scale - dragOffset.y;
      
      onNodesChange(nodes.map(node => 
        node.id === draggingNode 
          ? { ...node, position: { x: newX, y: newY } }
          : node
      ));
    }

    // Handle connection line following cursor
    if (connectingLine && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectingLine(prev => prev ? {
        ...prev,
        currentX: (e.clientX - rect.left - offset.x) / scale,
        currentY: (e.clientY - rect.top - offset.y) / scale
      } : null);
    }
  }, [isPanning, panStart, draggingNode, dragOffset, nodes, onNodesChange, scale, offset, connectingLine]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
    
    // Complete connection if hovering over a valid input
    if (connectingLine && hoveredInputNode && connectingLine.sourceId !== hoveredInputNode) {
      const edgeExists = edges.some(e => 
        e.source === connectingLine.sourceId && 
        e.target === hoveredInputNode &&
        e.sourceHandle === connectingLine.sourceHandle
      );
      
      if (!edgeExists) {
        const newEdge: FlowEdge = {
          id: `edge-${Date.now()}`,
          source: connectingLine.sourceId,
          target: hoveredInputNode,
          sourceHandle: connectingLine.sourceHandle
        };
        onEdgesChange([...edges, newEdge]);
      }
    }
    
    setConnectingLine(null);
    setHoveredInputNode(null);
  }, [connectingLine, hoveredInputNode, edges, onEdgesChange]);

  // Node drag handlers (only from grip handle)
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string, nodePos: { x: number, y: number }) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / scale;
    const mouseY = (e.clientY - rect.top - offset.y) / scale;
    
    setDraggingNode(nodeId);
    setDragOffset({ x: mouseX - nodePos.x, y: mouseY - nodePos.y });
  };

  // Connection handlers
  const handleOutputMouseDown = (e: React.MouseEvent, nodeId: string, handle?: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = node.position.x + 240; // Right side of node
    let startY = node.position.y + 40; // Center vertically
    
    // Adjust Y for condition handles
    if (handle === 'yes') startY = node.position.y + 60;
    if (handle === 'no') startY = node.position.y + 90;
    
    // Multi-conditional handles
    if (node.subType === 'multi' && handle) {
      const conditions = node.data.config?.conditions || [];
      const condIndex = conditions.findIndex((c: any) => c.id === handle);
      if (condIndex >= 0) {
        startY = node.position.y + 55 + condIndex * 28;
      } else if (handle === 'else') {
        startY = node.position.y + 55 + conditions.length * 28;
      }
    }
    
    // Button option handles
    if (node.subType === 'buttons' && handle?.startsWith('btn_')) {
      const btnIndex = parseInt(handle.replace('btn_', ''), 10);
      startY = node.position.y + 55 + btnIndex * 28;
    }
    
    setConnectingLine({
      sourceId: nodeId,
      sourceHandle: handle,
      startX,
      startY,
      currentX: (e.clientX - rect.left - offset.x) / scale,
      currentY: (e.clientY - rect.top - offset.y) / scale
    });
  };

  const handleInputMouseEnter = (nodeId: string) => {
    if (connectingLine) {
      setHoveredInputNode(nodeId);
    }
  };

  const handleInputMouseLeave = () => {
    setHoveredInputNode(null);
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    onNodeSelect(null);
  }, [nodes, edges, onNodesChange, onEdgesChange, onNodeSelect]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    onEdgesChange(edges.filter(e => e.id !== edgeId));
  }, [edges, onEdgesChange]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.25), 2));
  };

  // Get node content description
  const getNodeDescription = (node: FlowNode): string => {
    const config = node.data.config || {};
    
    switch (node.type) {
      case 'trigger':
        if (node.subType === 'whatsapp_channel') {
          return config.phoneNumber || config.sessionName || 'Selecione o canal';
        }
        if (node.subType === 'email_channel') {
          return config.email || 'Selecione o email';
        }
        if (node.subType === 'keyword') {
          const keywords = config.keywords || [];
          return keywords.length > 0 ? keywords.slice(0, 2).join(', ') + (keywords.length > 2 ? '...' : '') : 'Configure palavras-chave';
        }
        if (node.subType === 'conversation_start') {
          const when = config.triggerWhen || 'any';
          return when === 'new_conversation' ? 'Nova conversa' : when === 'reopened' ? 'Conversa reaberta' : 'Qualquer início';
        }
        if (node.subType === 'inactivity') {
          return `Após ${config.minutes || 5} min sem resposta`;
        }
        if (node.subType === 'webhook') {
          return config.url ? 'Webhook configurado' : 'Configure URL';
        }
        return 'Configure o gatilho';
        
      case 'message':
        if (config.content) {
          return config.content.length > 30 ? config.content.substring(0, 30) + '...' : config.content;
        }
        return 'Configure a mensagem';
        
      case 'condition':
        if (node.subType === 'if_else') {
          if (config.conditionType === 'user_response') {
            return `Resposta ${config.operator || 'contém'} "${config.value || '...'}"`;
          }
          if (config.conditionType === 'variable') {
            return `${config.variable || 'var'} ${config.operator || '=='} ${config.value || '?'}`;
          }
          return 'Configure a condição';
        }
        if (node.subType === 'check_variable') {
          return `${config.variable || 'var'} ${config.operator || '=='} ${config.value || '?'}`;
        }
        if (node.subType === 'check_time') {
          return `${config.startHour || 9}h - ${config.endHour || 18}h`;
        }
        if (node.subType === 'check_tag') {
          return config.tag ? `Tag: ${config.tag}` : 'Configure a tag';
        }
        return 'Configure a condição';
        
      case 'action':
        if (node.subType === 'assign_tag') {
          return config.tag ? `🏷️ ${config.tag}` : 'Configure a tag';
        }
        if (node.subType === 'transfer_human') {
          return config.departmentName || 'Transferir atendimento';
        }
        if (node.subType === 'save_crm') {
          return 'Salvar como lead';
        }
        if (node.subType === 'send_email') {
          return config.to ? `Para: ${config.to}` : 'Configure o email';
        }
        if (node.subType === 'call_api') {
          return config.url ? `${config.method || 'POST'} API` : 'Configure a API';
        }
        if (node.subType === 'set_variable') {
          return config.name ? `${config.name} = ${config.value || '?'}` : 'Configure a variável';
        }
        return 'Configure a ação';
        
      case 'delay':
        if (node.subType === 'wait_seconds') {
          return `⏱️ ${config.seconds || 5} segundos`;
        }
        if (node.subType === 'wait_response') {
          return `⏱️ Aguardar resposta (${config.timeout || 60}s)`;
        }
        if (node.subType === 'wait_business_hours') {
          return '⏱️ Próximo horário comercial';
        }
        return 'Configure o delay';
        
      default:
        return 'Clique para configurar';
    }
  };

  // Render edge path between two nodes
  const renderEdge = (edge: FlowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.position.x + 240;
    let sourceY = sourceNode.position.y + 40;
    
    // Adjust source Y for condition handles
    if (edge.sourceHandle === 'yes') sourceY = sourceNode.position.y + 60;
    if (edge.sourceHandle === 'no') sourceY = sourceNode.position.y + 90;
    
    // Multi-conditional handles
    if (sourceNode.subType === 'multi' && edge.sourceHandle) {
      const conditions = sourceNode.data.config?.conditions || [];
      const condIndex = conditions.findIndex((c: any) => c.id === edge.sourceHandle);
      if (condIndex >= 0) {
        sourceY = sourceNode.position.y + 55 + condIndex * 28;
      } else if (edge.sourceHandle === 'else') {
        sourceY = sourceNode.position.y + 55 + conditions.length * 28;
      }
    }
    
    // Button option handles
    if (sourceNode.subType === 'buttons' && edge.sourceHandle?.startsWith('btn_')) {
      const btnIndex = parseInt(edge.sourceHandle.replace('btn_', ''), 10);
      sourceY = sourceNode.position.y + 55 + btnIndex * 28;
    }
    
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 40;

    const midX = (sourceX + targetX) / 2;
    const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

    const handleColors: Record<string, string> = { 'yes': '#22C55E', 'no': '#EF4444', 'else': '#94A3B8' };
    let edgeColor = handleColors[edge.sourceHandle || ''] || '#94A3B8';
    
    // Color for multi-condition handles
    if (sourceNode.subType === 'multi' && edge.sourceHandle && !handleColors[edge.sourceHandle]) {
      const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
      const conditions = sourceNode.data.config?.conditions || [];
      const idx = conditions.findIndex((c: any) => c.id === edge.sourceHandle);
      if (idx >= 0) edgeColor = colors[idx % colors.length];
    }
    
    // Color for button option handles
    if (sourceNode.subType === 'buttons' && edge.sourceHandle?.startsWith('btn_')) {
      const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
      const btnIdx = parseInt(edge.sourceHandle.replace('btn_', ''), 10);
      edgeColor = colors[btnIdx % colors.length];
    }

    return (
      <g key={edge.id} className="edge-group">
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="cursor-pointer"
          onClick={() => handleDeleteEdge(edge.id)}
        />
        <path
          d={path}
          fill="none"
          stroke={edgeColor}
          strokeWidth={2}
          className="transition-colors pointer-events-none"
          markerEnd="url(#arrowhead)"
        />
        {/* Delete button on hover - shown in the middle of the edge */}
        <g 
          className="edge-delete opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          transform={`translate(${midX - 8}, ${(sourceY + targetY) / 2 - 8})`}
          onClick={() => handleDeleteEdge(edge.id)}
        >
          <circle cx={8} cy={8} r={10} fill="white" stroke="#EF4444" strokeWidth={1.5} />
          <path d="M 5 5 L 11 11 M 11 5 L 5 11" stroke="#EF4444" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      </g>
    );
  };

  // Render connecting line while dragging
  const renderConnectingLine = () => {
    if (!connectingLine) return null;
    
    const { startX, startY, currentX, currentY } = connectingLine;
    const midX = (startX + currentX) / 2;
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${currentY}, ${currentX} ${currentY}`;
    
    return (
      <path
        d={path}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeDasharray="5,5"
        className="pointer-events-none"
      />
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="flex-1 bg-muted/30 relative overflow-hidden"
      style={{ cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'default' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-40 canvas-grid pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Canvas Content */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {/* SVG for edges */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
            </marker>
          </defs>
          <g style={{ pointerEvents: 'auto' }}>
            {edges.map(renderEdge)}
            {renderConnectingLine()}
          </g>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const color = nodeColors[node.type];
          const Icon = iconMap[node.data.config?.icon] || MessageSquare;
          const isCondition = node.type === 'condition' && node.subType === 'if_else';
          const isMultiCondition = node.type === 'condition' && node.subType === 'multi';
          const multiConditions = isMultiCondition ? (node.data.config?.conditions || []) : [];
          const isTimeOrWeekday = node.type === 'condition' && (node.subType === 'time' || node.subType === 'weekday');
          const isButtonsNode = node.subType === 'buttons';
          const buttonOptions = isButtonsNode ? (node.data.config?.buttons || []) : [];
          const hasMultipleOutputs = isCondition || isMultiCondition || isTimeOrWeekday || (isButtonsNode && buttonOptions.length > 0);
          
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                width: 240,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(node);
              }}
              className={cn(
                "bg-background rounded-xl shadow-lg border-2 transition-all select-none",
                selectedNodeId === node.id ? "ring-2 ring-primary ring-offset-2" : "hover:shadow-xl",
                draggingNode === node.id ? "opacity-80" : ""
              )}
            >
              {/* Node Header */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <div
                  className="cursor-grab active:cursor-grabbing drag-handle p-1 -ml-1 rounded hover:bg-black/5"
                  onMouseDown={(e) => handleNodeDragStart(e, node.id, node.position)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium flex-1 truncate" style={{ color }}>
                  {node.data.label}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  className="p-1 hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>

              {/* Node Content */}
              <div className="px-3 py-2 text-xs text-muted-foreground min-h-[40px]">
                <p className="line-clamp-2">{getNodeDescription(node)}</p>
                {isMultiCondition && multiConditions.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {multiConditions.map((c: any, i: number) => (
                      <div key={c.id} className="text-[10px] text-muted-foreground/70">
                        {i + 1}. {c.label || `Condição ${i + 1}`}
                      </div>
                    ))}
                  </div>
                )}
                {isButtonsNode && buttonOptions.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {buttonOptions.map((btn: string, i: number) => (
                      <div key={i} className="text-[10px] text-muted-foreground/70">
                        {i + 1}. {btn}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connection Points */}
              {/* Input (left side) */}
              <div 
                className={cn(
                  "absolute -left-3 top-1/2 w-6 h-6 rounded-full bg-background border-2 flex items-center justify-center transition-all cursor-pointer",
                  hoveredInputNode === node.id && connectingLine ? "border-primary bg-primary/10 scale-125" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                )}
                style={{ transform: 'translateY(-50%)' }}
                onMouseEnter={() => handleInputMouseEnter(node.id)}
                onMouseLeave={handleInputMouseLeave}
                onMouseUp={() => {
                  if (connectingLine && connectingLine.sourceId !== node.id) {
                    // Connection will be handled in handleCanvasMouseUp
                  }
                }}
              >
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              </div>

              {/* Output (right side) */}
              {isButtonsNode && buttonOptions.length > 0 ? (
                <>
                  {buttonOptions.map((btn: string, i: number) => {
                    const handleColors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                    const handleColor = handleColors[i % handleColors.length];
                    const handleId = `btn_${i}`;
                    return (
                      <React.Fragment key={handleId}>
                        <div 
                          className="absolute -right-3 w-6 h-6 rounded-full bg-background border-2 flex items-center justify-center cursor-crosshair hover:scale-110 transition-all"
                          style={{ top: 45 + i * 28, borderColor: handleColor }}
                          onMouseDown={(e) => handleOutputMouseDown(e, node.id, handleId)}
                        >
                          <span className="text-[8px] font-bold" style={{ color: handleColor }}>{i + 1}</span>
                        </div>
                        <span className="absolute right-5 text-[9px] font-medium truncate max-w-[80px]" style={{ top: 48 + i * 28, color: handleColor }}>
                          {btn}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </>
              ) : isMultiCondition && multiConditions.length > 0 ? (
                <>
                  {multiConditions.map((c: any, i: number) => {
                    const handleColors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                    const handleColor = handleColors[i % handleColors.length];
                    return (
                      <React.Fragment key={c.id}>
                        <div 
                          className="absolute -right-3 w-6 h-6 rounded-full bg-background border-2 flex items-center justify-center cursor-crosshair hover:scale-110 transition-all"
                          style={{ top: 45 + i * 28, borderColor: handleColor }}
                          onMouseDown={(e) => handleOutputMouseDown(e, node.id, c.id)}
                        >
                          <span className="text-[8px] font-bold" style={{ color: handleColor }}>{i + 1}</span>
                        </div>
                        <span className="absolute right-5 text-[9px] font-medium truncate max-w-[60px]" style={{ top: 48 + i * 28, color: handleColor }}>
                          {c.label || `C${i + 1}`}
                        </span>
                      </React.Fragment>
                    );
                  })}
                  {/* Default/Else output */}
                  <div 
                    className="absolute -right-3 w-6 h-6 rounded-full bg-background border-2 border-gray-400 flex items-center justify-center cursor-crosshair hover:scale-110 transition-all"
                    style={{ top: 45 + multiConditions.length * 28 }}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id, 'else')}
                  >
                    <span className="text-[8px] font-bold text-gray-400">✕</span>
                  </div>
                  <span className="absolute right-5 text-[9px] text-gray-400 font-medium" style={{ top: 48 + multiConditions.length * 28 }}>Senão</span>
                </>
              ) : isCondition || isTimeOrWeekday ? (
                <>
                  {/* Yes output */}
                  <div 
                    className="absolute -right-3 w-6 h-6 rounded-full bg-background border-2 border-green-500 flex items-center justify-center cursor-crosshair hover:bg-green-50 hover:scale-110 transition-all"
                    style={{ top: 50 }}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id, 'yes')}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </div>
                  <span className="absolute right-5 text-[10px] text-green-600 font-medium" style={{ top: 54 }}>Sim</span>
                  
                  {/* No output */}
                  <div 
                    className="absolute -right-3 w-6 h-6 rounded-full bg-background border-2 border-red-500 flex items-center justify-center cursor-crosshair hover:bg-red-50 hover:scale-110 transition-all"
                    style={{ top: 80 }}
                    onMouseDown={(e) => handleOutputMouseDown(e, node.id, 'no')}
                  >
                    <XCircle className="h-3 w-3 text-red-500" />
                  </div>
                  <span className="absolute right-5 text-[10px] text-red-600 font-medium" style={{ top: 84 }}>Não</span>
                </>
              ) : (
                <div 
                  className="absolute -right-3 top-1/2 w-6 h-6 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center cursor-crosshair hover:border-primary hover:bg-primary/5 hover:scale-110 transition-all"
                  style={{ transform: 'translateY(-50%)' }}
                  onMouseDown={(e) => handleOutputMouseDown(e, node.id)}
                >
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Canvas vazio</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Arraste blocos da barra lateral para começar a construir seu fluxo de automação
            </p>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background rounded-lg shadow-md p-1 border">
        <button 
          onClick={() => setScale(prev => Math.min(prev * 1.2, 2))}
          className="p-2 hover:bg-muted rounded transition-colors text-sm font-medium"
        >
          +
        </button>
        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(prev => Math.max(prev * 0.8, 0.25))}
          className="p-2 hover:bg-muted rounded transition-colors text-sm font-medium"
        >
          −
        </button>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg border">
        <p><strong>Arrastar:</strong> Use o ícone ⋮⋮ no bloco</p>
        <p><strong>Conectar:</strong> Arraste dos círculos</p>
        <p><strong>Pan:</strong> Clique e arraste no canvas</p>
      </div>
    </div>
  );
};

export default ChatBotCanvas;
