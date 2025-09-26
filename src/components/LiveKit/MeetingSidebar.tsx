import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Users, MessageSquare, Crown, Mic, MicOff, Video, VideoOff, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useParticipants, 
  useRoomContext,
  useLocalParticipant
} from '@livekit/components-react';
import { supabase } from '@/integrations/supabase/client';
import TranscriptionPanel from './TranscriptionPanel';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'participants' | 'chat' | 'transcription';
  onTabChange: (tab: 'participants' | 'chat' | 'transcription') => void;
  roomId?: string;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  onTabChange,
  roomId 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Listen for chat messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));
        if (message.type === 'chat') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            participant: participant?.name || participant?.identity || 'Participante',
            message: message.text,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !room || !localParticipant) return;

    try {
      const messageData = {
        type: 'chat',
        text: inputMessage,
        timestamp: new Date().toISOString()
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      
      await room.localParticipant.publishData(data, { reliable: true });
      
      // Add to local messages
      setMessages(prev => [...prev, {
        id: Date.now(),
        participant: localParticipant.identity,
        message: inputMessage,
        timestamp: new Date()
      }]);
      
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="zoom-meeting-sidebar">
      <div className="h-full flex flex-col">
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            <TabsTrigger 
              value="participants" 
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Participantes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transcription" 
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Transcrição</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="flex-1 flex flex-col mt-0">
            <div className="p-3 border-b border-border">
              <h3 className="font-medium text-sm">Participantes ({participants.length})</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {participants.map((participant) => {
                  const isHost = participant.identity === localParticipant?.identity;
                  const audioEnabled = participant.isMicrophoneEnabled;
                  const videoEnabled = participant.isCameraEnabled;
                  
                  return (
                    <div 
                      key={participant.identity} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        {isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {(participant.name as string | undefined) || participant.identity || 'Participante'}
                            {isHost && ' (Você)'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {audioEnabled ? (
                          <Mic className="h-4 w-4 text-green-500" />
                        ) : (
                          <MicOff className="h-4 w-4 text-red-500" />
                        )}
                        {videoEnabled ? (
                          <Video className="h-4 w-4 text-green-500" />
                        ) : (
                          <VideoOff className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            <div className="p-3 border-b border-border">
              <h3 className="font-medium text-sm">Chat da Reunião</h3>
            </div>
            
            <ScrollArea className="flex-1" ref={chatScrollRef}>
              <div className="p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-xs mt-1">Envie uma mensagem para começar a conversa</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">
                          {msg.participant}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-foreground leading-relaxed">
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transcription" className="h-full mt-0 p-0">
            <TranscriptionPanel 
              roomId={roomId || ''} 
              isActive={activeTab === 'transcription'} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MeetingSidebar;