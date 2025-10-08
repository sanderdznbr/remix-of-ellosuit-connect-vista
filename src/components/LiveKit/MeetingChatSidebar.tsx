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
}

interface ChatMessage {
  id: string;
  sender_name: string;
  message: string;
  timestamp: string;
  file_url?: string;
}

const MeetingChatSidebar: React.FC<MeetingChatSidebarProps> = ({ roomCode }) => {
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
    <div className="w-[360px] bg-white flex flex-col rounded-3xl shadow-2xl mr-4">
      {/* Tabs Header */}
      <div className="flex items-center border-b px-2 pt-4">
        <div className="flex gap-2 flex-1">
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeTab === 'participants'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">Participantes</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Bate-papo</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Messages */}
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
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2">
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
                  placeholder="Escrever mensagem..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
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
