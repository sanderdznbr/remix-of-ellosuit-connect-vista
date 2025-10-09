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
import MeetingLayout from './MeetingLayout';
import '@/styles/meeting-dark-theme.css';

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
  const [showPreJoin, setShowPreJoin] = useState(false); // Começar false - decidiremos depois
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
  const [isCheckingHost, setIsCheckingHost] = useState(true); // Começar true - verificando primeiro
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

  console.log('🎬 [SimpleLiveKitRoom] Componente montado:', {
    roomName,
    participantName,
    hasUser: !!user,
    userId: user?.id
  });

  // Check if user is the first to enter (becomes host automatically)
  useEffect(() => {
    const checkFirstParticipant = async () => {
      console.log('🔍 [SimpleLiveKitRoom] === VERIFICANDO PRIMEIRO PARTICIPANTE ===');
      
      try {
        // First, get the room data
        console.log('📡 [SimpleLiveKitRoom] Buscando dados da sala...');
        const { data: roomData, error: roomError } = await supabase
          .from('meeting_rooms')
          .select('id, created_by, title')
          .eq('room_code', roomName)
          .eq('is_active', true)
          .single();

        if (roomError) {
          console.error('❌ [SimpleLiveKitRoom] Erro ao buscar sala:', roomError);
          setError('Sala não encontrada');
          setIsCheckingHost(false);
          return;
        }

        console.log('✅ [SimpleLiveKitRoom] Sala encontrada:', roomData);
        setCurrentRoomId(roomData.id);

        // Check if there are any participants already in the room
        console.log('👥 [SimpleLiveKitRoom] Verificando participantes existentes...');
        const { data: existingParticipants, error: participantsError } = await supabase
          .from('room_participants')
          .select('id, is_host, display_name')
          .eq('room_id', roomData.id);

        if (participantsError) {
          console.error('❌ [SimpleLiveKitRoom] Erro ao buscar participantes:', participantsError);
        }

        const participantCount = existingParticipants?.length || 0;
        const isFirstParticipant = participantCount === 0;
        
        console.log('📊 [SimpleLiveKitRoom] Participantes existentes:', participantCount);
        console.log('🎯 [SimpleLiveKitRoom] É o primeiro participante?', isFirstParticipant);

        // Get user data
        const { data: userData } = await supabase.auth.getUser();
        const userName = userData?.user?.user_metadata?.full_name || 
                        userData?.user?.email?.split('@')[0] || 
                        participantName ||
                        'Participante';

        // Get company ID
        if (userData?.user) {
          const { data: companyUsers } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', userData.user.id)
            .limit(1);
          
          if (companyUsers && companyUsers.length > 0) {
            setCompanyId(companyUsers[0].company_id);
          }
        }

        if (isFirstParticipant) {
          console.log('👑 [SimpleLiveKitRoom] ✨ PRIMEIRO A ENTRAR - VIRANDO HOST AUTOMATICAMENTE!');
          setIsHost(true);
          
          // Create participant record as host
          console.log('💾 [SimpleLiveKitRoom] Criando registro como host...');
          const peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          
          const { data: participantData, error: participantError } = await supabase
            .from('room_participants')
            .insert({
              room_id: roomData.id,
              user_id: userData?.user?.id || null,
              display_name: userName,
              peer_id: peerId,
              is_host: true,
              waiting_approval: false,
              connection_status: 'connected'
            })
            .select()
            .single();

          if (participantError) {
            console.error('❌ [SimpleLiveKitRoom] Erro ao criar participante host:', participantError);
            toast({
              title: "Erro ao entrar na sala",
              description: participantError.message,
              variant: "destructive"
            });
            setIsCheckingHost(false);
            return;
          }

          console.log('✅ [SimpleLiveKitRoom] Participante host criado:', participantData);

          // Generate token and enter room directly (NO PRE-JOIN)
          console.log('🎫 [SimpleLiveKitRoom] Gerando token para host...');
          setShowPreJoin(false);
          setIsCheckingHost(false);
          await generateToken(userName);
          
          console.log('✅ [SimpleLiveKitRoom] ✨ HOST (primeiro a entrar) na sala com sucesso!');
        } else {
          console.log('👥 [SimpleLiveKitRoom] NÃO é o primeiro - mostrando pre-join para guest');
          setIsHost(false);
          setIsCheckingHost(false);
          setShowPreJoin(true);
        }
      } catch (error) {
        console.error('❌ [SimpleLiveKitRoom] Erro ao verificar primeiro participante:', error);
        setError('Erro ao conectar com a sala');
        setIsCheckingHost(false);
      }
    };

    checkFirstParticipant();
  }, [roomName, participantName, toast]);

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
      console.log('🎫 [generateToken] Iniciando geração de token');
      console.log('📝 [generateToken] Sala:', roomName, 'Usuário:', username);
      
      setConnectingToRoom(true);
      setError('');

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName,
          participantName: username
        }
      });

      if (error) {
        console.error('❌ [generateToken] Erro do Supabase:', error);
        throw new Error(error.message || 'Erro ao gerar token');
      }

      if (!data || !data.token || !data.url) {
        console.error('❌ [generateToken] Resposta inválida:', data);
        throw new Error('Resposta inválida do servidor');
      }

      const tokenData = data as TokenResponse;
      console.log('✅ [generateToken] Token gerado com sucesso');
      console.log('🌐 [generateToken] Server URL:', tokenData.url);

      setToken(tokenData.token);
      setServerUrl(tokenData.url);
      setConnectingToRoom(false);
      
      console.log('✅ [generateToken] Estados atualizados - pronto para conectar');
    } catch (err) {
      console.error('❌ [generateToken] Erro fatal:', err);
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
    console.log('✅ [PreJoin] === INÍCIO DO SUBMIT ===');
    console.log('✅ [PreJoin] Valores recebidos:', values);
    console.log('🆔 [PreJoin] Room ID atual:', currentRoomId);
    console.log('👤 [PreJoin] User ID:', user?.id || 'sem user');
    console.log('📝 [PreJoin] Participant name:', participantName);
    
    if (!currentRoomId) {
      console.error('❌ [PreJoin] ERRO CRÍTICO: currentRoomId está vazio!');
      console.error('❌ [PreJoin] Estado completo:', {
        currentRoomId,
        hasUser: !!user,
        roomName,
        showPreJoin
      });
      toast({
        title: "Erro",
        description: "Sala não encontrada. Tente recarregar a página.",
        variant: "destructive",
      });
      return;
    }
    
    setPreJoinChoices(values);
    
    const finalUsername = values.username || participantName || 'Convidado';
    console.log('👤 [PreJoin] Nome final do convidado:', finalUsername);

    try {
      // Guest joining - create participant record and wait for approval
      const peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      console.log('🔑 [PreJoin] Criando participante com peer_id:', peerId);
      console.log('📋 [PreJoin] Dados do insert:', {
        room_id: currentRoomId,
        user_id: user?.id || null,
        display_name: finalUsername,
        peer_id: peerId,
        is_host: false,
        connection_status: 'waiting',
        waiting_approval: true,
      });
      
      const { data: participantData, error: insertError } = await supabase
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

      if (insertError) {
        console.error('❌ [PreJoin] Erro ao criar participante - DETALHES:', {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        toast({
          title: "Erro ao entrar",
          description: insertError.message || "Não foi possível entrar na sala. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (participantData) {
        console.log('✅ [PreJoin] Participante criado com sucesso:', participantData.id);
        setParticipantId(participantData.id);
        setIsWaitingApproval(true);
        setShowPreJoin(false);
        console.log('⏳ [PreJoin] Aguardando aprovação do anfitrião...');
        console.log('✅ [PreJoin] === FIM DO SUBMIT COM SUCESSO ===');
      }
    } catch (err) {
      console.error('❌ [PreJoin] Erro fatal capturado:', err);
      console.error('❌ [PreJoin] Tipo do erro:', typeof err);
      console.error('❌ [PreJoin] Stack:', (err as Error).stack);
      toast({
        title: "Erro inesperado",
        description: `Erro: ${(err as Error).message}`,
        variant: "destructive",
      });
    }
  }, [currentRoomId, participantName, user, toast]);

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
      <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: '#0f172a' }}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">Erro ao conectar</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setError('');
                generateToken(participantName || 'Convidado');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button onClick={onLeave} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Sair
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
    console.log('🔄 [Render] Mostrando tela de verificação de acesso');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6" style={{ background: '#0f172a' }}>
        <img src={logoEllo} alt="ElloSuit" className="h-16 w-auto mb-4" />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg text-white font-medium">Entrando na reunião...</p>
          <p className="text-sm text-slate-400">Verificando credenciais</p>
        </div>
      </div>
    );
  }

  console.log('🎬 [Render] Estados atuais:', {
    showPreJoin,
    isHost,
    isWaitingApproval,
    connectingToRoom,
    hasToken: !!token,
    hasServerUrl: !!serverUrl
  });

  return (
    <div style={{ backgroundColor: '#101010', minHeight: '100vh', width: '100%' }}>
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
        <div style={{ backgroundColor: '#101010', minHeight: '100vh', width: '100%' }}>
          <LiveKitRoom
            video={preJoinChoices?.videoEnabled ?? true}
            audio={preJoinChoices?.audioEnabled ?? true}
            token={token}
            serverUrl={serverUrl}
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
              {/* Loading States */}
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

              {/* Meeting Layout - Clean and Simple */}
              <MeetingLayout
                roomName={roomName}
                companyId={companyId}
                participantName={participantName}
                activeTab={activeTab}
                transcriptionMessages={transcriptionMessages}
                isTranscribing={isTranscribing}
                isHost={isHost}
                onTabChange={setActiveTab}
                onTranscriptionMessagesUpdate={setTranscriptionMessages}
                onLeave={() => setShowExitModal(true)}
                onDeviceSettings={() => setShowDeviceSettings(true)}
                onTranscriptionToggle={() => {
                  setIsTranscribing(!isTranscribing);
                  toast({
                    title: isTranscribing ? "Transcrição pausada" : "Transcrição iniciada",
                    description: isTranscribing 
                      ? "A transcrição foi pausada" 
                      : "A transcrição está ativa e funcionando",
                  });
                }}
                onShareMeeting={() => setShowShareModal(true)}
                onTranscriptionClick={() => setShowTranscriptionModal(true)}
                meetingControlsRef={meetingControlsRef}
              />
              
              {/* Modals */}
              <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
                companyId={companyId}
              />

              <TranscriptionModal
                isOpen={showTranscriptionModal}
                onClose={() => setShowTranscriptionModal(false)}
                messages={transcriptionMessages}
                isActive={isTranscribing}
              />

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
        </div>
      ) : null}
    </div>
  );
};

export default SimpleLiveKitRoom;
