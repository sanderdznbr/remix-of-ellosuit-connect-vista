import React, { useState, useEffect } from 'react';
import { X, Users, MessageSquare, Send, Crown, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useAuth } from '@/hooks/useAuth';

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
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    time: string;
    userId?: string;
  }>>([]);
  
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { user } = useAuth();

  // Listen for chat messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));
      
      if (data.type === 'chat') {
        const newMessage = {
          id: Date.now().toString(),
          sender: participant?.name || 'Participante',
          message: data.message,
          time: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          userId: participant?.identity
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
    };

    room.on('dataReceived', handleDataReceived);
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && localParticipant) {
      const messageData = {
        type: 'chat',
        message: inputMessage.trim(),
        sender: localParticipant.name || user?.user_metadata?.full_name || 'Você',
        timestamp: Date.now()
      };

      // Send to room
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      await localParticipant.publishData(data, { reliable: true });

      // Add to local messages
      const newMessage = {
        id: Date.now().toString(),
        sender: 'Você',
        message: inputMessage.trim(),
        time: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        userId: localParticipant.identity
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="meeting-sidebar">
      <div className="meeting-sidebar-header">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'chat' | 'participants')}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="participants" className="gap-2 text-gray-700 data-[state=active]:bg-ellosuit-blue data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              Participantes ({participants.length})
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2 text-gray-700 data-[state=active]:bg-ellosuit-blue data-[state=active]:text-white">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="meeting-sidebar-content">
        <Tabs value={activeTab} className="h-full">
          {/* Participants Tab */}
          <TabsContent value="participants" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-4 space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.identity}
                    className="participant-item"
                  >
                    <div className="w-8 h-8 bg-ellosuit-blue rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(participant.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {participant.name || `Participante ${participant.identity.slice(-4)}`}
                          {participant.identity === localParticipant?.identity && ' (Você)'}
                        </span>
                        {participant.permissions?.canPublish && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {participant.isMicrophoneEnabled === false && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {participant.isCameraEnabled === false && (
                        <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                          <VideoOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-0 h-full flex flex-col">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="chat-message">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-ellosuit-blue rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {msg.sender.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-900">
                            {msg.sender}
                          </span>
                          <span className="text-xs text-gray-500">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda.</p>
                    <p className="text-xs">Envie a primeira mensagem!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="chat-input">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-white border-gray-300 text-gray-900"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  className="bg-ellosuit-blue hover:bg-ellosuit-blue-hover text-white"
                  disabled={!inputMessage.trim()}
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