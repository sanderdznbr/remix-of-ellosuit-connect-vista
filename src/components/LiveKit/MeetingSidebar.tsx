import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Users, MessageSquare, Crown, Mic, MicOff, Video, VideoOff, FileText, Paperclip, Download, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useParticipants, 
  useRoomContext,
  useLocalParticipant
} from '@livekit/components-react';
import TranscriptionPanel from './TranscriptionPanel';
import { useToast } from '@/hooks/use-toast';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'participants' | 'chat' | 'transcription';
  onTabChange: (tab: 'participants' | 'chat' | 'transcription') => void;
  roomId?: string;
  transcriptionMessages: Array<{text: string, is_final: boolean, timestamp: string, speaker?: string}>;
  onTranscriptionMessagesUpdate: (messages: Array<{text: string, is_final: boolean, timestamp: string, speaker?: string}>) => void;
}

interface ChatMessage {
  id: number;
  participant: string;
  message?: string;
  file?: { name: string; size: number; type: string; url: string };
  timestamp: Date;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Listen for chat messages and files
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            participant: participant?.name || participant?.identity || 'Participante',
            message: data.text,
            timestamp: new Date()
          }]);
        } else if (data.type === 'file') {
          // Receive file metadata (files are temporary, not saved to Supabase)
          setMessages(prev => [...prev, {
            id: Date.now(),
            participant: participant?.name || participant?.identity || 'Participante',
            file: {
              name: data.fileName,
              size: data.fileSize,
              type: data.fileType,
              url: data.fileUrl
            },
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
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
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room || !localParticipant) return;

    // Limit file size to 10MB for temporary sharing
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert file to base64 for temporary sharing via DataChannel
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          
          const fileData = {
            type: 'file',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileUrl: base64Data, // Temporary base64 URL
            timestamp: new Date().toISOString()
          };

          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(fileData));
          
          await room.localParticipant.publishData(data, { reliable: true });
          
          const senderName = localParticipant.name || localParticipant.identity || 'Você';
          setMessages(prev => [...prev, {
            id: Date.now(),
            participant: senderName,
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
              url: base64Data
            },
            timestamp: new Date()
          }]);

          toast({
            title: "Arquivo compartilhado",
            description: `${file.name} foi compartilhado com sucesso`,
          });
        } catch (error) {
          console.error('Error sharing file:', error);
          toast({
            title: "Erro ao compartilhar",
            description: "Não foi possível compartilhar o arquivo",
            variant: "destructive"
          });
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-full bg-[#202124] flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col h-full">
        {/* Modern Clean Header with Tabs */}
        <div className="flex-none border-b border-gray-800/50 bg-[#202124]">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-[#2d2e30] rounded-none">
            <TabsTrigger 
              value="participants" 
              className="flex items-center gap-2 text-sm data-[state=active]:bg-[#202124] data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-300"
            >
              <Users className="h-4 w-4" />
              <span>Participantes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 text-sm data-[state=active]:bg-[#202124] data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none text-gray-300"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="participants" className="h-full m-0 flex flex-col">
            <div className="flex-none p-4 border-b border-gray-800/50 bg-[#202124]">
              <h3 className="font-semibold text-white">Participantes na reunião</h3>
              <p className="text-sm text-gray-400">{participants.length} pessoa{participants.length !== 1 ? 's' : ''} conectada{participants.length !== 1 ? 's' : ''}</p>
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
                      className="flex items-center justify-between p-3 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isHost && <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {displayName}
                            {isHost && ' (Você)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          audioEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {audioEnabled ? (
                            <Mic className="h-3 w-3" />
                          ) : (
                            <MicOff className="h-3 w-3" />
                          )}
                        </div>
                        <div className={cn(
                          "p-1.5 rounded-full",
                          videoEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
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
            <div className="flex-none p-4 border-b border-gray-800/50 bg-[#202124]">
              <h3 className="font-semibold text-white">Chat da reunião</h3>
              <p className="text-sm text-gray-400">Converse e compartilhe arquivos</p>
            </div>
            
            <ScrollArea className="flex-1 p-0" ref={chatScrollRef}>
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-sm text-gray-400 font-medium">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-gray-500 mt-1">Envie uma mensagem para começar a conversa</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-400">
                          {msg.participant}
                        </span>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {msg.message ? (
                        <div className="text-sm text-gray-200 leading-relaxed bg-[#2d2e30] rounded-lg px-3 py-2">
                          {msg.message}
                        </div>
                      ) : msg.file ? (
                        <div className="flex items-center gap-3 bg-[#2d2e30] rounded-lg px-3 py-2">
                          <File className="h-8 w-8 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{msg.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(msg.file.size)}</p>
                          </div>
                          <a
                            href={msg.file.url}
                            download={msg.file.name}
                            className="flex-shrink-0"
                          >
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex-none p-4 border-t border-gray-800/50 bg-[#202124]">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  variant="ghost"
                  className="px-3 text-gray-400 hover:text-gray-200"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-[#2d2e30] border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  size="sm"
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MeetingSidebar;
