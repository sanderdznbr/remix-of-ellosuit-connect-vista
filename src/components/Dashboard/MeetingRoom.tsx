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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  senderName: string;
}

interface VideoParticipant {
  id: string;
  peerId: string;
  displayName: string;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream: MediaStream | null;
}

interface SortableVideoProps {
  participant: VideoParticipant;
  videoRef: React.RefObject<HTMLVideoElement>;
  isMainView?: boolean;
}

// Componente SortableVideo 
const SortableVideo: React.FC<SortableVideoProps> = ({ participant, videoRef, isMainView = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative bg-gray-900 rounded-lg overflow-hidden cursor-move
        ${isMainView ? 'w-full h-full' : 'aspect-video'}
        ${isDragging ? 'shadow-2xl scale-105' : ''}
        transition-all duration-200
      `}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.id === 'local'}
        className="w-full h-full object-cover"
      />
      
      {/* Nome e status */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-2">
        <span>{participant.displayName}{participant.id === 'local' ? ' (Você)' : ''}</span>
        {!participant.audioEnabled && <MicOff className="h-3 w-3" />}
        {!participant.videoEnabled && <VideoOff className="h-3 w-3" />}
      </div>
      
      {/* Overlay quando vídeo está desativado */}
      {!participant.videoEnabled && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold">
                {participant.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm">{participant.displayName}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const MeetingRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const code = (roomCode as string)?.toUpperCase();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  const [videoOrder, setVideoOrder] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefsMapRef = useRef<Record<string, React.RefObject<HTMLVideoElement>>>({});
  
  const getRemoteVideoRef = useCallback((peerId: string) => {
    if (!remoteVideoRefsMapRef.current[peerId]) {
      remoteVideoRefsMapRef.current[peerId] = React.createRef<HTMLVideoElement>();
    }
    return remoteVideoRefsMapRef.current[peerId];
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // VAD setup
  const setupVAD = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const detectSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const isSpeaking = average > 30 && isAudioEnabled;
        
        setSpeakingParticipants(prev => {
          const newSet = new Set(prev);
          if (isSpeaking) {
            newSet.add('local');
          } else {
            newSet.delete('local');
          }
          return newSet;
        });
      };
      
      const interval = setInterval(detectSpeaking, 100);
      return () => {
        clearInterval(interval);
        audioContext.close();
      };
    } catch (error) {
      console.error('Error setting up VAD:', error);
    }
  }, [isAudioEnabled]);

  // Auto join for room creator or when name is provided in URL
  useEffect(() => {
    if (user && room) {
      const urlParams = new URLSearchParams(window.location.search);
      const nameFromUrl = urlParams.get('name');
      
      if (nameFromUrl) {
        // Guest joining with name from URL
        joinMeeting(nameFromUrl);
      } else if (user.id === room.created_by && showNamePrompt) {
        // Host auto-joining
        joinMeeting(user.user_metadata?.username || user.email?.split('@')[0] || 'Anfitrião');
      }
    }
  }, [user, room, showNamePrompt]);

  // Fetch room info
  useEffect(() => {
    const fetchRoom = async () => {
      if (!code) return;
      
      try {
        const { data, error } = await supabase
          .from('meeting_rooms')
          .select('*')
          .eq('room_code', code)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          toast({
            title: "Sala não encontrada",
            description: "Esta sala não existe ou foi encerrada",
            variant: "destructive",
          });
          navigate('/dashboard/reunioes');
          return;
        }
        
        setRoom(data);
      } catch (error) {
        console.error('Error fetching room:', error);
      }
    };
    
    fetchRoom();
  }, [code, navigate, toast]);

  const joinMeeting = async (nameOverride?: string) => {
    try {
      const name = nameOverride || displayName;
      if (!name.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, insira seu nome",
          variant: "destructive",
        });
        return;
      }

      setIsConnecting(true);
      
      // Create WebSocket connection
      const ws = new WebSocket(`wss://jwddiyuezqrpuakazvgg.functions.supabase.co/meeting-signaling`);
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (!isConnected) {
          toast({
            title: "Falha ao Conectar",
            description: "Não foi possível conectar à reunião. Verifique sua conexão.",
            variant: "destructive",
          });
        }
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setIsConnecting(false);
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          setHeartbeatInterval(null);
        }
        
        if (isConnected) {
          toast({
            title: "Conexão Encerrada",
            description: "A conexão com a reunião foi encerrada",
            variant: "destructive",
          });
        }
      };

      ws.onopen = () => {
        console.log('WebSocket connected, joining room...');
        ws.send(JSON.stringify({
          type: 'join-room',
          roomCode: code,
          displayName: name,
          userId: user?.id || null
        }));
        
        // Setup heartbeat
        const interval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
        setHeartbeatInterval(interval);
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        switch (data.type) {
          case 'joined-room':
            setRoom(data.room);
            setMyPeerId(data.peerId);
            setIsConnected(true);
            setIsConnecting(false);
            setShowNamePrompt(false);
            
            // Set up local media
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              setLocalStream(stream);
              
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }

              // Setup VAD for local audio
              setupVAD(stream);
              
              // Create peer connections for existing participants
              data.otherParticipants?.forEach((participant: any) => {
                createPeerConnection(participant.peer_id, true, ws, stream);
              });
            } catch (error) {
              console.error('Error accessing media:', error);
              toast({
                title: "Erro de Mídia",
                description: "Não foi possível acessar câmera/microfone",
                variant: "destructive",
              });
            }
            break;
            
          case 'participant-joined':
            setParticipants(prev => [
              ...prev.filter(p => p.peerId !== data.participant.peer_id),
              {
                id: data.participant.id,
                peerId: data.participant.peer_id,
                displayName: data.participant.display_name,
                isHost: data.participant.is_host,
                audioEnabled: true,
                videoEnabled: true,
                stream: null
              }
            ]);
            
            // Create peer connection for new participant
            if (localStream) {
              createPeerConnection(data.participant.peer_id, true, ws, localStream);
            }
            break;
            
          case 'participant-left':
            setParticipants(prev => prev.filter(p => p.id !== data.participantId));
            // Clean up peer connection
            const pc = peerConnections.get(data.participantId);
            if (pc) {
              pc.close();
              setPeerConnections(prev => {
                const newMap = new Map(prev);
                newMap.delete(data.participantId);
                return newMap;
              });
            }
            break;
            
          case 'webrtc-offer':
            await handleWebRTCOffer(data, ws);
            break;
            
          case 'webrtc-answer':
            await handleWebRTCAnswer(data);
            break;
            
          case 'webrtc-ice-candidate':
            await handleWebRTCIceCandidate(data);
            break;
            
          case 'chat-message':
            setMessages(prev => [...prev, {
              id: data.message.id,
              message: data.message.message,
              timestamp: data.message.created_at,
              senderName: 'Participante'
            }]);
            break;
            
          case 'pong':
            // Heartbeat response received
            break;
        }
      };

      setSocket(ws);
      
    } catch (error) {
      console.error('Error joining meeting:', error);
      setIsConnecting(false);
      toast({
        title: "Erro",
        description: "Não foi possível entrar na reunião",
        variant: "destructive",
      });
    }
  };

  const createPeerConnection = async (peerId: string, isInitiator: boolean, ws: WebSocket, stream: MediaStream) => {
    console.log(`Creating peer connection for ${peerId}, isInitiator: ${isInitiator}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId);
      const remoteStream = event.streams[0];
      
      // Find remote video element for this peer
      const remoteVideoRef = getRemoteVideoRef(peerId);
      if (remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      
      // Update participant with stream
      setParticipants(prev => prev.map(p => 
        p.peerId === peerId ? { ...p, stream: remoteStream } : p
      ));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc-ice-candidate',
          targetPeerId: peerId,
          candidate: event.candidate
        }));
      }
    };

    setPeerConnections(prev => new Map(prev.set(peerId, pc)));

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc-offer',
          targetPeerId: peerId,
          offer: offer
        }));
      }
    }
  };

  const handleWebRTCOffer = async (data: any, ws: WebSocket) => {
    const pc = peerConnections.get(data.fromPeerId);
    if (!pc) return;

    await pc.setRemoteDescription(data.data.offer);
    
    // Add local stream tracks if not already added
    if (localStream) {
      localStream.getTracks().forEach(track => {
        if (!pc.getSenders().find(sender => sender.track === track)) {
          pc.addTrack(track, localStream);
        }
      });
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'webrtc-answer',
        targetPeerId: data.fromPeerId,
        answer: answer
      }));
    }
  };

  const handleWebRTCAnswer = async (data: any) => {
    const pc = peerConnections.get(data.fromPeerId);
    if (pc) {
      await pc.setRemoteDescription(data.data.answer);
    }
  };

  const handleWebRTCIceCandidate = async (data: any) => {
    const pc = peerConnections.get(data.fromPeerId);
    if (pc) {
      await pc.addIceCandidate(data.data.candidate);
    }
  };

  const leaveMeeting = async () => {
    // Cleanup
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      setHeartbeatInterval(null);
    }
    
    // Close peer connections
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    
    // Close WebSocket
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    // Stop local streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setIsConnected(false);
    navigate('/dashboard/reunioes');
  };

  const toggleAudio = async () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(!isAudioEnabled);
      
      toast({
        title: !isAudioEnabled ? "Microfone ativado" : "Microfone desativado",
        description: !isAudioEnabled ? "Seu áudio está sendo transmitido" : "Seu áudio foi desativado",
      });
    }
  };

  const toggleVideo = async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(!isVideoEnabled);
      
      toast({
        title: !isVideoEnabled ? "Câmera ativada" : "Câmera desativada", 
        description: !isVideoEnabled ? "Seu vídeo está sendo transmitido" : "Seu vídeo foi desativado",
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        setIsScreenSharing(true);

        // Replace video track in all peer connections
        peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          const track = screenStream.getVideoTracks()[0];
          if (sender && track) {
            sender.replaceTrack(track);
          }
        });

        // Show screen locally
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Handle screen share end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
          // Restore original video track
          peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            const track = localStream?.getVideoTracks()[0] || null;
            if (sender) {
              sender.replaceTrack(track);
            }
          });
        });

        toast({ title: 'Compartilhamento iniciado', description: 'Sua tela está sendo compartilhada' });
      } else {
        setIsScreenSharing(false);
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        // Restore original video track
        peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          const track = localStream?.getVideoTracks()[0] || null;
          if (sender) {
            sender.replaceTrack(track);
          }
        });
        toast({ title: 'Compartilhamento parado', description: 'Compartilhamento de tela foi interrompido' });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast({ title: 'Erro', description: 'Não foi possível compartilhar a tela', variant: 'destructive' });
    }
  };

  const sendChatMessage = () => {
    if (!newMessage.trim() || !socket) return;
    
    socket.send(JSON.stringify({
      type: 'chat-message',
      message: newMessage
    }));
    
    setNewMessage('');
  };

  const copyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link da reunião foi copiado para a área de transferência",
    });
  };

  // DnD handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setParticipants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Prepare video participants list for display
  const videoParticipants: VideoParticipant[] = [
    // Local participant
    ...(isConnected && myPeerId ? [{
      id: 'local',
      peerId: myPeerId,
      displayName: displayName,
      isHost: user?.id === room?.created_by,
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
      stream: localStream
    }] : []),
    // Remote participants
    ...participants
  ];

  // Not connected - show entry screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <img src={ellosuitLogo} alt="Ellosuit" className="h-12" />
            </div>
            <CardTitle className="text-2xl text-gray-900">
              {isConnecting ? 'Conectando...' : 'Entrar na Reunião'}
            </CardTitle>
            <p className="text-gray-600">
              Código: <span className="font-mono font-semibold text-blue-600">{code}</span>
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!showNamePrompt || isConnecting ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Entrando na reunião...</p>
              </div>
            ) : (
              <>
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
                    onClick={() => joinMeeting()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                    disabled={!displayName.trim()}
                  >
                    Entrar na Reunião
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Meeting interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <img src={ellosuitLogo} alt="Ellosuit" className="h-8" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{room?.title || `Reunião ${code}`}</h1>
            <p className="text-sm text-gray-600">
              {videoParticipants.length} participante{videoParticipants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
        <div className="flex-1 relative bg-gradient-to-br from-gray-100 to-blue-100 p-6">
          {videoParticipants.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Card className="w-80 bg-white shadow-lg">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="mb-2 text-gray-700">Aguardando outros participantes</CardTitle>
                  <p className="text-gray-500">
                    Compartilhe o código <span className="font-mono font-semibold text-blue-600">{code}</span> para convidar pessoas
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={videoParticipants.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className={`
                  w-full h-full grid gap-4 
                  ${videoParticipants.length === 1 ? 'grid-cols-1' : 
                    videoParticipants.length === 2 ? 'grid-cols-2' : 
                    videoParticipants.length <= 4 ? 'grid-cols-2 grid-rows-2' : 
                    'grid-cols-3 grid-rows-3'}
                `}>
                  {videoParticipants.map((participant) => (
                    <SortableVideo
                      key={participant.id}
                      participant={participant}
                      videoRef={
                        participant.id === 'local' 
                          ? localVideoRef 
                          : getRemoteVideoRef(participant.peerId)
                      }
                      isMainView={videoParticipants.length === 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-white border-l border-blue-200 shadow-lg flex flex-col">
            <div className="p-4 border-b border-blue-200">
              <h3 className="font-semibold text-gray-900">Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-left">
                    <div className="inline-block max-w-xs p-3 rounded-2xl bg-gray-100 text-gray-900">
                      <div className="text-xs mb-1 text-gray-600">
                        {msg.senderName}
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
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button 
                  size="sm" 
                  onClick={sendChatMessage} 
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-blue-200 px-6 py-4 flex items-center justify-center gap-3">
        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className={`rounded-full w-12 h-12 ${
            isAudioEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className={`rounded-full w-12 h-12 ${
            isVideoEnabled 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full w-12 h-12"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={leaveMeeting}
          className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MeetingRoom;