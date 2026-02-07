import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Phone, Mail, Hash, Clock, Globe, GitBranch, 
  Tag, UserPlus, Database, Send, Image, FileText, List, ToggleLeft,
  X, GripVertical
} from 'lucide-react';
import { FlowNode, FlowEdge, BlockDefinition } from './types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<any>> = {
  Phone, Mail, Hash, MessageSquare, Clock, Globe, ToggleLeft, 
  List, Image, FileText, GitBranch, Database, Tag, UserPlus, Send
};

const nodeColors: Record<string, string> = {
  trigger: '#E34800',
  message: '#007DE3',
  condition: '#8B5CF6',
  action: '#00E371',
  delay: '#EC4899',
};

interface ChatBotCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (node: FlowNode | null) => void;
  selectedNodeId: string | null;
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

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
        config: { ...block.defaultConfig }
      }
    };

    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange, scale, offset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNodeDrag = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    onNodesChange(nodes.map(node => 
      node.id === nodeId 
        ? { ...node, position: { x: node.position.x + deltaX / scale, y: node.position.y + deltaY / scale } }
        : node
    ));
  }, [nodes, onNodesChange, scale]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    onNodeSelect(null);
  }, [nodes, edges, onNodesChange, onEdgesChange, onNodeSelect]);

  const handleConnectStart = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId);
  }, []);

  const handleConnectEnd = useCallback((targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      const edgeExists = edges.some(e => e.source === connectingFrom && e.target === targetId);
      if (!edgeExists) {
        const newEdge: FlowEdge = {
          id: `edge-${Date.now()}`,
          source: connectingFrom,
          target: targetId
        };
        onEdgesChange([...edges, newEdge]);
      }
    }
    setConnectingFrom(null);
  }, [connectingFrom, edges, onEdgesChange]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      onNodeSelect(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.25), 2));
  };

  // Render edge path between two nodes
  const renderEdge = (edge: FlowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.position.x + 120;
    const sourceY = sourceNode.position.y + 40;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 40;

    const midX = (sourceX + targetX) / 2;
    const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

    return (
      <g key={edge.id}>
        <path
          d={path}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={2}
          className="cursor-pointer hover:stroke-red-400 transition-colors"
          onClick={() => onEdgesChange(edges.filter(e => e.id !== edge.id))}
        />
        <circle cx={targetX} cy={targetY} r={4} fill="#94A3B8" />
      </g>
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="flex-1 bg-gray-50 relative overflow-hidden cursor-grab active:cursor-grabbing"
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
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #CBD5E1 1px, transparent 1px)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Canvas Content */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Edges SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <g className="pointer-events-auto">
            {edges.map(renderEdge)}
          </g>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const color = nodeColors[node.type];
          const Icon = iconMap[node.data.config?.icon] || MessageSquare;
          
          return (
            <motion.div
              key={node.id}
              drag
              dragMomentum={false}
              onDrag={(_, info) => handleNodeDrag(node.id, info.delta.x, info.delta.y)}
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(node);
              }}
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
              }}
              className={cn(
                "w-60 bg-white rounded-xl shadow-lg border-2 transition-all cursor-pointer",
                selectedNodeId === node.id ? "ring-2 ring-offset-2" : ""
              )}
              whileHover={{ scale: 1.02 }}
            >
              {/* Node Header */}
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center"
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
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>

              {/* Node Content */}
              <div className="px-3 py-2 text-xs text-gray-500">
                {node.type === 'message' && node.data.config?.content && (
                  <p className="truncate">{node.data.config.content}</p>
                )}
                {node.type === 'trigger' && (
                  <p>Gatilho: {node.subType.replace('_', ' ')}</p>
                )}
                {node.type === 'delay' && node.data.config?.seconds && (
                  <p>Aguardar {node.data.config.seconds}s</p>
                )}
                {!node.data.config?.content && node.type !== 'trigger' && node.type !== 'delay' && (
                  <p className="text-gray-400 italic">Clique para configurar</p>
                )}
              </div>

              {/* Connection Points */}
              <div 
                className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 cursor-crosshair hover:border-blue-500 hover:bg-blue-50 transition-colors"
                style={{ transform: 'translateY(-50%)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnectEnd(node.id);
                }}
              />
              <div 
                className="absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 cursor-crosshair hover:border-green-500 hover:bg-green-50 transition-colors"
                style={{ transform: 'translateY(-50%)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnectStart(node.id);
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Canvas vazio</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Arraste blocos da barra lateral para começar a construir seu fluxo de automação
            </p>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-md p-1">
        <button 
          onClick={() => setScale(prev => Math.min(prev * 1.2, 2))}
          className="p-2 hover:bg-gray-100 rounded transition-colors text-sm font-medium"
        >
          +
        </button>
        <span className="text-xs text-gray-500 min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(prev => Math.max(prev * 0.8, 0.25))}
          className="p-2 hover:bg-gray-100 rounded transition-colors text-sm font-medium"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default ChatBotCanvas;
