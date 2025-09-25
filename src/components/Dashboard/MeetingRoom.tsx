import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  Phone, PhoneOff, MessageSquare, Users, Settings,
  Send, MoreVertical, Copy, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useMeetingRooms, type RoomParticipant } from '@/hooks/useMeetingRooms';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  participant_name: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
}

const MeetingRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRoom, participants, joinRoom, leaveRoom, updateParticipantStatus } = useMeetingRooms();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(true);
  const [currentParticipant, setCurrentParticipant] = useState<RoomParticipant | null>(null);
  
  // Estados dos controles de mídia
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  
  // Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Participantes
  const [showParticipants, setShowParticipants] = useState(false);
  
  // Refs para vídeo
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});

  const joinMeeting = async () => {
    if (!roomCode || !displayName.trim()) return;
    
    const result = await joinRoom(roomCode, displayName);
    if (result) {
      setCurrentParticipant(result.participant);
      setIsConnected(true);
      setShowNameDialog(false);
      
      toast({
        title: "Conectado!",
        description: `Você entrou na reunião "${result.room.title}"`,
      });
    }
  };

  const leaveMeeting = async () => {
    if (currentParticipant) {
      await leaveRoom(currentParticipant.id);
      setIsConnected(false);
      navigate('/dashboard/reunioes');
    }
  };

  const toggleAudio = async () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    
    if (currentParticipant) {
      await updateParticipantStatus(currentParticipant.id, { audio_enabled: newState });
    }
    
    toast({
      title: newState ? "Microfone ativado" : "Microfone desativado",
      description: newState ? "Seu áudio está sendo transmitido" : "Seu áudio foi desativado",
    });
  };

  const toggleVideo = async () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    
    if (currentParticipant) {
      await updateParticipantStatus(currentParticipant.id, { video_enabled: newState });
    }
    
    toast({
      title: newState ? "Câmera ativada" : "Câmera desativada",
      description: newState ? "Seu vídeo está sendo transmitido" : "Seu vídeo foi desativado",
    });
  };

  const toggleScreenShare = async () => {
    const newState = !screenSharing;
    setScreenSharing(newState);
    
    if (currentParticipant) {
      await updateParticipantStatus(currentParticipant.id, { screen_sharing: newState });
    }
    
    toast({
      title: newState ? "Compartilhamento iniciado" : "Compartilhamento parado",
      description: newState ? "Sua tela está sendo compartilhada" : "Compartilhamento de tela parado",
    });
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      participant_name: displayName,
      message: chatMessage,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');
  };

  const copyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link da reunião foi copiado para a área de transferência",
    });
  };

  // Não conectado - mostrar tela de entrada
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar na Reunião</CardTitle>
            <p className="text-muted-foreground">
              Código: <span className="font-mono font-semibold">{roomCode}</span>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Como você quer aparecer?
              </label>
              <Input
                id="displayName"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinMeeting()}
              />
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/dashboard/reunioes')} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={joinMeeting} className="flex-1" disabled={!displayName.trim()}>
                Entrar na Reunião
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interface da reunião
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{currentRoom?.title || `Reunião ${roomCode}`}</h1>
          <p className="text-sm text-gray-400">
            {participants.length} participante{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-white hover:bg-gray-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Participantes
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-white hover:bg-gray-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={copyMeetingLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Video area */}
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
          {/* Local video */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
              Você {!audioEnabled && <MicOff className="inline h-3 w-3 ml-1" />}
            </div>
          </div>

          {/* Remote videos grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {participants.filter(p => p.id !== currentParticipant?.id).map((participant) => (
              <div key={participant.id} className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative">
                <video
                  ref={(el) => {
                    if (el) remoteVideosRef.current[participant.peer_id] = el;
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  {participant.display_name}
                  {!participant.audio_enabled && <MicOff className="inline h-3 w-3 ml-1" />}
                </div>
                <div className="absolute top-2 right-2">
                  {participant.is_host && <Badge variant="secondary" className="text-xs">Host</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            {showParticipants && (
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold mb-3">Participantes ({participants.length})</h3>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            participant.connection_status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <span>{participant.display_name}</span>
                          {participant.is_host && <Badge variant="secondary" className="text-xs">Host</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {!participant.audio_enabled && <MicOff className="h-3 w-3 text-red-500" />}
                          {!participant.video_enabled && <VideoOff className="h-3 w-3 text-red-500" />}
                          {participant.screen_sharing && <Monitor className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {showChat && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold">Chat</h3>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`${msg.isOwn ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-xs p-2 rounded-lg ${
                          msg.isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-100'
                        }`}>
                          <div className="text-xs opacity-75 mb-1">{msg.participant_name}</div>
                          <div className="text-sm">{msg.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1 bg-gray-700 border-gray-600 text-white"
                    />
                    <Button size="sm" onClick={sendChatMessage} disabled={!chatMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-center gap-4">
        <Button
          variant={audioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className="rounded-full"
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={videoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full"
        >
          {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={screenSharing ? "secondary" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full"
        >
          {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={speakerEnabled ? "default" : "destructive"}
          size="lg"
          onClick={() => setSpeakerEnabled(!speakerEnabled)}
          className="rounded-full"
        >
          {speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <Button
          variant="destructive"
          size="lg"
          onClick={leaveMeeting}
          className="rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MeetingRoom;