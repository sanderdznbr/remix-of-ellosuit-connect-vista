
import { useCallback, useRef, useState } from 'react';
import { AutomationNode, AutomationEdge, AutomationBlockDefinition, AUTOMATION_BLOCKS } from './types';
import * as Icons from 'lucide-react';
import { Trash2 } from 'lucide-react';

interface Props {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  onNodesChange: (nodes: AutomationNode[]) => void;
  onEdgesChange: (edges: AutomationEdge[]) => void;
  onNodeSelect: (node: AutomationNode | null) => void;
  selectedNodeId: string | null;
}

const GRID_SIZE = 20;

export default function AutomationCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeSelect, selectedNodeId }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const getBlockDef = (type: string) => AUTOMATION_BLOCKS.find(b => b.type === type);

  const getIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="h-4 w-4" /> : null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;

    // Get the dragged block type from the last drag event
    const newNode: AutomationNode = {
      id: `node-${Date.now()}`,
      type: 'unknown',
      label: 'Novo Bloco',
      position: { x, y },
      data: {},
      config: {},
    };

    onNodesChange([...nodes, newNode]);
    onNodeSelect(newNode);
  }, [nodes, onNodesChange, onNodeSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: AutomationNode) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      id: node.id,
      offsetX: e.clientX - rect.left - node.position.x,
      offsetY: e.clientY - rect.top - node.position.y,
    });
    onNodeSelect(node);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - dragging.offsetX) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round((e.clientY - rect.top - dragging.offsetY) / GRID_SIZE) * GRID_SIZE;
    onNodesChange(nodes.map(n => n.id === dragging.id ? { ...n, position: { x, y } } : n));
  }, [dragging, nodes, onNodesChange]);

  const handleMouseUp = () => setDragging(null);

  const handleConnect = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    if (edges.some(e => e.source === sourceId && e.target === targetId)) return;
    const newEdge: AutomationEdge = {
      id: `edge-${Date.now()}`,
      source: sourceId,
      target: targetId,
    };
    onEdgesChange([...edges, newEdge]);
  };

  const deleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) onNodeSelect(null);
  };

  const deleteEdge = (edgeId: string) => {
    onEdgesChange(edges.filter(e => e.id !== edgeId));
  };

  // SVG edge rendering
  const renderEdge = (edge: AutomationEdge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return null;

    const sx = source.position.x + 120;
    const sy = source.position.y + 30;
    const tx = target.position.x;
    const ty = target.position.y + 30;
    const mx = (sx + tx) / 2;

    return (
      <g key={edge.id} className="cursor-pointer group" onClick={() => deleteEdge(edge.id)}>
        <path
          d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth={2}
          className="group-hover:stroke-red-400 transition-colors"
        />
        <circle cx={mx} cy={(sy + ty) / 2} r={6} fill="white" stroke="#CBD5E1" strokeWidth={1.5}
          className="group-hover:stroke-red-400 group-hover:fill-red-50" />
        <text x={mx} y={(sy + ty) / 2 + 3.5} textAnchor="middle" fontSize={8} fill="#94A3B8"
          className="group-hover:fill-red-400 select-none">×</text>
      </g>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-auto cursor-crosshair"
      style={{
        backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        backgroundColor: '#f8fafc',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => onNodeSelect(null)}
    >
      {/* Edges SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <g className="pointer-events-auto">
          {edges.map(renderEdge)}
        </g>
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const block = getBlockDef(node.type);
        const isSelected = selectedNodeId === node.id;
        const color = block?.color || '#64748B';

        return (
          <div
            key={node.id}
            className={`absolute select-none transition-shadow ${isSelected ? 'z-20' : 'z-10'}`}
            style={{ left: node.position.x, top: node.position.y, width: 240 }}
            onMouseDown={e => handleNodeMouseDown(e, node)}
          >
            <div className={`bg-white rounded-xl shadow-md border-2 transition-all ${isSelected ? 'shadow-lg' : 'hover:shadow-lg'}`}
              style={{ borderColor: isSelected ? color : 'transparent' }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl" style={{ backgroundColor: color + '10' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: color }}>
                  {block && getIcon(block.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{node.label}</div>
                  <div className="text-[10px] text-gray-400">{block?.description || node.type}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
                  className="p-1 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </button>
              </div>

              {/* Config preview */}
              <div className="px-3 py-2 text-[10px] text-gray-500">
                {node.type === 'webhook' && <span>POST endpoint</span>}
                {node.type === 'new_client' && <span>Gatilho: novo cliente</span>}
                {node.type === 'send_email' && <span>Template: {node.config?.templateId || 'não selecionado'}</span>}
                {node.type === 'create_client' && <span>Mapear campos do webhook</span>}
                {node.type === 'condition' && <span>{node.config?.field || 'Configurar condição'}</span>}
                {!['webhook', 'new_client', 'send_email', 'create_client', 'condition'].includes(node.type) && (
                  <span>Clique para configurar</span>
                )}
              </div>

              {/* Connection points */}
              <div
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-pointer hover:scale-125 transition-transform z-30"
                style={{ borderColor: color }}
                onMouseDown={e => { e.stopPropagation(); setConnecting(node.id); }}
                onMouseUp={e => {
                  e.stopPropagation();
                  if (connecting && connecting !== node.id) {
                    handleConnect(connecting, node.id);
                  }
                  setConnecting(null);
                }}
              />
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 cursor-pointer hover:scale-125 transition-transform z-30"
                style={{ borderColor: color }}
                onMouseUp={e => {
                  e.stopPropagation();
                  if (connecting && connecting !== node.id) {
                    handleConnect(connecting, node.id);
                  }
                  setConnecting(null);
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Icons.Workflow className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Arraste blocos para criar sua automação</p>
            <p className="text-xs text-gray-300 mt-1">Conecte gatilhos a ações para automatizar processos</p>
          </div>
        </div>
      )}
    </div>
  );
}
