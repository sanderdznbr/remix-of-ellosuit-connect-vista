import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  Phone, PhoneOff, MessageSquare, Users, Settings,
  Send, MoreVertical, Copy, Volume2, VolumeX, Camera, CameraOff
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

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
  const { currentRoom, participants, leaveRoom, updateParticipantStatus, fetchParticipants } = useMeetingRooms();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(true);
  const [currentParticipant, setCurrentParticipant] = useState<RoomParticipant | null>(null);
  const [roomInfo, setRoomInfo] = useState<{ id: string; title: string } | null>(null);
  const [localPeerId, setLocalPeerId] = useState<string | null>(null);
  
  // Estados dos controles de mídia
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  
  // Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Participantes
  const [showParticipants, setShowParticipants] = useState(false);
  
  // Refs para vídeo
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const targetMapRef = useRef<Record<string, string>>({});

  // Solicitar permissões de mídia
  const requestMediaPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setAudioEnabled(true);
      setVideoEnabled(true);
      setPermissionsRequested(true);
      
      toast({
        title: "Permissões concedidas",
        description: "Câmera e microfone foram ativados",
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setPermissionsRequested(true); // evitar overlay infinito
      toast({
        title: "Erro de permissões",
        description: "Não foi possível acessar a câmera ou microfone. Verifique as permissões.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Inicializar mídia quando conectar
  useEffect(() => {
    if (isConnected && !permissionsRequested) {
      requestMediaPermissions();
    }
  }, [isConnected, permissionsRequested, requestMediaPermissions]);

  const ensureLocalStream = useCallback(async () => {
    if (!localStreamRef.current) {
      await requestMediaPermissions();
    }
  }, [requestMediaPermissions]);

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ]
    });

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      const videoEl = remoteVideosRef.current[peerId];
      if (videoEl) {
        videoEl.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && targetMapRef.current[peerId]) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc-ice-candidate',
          targetPeerId: targetMapRef.current[peerId],
          candidate: event.candidate
        }));
      }
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  const attachLocalTracks = async (pc: RTCPeerConnection) => {
    await ensureLocalStream();
    const stream = localStreamRef.current!;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  };

  const joinMeeting = async () => {
    if (!roomCode || !displayName.trim()) return;

    // Abrir WebSocket para o servidor de sinalização
    const ws = new WebSocket('wss://jwddiyuezqrpuakazvgg.functions.supabase.co/meeting-signaling');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join-room',
        roomCode: (roomCode as string).toUpperCase(),
        displayName,
        userId: user?.id || null,
      }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'joined-room') {
        setIsConnected(true);
        setShowNameDialog(false);
        setCurrentParticipant(msg.participant);
        setRoomInfo({ id: msg.room.id, title: msg.room.title });
        setLocalPeerId(msg.peerId);
        await fetchParticipants(msg.room.id);

        // Assinar canal realtime para sinais
        const channel = supabase
          .channel(`room_${msg.room.id}`)
          .on('broadcast', { event: 'webrtc-signal' }, async (payload: any) => {
            const { type, data, fromPeerId, targetPeerId } = payload.payload || payload;
            if (!localPeerId || targetPeerId !== localPeerId) return;

            if (type === 'webrtc-offer') {
              const pc = createPeerConnection(fromPeerId);
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              await attachLocalTracks(pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              targetMapRef.current[fromPeerId] = fromPeerId; // responses go back
              ws.send(JSON.stringify({ type: 'webrtc-answer', targetPeerId: fromPeerId, answer }));
            } else if (type === 'webrtc-answer') {
              const pc = peersRef.current[fromPeerId];
              if (pc && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
            } else if (type === 'webrtc-ice-candidate') {
              const pc = peersRef.current[fromPeerId];
              if (pc) {
                try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
              }
            }
          })
          .on('broadcast', { event: 'participant-joined' }, async (payload: any) => {
            const p = payload.payload?.participant || payload.participant;
            if (!p || !localPeerId) return;
            // Nós (participantes existentes) enviamos offer para o novo
            const pc = createPeerConnection(p.peer_id);
            targetMapRef.current[p.peer_id] = p.peer_id;
            await attachLocalTracks(pc);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'webrtc-offer', targetPeerId: p.peer_id, offer }));
          })
          .on('broadcast', { event: 'participant-left' }, async () => {
            await fetchParticipants(msg.room.id);
          })
          .subscribe();
        channelRef.current = channel;

        toast({ title: 'Conectado!', description: `Você entrou na reunião "${msg.room.title}"` });
      } else if (msg.type === 'error') {
        toast({ title: 'Erro', description: msg.message, variant: 'destructive' });
      }
    };

    ws.onclose = () => {
      // cleanup parcial
    };
  };

  const leaveMeeting = async () => {
    // encerrar rtc
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (wsRef.current) wsRef.current.close();

    if (currentParticipant) {
      await leaveRoom(currentParticipant.id);
    }
    setIsConnected(false);
    navigate('/dashboard/reunioes');
  };

  const toggleAudio = async () => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioEnabled;
      setAudioEnabled(!audioEnabled);
      
      if (currentParticipant) {
        await updateParticipantStatus(currentParticipant.id, { audio_enabled: !audioEnabled });
      }
      
      toast({
        title: !audioEnabled ? "Microfone ativado" : "Microfone desativado",
        description: !audioEnabled ? "Seu áudio está sendo transmitido" : "Seu áudio foi desativado",
      });
    }
  };

  const toggleVideo = async () => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoEnabled;
      setVideoEnabled(!videoEnabled);
      
      if (currentParticipant) {
        await updateParticipantStatus(currentParticipant.id, { video_enabled: !videoEnabled });
      }
      
      toast({
        title: !videoEnabled ? "Câmera ativada" : "Câmera desativada", 
        description: !videoEnabled ? "Seu vídeo está sendo transmitido" : "Seu vídeo foi desativado",
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        setScreenSharing(true);

        // Mostrar a tela localmente
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Trocar a track de vídeo enviada para todos os peers
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          const track = screenStream.getVideoTracks()[0];
          if (sender && track) sender.replaceTrack(track);
        });

        // Voltar quando parar o compartilhamento
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setScreenSharing(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          Object.values(peersRef.current).forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            const track = localStreamRef.current?.getVideoTracks()[0] || null;
            if (sender) sender.replaceTrack(track);
          });
          if (currentParticipant) {
            updateParticipantStatus(currentParticipant.id, { screen_sharing: false });
          }
        });

        toast({ title: 'Compartilhamento iniciado', description: 'Sua tela está sendo compartilhada' });
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        setScreenSharing(false);
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        // Voltar a track de vídeo para os peers
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          const track = localStreamRef.current?.getVideoTracks()[0] || null;
          if (sender) sender.replaceTrack(track);
        });
        toast({ title: 'Compartilhamento parado', description: 'Compartilhamento de tela foi interrompido' });
      }
      if (currentParticipant) {
        await updateParticipantStatus(currentParticipant.id, { screen_sharing: !screenSharing });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast({ title: 'Erro', description: 'Não foi possível compartilhar a tela', variant: 'destructive' });
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src={ellosuitLogo} alt="Ellosuit" className="h-12" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Entrar na Reunião</CardTitle>
            <p className="text-gray-600">
              Código: <span className="font-mono font-semibold text-blue-600">{roomCode}</span>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                Como você quer aparecer?
              </label>
              <Input
                id="displayName"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinMeeting()}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/reunioes')} 
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button 
                onClick={joinMeeting} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={!displayName.trim()}
              >
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <img src={ellosuitLogo} alt="Ellosuit" className="h-8" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{roomInfo?.title || currentRoom?.title || `Reunião ${roomCode}`}</h1>
            <p className="text-sm text-gray-600">
            {participants.length} participante{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Participantes
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-blue-50">
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
        <div className="flex-1 relative bg-gradient-to-br from-gray-100 to-blue-100 flex items-center justify-center">
          {!permissionsRequested && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <Card className="w-80 shadow-xl">
                <CardContent className="p-6 text-center">
                  <Camera className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="mb-2 text-gray-900">Ativar câmera e microfone</CardTitle>
                  <p className="text-gray-600 mb-4">
                    Para participar da reunião, você precisa permitir o acesso à sua câmera e microfone.
                  </p>
                  <Button onClick={requestMediaPermissions} className="w-full bg-blue-600 hover:bg-blue-700">
                    Ativar câmera e microfone
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Local video */}
          <div className="absolute top-4 right-4 w-56 h-42 bg-white rounded-xl overflow-hidden border-2 border-blue-200 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
              Você {!audioEnabled && <MicOff className="inline h-3 w-3 ml-1" />}
            </div>
            {screenSharing && (
              <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                Compartilhando
              </div>
            )}
          </div>

          {/* Remote videos grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {participants.filter(p => p.id !== currentParticipant?.id).length === 0 ? (
              <div className="col-span-full flex items-center justify-center">
                <Card className="w-80 bg-white shadow-lg">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <CardTitle className="mb-2 text-gray-700">Aguardando outros participantes</CardTitle>
                    <p className="text-gray-500">
                      Compartilhe o código <span className="font-mono font-semibold text-blue-600">{roomCode}</span> para convidar pessoas
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              participants.filter(p => p.id !== currentParticipant?.id).map((participant) => (
                <div key={participant.id} className="aspect-video bg-white rounded-xl overflow-hidden relative shadow-lg border border-blue-200">
                  <video
                    ref={(el) => {
                      if (el) remoteVideosRef.current[participant.peer_id] = el;
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-sm bg-blue-600 text-white px-3 py-1 rounded-full">
                    {participant.display_name}
                    {!participant.audio_enabled && <MicOff className="inline h-3 w-3 ml-1" />}
                  </div>
                  <div className="absolute top-2 right-2">
                    {participant.is_host && <Badge className="text-xs bg-green-600">Host</Badge>}
                    {participant.screen_sharing && <Badge className="text-xs bg-orange-600 ml-1">Tela</Badge>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-white border-l border-blue-200 shadow-lg">
            {showParticipants && (
              <div className="p-4 border-b border-blue-200">
                <h3 className="font-semibold mb-3 text-gray-900">Participantes ({participants.length})</h3>
                <ScrollArea className="h-40">
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            participant.connection_status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-gray-900 font-medium">{participant.display_name}</span>
                          {participant.is_host && <Badge className="text-xs bg-green-600">Host</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {!participant.audio_enabled && <MicOff className="h-3 w-3 text-red-500" />}
                          {!participant.video_enabled && <VideoOff className="h-3 w-3 text-red-500" />}
                          {participant.screen_sharing && <Monitor className="h-3 w-3 text-green-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {showChat && (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-blue-200">
                  <h3 className="font-semibold text-gray-900">Chat</h3>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`${msg.isOwn ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-xs p-3 rounded-2xl ${
                          msg.isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <div className={`text-xs mb-1 ${msg.isOwn ? 'opacity-75' : 'text-gray-600'}`}>
                            {msg.participant_name}
                          </div>
                          <div className="text-sm">{msg.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t border-blue-200">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button 
                      size="sm" 
                      onClick={sendChatMessage} 
                      disabled={!chatMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
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
      <div className="bg-white border-t border-blue-200 px-6 py-4 flex items-center justify-center gap-3">
        <Button
          variant={audioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className={`rounded-full w-12 h-12 ${
            audioEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={videoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className={`rounded-full w-12 h-12 ${
            videoEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={screenSharing ? "default" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className={`rounded-full w-12 h-12 ${
            screenSharing 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
          }`}
        >
          {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={speakerEnabled ? "default" : "destructive"}
          size="lg"
          onClick={() => setSpeakerEnabled(!speakerEnabled)}
          className={`rounded-full w-12 h-12 ${
            speakerEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        
        
        <Separator orientation="vertical" className="h-8 bg-blue-200" />
        
        <Button
          variant="destructive"
          size="lg"
          onClick={leaveMeeting}
          className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MeetingRoom;