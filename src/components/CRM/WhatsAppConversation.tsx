import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Phone, MoreVertical, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import WhatsAppMediaMessage from './WhatsAppMediaMessage';

interface Message {
  id: string;
  from_me: boolean;
  content: string;
  timestamp: string;
  status: string;
  message_type?: string;
  media_url?: string;
  media_caption?: string;
  sender_name?: string;
  sender_phone?: string;
}

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name?: string;
  profile_picture?: string;
  session_id?: string;
  assigned_agent_id?: string;
}

interface WhatsAppConversationProps {
  conversation: Conversation;
  sessionId: string;
  onBack?: () => void;
  onAssignAgent?: () => void;
}

const WhatsAppConversation: React.FC<WhatsAppConversationProps> = ({
  conversation,
  sessionId,
  onBack,
  onAssignAgent
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (!error) {
        setMessages(data?.map(m => ({
          id: m.id,
          from_me: m.from_me,
          content: m.content || '',
          timestamp: m.timestamp,
          status: m.status,
          message_type: m.message_type || 'text',
          media_url: m.media_url || '',
          media_caption: m.media_caption || '',
          sender_name: m.sender_name || '',
          sender_phone: m.sender_phone || ''
        })) || []);
      }
      setLoading(false);
    };

    loadMessages();

    // Subscribe to new messages with proper deduplication
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        const newMsg = payload.new as any;
        setMessages(prev => {
          // Check if this exact message ID already exists
          if (prev.some(m => m.id === newMsg.id)) {
            return prev;
          }
          
          // For sent messages (from_me), replace temp message with same content
          if (newMsg.from_me) {
            const tempIndex = prev.findIndex(m => 
              m.id.startsWith('temp-') && 
              m.content === (newMsg.content || '') &&
              m.from_me === true
            );
            
              if (tempIndex !== -1) {
              // Replace temp message with real one
              const updated = [...prev];
              updated[tempIndex] = {
                id: newMsg.id,
                from_me: newMsg.from_me,
                content: newMsg.content || '',
                timestamp: newMsg.timestamp,
                status: newMsg.status,
                message_type: newMsg.message_type || 'text',
                media_url: newMsg.media_url || '',
                media_caption: newMsg.media_caption || '',
                sender_name: newMsg.sender_name || '',
                sender_phone: newMsg.sender_phone || ''
              };
              return updated;
            }
          }
          
          // Check for duplicate content from same direction within recent messages
          const recentDuplicate = prev.slice(-10).some(m => 
            m.content === (newMsg.content || '') && 
            m.from_me === newMsg.from_me
          );
          if (recentDuplicate) {
            return prev;
          }
          
          // Add new message
          return [...prev, {
            id: newMsg.id,
            from_me: newMsg.from_me,
            content: newMsg.content || '',
            timestamp: newMsg.timestamp,
            status: newMsg.status,
            message_type: newMsg.message_type || 'text',
            media_url: newMsg.media_url || '',
            media_caption: newMsg.media_caption || '',
            sender_name: newMsg.sender_name || '',
            sender_phone: newMsg.sender_phone || ''
          }];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    const messageContent = inputMessage.trim();
    setInputMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-api', {
        body: {
          action: 'send_message',
          sessionId,
          phone: conversation.contact_phone,
          message: messageContent
        }
      });

      if (error) throw error;

      // Add message locally immediately with temp ID
      const tempId = `temp-${Date.now()}`;
      const tempTimestamp = new Date().toISOString();
      setMessages(prev => [...prev, {
        id: tempId,
        from_me: true,
        content: messageContent,
        timestamp: tempTimestamp,
        status: 'sent'
      }]);

    } catch (e: any) {
      console.error('Error sending message:', e);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem. Tente novamente.',
        variant: 'destructive'
      });
      setInputMessage(messageContent); // Restore message
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.profile_picture} />
          <AvatarFallback className="bg-green-100 text-green-700">
            {conversation.contact_name?.[0] || conversation.contact_phone[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-medium">
            {conversation.contact_name || conversation.contact_phone}
          </h3>
          <p className="text-xs text-muted-foreground">
            {conversation.contact_phone}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`tel:${conversation.contact_phone}`)}>
              <Phone className="h-4 w-4 mr-2" />
              Ligar
            </DropdownMenuItem>
            {onAssignAgent && (
              <DropdownMenuItem onClick={onAssignAgent}>
                <Bot className="h-4 w-4 mr-2" />
                Atribuir Agente IA
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-[#e5ddd5]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              // Check if this is a group conversation (contact_phone ends with digits typical of groups - 18+ digits)
              const isGroupConversation = conversation.contact_phone?.replace(/\D/g, '').length >= 18;
              // Show sender name for incoming messages in groups
              const showSenderName = isGroupConversation && !message.from_me && message.sender_name;
              // Check if previous message is from same sender (to avoid repetition)
              const prevMsg = messages[index - 1];
              const sameSenderAsPrev = prevMsg && 
                prevMsg.sender_name === message.sender_name && 
                !message.from_me && 
                !prevMsg.from_me;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${message.from_me ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 ${
                      message.from_me
                        ? 'bg-[#dcf8c6] text-gray-900'
                        : 'bg-white text-gray-900'
                    }`}
                  >
                    {/* Show sender name in groups */}
                    {showSenderName && !sameSenderAsPrev && (
                      <p className="text-xs font-semibold text-primary mb-1">
                        {message.sender_name}
                      </p>
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <div className={`flex items-center gap-1 justify-end mt-1`}>
                      <span className="text-[10px] text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.from_me && (
                        <span className="text-[10px] text-blue-500">
                          {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || sending}
            size="icon"
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConversation;
