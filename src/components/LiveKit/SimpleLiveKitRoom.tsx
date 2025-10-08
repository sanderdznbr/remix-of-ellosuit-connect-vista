import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { Room, Track, ConnectionState } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, RefreshCw, Share2, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import SimpleMeetingControls from './SimpleMeetingControls';
import MeetingSidebar from './MeetingSidebar';
import ShareMeetingModal from './ShareMeetingModal';
import FloatingChatPanel from './FloatingChatPanel';
import { MeetingExitModal } from './MeetingExitModal';
import ZoomPreJoin from './ZoomPreJoin';
import ZoomParticipantGrid from './ZoomParticipantGrid';
import MobileMeetingLayout from './MobileMeetingLayout';
import { RoomContextCapture } from './RoomContextCapture';
import WaitingRoomApproval from './WaitingRoomApproval';
import WaitingRoomScreen from './WaitingRoomScreen';
import WhiteboardCanvas from './WhiteboardCanvas';
import AudioDevicePersistence from './AudioDevicePersistence';
import logoEllo from '@/assets/logoellosuit.png';
import DeviceSettingsModal from './DeviceSettingsModal';
import TranscriptionModal from './TranscriptionModal';
import { MeetingAIChat } from './MeetingAIChat';
import { LiveKitAudioCapture } from './LiveKitAudioCapture';
import '@/styles/livekit.css';
import '@/styles/zoom-meeting.css';

interface SimpleLiveKitRoomProps {
  roomName: string;
  participantName: string;
  onLeave: () => void;
}

interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  participantName: string;
  userId: string;
}

interface TranscriptionMessage {
  text: string;
  is_final: boolean;
  timestamp: string;
  speaker?: string;
}

