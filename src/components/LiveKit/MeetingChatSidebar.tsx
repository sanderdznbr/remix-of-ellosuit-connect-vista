import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Paperclip, Users, MessageSquare, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MeetingChatSidebarProps {
  roomCode: string;
  onShowAIChat: () => void;
}

interface ChatMessage {
  id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  file_url?: string;
}

const MeetingChatSidebar: React.FC<MeetingChatSidebarProps> = ({ roomCode, onShowAIChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Temporary: add message locally
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

    // Implement file upload logic here
    toast({
      title: "Upload em desenvolvimento",
      description: "A funcionalidade de envio de arquivos será implementada em breve.",
    });
  };

  return (
    <div className="w-[340px] bg-white flex flex-col rounded-tl-[37px] shadow-2xl relative">
      {/* AI Chat Button - Floating */}
      <button
        onClick={onShowAIChat}
        className="absolute -left-16 bottom-8 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-105"
        style={{ width: '60px', height: '60px', backgroundColor: '#3600FF' }}
        title="Falar com EllolA"
      >
        <Bot className="w-7 h-7 text-white" />
      </button>

      {/* Tabs Header */}
      <div className="flex items-center border-b px-4 pt-6">
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors ${
              activeTab === 'participants'
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bate-papo</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded-2xl p-3 mr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {msg.sender_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
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
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escrever mensagem..."
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  size="icon"
                  disabled={!inputMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-gray-500">Lista de participantes será exibida aqui</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingChatSidebar;
