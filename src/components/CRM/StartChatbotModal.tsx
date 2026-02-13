import React, { useState, useEffect } from 'react';
import { Bot, Play, Loader2, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatbotFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  nodes: any;
  edges: any;
  execution_count: number | null;
}

interface StartChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  conversationId: string;
  contactPhone: string;
  contactName?: string;
  sessionId?: string;
  onStarted?: (executionId: string, flowName: string) => void;
}

const StartChatbotModal: React.FC<StartChatbotModalProps> = ({
  isOpen,
  onClose,
  companyId,
  conversationId,
  contactPhone,
  contactName,
  sessionId,
  onStarted,
}) => {
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && companyId) {
      fetchFlows();
    }
  }, [isOpen, companyId]);

  const fetchFlows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chatbot_flows')
      .select('id, name, description, is_active, nodes, edges, execution_count')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setFlows(data);
    }
    setLoading(false);
  };

  const handleStartFlow = async (flow: ChatbotFlow) => {
    setStarting(flow.id);
    try {
      // Create an execution record
      const { data: execution, error: execError } = await supabase
        .from('chatbot_executions')
        .insert({
          flow_id: flow.id,
          conversation_id: conversationId,
          contact_phone: contactPhone,
          status: 'running',
          variables: {
            nome: contactName || contactPhone,
            telefone: contactPhone,
          },
          execution_path: [],
        })
        .select()
        .single();

      if (execError) throw execError;

      // Update execution count
      await supabase
        .from('chatbot_flows')
        .update({ execution_count: (flow.execution_count || 0) + 1 })
        .eq('id', flow.id);

      // Parse nodes to find the first message to send
      const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
      const edges = Array.isArray(flow.edges) ? flow.edges : [];

      // Find root node (trigger or node with no incoming edges)
      const targetIds = new Set(edges.map((e: any) => e.target));
      const triggerNode = nodes.find((n: any) => n.type === 'trigger');
      const rootNode = triggerNode || nodes.filter((n: any) => !targetIds.has(n.id))
        .sort((a: any, b: any) => (a.position?.x || 0) - (b.position?.x || 0))[0];

      if (rootNode) {
        // Find the first message node after the trigger
        const getNextNode = (nodeId: string) => {
          const edge = edges.find((e: any) => e.source === nodeId);
          return edge ? nodes.find((n: any) => n.id === edge.target) : null;
        };

        let messageNode = rootNode.type === 'trigger' ? getNextNode(rootNode.id) : rootNode;
        
        // Send the first message if it's a text/buttons message
        if (messageNode && messageNode.type === 'message') {
          const content = messageNode.data?.config?.content || messageNode.data?.config?.message || '';
          if (content && sessionId) {
            // Replace variables
            const resolved = content
              .replace(/\{\{nome\}\}/g, contactName || contactPhone)
              .replace(/\{\{telefone\}\}/g, contactPhone);

            // Send via WhatsApp
            const session = await supabase
              .from('whatsapp_sessions')
              .select('baileys_server_url')
              .eq('id', sessionId)
              .single();

            if (session.data?.baileys_server_url) {
              const jid = contactPhone.includes('@') ? contactPhone : `${contactPhone}@s.whatsapp.net`;
              const sendRes = await fetch(`${session.data.baileys_server_url}/api/message/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jid,
                  message: { text: resolved },
                }),
              });
              
              if (sendRes.ok) {
                // Also save the message locally in the conversation
                await supabase.from('whatsapp_messages').insert({
                  company_id: companyId,
                  session_id: sessionId,
                  conversation_id: conversationId,
                  content: resolved,
                  from_me: true,
                  status: 'sent',
                  message_type: 'text',
                  sender_name: 'Chatbot',
                });
              }
            }
          }
        }

        // Update execution with current node
        await supabase
          .from('chatbot_executions')
          .update({
            current_node_id: messageNode?.id || rootNode.id,
            execution_path: [rootNode.id, messageNode?.id].filter(Boolean),
          })
          .eq('id', execution.id);
      }

      onStarted?.(execution.id, flow.name);
      toast({
        title: '🤖 Chatbot iniciado!',
        description: `Fluxo "${flow.name}" iniciado na conversa`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao iniciar chatbot',
        variant: 'destructive',
      });
    } finally {
      setStarting(null);
    }
  };

  const nodeCount = (flow: ChatbotFlow) => {
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    return nodes.length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#FF4500]" />
            Iniciar Chatbot
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecione um fluxo para iniciar na conversa com {contactName || contactPhone}
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#FF4500]" />
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum fluxo de chatbot encontrado</p>
              <p className="text-xs mt-1">Crie um fluxo no Chatbot Builder primeiro</p>
            </div>
          ) : (
            flows.map(flow => (
              <div
                key={flow.id}
                className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{flow.name}</span>
                    {flow.is_active ? (
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-600 px-1.5">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  {flow.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{flow.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {nodeCount(flow)} blocos · {flow.execution_count || 0} execuções
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleStartFlow(flow)}
                  disabled={starting !== null}
                  className="ml-3 gap-1.5 bg-[#FF4500] hover:bg-[#E03E00] text-white"
                >
                  {starting === flow.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Iniciar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartChatbotModal;