const SimpleLiveKitRoom: React.FC<SimpleLiveKitRoomProps> = ({ 
  roomName, 
  participantName, 
  onLeave 
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [connectingToRoom, setConnectingToRoom] = useState(false);
  const [error, setError] = useState<string>('');
  const [preJoinChoices, setPreJoinChoices] = useState<any>();
  const [showPreJoin, setShowPreJoin] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false); // Removed waiting popup
  const [companyId, setCompanyId] = useState<string>('');
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(true); // Auto-start transcription
  const [showExitModal, setShowExitModal] = useState(false);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string>('');
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [participantId, setParticipantId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isCheckingHost, setIsCheckingHost] = useState(true);
  const [whiteboardBgColor, setWhiteboardBgColor] = useState<'white' | 'black'>('white');
  const [meetingStartTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<string>('');
  const meetingControlsRef = useRef<any>(null);
  const meetingDurationTimerRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const roomRef = useRef<Room | null>(null);
  const audioRecordersRef = useRef<Map<string, { recorder: MediaRecorder; chunks: Blob[] }>>(new Map());

  // Check if user is host on mount
  useEffect(() => {
    const checkHostAndSetup = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setIsCheckingHost(false);
        return;
      }

      // Get company ID
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .limit(1);
      
      if (companyUsers && companyUsers.length > 0) {
        setCompanyId(companyUsers[0].company_id);
      }

      // Check if user is host
      const { data: roomData } = await supabase
        .from('meeting_rooms')
        .select('id, created_by')
        .eq('room_code', roomName)
        .single();

      if (roomData) {
        setCurrentRoomId(roomData.id);
        const userIsHost = userData.user && roomData.created_by === userData.user.id;
        setIsHost(userIsHost);

        // If host, skip PreJoin and enter directly
        if (userIsHost) {
          console.log('User is host, entering directly');
          const finalUsername = userData.user.user_metadata?.full_name || participantName || 'Anfitrião';
          
          // Create participant record as host
          const peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          await supabase
            .from('room_participants')
            .insert({
              room_id: roomData.id,
              user_id: userData.user.id,
              display_name: finalUsername,
              peer_id: peerId,
              is_host: true,
              connection_status: 'connected',
              waiting_approval: false,
            });

          // Generate token and enter
          await generateToken(finalUsername);
          setShowPreJoin(false);
        }
      }
      
      setIsCheckingHost(false);
    };
    
    checkHostAndSetup();
  }, [roomName, participantName]);

  // Clock update (Brasília time)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now);
      setCurrentTime(brasiliaTime);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Meeting duration timer (1 hour limit)
  useEffect(() => {
    if (!showPreJoin && token && serverUrl) {
      const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
      
      meetingDurationTimerRef.current = setTimeout(() => {
        toast({
          title: "Reunião encerrada",
          description: "A reunião atingiu o limite de 1 hora e foi encerrada automaticamente",
          variant: "destructive",
        });
        handleLeaveClick();
      }, ONE_HOUR);

      return () => {
        if (meetingDurationTimerRef.current) {
          clearTimeout(meetingDurationTimerRef.current);
        }
      };
    }
  }, [showPreJoin, token, serverUrl]);

  // Enhanced connection management with better visibility handling
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        console.log('Page visible - maintaining stable connection');
      } else {
        console.log('Page hidden - connection maintained');
      }
    };

    const handleFocus = () => {
      console.log('Window focused - ensuring connection stability');
    };

    const handleBlur = () => {
      console.log('Window blurred - maintaining connection');
    };

    const preventDisconnect = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', preventDisconnect);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', preventDisconnect);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Play connection sound on successful join
  useEffect(() => {
    if (!showPreJoin && token && serverUrl) {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAzuJzfPJdSgEJnzE8N+MSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+PSg0PVqvl7q5bGgtBluL0u2EaAzqIy';
      audio.play().catch(() => {
        console.log('Could not play connection sound');
      });
    }
  }, [showPreJoin, token, serverUrl]);

  const generateToken = useCallback(async (username: string) => {
    try {
      setConnectingToRoom(true);
      setError('');

      console.log('Generating LiveKit token for room:', roomName, 'with name:', username);

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName,
          participantName: username
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar token');
      }

      if (!data || !data.token || !data.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const tokenData = data as TokenResponse;
      console.log('Token generated successfully for:', username);

      setToken(tokenData.token);
      setServerUrl(tokenData.url);
      setConnectingToRoom(false);
      
    } catch (err) {
      console.error('Error generating token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar na sala';
      setError(errorMessage);
      setConnectingToRoom(false);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [roomName, toast]);


  const handlePreJoinSubmit = useCallback(async (values: any) => {
    console.log('PreJoin submitted with values (guest):', values);
    setPreJoinChoices(values);
    
    const finalUsername = values.username || participantName || 'Convidado';
    console.log('Guest username:', finalUsername);

    // Guest joining - create participant record and wait for approval
    const peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const { data: participantData } = await supabase
      .from('room_participants')
      .insert({
        room_id: currentRoomId,
        user_id: user?.id || null,
        display_name: finalUsername,
        peer_id: peerId,
        is_host: false,
        connection_status: 'waiting',
        waiting_approval: true,
      })
      .select('id')
      .single();

    if (participantData) {
      setParticipantId(participantData.id);
      setIsWaitingApproval(true);
      setShowPreJoin(false);
    }
  }, [currentRoomId, participantName, user]);

  const handleTranscriptionUpdate = useCallback((message: TranscriptionMessage) => {
    setTranscriptionMessages(prev => [...prev, message]);
  }, []);

  const handleLeaveClick = async () => {
    console.log('🚪 Iniciando processo de saída...');
    
    // Clear meeting duration timer
    if (meetingDurationTimerRef.current) {
      clearTimeout(meetingDurationTimerRef.current);
    }
    
    // Auto-save meeting before leaving (only for host)
    if (isHost && transcriptionMessages.length > 0) {
      console.log('💾 Auto-salvando reunião...');
      setIsProcessingTranscript(true);
      await autoSaveMeeting();
      setIsProcessingTranscript(false);
    }
    
    // Immediate disconnect
    handleDisconnected();
  };

  // Auto-save meeting function
  const autoSaveMeeting = async () => {
    try {
      if (!companyId || !user?.id) {
        console.log('⚠️ Sem companyId ou user.id, não é possível salvar');
        return;
      }

      if (transcriptionMessages.length === 0) {
        console.log('⚠️ Nenhuma transcrição para salvar');
        return;
      }

      console.log('💾 Salvando reunião automaticamente com', transcriptionMessages.length, 'mensagens...');

      // Concatenate all transcription messages
      const fullTranscript = transcriptionMessages
        .map(msg => `[${msg.timestamp}] ${msg.speaker}: ${msg.text}`)
        .join('\n\n');

      console.log('📝 Transcrição completa:', fullTranscript.substring(0, 200) + '...');

      // Save to in_person_meetings table
      const { data, error } = await supabase
        .from('in_person_meetings')
        .insert({
          title: `Reunião ${roomName} - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
          transcript: fullTranscript,
          company_id: companyId,
          created_by: user.id,
          transcript_with_timestamps: transcriptionMessages.map(msg => ({
            timestamp: msg.timestamp,
            speaker: msg.speaker,
            text: msg.text,
            is_final: msg.is_final
          })),
          duration_seconds: Math.floor((Date.now() - Date.parse(transcriptionMessages[0]?.timestamp || new Date().toISOString())) / 1000)
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro do Supabase ao salvar:', error);
        throw error;
      }

      console.log('✅ Reunião salva automaticamente:', data.id);
      
      toast({
        title: "Reunião salva!",
        description: `A reunião foi salva com ${transcriptionMessages.length} transcrições.`,
      });

      return data.id;
    } catch (error) {
      console.error('❌ Erro ao salvar reunião:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a reunião automaticamente. Use 'Recuperar Reunião'.",
        variant: "destructive"
      });
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a reunião automaticamente.",
        variant: "destructive",
      });
    }
  };
  
  const handleDisconnected = useCallback(async () => {
    console.log('Disconnected from room');
    
    if (roomRef.current?.localParticipant) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: roomData } = await supabase
          .from('meeting_rooms')
          .select('created_by, room_code')
          .eq('room_code', roomName)
          .single();
        
        if (roomData && user && roomData.created_by === user.id) {
          await supabase
            .from('meeting_rooms')
            .update({ 
              is_active: false,
              ended_at: new Date().toISOString()
            })
            .eq('room_code', roomName);
          
          console.log('Room marked as inactive by host');
        }
      } catch (error) {
        console.error('Error marking room as inactive:', error);
      }
    }
    
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAzuJzfPJdSgEJnzE8N+MSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIy';
    audio.play().catch(() => {
      console.log('Could not play disconnect sound');
    });
    
    toast({
      title: "Desconectado",
      description: "Você saiu da sala de reunião",
    });
    
    setTimeout(() => {
      onLeave();
    }, 500);
  }, [onLeave, toast, roomName]);

  const handleError = useCallback((error: Error) => {
    console.error('LiveKit error:', error);
    setError(error.message);
    toast({
      title: "Erro na chamada",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);


  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Erro na Conexão</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => generateToken(participantName || 'Convidado')} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button onClick={onLeave} variant="outline">
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleApprovalGranted = useCallback(async () => {
    setIsWaitingApproval(false);
    const finalUsername = preJoinChoices?.username || participantName || 'Convidado';
    await generateToken(finalUsername);
  }, [preJoinChoices, participantName, generateToken]);

  const handleApprovalRejected = useCallback(() => {
    toast({
      title: "Acesso negado",
      description: "O anfitrião rejeitou sua entrada na reunião",
      variant: "destructive",
    });
    setTimeout(() => onLeave(), 2000);
  }, [toast, onLeave]);

  // Show loading while checking host status
  if (isCheckingHost) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-white text-lg font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPreJoin && !isHost ? (
        <ZoomPreJoin 
          roomName={roomName}
          participantName={participantName}
          onSubmit={handlePreJoinSubmit}
          onCancel={onLeave}
        />
      ) : isWaitingApproval ? (
        <WaitingRoomScreen
          roomName={roomName}
          participantId={participantId}
          onApproved={handleApprovalGranted}
          onRejected={handleApprovalRejected}
        />
      ) : connectingToRoom ? (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-white text-lg font-medium">Entrando na reunião...</p>
            <p className="text-zinc-400 text-sm">Aguarde um momento</p>
          </div>
        </div>
      ) : token && serverUrl ? (
        <LiveKitRoom
          video={preJoinChoices?.videoEnabled ?? true}
          audio={preJoinChoices?.audioEnabled ?? true}
          token={token}
          serverUrl={serverUrl}
          data-lk-theme="default"
          onDisconnected={handleDisconnected}
          onError={handleError}
          options={{
            adaptiveStream: true,
            disconnectOnPageLeave: false,
            publishDefaults: {
              simulcast: false,
              stopMicTrackOnMute: false,
              videoCodec: 'vp8',
            },
            reconnectPolicy: {
              nextRetryDelayInMs: (context) => {
                if (context.elapsedMs < 10_000) {
                  return 1000;
                }
                return Math.min(context.retryCount * 2000, 10000);
              },
            },
          }}
        >
          <RoomContextCapture onRoomReady={(room) => {
            console.log('Room ready:', room.name);
            roomRef.current = room;
          }} />
          <RoomAudioRenderer />
          <AudioDevicePersistence />
          
          {/* Local Audio Capture for Real-time Transcription */}
          <LiveKitAudioCapture 
            isActive={isTranscribing}
            roomName={roomName}
            onTranscriptionUpdate={handleTranscriptionUpdate}
          />
          
          {/* Waiting Room Approval Panel (for hosts) */}
          {!isMobile && isHost && (
            <WaitingRoomApproval
              roomId={currentRoomId}
              isHost={isHost}
            />
          )}

          {isMobile ? (
            <MobileMeetingLayout
              roomName={roomName}
              onLeave={onLeave}
              onShareMeeting={() => setShowShareModal(true)}
            />
          ) : (
            <>
              {/* Processing Transcript Loading */}
              {isProcessingTranscript && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 text-center">
                    <div className="mb-4">
                      <Loader2 className="mx-auto w-16 h-16 text-primary animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Processando transcrição...</h3>
                    <p className="text-muted-foreground">
                      Estamos identificando os participantes e gerando a transcrição completa da reunião.
                    </p>
                  </div>
                </div>
              )}

              {/* Floating Chat Panel */}
              <FloatingChatPanel
                isOpen={showFloatingChat}
                onClose={() => setShowFloatingChat(false)}
              />

              <div className="h-screen w-full flex flex-col" style={{ backgroundColor: '#101010' }}>
                {/* Header with Logo - Dark Theme #101010 */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
                  <div className="flex-1" />
                  <div className="flex items-center justify-center">
                    <svg width="220" height="36" viewBox="0 0 220 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M31.8756 30.9857V0H37.797V30.9857H31.8756ZM5.9166 20.8131C6.09924 24.161 8.01216 26.334 10.9248 26.334C12.8377 26.334 14.5247 25.3836 14.9333 23.8458H21.0373C19.6675 28.4163 15.9811 30.9952 11.1988 30.9952C3.72971 30.9952 0 26.9214 0 18.8646C0 11.9874 3.96042 7.55539 10.8335 7.55539C17.7113 7.55539 21.3545 11.9874 21.3545 20.8131H5.9166ZM15.2505 17.1023C15.1592 13.7974 12.9771 12.2166 10.6508 12.2166C8.28612 12.2166 6.32513 14.0267 6.09924 17.1023H15.2505ZM23.402 30.9857V0H29.3234V30.9857H23.402ZM39.7291 19.2753C39.7291 12.2166 44.1462 7.55539 51.2499 7.55539C58.2624 7.55539 62.6361 12.1689 62.6361 19.2753C62.6361 26.334 58.2191 30.9952 51.2499 30.9952C44.0116 30.9952 39.7291 26.1955 39.7291 19.2753ZM56.6715 19.2753C56.6715 14.7478 54.8499 12.5318 51.2499 12.5318C47.6548 12.5318 45.8332 14.7478 45.8332 19.2753C45.8332 23.798 47.6548 26.0618 51.2499 26.0618C54.8499 26.0618 56.6715 23.798 56.6715 19.2753ZM78.2567 14.8863C77.9347 12.7133 76.7523 11.9444 74.0656 11.9444C71.8355 11.9444 70.557 12.4888 70.557 13.7974C70.557 15.1108 71.7874 15.6552 74.2002 16.3334C76.7523 17.0545 79.1651 17.556 80.8954 18.2342C83.2649 19.1846 84.5867 20.7224 84.5867 23.6165C84.5867 28.2348 81.1694 30.9952 74.7962 30.9952C67.9183 30.9952 64.0925 27.7811 64.0011 23.2536H70.1052C70.1052 25.3359 71.8787 26.5585 74.7481 26.5585C76.8437 26.5585 78.7085 25.9233 78.7085 24.2517C78.7085 22.6662 77.0263 22.1695 75.1134 21.7158C71.3356 20.8131 69.24 20.1779 67.6443 19.1846C65.5488 17.8712 64.823 16.1519 64.823 14.1604C64.823 10.4066 67.4184 7.55539 74.2482 7.55539C80.7128 7.55539 83.6302 10.0866 83.9474 14.8863H78.2567ZM100.842 31V27.2844C99.294 29.8156 96.9726 30.9952 93.8773 30.9952C89.4122 30.9952 86.2689 27.6903 86.2689 22.8046V7.54583H92.1903V21.8972C92.1903 24.7054 93.464 26.0618 95.9729 26.0618C98.9768 26.0618 100.568 23.9365 100.568 20.9946V7.54583H106.446V31H100.842ZM109.176 30.9857V7.54583H115.092V30.9857H109.176ZM115.097 0V5.47312H109.176V0H115.097ZM130.492 15.746H136V22.0787C136 26.7877 133.27 30.9952 126.94 30.9952C120.379 30.9952 117.784 26.8307 117.784 22.0357L117.813 0H123.643L123.614 7.57449H136V12.3074H123.614V21.4483C123.614 24.2517 124.614 25.8803 127.031 25.8803C129.396 25.8803 130.492 24.2947 130.492 21.5343V15.746Z" fill="white"/>
                      <path d="M146.94 16.4547H150.165L152.743 26.9944H152.913L158.972 16.4547H162.196L159.781 31.0001H157.253L158.915 21.0072H158.787L153.105 30.9575H151.223L148.865 20.9859H148.73L147.054 31.0001H144.526L146.94 16.4547Z" fill="#3600FF"/>
                      <path d="M166.738 31.2132C165.644 31.2132 164.74 30.9859 164.025 30.5314C163.31 30.0721 162.808 29.4234 162.519 28.5853C162.235 27.7425 162.188 26.7506 162.377 25.6095C162.562 24.4873 162.938 23.5025 163.507 22.6549C164.075 21.8027 164.785 21.1398 165.637 20.6663C166.494 20.1881 167.441 19.949 168.478 19.949C169.151 19.949 169.768 20.0579 170.332 20.2757C170.895 20.4887 171.371 20.8202 171.759 21.27C172.148 21.7198 172.415 22.2927 172.562 22.9887C172.709 23.68 172.702 24.5039 172.541 25.4603L172.42 26.2487H163.471L163.748 24.5157H170.225C170.311 24.0233 170.282 23.5853 170.14 23.2018C169.998 22.8136 169.761 22.5082 169.43 22.2856C169.098 22.0631 168.684 21.9518 168.187 21.9518C167.68 21.9518 167.207 22.082 166.767 22.3424C166.331 22.5981 165.964 22.9296 165.666 23.3368C165.367 23.744 165.178 24.1725 165.098 24.6223L164.806 26.2842C164.702 26.966 164.726 27.5224 164.877 27.9532C165.029 28.3841 165.294 28.7013 165.673 28.9049C166.052 29.1085 166.53 29.2103 167.107 29.2103C167.486 29.2103 167.837 29.1583 168.159 29.0541C168.481 28.9499 168.767 28.7937 169.018 28.5853C169.274 28.3723 169.487 28.1119 169.657 27.8041L172.008 28.074C171.748 28.7084 171.366 29.2624 170.865 29.7359C170.363 30.2047 169.761 30.5692 169.061 30.8297C168.365 31.0853 167.59 31.2132 166.738 31.2132Z" fill="#3600FF"/>
                      <path d="M178.013 31.2132C176.919 31.2132 176.015 30.9859 175.3 30.5314C174.585 30.0721 174.083 29.4234 173.794 28.5853C173.51 27.7425 173.463 26.7506 173.652 25.6095C173.837 24.4873 174.213 23.5025 174.782 22.6549C175.35 21.8027 176.06 21.1398 176.912 20.6663C177.769 20.1881 178.716 19.949 179.753 19.949C180.426 19.949 181.043 20.0579 181.607 20.2757C182.17 20.4887 182.646 20.8202 183.034 21.27C183.423 21.7198 183.69 22.2927 183.837 22.9887C183.984 23.68 183.977 24.5039 183.816 25.4603L183.695 26.2487H174.746L175.023 24.5157H181.5C181.586 24.0233 181.557 23.5853 181.415 23.2018C181.273 22.8136 181.036 22.5082 180.705 22.2856C180.373 22.0631 179.959 21.9518 179.462 21.9518C178.955 21.9518 178.482 22.082 178.042 22.3424C177.606 22.5981 177.239 22.9296 176.941 23.3368C176.642 23.744 176.453 24.1725 176.373 24.6223L176.081 26.2842C175.977 26.966 176.001 27.5224 176.152 27.9532C176.304 28.3841 176.569 28.7013 176.948 28.9049C177.327 29.1085 177.805 29.2103 178.382 29.2103C178.761 29.2103 179.112 29.1583 179.434 29.0541C179.756 28.9499 180.042 28.7937 180.293 28.5853C180.549 28.3723 180.762 28.1119 180.932 27.8041L183.283 28.074C183.023 28.7084 182.641 29.2624 182.14 29.7359C181.638 30.2047 181.036 30.5692 180.336 30.8297C179.64 31.0853 178.865 31.2132 178.013 31.2132Z" fill="#3600FF"/>
                      <path d="M191.753 20.091L191.419 22.0797H185.155L185.481 20.091H191.753ZM187.456 17.4774H190.027L188.322 27.7189C188.27 28.0645 188.28 28.3297 188.351 28.5143C188.426 28.6942 188.547 28.8173 188.713 28.8836C188.883 28.9499 189.075 28.9831 189.288 28.9831C189.444 28.9831 189.591 28.9712 189.728 28.9476C189.866 28.9191 189.975 28.8978 190.055 28.8836L190.169 30.8936C190.013 30.9409 189.802 30.993 189.537 31.0498C189.276 31.1066 188.964 31.1398 188.599 31.1493C187.946 31.1635 187.378 31.064 186.895 30.851C186.416 30.6332 186.066 30.2994 185.844 29.8495C185.626 29.395 185.576 28.8268 185.694 28.145L187.456 17.4774Z" fill="#3600FF"/>
                      <path d="M191.485 31.0001L193.303 20.091H195.874L194.056 31.0001H191.485ZM194.965 18.5285C194.553 18.5285 194.212 18.3912 193.942 18.1166C193.672 17.842 193.554 17.5129 193.587 17.1294C193.62 16.7458 193.793 16.4168 194.105 16.1422C194.423 15.8675 194.785 15.7302 195.192 15.7302C195.604 15.7302 195.943 15.8675 196.208 16.1422C196.478 16.4168 196.596 16.7458 196.563 17.1294C196.534 17.5129 196.362 17.842 196.044 18.1166C195.732 18.3912 195.372 18.5285 194.965 18.5285Z" fill="#3600FF"/>
                      <path d="M199.736 24.6081L198.685 31.0001H196.107L197.925 20.091H200.389L200.077 21.9447H200.212C200.553 21.3339 201.031 20.8486 201.646 20.4887C202.262 20.1289 202.979 19.949 203.798 19.949C204.542 19.949 205.167 20.11 205.673 20.4319C206.18 20.7492 206.54 21.2155 206.753 21.8311C206.966 22.4419 206.999 23.1829 206.852 24.0541L205.688 31.0001H203.117L204.203 24.4518C204.326 23.7274 204.234 23.1592 203.926 22.7473C203.623 22.3306 203.135 22.1223 202.463 22.1223C202.013 22.1223 201.599 22.2217 201.22 22.4206C200.841 22.6147 200.522 22.8964 200.261 23.2657C200.006 23.6351 199.831 24.0825 199.736 24.6081Z" fill="#3600FF"/>
                      <path d="M211.749 35.3183C210.821 35.3183 210.047 35.1928 209.427 34.9419C208.807 34.6957 208.329 34.3642 207.992 33.9476C207.656 33.5309 207.448 33.0692 207.367 32.5626L209.782 32.0015C209.853 32.2146 209.967 32.4253 210.123 32.6336C210.284 32.8467 210.521 33.0219 210.833 33.1592C211.146 33.3012 211.562 33.3723 212.083 33.3723C212.812 33.3723 213.449 33.1947 213.994 32.8396C214.538 32.4845 214.875 31.9068 215.002 31.1066L215.329 29.0399H215.201C215.031 29.305 214.796 29.5773 214.498 29.8566C214.205 30.136 213.833 30.3704 213.383 30.5598C212.938 30.7492 212.403 30.8439 211.778 30.8439C210.94 30.8439 210.213 30.6474 209.598 30.2544C208.982 29.8566 208.539 29.2648 208.269 28.4788C208.004 27.6881 207.971 26.6985 208.17 25.5101C208.364 24.3121 208.729 23.3012 209.264 22.4774C209.803 21.6488 210.45 21.0214 211.203 20.5953C211.955 20.1644 212.751 19.949 213.589 19.949C214.228 19.949 214.737 20.0579 215.116 20.2757C215.495 20.4887 215.781 20.7468 215.975 21.0498C216.169 21.3481 216.312 21.6298 216.401 21.895H216.536L216.835 20.091H219.37L217.538 31.1777C217.386 32.1104 217.038 32.8822 216.494 33.493C215.949 34.1085 215.265 34.5655 214.441 34.8637C213.622 35.1668 212.725 35.3183 211.749 35.3183ZM212.801 28.8268C213.345 28.8268 213.833 28.6942 214.264 28.4291C214.695 28.1639 215.054 27.7828 215.343 27.2856C215.632 26.7885 215.833 26.1919 215.947 25.4958C216.061 24.8093 216.056 24.208 215.933 23.6919C215.814 23.1758 215.585 22.7757 215.244 22.4916C214.903 22.2028 214.458 22.0583 213.909 22.0583C213.336 22.0583 212.834 22.2075 212.403 22.5058C211.977 22.8041 211.626 23.2137 211.352 23.7345C211.082 24.2506 210.892 24.8377 210.784 25.4958C210.679 26.1635 210.679 26.7482 210.784 27.2501C210.892 27.7473 211.113 28.1355 211.444 28.4149C211.78 28.6895 212.232 28.8268 212.801 28.8268Z" fill="#3600FF"/>
                    </svg>
                  </div>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <Button
                      onClick={() => setShowWhiteboard(true)}
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-xl text-white hover:bg-white/10"
                      title="Lousa"
                    >
                      📝
                    </Button>
                    <Button
                      onClick={() => setShowShareModal(true)}
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-xl text-white hover:bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                    <div className="text-sm text-white/80 font-medium px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm">
                      🕐 {currentTime}
                    </div>
                  </div>
                </div>

                {/* Main content area - Dark Theme #101010 with scroll */}
                <div className="flex-1 flex overflow-y-auto">
                  {/* Video Grid Area */}
                  <div className={cn(
                    "flex-1 flex items-center justify-center p-6 transition-all duration-300",
                    (activeTab === 'chat' || activeTab === 'participants') && "mr-96"
                  )}>
                    <div className="w-full h-full max-w-6xl">
                      <ZoomParticipantGrid />
                    </div>
                  </div>

                  {/* Sidebar - White Theme with rounded corners */}
                  {(activeTab === 'chat' || activeTab === 'participants') && (
                    <div className="w-96 bg-white flex flex-col animate-in slide-in-from-right duration-200 rounded-tl-3xl shadow-2xl">
                      <MeetingSidebar 
                        isOpen={true}
                        onClose={() => setActiveTab(null)}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        roomId={roomName}
                        transcriptionMessages={transcriptionMessages}
                        onTranscriptionMessagesUpdate={setTranscriptionMessages}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Controls Bar - Dark Theme */}
                <div className="px-6 py-4 border-t border-white/10" style={{ backgroundColor: '#101010' }}>
                  <SimpleMeetingControls
                    ref={meetingControlsRef}
                    onToggleChat={() => setShowFloatingChat(!showFloatingChat)}
                    onToggleParticipants={() => setActiveTab(activeTab === 'participants' ? null : 'participants')}
                    onShareMeeting={() => setShowShareModal(true)}
                    onLeave={handleLeaveClick}
                    onSettingsClick={() => setShowDeviceSettings(true)}
                    onShowTranscription={() => setShowTranscriptionModal(true)}
                    isChatOpen={showFloatingChat}
                    isParticipantsOpen={activeTab === 'participants'}
                  />
                </div>
              </div>
              
              {/* Device Settings Modal */}
              <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
                companyId={companyId}
              />

              {/* Transcription Modal */}
              <TranscriptionModal
                isOpen={showTranscriptionModal}
                onClose={() => setShowTranscriptionModal(false)}
                messages={transcriptionMessages}
                isActive={isTranscribing}
              />

              {/* AI Chat Assistant */}
              <MeetingAIChat
                transcriptionMessages={transcriptionMessages}
                roomName={roomName}
              />

              {/* Whiteboard Canvas */}
              <WhiteboardCanvas
                isOpen={showWhiteboard}
                onClose={() => setShowWhiteboard(false)}
                backgroundColor={whiteboardBgColor}
              />
            </>
          )}

          <ShareMeetingModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            roomName={roomName}
          />

          <MeetingExitModal
            isOpen={showExitModal}
            onClose={() => setShowExitModal(false)}
            onConfirmExit={handleDisconnected}
            transcriptionMessages={transcriptionMessages}
            roomName={roomName}
            savedAudioUrl={savedAudioUrl}
          />
        </LiveKitRoom>
      ) : null}
    </>
  );
};

export default SimpleLiveKitRoom;
