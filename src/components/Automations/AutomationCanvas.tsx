
import { useCallback, useRef, useState } from 'react';
import { AutomationNode, AutomationEdge, AutomationBlockDefinition, AUTOMATION_BLOCKS } from './types';
import * as Icons from 'lucide-react';
import { Trash2, GripVertical } from 'lucide-react';

interface Props {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  onNodesChange: (nodes: AutomationNode[]) => void;
  onEdgesChange: (edges: AutomationEdge[]) => void;
  onNodeSelect: (node: AutomationNode | null) => void;
  selectedNodeId: string | null;
}

const GRID_SIZE = 20;
const NODE_WIDTH = 260;
const NODE_HEIGHT = 72;

export default function AutomationCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeSelect, selectedNodeId }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);

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

  // Drag handle starts drag (for moving the node)
  const handleGripMouseDown = (e: React.MouseEvent, node: AutomationNode) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      id: node.id,
      offsetX: e.clientX - rect.left - node.position.x,
      offsetY: e.clientY - rect.top - node.position.y,
    });
  };

  // Click on card body opens config
  const handleNodeClick = (e: React.MouseEvent, node: AutomationNode) => {
    e.stopPropagation();
    onNodeSelect(node);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragging) {
      const x = Math.round((e.clientX - rect.left - dragging.offsetX) / GRID_SIZE) * GRID_SIZE;
      const y = Math.round((e.clientY - rect.top - dragging.offsetY) / GRID_SIZE) * GRID_SIZE;
      onNodesChange(nodes.map(n => n.id === dragging.id ? { ...n, position: { x, y } } : n));
    }

    if (connecting) {
      setConnecting(prev => prev ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : null);
    }
  }, [dragging, connecting, nodes, onNodesChange]);

  const handleMouseUp = () => {
    setDragging(null);
    setConnecting(null);
  };

  const handleConnect = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    if (edges.some(e => e.source === sourceId && e.target === targetId)) return;
    onEdgesChange([...edges, { id: `edge-${Date.now()}`, source: sourceId, target: targetId }]);
  };

  const deleteNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) onNodeSelect(null);
  };

  const deleteEdge = (edgeId: string) => {
    onEdgesChange(edges.filter(e => e.id !== edgeId));
  };

  // Connection point: start from right port
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setConnecting({
      sourceId: nodeId,
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
    });
  };

  // Drop on left port to complete connection
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connecting && connecting.sourceId !== nodeId) {
      handleConnect(connecting.sourceId, nodeId);
    }
    setConnecting(null);
  };

  const getNodeHeight = (node: AutomationNode) => {
    const webhookFields = node.config?.detectedFields || node.config?.externalDetectedFields || [];
    const hasWebhookFields = node.type === 'webhook' && webhookFields.length > 0;
    const hasClientFields = node.type === 'create_client';
    const fieldCount = hasWebhookFields ? webhookFields.length : hasClientFields ? 4 : 0;
    return NODE_HEIGHT + (fieldCount > 0 ? 44 + fieldCount * 34 : 0);
  };

  const renderEdge = (edge: AutomationEdge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return null;

    const sx = source.position.x + NODE_WIDTH;
    const sy = source.position.y + getNodeHeight(source) / 2;
    const tx = target.position.x;
    const ty = target.position.y + getNodeHeight(target) / 2;
    const mx = (sx + tx) / 2;

    return (
      <g key={edge.id} className="cursor-pointer group" onClick={() => deleteEdge(edge.id)}>
        <path
          d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={2.5}
          strokeDasharray="none"
          className="group-hover:stroke-red-400 transition-colors"
        />
        {/* Delete button on edge midpoint */}
        <circle cx={mx} cy={(sy + ty) / 2} r={8} fill="white" stroke="#CBD5E1" strokeWidth={1.5}
          className="group-hover:stroke-red-400 group-hover:fill-red-50 transition-colors" />
        <text x={mx} y={(sy + ty) / 2 + 4} textAnchor="middle" fontSize={11} fill="#94A3B8"
          className="group-hover:fill-red-400 select-none pointer-events-none">×</text>
      </g>
    );
  };

  // Temporary connecting line
  const renderConnectingLine = () => {
    if (!connecting) return null;
    const source = nodes.find(n => n.id === connecting.sourceId);
    if (!source) return null;
    const sx = source.position.x + NODE_WIDTH;
    const sy = source.position.y + getNodeHeight(source) / 2;
    const mx = (sx + connecting.mouseX) / 2;
    return (
      <path
        d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${connecting.mouseY}, ${connecting.mouseX} ${connecting.mouseY}`}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeDasharray="6 3"
        className="pointer-events-none"
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-auto"
      style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        backgroundColor: 'hsl(var(--muted) / 0.3)',
        cursor: connecting ? 'crosshair' : dragging ? 'grabbing' : 'default',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={() => { onNodeSelect(null); }}
    >
      {/* Edges SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <g className="pointer-events-auto">
          {edges.map(renderEdge)}
        </g>
        {renderConnectingLine()}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const block = getBlockDef(node.type);
        const isSelected = selectedNodeId === node.id;
        const color = block?.color || '#64748B';

        return (
          <div
            key={node.id}
            className={`absolute select-none group ${isSelected ? 'z-20' : 'z-10'}`}
            style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH }}
            onClick={e => handleNodeClick(e, node)}
          >
            <div
              className={`bg-white rounded-2xl border-2 transition-all duration-150 overflow-visible ${
                isSelected
                  ? 'shadow-xl ring-2 ring-offset-1'
                  : 'shadow-md hover:shadow-lg'
              }`}
              style={{
                borderColor: isSelected ? color : 'hsl(var(--border))',
                ...(isSelected ? { boxShadow: `0 0 0 3px ${color}40` } : {}),
              }}
            >
              {/* Header with grip handle */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl" style={{ backgroundColor: color + '12' }}>
                {/* 6-dot grip handle */}
                <div
                  className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0"
                  onMouseDown={e => handleGripMouseDown(e, node)}
                  title="Arrastar bloco"
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>

                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}>
                  {block && getIcon(block.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{node.label}</div>
                  <div className="text-[10px] text-gray-400 truncate">{block?.description || node.type}</div>
                </div>

                <button
                  onClick={e => deleteNode(e, node.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir bloco"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>

              {/* Config preview */}
              <div className="px-3 py-2 text-[10px] text-gray-500 border-t border-gray-50">
                {node.type === 'webhook' && <span>{node.config?.webhookMode === 'fetch' ? '🌐 Puxar dados externos' : '⚡ Receber POST'}</span>}
                {node.type === 'new_client' && <span>Gatilho: novo {node.config?.clientType === 'any' ? 'contato' : node.config?.clientType}</span>}
                {node.type === 'client_updated' && <span>Gatilho: cliente atualizado</span>}
                {node.type === 'proposal_status' && <span>Status: {node.config?.status || 'aprovada'}</span>}
                {node.type === 'schedule' && <span>⏰ Cron: {node.config?.cron || '0 9 * * *'}</span>}
                {node.type === 'send_email' && <span>📧 Para: {node.config?.to || 'configurar'}</span>}
                {node.type === 'send_whatsapp' && <span>💬 Para: {node.config?.to || 'configurar'}</span>}
                {node.type === 'create_client' && <span>👤 Mapear campos do gatilho</span>}
                {node.type === 'update_client' && <span>✏️ Atualizar: {node.config?.clientIdentifier || 'configurar'}</span>}
                {node.type === 'create_task' && <span>📋 Tarefa: {node.config?.title || 'configurar'}</span>}
                {node.type === 'create_proposal' && <span>📄 Proposta automática</span>}
                {node.type === 'http_request' && <span>🔗 {node.config?.method || 'POST'} {node.config?.url ? '✓' : '...'}</span>}
                {node.type === 'condition' && <span>🔀 {node.config?.field || 'Configurar condição'}</span>}
                {node.type === 'filter' && <span>🔍 Filtro: {node.config?.filterField || 'configurar'}</span>}
                {node.type === 'transform_data' && <span>🔄 Mapear campos</span>}
                {node.type === 'delay' && <span>⏳ {node.config?.duration || 5} {node.config?.unit || 'min'}</span>}
              </div>

              {/* Detected fields (webhook) with individual output ports */}
              {(() => {
                const fields: string[] = node.config?.detectedFields || node.config?.externalDetectedFields || [];
                if (node.type !== 'webhook' || fields.length === 0) return null;
                return (
                  <div className="border-t-2 border-blue-100 px-3 py-3 bg-blue-50/30">
                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Saídas ({fields.length})
                    </div>
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <div key={field} className="flex items-center relative group/field">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-blue-100 flex-1 min-w-0 shadow-sm hover:border-blue-300 hover:shadow transition-all">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-blue-400" />
                            <span className="text-[11px] font-mono font-medium text-gray-700 truncate">{field}</span>
                          </div>
                          <div
                            className="absolute -right-[26px] w-7 h-7 rounded-full bg-white border-[2.5px] border-blue-400 cursor-crosshair hover:scale-[1.3] hover:border-blue-600 hover:shadow-lg transition-all z-30 flex items-center justify-center shadow-md"
                            onMouseDown={e => handlePortMouseDown(e, node.id)}
                            title={`Conectar: ${field}`}
                          >
                            <div className="w-3 h-3 rounded-full bg-blue-400 group-hover/field:bg-blue-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Input fields for create_client with individual input ports */}
              {node.type === 'create_client' && (
                <div className="border-t-2 border-emerald-100 px-3 py-3 bg-emerald-50/30">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Entradas
                  </div>
                  <div className="space-y-2">
                    {['Nome', 'Email', 'Telefone', 'Status'].map((field) => (
                      <div key={field} className="flex items-center relative group/field">
                        <div
                          className="absolute -left-[26px] w-7 h-7 rounded-full bg-white border-[2.5px] border-emerald-400 cursor-pointer hover:scale-[1.3] hover:border-emerald-600 hover:shadow-lg transition-all z-30 flex items-center justify-center shadow-md"
                          onMouseUp={e => handlePortMouseUp(e, node.id)}
                          title={`Receber: ${field}`}
                        >
                          <div className="w-3 h-3 rounded-full bg-emerald-400 group-hover/field:bg-emerald-600 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-emerald-100 flex-1 min-w-0 shadow-sm hover:border-emerald-300 hover:shadow transition-all">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-emerald-400" />
                          <span className="text-[11px] font-mono font-medium text-gray-700">{field}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RIGHT port (output) - main, only when no field ports */}
              {!(node.type === 'webhook' && ((node.config?.detectedFields?.length || 0) > 0 || (node.config?.externalDetectedFields?.length || 0) > 0)) && node.type !== 'create_client' && (
                <div
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform z-30 flex items-center justify-center shadow-sm"
                  style={{ borderColor: color }}
                  onMouseDown={e => handlePortMouseDown(e, node.id)}
                  title="Arraste para conectar"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                </div>
              )}

              {/* Also show main output for create_client (to chain further) */}
              {node.type === 'create_client' && (
                <div
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 cursor-crosshair hover:scale-125 transition-transform z-30 flex items-center justify-center shadow-sm"
                  style={{ borderColor: color }}
                  onMouseDown={e => handlePortMouseDown(e, node.id)}
                  title="Arraste para conectar"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                </div>
              )}

              {/* LEFT port (input) - only for non-create_client (they have per-field inputs) */}
              {node.type !== 'create_client' && (
                <div
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 cursor-pointer hover:scale-125 transition-transform z-30 flex items-center justify-center shadow-sm"
                  style={{ borderColor: color }}
                  onMouseUp={e => handlePortMouseUp(e, node.id)}
                  title="Solte aqui para conectar"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Icons.Workflow className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Arraste blocos para criar sua automação</p>
            <p className="text-xs text-gray-300 mt-1">Conecte gatilhos a ações para automatizar processos</p>
          </div>
        </div>
      )}
    </div>
  );
}
