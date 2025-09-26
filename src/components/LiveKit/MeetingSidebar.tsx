import React, { useState } from 'react';
import { X, Send, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'participants';
  onTabChange: (tab: 'chat' | 'participants') => void;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange
}) => {
  const [message, setMessage] = useState('');
  
  // Mock data - replace with real data from LiveKit
  const participants = [
    { id: '1', name: 'João Silva', isHost: true, isMuted: false, hasVideo: true },
    { id: '2', name: 'Maria Santos', isHost: false, isMuted: true, hasVideo: true },
    { id: '3', name: 'Pedro Costa', isHost: false, isMuted: false, hasVideo: false },
  ];

  const messages = [
    { id: '1', sender: 'João Silva', message: 'Olá pessoal! Bem-vindos à reunião.', time: '14:32' },
    { id: '2', sender: 'Maria Santos', message: 'Oi! Obrigada por organizar.', time: '14:33' },
    { id: '3', sender: 'Pedro Costa', message: 'Vamos começar?', time: '14:35' },
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: Send message via LiveKit
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="meeting-sidebar">
      <div className="meeting-sidebar-header">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'chat' | 'participants')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participants" className="gap-2">
              <Users className="h-4 w-4" />
              Participantes ({participants.length})
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button 
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="meeting-sidebar-content">
        <Tabs value={activeTab} className="h-full">
          {/* Participants Tab */}
          <TabsContent value="participants" className="h-full">
            <ScrollArea className="h-full px-4">
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="participant-item">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/20 text-white text-xs">
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {participant.name}
                        </span>
                        {participant.isHost && (
                          <Badge variant="secondary" className="text-xs">
                            Host
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          participant.isMuted ? "bg-red-500" : "bg-green-500"
                        )} />
                        <span className="text-xs text-white/70">
                          {participant.isMuted ? 'Mudo' : 'Ativo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!participant.isMuted && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                      {!participant.hasVideo && (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="h-full flex flex-col">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="chat-message">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/20 text-white text-xs">
                          {msg.sender.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white">
                            {msg.sender}
                          </span>
                          <span className="text-xs text-white/50">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-white/90">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="chat-input">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MeetingSidebar;