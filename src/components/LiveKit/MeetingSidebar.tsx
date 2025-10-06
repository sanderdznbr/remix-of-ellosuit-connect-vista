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
import TranscriptionPanel from './TranscriptionPanel';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'participants' | 'chat' | 'transcription';
  onTabChange: (tab: 'participants' | 'chat' | 'transcription') => void;
  roomId?: string;
  transcriptionMessages: Array<{text: string, is_final: boolean, timestamp: string}>;
  onTranscriptionMessagesUpdate: (messages: Array<{text: string, is_final: boolean, timestamp: string}>) => void;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  onTabChange,
  roomId,
  transcriptionMessages,
  onTranscriptionMessagesUpdate
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
      
      // Add to local messages - use name first, then identity as fallback
      const senderName = localParticipant.name || localParticipant.identity || 'Você';
      setMessages(prev => [...prev, {
        id: Date.now(),
        participant: senderName,
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
    <div className="h-full w-80 bg-background border-l border-border flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col h-full">
        {/* Modern Clean Header with Tabs */}
        <div className="flex-none border-b border-border bg-background">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/20 rounded-none">
            <TabsTrigger 
              value="participants" 
              className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Users className="h-4 w-4" />
              <span>Participantes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transcription" 
              className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <FileText className="h-4 w-4" />
              <span>Transcrição</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="participants" className="h-full m-0 flex flex-col">
            <div className="flex-none p-4 border-b border-border bg-background">
              <h3 className="font-semibold text-foreground">Participantes na reunião</h3>
              <p className="text-sm text-muted-foreground">{participants.length} pessoa{participants.length !== 1 ? 's' : ''} conectada{participants.length !== 1 ? 's' : ''}</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {participants.map((participant) => {
                  const isHost = participant.identity === localParticipant?.identity;
                  const audioEnabled = participant.isMicrophoneEnabled;
                  const videoEnabled = participant.isCameraEnabled;
                  const displayName = participant.name || participant.identity || 'Participante';
                  
                  return (
                    <div 
                      key={participant.identity} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isHost && <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {displayName}
                            {isHost && ' (Você)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          audioEnabled ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {audioEnabled ? (
                            <Mic className="h-3 w-3" />
                          ) : (
                            <MicOff className="h-3 w-3" />
                          )}
                        </div>
                        <div className={cn(
                          "p-1.5 rounded-full",
                          videoEnabled ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {videoEnabled ? (
                            <Video className="h-3 w-3" />
                          ) : (
                            <VideoOff className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="h-full m-0 flex flex-col">
            <div className="flex-none p-4 border-b border-border bg-background">
              <h3 className="font-semibold text-foreground">Chat da reunião</h3>
              <p className="text-sm text-muted-foreground">Converse com os participantes</p>
            </div>
            
            <ScrollArea className="flex-1 p-0" ref={chatScrollRef}>
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground font-medium">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para começar a conversa</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {msg.participant}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2">
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex-none p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 border-muted-foreground/20 focus:border-primary"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transcription" className="h-full m-0 p-0">
            <TranscriptionPanel 
              roomId={roomId || ''} 
              isActive={activeTab === 'transcription'}
              messages={transcriptionMessages}
              onMessagesUpdate={onTranscriptionMessagesUpdate}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MeetingSidebar;