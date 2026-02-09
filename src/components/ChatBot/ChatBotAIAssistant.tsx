import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Loader2, Bot, User, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FlowNode, FlowEdge } from './types';

const OMNI_COLOR = '#FF4500';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  flowData?: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
}

interface ChatBotAIAssistantProps {
  onApplyFlow: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
}

const ChatBotAIAssistant: React.FC<ChatBotAIAssistantProps> = ({
  onApplyFlow,
  currentNodes,
  currentEdges
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! 👋 Sou sua assistente de criação de fluxos. Descreva o que você precisa e eu criarei o fluxo completo para você.\n\nExemplos:\n• "Crie um fluxo de atendimento ao cliente com menu de opções"\n• "Quero um bot para captura de leads com nome, email e telefone"\n• "Monte um fluxo de agendamento de consultas"'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateFlowFromDescription = useCallback(async (description: string): Promise<{ nodes: FlowNode[], edges: FlowEdge[] }> => {
    const baseX = 250;
    const baseY = 100;
    const nodeSpacing = 150;
    
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    let nodeId = 1;
    let yPos = baseY;

    const descLower = description.toLowerCase();
    
    // Start node (trigger)
    const startNode: FlowNode = {
      id: `node_${nodeId++}`,
      type: 'trigger',
      subType: 'conversation_start',
      position: { x: baseX, y: yPos },
      data: {
        label: 'Início',
        config: { triggerType: 'conversation_start' }
      }
    };
    nodes.push(startNode);
    yPos += nodeSpacing;

    // Welcome message
    const welcomeNode: FlowNode = {
      id: `node_${nodeId++}`,
      type: 'message',
      subType: 'text',
      position: { x: baseX, y: yPos },
      data: {
        label: 'Boas-vindas',
        config: { 
          messageType: 'text',
          message: descLower.includes('atendimento') 
            ? 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudar você hoje?' 
            : descLower.includes('lead')
              ? 'Olá! Que bom ter você aqui. Vou precisar de algumas informações.'
              : 'Olá! Como posso ajudar você hoje?'
        }
      }
    };
    nodes.push(welcomeNode);
    edges.push({
      id: `edge_${startNode.id}_${welcomeNode.id}`,
      source: startNode.id,
      target: welcomeNode.id
    });
    yPos += nodeSpacing;

    // Lead capture flow
    if (descLower.includes('lead') || descLower.includes('captura') || descLower.includes('cadastro')) {
      // Ask name
      const nameNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Perguntar Nome',
          config: { 
            messageType: 'text',
            message: 'Qual é o seu nome completo?',
            waitForResponse: true,
            saveAs: 'nome'
          }
        }
      };
      nodes.push(nameNode);
      edges.push({
        id: `edge_${welcomeNode.id}_${nameNode.id}`,
        source: welcomeNode.id,
        target: nameNode.id
      });
      yPos += nodeSpacing;

      // Ask email
      const emailNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Perguntar Email',
          config: { 
            messageType: 'text',
            message: 'Qual é o seu melhor email?',
            waitForResponse: true,
            saveAs: 'email'
          }
        }
      };
      nodes.push(emailNode);
      edges.push({
        id: `edge_${nameNode.id}_${emailNode.id}`,
        source: nameNode.id,
        target: emailNode.id
      });
      yPos += nodeSpacing;

      // Ask phone
      const phoneNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Perguntar Telefone',
          config: { 
            messageType: 'text',
            message: 'E qual é o seu telefone com DDD?',
            waitForResponse: true,
            saveAs: 'telefone'
          }
        }
      };
      nodes.push(phoneNode);
      edges.push({
        id: `edge_${emailNode.id}_${phoneNode.id}`,
        source: emailNode.id,
        target: phoneNode.id
      });
      yPos += nodeSpacing;

      // Save to CRM action
      const saveNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'action',
        subType: 'save_crm',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Salvar no CRM',
          config: { 
            actionType: 'save_crm',
            fields: ['nome', 'email', 'telefone']
          }
        }
      };
      nodes.push(saveNode);
      edges.push({
        id: `edge_${phoneNode.id}_${saveNode.id}`,
        source: phoneNode.id,
        target: saveNode.id
      });
      yPos += nodeSpacing;

      // Confirmation
      const confirmNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Confirmação',
          config: { 
            messageType: 'text',
            message: 'Perfeito, {{nome}}! Seus dados foram salvos. Entraremos em contato em breve.'
          }
        }
      };
      nodes.push(confirmNode);
      edges.push({
        id: `edge_${saveNode.id}_${confirmNode.id}`,
        source: saveNode.id,
        target: confirmNode.id
      });
    }
    // Menu/Options flow
    else if (descLower.includes('menu') || descLower.includes('opções') || descLower.includes('atendimento')) {
      // Menu options
      const menuNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'buttons',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Menu Principal',
          config: { 
            messageType: 'buttons',
            message: 'Selecione uma opção:',
            buttons: [
              { id: 'opt1', label: '1️⃣ Informações' },
              { id: 'opt2', label: '2️⃣ Suporte' },
              { id: 'opt3', label: '3️⃣ Atendente' }
            ]
          }
        }
      };
      nodes.push(menuNode);
      edges.push({
        id: `edge_${welcomeNode.id}_${menuNode.id}`,
        source: welcomeNode.id,
        target: menuNode.id
      });
      yPos += nodeSpacing;

      // Option responses
      const opt1Node: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX - 150, y: yPos },
        data: {
          label: 'Informações',
          config: { messageType: 'text', message: 'Aqui estão nossas informações...' }
        }
      };
      nodes.push(opt1Node);
      edges.push({ id: `edge_${menuNode.id}_${opt1Node.id}`, source: menuNode.id, target: opt1Node.id, sourceHandle: 'opt1' });

      const opt2Node: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Suporte',
          config: { messageType: 'text', message: 'Descreva seu problema...' }
        }
      };
      nodes.push(opt2Node);
      edges.push({ id: `edge_${menuNode.id}_${opt2Node.id}`, source: menuNode.id, target: opt2Node.id, sourceHandle: 'opt2' });

      const opt3Node: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'action',
        subType: 'transfer_human',
        position: { x: baseX + 150, y: yPos },
        data: {
          label: 'Transferir',
          config: { actionType: 'transfer_human', department: 'atendimento' }
        }
      };
      nodes.push(opt3Node);
      edges.push({ id: `edge_${menuNode.id}_${opt3Node.id}`, source: menuNode.id, target: opt3Node.id, sourceHandle: 'opt3' });
    }
    // Generic flow
    else {
      const genericNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Pergunta',
          config: { messageType: 'text', message: 'Como posso ajudar?', waitForResponse: true }
        }
      };
      nodes.push(genericNode);
      edges.push({ id: `edge_${welcomeNode.id}_${genericNode.id}`, source: welcomeNode.id, target: genericNode.id });
      yPos += nodeSpacing;

      const endNode: FlowNode = {
        id: `node_${nodeId++}`,
        type: 'message',
        subType: 'text',
        position: { x: baseX, y: yPos },
        data: {
          label: 'Resposta',
          config: { messageType: 'text', message: 'Obrigado! Vou encaminhar para nossa equipe.' }
        }
      };
      nodes.push(endNode);
      edges.push({ id: `edge_${genericNode.id}_${endNode.id}`, source: genericNode.id, target: endNode.id });
    }

    return { nodes, edges };
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const flowData = await generateFlowFromDescription(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Criei um fluxo com ${flowData.nodes.length} blocos!\n\n${flowData.nodes.map(n => `• ${n.data.label}`).join('\n')}\n\nClique abaixo para aplicar:`,
        flowData
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível gerar o fluxo.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFlow = (flowData: { nodes: FlowNode[], edges: FlowEdge[] }) => {
    onApplyFlow(flowData.nodes, flowData.edges);
    toast({ title: 'Fluxo aplicado!', description: `${flowData.nodes.length} blocos adicionados.` });
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${OMNI_COLOR}10, ${OMNI_COLOR}05)` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: OMNI_COLOR }}>
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Assistente IA</h3>
          <p className="text-xs text-muted-foreground">Crie fluxos com IA</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div 
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-gray-100' : ''}`}
                style={message.role === 'assistant' ? { backgroundColor: `${OMNI_COLOR}15` } : {}}
              >
                {message.role === 'user' ? <User className="h-4 w-4 text-gray-600" /> : <Bot className="h-4 w-4" style={{ color: OMNI_COLOR }} />}
              </div>
              <div className={`flex-1 rounded-2xl p-3 text-sm ${message.role === 'user' ? 'bg-gray-100' : 'bg-muted/50'}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.flowData && (
                  <Button onClick={() => handleApplyFlow(message.flowData!)} className="mt-3 w-full rounded-xl text-white" style={{ backgroundColor: OMNI_COLOR }}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Aplicar Fluxo
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${OMNI_COLOR}15` }}>
                <Bot className="h-4 w-4" style={{ color: OMNI_COLOR }} />
              </div>
              <div className="bg-muted/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando fluxo...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Descreva o fluxo..."
            className="rounded-xl"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon" className="rounded-xl shrink-0" style={{ backgroundColor: OMNI_COLOR }}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatBotAIAssistant;
