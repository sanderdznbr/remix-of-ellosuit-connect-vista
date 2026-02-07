import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Check, CheckCheck, Circle, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import WhatsAppMediaMessage from './WhatsAppMediaMessage';

interface WhatsAppConversationData {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message_at: string;
  last_message?: string;
  status: string;
  unread_count?: number;
  profile_picture?: string;
  session_id?: string;
  assigned_agent_id?: string;
  ai_auto_reply_enabled?: boolean;
  pipeline_stage?: string;
  labels?: string[];
}

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  content: string;
  from_me: boolean;
  status: string;
  created_at: string;
  sender_name?: string;
  wa_message_id?: string;
  message_type?: string;
  media_url?: string;
  media_caption?: string;
  is_ai_response?: boolean;
}

interface KanbanChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: WhatsAppConversationData | null;
  companyId: string | null;
}

const KanbanChatSidebar: React.FC<KanbanChatSidebarProps> = ({
  isOpen,
  onClose,
  conversation,
  companyId
}) => {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation || !companyId || !isOpen) return;
    
    const loadMessages = async () => {
      setLoading(true);
      
      // Get all conversation IDs for this phone
      const { data: convs } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('company_id', companyId)
        .eq('contact_phone', conversation.contact_phone);
      
      if (!convs || convs.length === 0) {
        setLoading(false);
        return;
      }
      
      const conversationIds = convs.map(c => c.id);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('timestamp', { ascending: true })
        .limit(200);
      
      if (!error && data) {
        // Deduplicate by wa_message_id
        const uniqueMessages = new Map<string, WhatsAppMessage>();
        data.forEach(m => {
          const key = m.wa_message_id || m.id;
          if (!uniqueMessages.has(key)) {
            uniqueMessages.set(key, {
              ...m,
              created_at: m.timestamp || m.created_at
            });
          }
        });
        setMessages(Array.from(uniqueMessages.values()));
      }
      setLoading(false);
    };
    
    loadMessages();
    
    // Poll for new messages
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [conversation?.contact_phone, companyId, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening
  useEffect(() => {
    if (conversation && isOpen && (conversation.unread_count || 0) > 0) {
      supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id);
    }
  }, [conversation, isOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || sendingMessage) return;
    
    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage: WhatsAppMessage = {
      id: tempId,
      conversation_id: conversation.id,
      content: messageContent,
      from_me: true,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // Get session info
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('session_id')
        .eq('id', conversation.id)
        .single();
      
      if (!conv?.session_id) {
        throw new Error('Sessão não encontrada');
      }
      
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('baileys_server_url')
        .eq('id', conv.session_id)
        .single();
      
      if (!session?.baileys_server_url) {
        throw new Error('Servidor não configurado');
      }
      
      // Send via Baileys
      const response = await fetch(`${session.baileys_server_url}/api/message/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: conv.session_id,
          phone: conversation.contact_phone,
          message: messageContent
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao enviar');
      }
      
      // Update temp message status
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' } : m
      ));
      
      // Update conversation
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: messageContent,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
        
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: error.message,
        variant: 'destructive'
      });
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' } : m
      ));
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'sending':
        return <Circle className="h-3 w-3 animate-pulse" />;
      case 'failed':
        return <Circle className="h-3 w-3 text-red-500" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  if (!conversation) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={conversation.profile_picture} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {conversation.contact_name || conversation.contact_phone}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">{conversation.contact_phone}</p>
            </div>
            {conversation.ai_auto_reply_enabled && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                <Bot className="h-3 w-3 mr-1" />
                IA Ativa
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.from_me ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      message.from_me
                        ? message.is_ai_response
                          ? "bg-gradient-to-r from-purple-500/90 to-violet-500/90 text-white"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.is_ai_response && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1">
                        <Bot className="h-3 w-3" />
                        <span>{message.sender_name || 'IA'}</span>
                      </div>
                    )}
                    {message.message_type && message.message_type !== 'text' ? (
                      <WhatsAppMediaMessage
                        messageType={message.message_type}
                        content={message.content}
                        mediaUrl={message.media_url}
                        mediaCaption={message.media_caption}
                        fromMe={message.from_me}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1 text-[10px]",
                      message.from_me ? "opacity-70" : "text-muted-foreground"
                    )}>
                      <span>{formatTime(message.created_at)}</span>
                      {message.from_me && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-card">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1"
              disabled={sendingMessage}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={sendingMessage || !newMessage.trim()}
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KanbanChatSidebar;
