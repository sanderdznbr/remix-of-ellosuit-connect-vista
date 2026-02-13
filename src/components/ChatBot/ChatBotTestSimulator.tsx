import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, Send, RotateCcw, X, Bot, User, Clock, 
  ArrowRight, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FlowNode, FlowEdge } from './types';

const BRAND_COLOR = '#FF4500';

interface SimMessage {
  id: string;
  role: 'bot' | 'user' | 'system';
  content: string;
  timestamp: Date;
  nodeId?: string;
  nodeLabel?: string;
}

interface ChatBotTestSimulatorProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onClose: () => void;
  onHighlightNode?: (nodeId: string | null) => void;
}

const ChatBotTestSimulator: React.FC<ChatBotTestSimulatorProps> = ({
  nodes,
  edges,
  onClose,
  onHighlightNode,
}) => {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: SimMessage['role'], content: string, nodeId?: string, nodeLabel?: string) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      nodeId,
      nodeLabel,
    }]);
  }, []);

  const getNextNodes = useCallback((nodeId: string, handleId?: string): FlowNode[] => {
    const outEdges = edges.filter(e => {
      if (e.source !== nodeId) return false;
      if (handleId && e.sourceHandle) return e.sourceHandle === handleId;
      if (!handleId) return !e.sourceHandle || e.sourceHandle === 'default';
      return false;
    });
    return outEdges
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean) as FlowNode[];
  }, [nodes, edges]);

  const processNode = useCallback(async (node: FlowNode) => {
    onHighlightNode?.(node.id);
    setCurrentNodeId(node.id);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    switch (node.type) {
      case 'trigger': {
        addMessage('system', `▶ Fluxo iniciado: ${node.data.label}`, node.id, node.data.label);
        await delay(500);
        const next = getNextNodes(node.id);
        if (next.length > 0) processNode(next[0]);
        break;
      }

      case 'message': {
        if (node.subType === 'text') {
          const text = node.data.config?.message || node.data.label;
          // Replace variables
          const resolved = text.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => variables[key] || `{{${key}}}`);
          addMessage('bot', resolved, node.id, node.data.label);
          await delay(800);
          const next = getNextNodes(node.id);
          if (next.length > 0) processNode(next[0]);
        } else if (node.subType === 'buttons') {
          const text = node.data.config?.message || node.data.label;
          const buttons: string[] = node.data.config?.buttons || [];
          const optionsText = buttons.map((b, i) => `  ${i + 1}. ${b}`).join('\n');
          addMessage('bot', `${text}\n\n${optionsText}`, node.id, node.data.label);
          setWaitingForInput(true);
        } else if (node.subType === 'image') {
          addMessage('bot', `📷 [Imagem: ${node.data.config?.imageUrl || 'imagem.png'}]`, node.id, node.data.label);
          await delay(600);
          const next = getNextNodes(node.id);
          if (next.length > 0) processNode(next[0]);
        } else {
          addMessage('bot', node.data.config?.message || node.data.label, node.id, node.data.label);
          await delay(600);
          const next = getNextNodes(node.id);
          if (next.length > 0) processNode(next[0]);
        }
        break;
      }

      case 'condition': {
        addMessage('system', `🔀 Condição: ${node.data.label}`, node.id, node.data.label);
        await delay(400);
        // Default: follow "true" path, fallback to first next
        const trueNext = getNextNodes(node.id, 'true');
        const falseNext = getNextNodes(node.id, 'false');
        const defaultNext = getNextNodes(node.id);
        const next = trueNext.length > 0 ? trueNext : (defaultNext.length > 0 ? defaultNext : falseNext);
        if (next.length > 0) processNode(next[0]);
        else addMessage('system', '⚠️ Condição sem saída conectada');
        break;
      }

      case 'action': {
        const actionLabels: Record<string, string> = {
          'assign_tag': '🏷️ Tag atribuída',
          'transfer_human': '👤 Transferido para humano',
          'save_crm': '💾 Salvo no CRM',
          'send_email': '📧 Email enviado',
          'call_api': '🔗 API chamada',
          'set_variable': '📝 Variável definida',
        };
        addMessage('system', `${actionLabels[node.subType] || '⚙️ Ação executada'}: ${node.data.label}`, node.id, node.data.label);
        
        if (node.subType === 'set_variable' && node.data.config?.variableName) {
          setVariables(prev => ({
            ...prev,
            [node.data.config.variableName]: node.data.config.variableValue || '',
          }));
        }

        await delay(500);
        const next = getNextNodes(node.id);
        if (next.length > 0) processNode(next[0]);
        break;
      }

      case 'delay': {
        const seconds = node.data.config?.seconds || 3;
        if (node.subType === 'wait_response') {
          addMessage('system', `⏳ Aguardando resposta do usuário...`, node.id, node.data.label);
          setWaitingForInput(true);
        } else {
          addMessage('system', `⏱️ Aguardando ${seconds}s...`, node.id, node.data.label);
          await delay(Math.min(seconds * 1000, 3000)); // Cap at 3s for testing
          const next = getNextNodes(node.id);
          if (next.length > 0) processNode(next[0]);
        }
        break;
      }

      default: {
        addMessage('system', `⚠️ Bloco não reconhecido: ${node.type}`, node.id, node.data.label);
        const next = getNextNodes(node.id);
        if (next.length > 0) processNode(next[0]);
      }
    }
  }, [addMessage, getNextNodes, variables, onHighlightNode]);

  const startSimulation = useCallback(() => {
    setMessages([]);
    setVariables({});
    setWaitingForInput(false);
    setIsRunning(true);
    onHighlightNode?.(null);

    // Find trigger node (start)
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (triggerNode) {
      processNode(triggerNode);
    } else {
      // No trigger: try first node
      if (nodes.length > 0) {
        processNode(nodes[0]);
      } else {
        addMessage('system', '⚠️ Nenhum bloco encontrado no fluxo.');
      }
    }
  }, [nodes, processNode, addMessage, onHighlightNode]);

  const handleUserInput = useCallback(() => {
    if (!inputValue.trim() || !waitingForInput) return;

    const userText = inputValue.trim();
    addMessage('user', userText);
    setInputValue('');
    setWaitingForInput(false);

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    if (currentNode.subType === 'buttons') {
      const buttons: string[] = currentNode.data.config?.buttons || [];
      // Match by number or exact text (case insensitive)
      const numChoice = parseInt(userText, 10);
      let matchedIndex = -1;

      if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= buttons.length) {
        matchedIndex = numChoice - 1;
      } else {
        matchedIndex = buttons.findIndex(b => b.toLowerCase() === userText.toLowerCase());
      }

      if (matchedIndex >= 0) {
        const handleId = `btn_${matchedIndex}`;
        const next = getNextNodes(currentNode.id, handleId);
        if (next.length > 0) {
          addMessage('system', `✅ Opção selecionada: ${buttons[matchedIndex]}`);
          setTimeout(() => processNode(next[0]), 400);
        } else {
          // Fallback to default output
          const defaultNext = getNextNodes(currentNode.id);
          if (defaultNext.length > 0) {
            addMessage('system', `✅ Opção: ${buttons[matchedIndex]}`);
            setTimeout(() => processNode(defaultNext[0]), 400);
          } else {
            addMessage('system', '⚠️ Opção sem caminho conectado.');
          }
        }
      } else {
        // Invalid response - follow 'invalid' handle
        const invalidNext = getNextNodes(currentNode.id, 'invalid');
        if (invalidNext.length > 0) {
          addMessage('system', `❌ Resposta inválida. Seguindo caminho alternativo...`);
          setTimeout(() => processNode(invalidNext[0]), 400);
        } else {
          addMessage('system', `❌ Resposta inválida: "${userText}". Nenhum caminho de resposta inválida conectado.`);
          // Re-ask
          setWaitingForInput(true);
        }
      }
    } else if (currentNode.subType === 'wait_response') {
      // Save response as variable if configured
      if (currentNode.data.config?.saveAs) {
        setVariables(prev => ({ ...prev, [currentNode.data.config.saveAs]: userText }));
      }
      const next = getNextNodes(currentNode.id);
      if (next.length > 0) setTimeout(() => processNode(next[0]), 400);
    } else {
      const next = getNextNodes(currentNode.id);
      if (next.length > 0) setTimeout(() => processNode(next[0]), 400);
    }
  }, [inputValue, waitingForInput, currentNodeId, nodes, getNextNodes, addMessage, processNode]);

  const resetSimulation = () => {
    setMessages([]);
    setVariables({});
    setCurrentNodeId(null);
    setWaitingForInput(false);
    setIsRunning(false);
    onHighlightNode?.(null);
  };

  return (
    <div className="w-[380px] h-full bg-white border-l flex flex-col shadow-xl flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}10, ${BRAND_COLOR}05)` }}>
        <div className="flex items-center gap-2.5">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_COLOR}cc)` }}
          >
            <MessageCircle className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Testar Chatbot</h3>
            <p className="text-[11px] text-gray-500">Simule o fluxo em tempo real</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {!isRunning && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}15, ${BRAND_COLOR}08)` }}
            >
              <Bot className="h-8 w-8" style={{ color: BRAND_COLOR }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Teste seu fluxo</p>
              <p className="text-xs text-gray-400 mt-1">
                Inicie a simulação para ver como o chatbot se comporta com as mensagens e opções configuradas.
              </p>
            </div>
            <Button
              onClick={startSimulation}
              className="gap-2 rounded-xl text-white mt-2"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_COLOR}dd)` }}
              disabled={nodes.length === 0}
            >
              <ArrowRight className="h-4 w-4" />
              Iniciar Simulação
            </Button>
            {nodes.length === 0 && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Adicione blocos ao fluxo primeiro
              </p>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div className="w-full">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] text-gray-500 whitespace-pre-wrap">{msg.content}</span>
                </div>
                {msg.nodeLabel && (
                  <button
                    onClick={() => onHighlightNode?.(msg.nodeId || null)}
                    className="text-[10px] mt-0.5 ml-2 hover:underline"
                    style={{ color: BRAND_COLOR }}
                  >
                    → {msg.nodeLabel}
                  </button>
                )}
              </div>
            ) : msg.role === 'bot' ? (
              <div className="max-w-[85%]">
                <div className="flex items-start gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${BRAND_COLOR}15` }}
                  >
                    <Bot className="h-3.5 w-3.5" style={{ color: BRAND_COLOR }} />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-3.5 py-2.5">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {msg.nodeLabel && (
                  <button
                    onClick={() => onHighlightNode?.(msg.nodeId || null)}
                    className="text-[10px] mt-0.5 ml-8 hover:underline"
                    style={{ color: BRAND_COLOR }}
                  >
                    → {msg.nodeLabel}
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-[85%]">
                <div className="flex items-start gap-2 flex-row-reverse">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="bg-blue-500 rounded-2xl rounded-tr-md px-3.5 py-2.5">
                    <p className="text-sm text-white">{msg.content}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {waitingForInput && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-gray-400">Aguardando sua resposta...</span>
          </div>
        )}
      </div>

      {/* Variables */}
      {Object.keys(variables).length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-[10px] font-medium text-gray-500 mb-1">Variáveis:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(variables).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px] rounded-md">
                {k}={v}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white">
        {isRunning ? (
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUserInput()}
              placeholder={waitingForInput ? 'Digite sua resposta...' : 'Aguardando o bot...'}
              disabled={!waitingForInput}
              className="rounded-xl text-sm"
              autoFocus
            />
            <Button
              size="icon"
              onClick={handleUserInput}
              disabled={!waitingForInput || !inputValue.trim()}
              className="h-10 w-10 rounded-xl flex-shrink-0 text-white"
              style={{ background: waitingForInput ? BRAND_COLOR : '#ccc' }}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={resetSimulation}
              className="h-10 w-10 rounded-xl flex-shrink-0"
              title="Reiniciar"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={startSimulation}
            className="w-full gap-2 rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_COLOR}dd)` }}
            disabled={nodes.length === 0}
          >
            <ArrowRight className="h-4 w-4" />
            Iniciar Simulação
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatBotTestSimulator;
