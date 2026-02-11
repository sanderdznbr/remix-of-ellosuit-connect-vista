import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Users, MessageSquare, Bot, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MeetingChatSidebarProps {
  roomCode: string;
  transcriptionMessages: Array<{ text: string; timestamp: string; speaker?: string }>;
}

interface ChatMessage {
  id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  file_url?: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MeetingChatSidebar: React.FC<MeetingChatSidebarProps> = ({ roomCode, transcriptionMessages }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'ia'>('chat');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // AI Chat State
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Auto-collapse on small screens
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1100) {
        setIsCollapsed(true);
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      sender_name: user?.user_metadata?.full_name || 'Convidado',
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-files/${roomCode}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('meeting-audios')
        .getPublicUrl(filePath);

      const newMessage: ChatMessage = {
        id: Math.random().toString(),
        sender_name: user?.user_metadata?.full_name || 'Convidado',
        message: `Enviou um arquivo: ${file.name}`,
        timestamp: new Date().toISOString(),
        file_url: data.publicUrl,
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      toast({
        title: "Arquivo enviado!",
        description: "O arquivo foi compartilhado no chat.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);

    try {
      const transcriptContext = transcriptionMessages
        .map(m => `[${new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${m.speaker || 'Participante'}: ${m.text}`)
        .join('\n');

      const contextMessage = transcriptContext 
        ? `Contexto da reunião (transcrição):\n${transcriptContext}\n\nPergunta do usuário: ${userMessage}`
        : userMessage;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: contextMessage,
          roomCode: roomCode 
        }
      });

      if (error) throw error;

      if (data?.response) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error: any) {
      console.error('AI Chat error:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Não foi possível processar sua pergunta.",
        variant: "destructive",
      });
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.' 
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  // Collapsed state - just a toggle button
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 mr-4 mb-4 pt-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Abrir chat"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => { setIsCollapsed(false); setActiveTab('chat'); }}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Chat"
        >
          <MessageSquare className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => { setIsCollapsed(false); setActiveTab('participants'); }}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Participantes"
        >
          <Users className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => { setIsCollapsed(false); setActiveTab('ia'); }}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Assistente IA"
        >
          <Bot className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[320px] xl:w-[360px] bg-white flex flex-col rounded-3xl shadow-2xl mr-4 mb-4 transition-all duration-300">
      {/* Tabs Header */}
      <div className="flex items-center border-b px-2 pt-4">
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'participants'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">Participantes</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('ia')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'ia'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="text-xs">IA</span>
          </button>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Minimizar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  Nenhuma mensagem ainda
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs text-gray-900">
                      {msg.sender_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                  {msg.file_url && (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      📎 Abrir arquivo
                    </a>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t rounded-b-3xl">
              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 p-0 hover:bg-transparent"
                >
                  <Paperclip className="w-4 h-4 text-gray-600" />
                </Button>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Mensagem..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                />
                <Button
                  onClick={sendMessage}
                  size="icon"
                  disabled={!inputMessage.trim()}
                  className="h-8 w-8 p-0 rounded-full"
                  style={{ backgroundColor: '#3600FF' }}
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="p-4">
            <p className="text-sm text-gray-500">Lista de participantes será exibida aqui</p>
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3600FF' }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">Assistente IA</h3>
                  <p className="text-xs text-gray-500">Pergunte sobre a reunião</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={aiScrollRef}>
              {aiMessages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#F5F3FF' }}>
                    <Bot className="w-8 h-8" style={{ color: '#3600FF' }} />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Olá! Sou seu assistente IA.</h4>
                  <p className="text-xs text-gray-500">
                    Pergunte-me sobre a reunião!
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {aiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                      style={msg.role === 'user' ? { backgroundColor: '#3600FF' } : {}}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t rounded-b-3xl">
              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={handleAiKeyPress}
                  placeholder="Pergunte..."
                  disabled={isAiLoading}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                />
                <Button
                  onClick={handleAiSend}
                  size="icon"
                  disabled={!aiInput.trim() || isAiLoading}
                  className="h-8 w-8 p-0 rounded-full"
                  style={{ backgroundColor: '#3600FF' }}
                >
                  {isAiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingChatSidebar;
