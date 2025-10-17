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
import InviteModal from './InviteModal';
import RecordingConsentDialog from './RecordingConsentDialog';
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
  const [livekitConnectedAt, setLivekitConnectedAt] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string>('');
  const [livekitRecordingId, setLivekitRecordingId] = useState<string>('');
  const [showRecordingConsent, setShowRecordingConsent] = useState(false);
  const [pendingRecordingRequest, setPendingRecordingRequest] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [isInitialConnection, setIsInitialConnection] = useState(true);
  const [connectionStable, setConnectionStable] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const hasCheckedHostRef = useRef(false); // Prevenir múltiplas execuções
  const meetingControlsRef = useRef<any>(null);
  const meetingDurationTimerRef = useRef<NodeJS.Timeout>();
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
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

  // Function to request host permissions
  const requestHostPermissions = async (): Promise<boolean> => {
    try {
      console.log('🎤 [SimpleLiveKitRoom] Solicitando permissões para host...');
      setRequestingPermissions(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ [SimpleLiveKitRoom] Permissões concedidas para host!');
      
      // Parar as tracks imediatamente (só precisávamos da permissão)
      stream.getTracks().forEach(track => track.stop());
      
      setRequestingPermissions(false);
      return true;
    } catch (error: any) {
      console.error('❌ [SimpleLiveKitRoom] Erro ao solicitar permissões:', error);
      
      let errorMessage = 'Erro ao acessar câmera e microfone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Você precisa permitir acesso à câmera e microfone para entrar na reunião';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera ou microfone foi encontrado';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera ou microfone já está em uso por outro aplicativo';
      }
      
      setError(errorMessage);
      setRequestingPermissions(false);
      return false;
    }
  };

  // Check if user is the first to enter (becomes host automatically)
  useEffect(() => {
    // Prevenir múltiplas execuções
    if (hasCheckedHostRef.current) {
      console.log('⚠️ [SimpleLiveKitRoom] Checagem já executada, ignorando...');
      return;
    }
    
    hasCheckedHostRef.current = true;
    
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
          
          // ===== SOLICITAR PERMISSÕES ANTES DE ENTRAR =====
          console.log('🎤 [SimpleLiveKitRoom] Solicitando permissões para host...');
          const permissionsGranted = await requestHostPermissions();
          
          if (!permissionsGranted) {
            console.error('❌ [SimpleLiveKitRoom] Permissões negadas - abortando entrada');
            setIsCheckingHost(false);
            return; // Não entra na sala sem permissões
          }
          // ================================================
          
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
          
          // Definir configurações padrão para o host (já que não há pre-join)
          console.log('⚙️ [SimpleLiveKitRoom] Definindo preJoinChoices padrão para host');
          setPreJoinChoices({
            username: userName,
            videoEnabled: true,
            audioEnabled: true
          });
          console.log('✅ [SimpleLiveKitRoom] PreJoinChoices definido:', {
            username: userName,
            videoEnabled: true,
            audioEnabled: true
          });
          
          setShowPreJoin(false);
          
          // IMPORTANTE: Manter isCheckingHost=true até generateToken ser chamado
          // para evitar tela preta durante a geração do token
          console.log('🎫 [SimpleLiveKitRoom] Gerando token para host (mantendo loading ativo)...');
          await generateToken(userName);
          
          // Só desativar loading DEPOIS que o token foi gerado
          setIsCheckingHost(false);
          
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
    
    return () => {
      clearInterval(interval);
      // Cleanup timeout de conexão
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
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
      setIsInitialConnection(true);
      setConnectionStable(false);

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
      
      // Set timeout de segurança: se após 30 segundos não conectar, mostrar erro
      connectionTimeoutRef.current = setTimeout(() => {
        console.error('⏰ [generateToken] Timeout ao conectar - 30 segundos sem resposta');
        setError('Tempo de conexão esgotado. Tente novamente.');
        setToken('');
        setServerUrl('');
        setIsInitialConnection(false);
        toast({
          title: "Erro ao conectar",
          description: "A conexão demorou muito. Tente entrar novamente.",
          variant: "destructive",
        });
      }, 30000);
      
      console.log('✅ [generateToken] Estados atualizados - pronto para conectar');
    } catch (err) {
      console.error('❌ [generateToken] Erro fatal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar na sala';
      setError(errorMessage);
      setConnectingToRoom(false);
      setIsInitialConnection(false);
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

  // Listen for recording consent requests via Realtime
  useEffect(() => {
    if (!currentRoomId || isHost) return; // Host doesn't need to see their own request

    const channel = supabase
      .channel(`recording-consent:${currentRoomId}`)
      .on(
        'broadcast',
        { event: 'recording-request' },
        () => {
          console.log('📢 Received recording consent request');
          setShowRecordingConsent(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoomId, isHost]);

  const checkAllConsents = async (): Promise<boolean> => {
    if (!currentRoomId) return false;

    // Get all participants in the room
    const { data: participants } = await supabase
      .from('room_participants')
      .select('id, display_name')
      .eq('room_id', currentRoomId)
      .is('left_at', null);

    if (!participants || participants.length === 0) return false;

    // Get all consents
    const { data: consents } = await supabase
      .from('recording_consents')
      .select('*')
      .eq('room_id', currentRoomId);

    // Check if all participants have consented
    const allConsented = participants.every(p => 
      consents?.some(c => c.participant_name === p.display_name && c.consented === true)
    );

    return allConsented;
  };

  const startRecording = async () => {
    if (!isHost) {
      toast({
        title: "Permissão negada",
        description: "Apenas o anfitrião pode iniciar gravação",
        variant: "destructive",
      });
      return;
    }

    // Clear previous consents
    await supabase
      .from('recording_consents')
      .delete()
      .eq('room_id', currentRoomId);

    // Broadcast recording request to all participants
    const channel = supabase.channel(`recording-consent:${currentRoomId}`);
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'recording-request',
          payload: {},
        });
      }
    });

    // Host automatically consents
    await supabase
      .from('recording_consents')
      .insert({
        room_id: currentRoomId,
        participant_name: participantName,
        consented: true,
      });

    setPendingRecordingRequest(true);

    // Wait for all participants to respond (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    const checkInterval = setInterval(async () => {
      attempts++;

      const allConsented = await checkAllConsents();

      if (allConsented) {
        clearInterval(checkInterval);
        setPendingRecordingRequest(false);

        // Start actual recording
        try {
          const { data, error } = await supabase.functions.invoke('meeting-recording', {
            body: {
              action: 'start',
              roomName: roomName,
              userId: user?.id,
              companyId: companyId
            }
          });

          if (error) throw error;

          setIsRecording(true);
          setRecordingId(data.recording_id);
          setLivekitRecordingId(data.livekit_recording_id || '');

          toast({
            title: "Gravação iniciada",
            description: "Todos os participantes consentiram. A reunião está sendo gravada.",
          });
        } catch (error) {
          console.error('Erro ao iniciar gravação:', error);
          toast({
            title: "Erro ao gravar",
            description: "Não foi possível iniciar a gravação",
            variant: "destructive",
          });
        }

        return;
      }

      // Check if anyone rejected
      const { data: consents } = await supabase
        .from('recording_consents')
        .select('*')
        .eq('room_id', currentRoomId)
        .eq('consented', false);

      if (consents && consents.length > 0) {
        clearInterval(checkInterval);
        setPendingRecordingRequest(false);

        toast({
          title: "Gravação cancelada",
          description: "Um participante não consentiu com a gravação",
          variant: "destructive",
        });

        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        setPendingRecordingRequest(false);

        toast({
          title: "Tempo esgotado",
          description: "Nem todos os participantes responderam a tempo",
          variant: "destructive",
        });
      }
    }, 1000);
  };

  const handleRecordingConsent = async () => {
    await supabase
      .from('recording_consents')
      .insert({
        room_id: currentRoomId,
        participant_name: participantName,
        consented: true,
      });

    setShowRecordingConsent(false);
  };

  const handleRecordingReject = async () => {
    await supabase
      .from('recording_consents')
      .insert({
        room_id: currentRoomId,
        participant_name: participantName,
        consented: false,
      });

    setShowRecordingConsent(false);

    // Notify host
    toast({
      title: "Gravação negada",
      description: "Você não autorizou a gravação desta reunião",
      variant: "destructive",
    });
  };

  const stopRecording = async () => {
    if (!recordingId) return;

    try {
      console.log('🔴 [stopRecording] Parando gravação...', { recordingId, livekitRecordingId });
      setIsProcessingRecording(true);

      toast({
        title: "Processando gravação",
        description: "Aguarde enquanto finalizamos a gravação...",
      });

      const { data, error } = await supabase.functions.invoke('meeting-recording', {
        body: {
          action: 'stop',
          roomName: roomName,
          recordingId: recordingId,
          livekitRecordingId: livekitRecordingId
        }
      });

      if (error) {
        console.error('❌ [stopRecording] Erro:', error);
        throw error;
      }

      console.log('✅ [stopRecording] Gravação parada com sucesso:', data);

      setIsRecording(false);
      setRecordingId('');
      setLivekitRecordingId('');
      setIsProcessingRecording(false);

      toast({
        title: "Gravação salva!",
        description: "A gravação foi finalizada e salva em 'Gravações Salvas'. O vídeo será processado nos próximos minutos.",
      });
    } catch (error) {
      console.error('❌ [stopRecording] Erro ao parar gravação:', error);
      setIsProcessingRecording(false);
      toast({
        title: "Erro ao parar gravação",
        description: "Não foi possível finalizar a gravação",
        variant: "destructive",
      });
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleLeaveClick = async () => {
    console.log('🚪 Iniciando processo de saída...');
    
    // Stop recording if active
    if (isRecording && recordingId) {
      console.log('🔴 Parando gravação antes de sair...');
      setIsProcessingRecording(true);
      toast({
        title: "Finalizando gravação",
        description: "Aguarde enquanto salvamos a gravação...",
      });
      await stopRecording();
    }
    
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
    
    // Wait a bit if recording was just stopped to ensure it's processed
    if (isProcessingRecording) {
      console.log('⏳ Aguardando processamento da gravação...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessingRecording(false);
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
    console.log('🔴 [handleDisconnected] === DESCONEXÃO DETECTADA ===');
    console.log('🔍 [handleDisconnected] Estado da conexão:', {
      isInitialConnection,
      connectionStable,
      livekitConnectedAt,
      timeSinceConnect: livekitConnectedAt > 0 ? Date.now() - livekitConnectedAt : 0
    });
    
    // PROTEÇÃO CRÍTICA: Ignorar TODAS as desconexões nos primeiros 30 segundos
    if (livekitConnectedAt > 0) {
      const connectionTime = Date.now() - livekitConnectedAt;
      console.log('⏱️ [handleDisconnected] Tempo desde conexão:', connectionTime, 'ms');
      
      if (connectionTime < 30000) {
        console.warn('🛡️ [handleDisconnected] BLOQUEADO - Desconexão nos primeiros 30 segundos!');
        console.log('🛡️ [handleDisconnected] Ignorando para prevenir desconexão prematura');
        console.log('🔄 [handleDisconnected] Conexão será mantida para estabilização');
        toast({
          title: "Estabilizando conexão...",
          description: "Aguarde enquanto estabelecemos a conexão com a sala",
        });
        return;
      }
    }
    
    // Proteção extra: se for o host, adicionar mais validação
    if (isHost && livekitConnectedAt > 0) {
      const connectionTime = Date.now() - livekitConnectedAt;
      if (connectionTime < 45000) {
        console.warn('👑 [handleDisconnected] HOST BLOQUEADO - Desconexão nos primeiros 45 segundos!');
        console.log('🛡️ [handleDisconnected] Hosts precisam de mais tempo para estabilizar');
        toast({
          title: "Estabilizando como anfitrião...",
          description: "Configurando a sala para você",
        });
        return;
      }
    }
    
    // Se não há timestamp de conexão mas ainda está inicial, também ignorar
    if (isInitialConnection || !connectionStable) {
      console.warn('🛡️ [handleDisconnected] BLOQUEADO - Conexão ainda não estável!');
      toast({
        title: "Conectando...",
        description: "Estabelecendo conexão com a sala...",
      });
      return;
    }
    
    console.log('✅ [handleDisconnected] Desconexão válida após conexão estável, processando saída...');
    
    // Stop all local media tracks before leaving
    if (roomRef.current?.localParticipant) {
      try {
        console.log('⏹️ [handleDisconnected] Parando todas as tracks de mídia...');
        
        // Stop all audio tracks
        roomRef.current.localParticipant.audioTrackPublications.forEach((publication) => {
          const track = publication.track;
          if (track) {
            track.stop();
            console.log('🔇 Stopped audio track:', track.sid);
          }
        });
        
        // Stop all video tracks
        roomRef.current.localParticipant.videoTrackPublications.forEach((publication) => {
          const track = publication.track;
          if (track) {
            track.stop();
            console.log('📹 Stopped video track:', track.sid);
          }
        });
        
        console.log('✅ [handleDisconnected] Todas as tracks de mídia paradas com sucesso');

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
          
          console.log('👑 [handleDisconnected] Sala marcada como inativa pelo host');
        }
      } catch (error) {
        console.error('❌ [handleDisconnected] Erro durante desconexão:', error);
      }
    }
    
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAzuJzfPJdSgEJnzE8N+MSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIy';
    audio.play().catch(() => {
      console.log('Could not play disconnect sound');
    });
    
    toast({
      title: "Desconectado",
      description: "Você saiu da sala de reunião",
    });
    
    setTimeout(() => {
      console.log('🚪 [handleDisconnected] Chamando onLeave()...');
      onLeave();
    }, 500);
  }, [onLeave, toast, roomName, livekitConnectedAt]);

  const handleError = useCallback((error: Error) => {
    console.error('🚨 [handleError] LiveKit error:', error);
    console.log('🔍 [handleError] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Detectar erros de dispositivo não disponível
    const isDeviceError = 
      error.message.toLowerCase().includes('device') ||
      error.message.toLowerCase().includes('dispositivo') ||
      error.message.toLowerCase().includes('not found') ||
      error.message.toLowerCase().includes('não encontrado') ||
      error.name === 'NotFoundError' ||
      error.name === 'DevicesNotFoundError';
    
    if (isDeviceError) {
      console.warn('⚠️ [handleError] Erro de dispositivo detectado - abrindo configurações');
      setShowDeviceSettings(true);
      toast({
        title: "Dispositivo não encontrado",
        description: "Configure seus dispositivos de áudio e vídeo para continuar",
        variant: "default",
        duration: 6000,
      });
      return;
    }
    
    // Detectar erros de permissão - ESTES NÃO SÃO FATAIS!
    const isPermissionError = 
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError' ||
      error.message.toLowerCase().includes('permission') ||
      error.message.toLowerCase().includes('denied') ||
      error.message.toLowerCase().includes('camera') ||
      error.message.toLowerCase().includes('microphone') ||
      error.message.toLowerCase().includes('mic') ||
      error.message.toLowerCase().includes('video');
    
    if (isPermissionError) {
      console.warn('⚠️ [handleError] Erro de permissão detectado - tratando como não-fatal');
      console.log('✅ [handleError] Permitindo reunião continuar sem mídia');
      setShowDeviceSettings(true);
      toast({
        title: "Sem acesso a câmera/microfone",
        description: "Configure as permissões de mídia para usar câmera e microfone",
        variant: "default",
        duration: 6000,
      });
      // NÃO chamar setError() - deixar a reunião continuar
      return;
    }
    
    // Para outros erros, manter comportamento original (erro fatal)
    console.error('❌ [handleError] Erro fatal detectado - mostrando tela de erro');
    setError(error.message);
    toast({
      title: "Erro na chamada",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);


  // Loading state for permissions
  if (requestingPermissions) {
    return (
      <div className="h-screen w-full bg-[#101010] flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoEllo} alt="ELLOSUIT" className="h-12" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Solicitando permissões...</p>
          <p className="text-gray-400 text-sm">
            Por favor, permita o acesso à câmera e microfone
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-full bg-[#101010] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1C1C1E] rounded-2xl p-8 border border-red-500/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoEllo} alt="ELLOSUIT" className="h-12" />
          </div>

          {/* Ícone de erro */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* Mensagem de erro */}
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Não foi possível acessar seus dispositivos
          </h2>
          <p className="text-gray-400 text-center mb-6">
            {error}
          </p>

          {/* Instruções */}
          <div className="bg-[#2C2C2E] rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300 mb-2 font-medium">Como resolver:</p>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Clique no ícone de cadeado 🔒 na barra de endereço</li>
              <li>Permita o acesso à câmera e microfone</li>
              <li>Recarregue a página</li>
            </ol>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            
            <Button
              onClick={onLeave}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Voltar para o dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleApprovalGranted = useCallback(async () => {
    console.log('✅ [handleApprovalGranted] Participante aprovado! Gerando token...');
    setIsWaitingApproval(false);
    const finalUsername = preJoinChoices?.username || participantName || 'Convidado';
    console.log('👤 [handleApprovalGranted] Nome do usuário:', finalUsername);
    await generateToken(finalUsername);
    console.log('✅ [handleApprovalGranted] Token gerado, entrando na sala...');
  }, [preJoinChoices, participantName, generateToken]);

  const handleApprovalRejected = useCallback(() => {
    toast({
      title: "Acesso negado",
      description: "O anfitrião rejeitou sua entrada na reunião",
      variant: "destructive",
    });
    setTimeout(() => onLeave(), 2000);
  }, [toast, onLeave]);

  console.log('🎬 [Render] Estados atuais:', {
    showPreJoin,
    isHost,
    isWaitingApproval,
    connectingToRoom,
    hasToken: !!token,
    hasServerUrl: !!serverUrl,
    isCheckingHost
  });

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
            onMediaDeviceFailure={(error) => {
              console.warn('⚠️ [LiveKitRoom] Falha no dispositivo de mídia:', error);
              console.log('🔧 [LiveKitRoom] Detalhes do erro:', error);
              console.log('📱 [LiveKitRoom] Abrindo modal de configurações para o usuário');
              
              // Abrir modal de configurações automaticamente
              setShowDeviceSettings(true);
              
              toast({
                title: "Dispositivo não disponível",
                description: "Câmera ou microfone não puderam ser acessados. Configure seus dispositivos.",
                variant: "default",
                duration: 5000,
              });
            }}
            onConnected={() => {
              console.log('🟢 [LiveKitRoom] === CONECTADO COM SUCESSO ===');
              console.log('🎉 [LiveKitRoom] Token válido, sessão iniciada');
              console.log('🎬 [LiveKitRoom] Preferências de mídia:', {
                video: preJoinChoices?.videoEnabled ?? true,
                audio: preJoinChoices?.audioEnabled ?? true
              });
              const now = Date.now();
              setLivekitConnectedAt(now);
              
              // Marcar que não é mais conexão inicial
              console.log('✅ [LiveKitRoom] Marcando como não-inicial');
              setIsInitialConnection(false);
              
              // Limpar timeout de conexão se existir
              if (connectionTimeoutRef.current) {
                console.log('🔄 [LiveKitRoom] Limpando timeout de conexão');
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = undefined;
              }
              
              // Aguardar 10 segundos para marcar a conexão como estável (mais tempo para hosts)
              const stabilizationTime = isHost ? 10000 : 7000;
              console.log(`⏱️ [LiveKitRoom] Aguardando ${stabilizationTime/1000}s para estabilizar (${isHost ? 'HOST' : 'GUEST'})`);
              
              setTimeout(() => {
                console.log('✅ [LiveKitRoom] ⭐ CONEXÃO ESTABILIZADA - proteção ativa');
                setConnectionStable(true);
              }, stabilizationTime);
              
              // Mostrar aviso se entrou sem mídia
              console.log('🎬 [LiveKitRoom] Verificando status da mídia:', {
                videoEnabled: preJoinChoices?.videoEnabled,
                audioEnabled: preJoinChoices?.audioEnabled
              });
              
              if (!preJoinChoices?.videoEnabled && !preJoinChoices?.audioEnabled) {
                console.warn('⚠️ [LiveKitRoom] Usuário entrou sem vídeo e sem áudio');
                toast({
                  title: "Conectado sem mídia",
                  description: "Você entrou na reunião sem câmera e microfone",
                  variant: "default",
                });
              } else if (!preJoinChoices?.videoEnabled) {
                console.log('📹 [LiveKitRoom] Usuário entrou apenas com áudio');
                toast({
                  title: "Conectado!",
                  description: "Você está na reunião apenas com áudio",
                });
              } else if (!preJoinChoices?.audioEnabled) {
                console.log('🎤 [LiveKitRoom] Usuário entrou apenas com vídeo');
                toast({
                  title: "Conectado!",
                  description: "Você está na reunião apenas com vídeo",
                });
              } else {
                console.log('✅ [LiveKitRoom] Usuário entrou com vídeo e áudio');
                toast({
                  title: "Conectado!",
                  description: "Você está na reunião",
                });
              }
            }}
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
                console.log('🔄 [LiveKitRoom] Tentando reconectar...', { 
                  tentativa: context.retryCount,
                  tempoDecorrido: context.elapsedMs,
                  isInitialConnection,
                  connectionStable,
                  isHost
                });
                
                // Durante a conexão inicial, tentar mais agressivamente
                if (isInitialConnection || !connectionStable) {
                  console.log('🔄 [LiveKitRoom] Conexão inicial - retry rápido (300ms)');
                  return 300;
                }
                
                // Se for o host, ser mais persistente
                if (isHost) {
                  console.log('👑 [LiveKitRoom] Host - retry persistente');
                  return 500;
                }
                
                // Após estabilizado, usar política normal
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
          
          {/* Local Audio Capture for Real-time Transcription - Desktop only */}
          {!isMobile && (
            <LiveKitAudioCapture 
              isActive={isTranscribing}
              roomName={roomName}
              onTranscriptionUpdate={handleTranscriptionUpdate}
            />
          )}
          
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
              onToggleRecording={toggleRecording}
              isRecording={isRecording}
            />
          ) : (
            <>
              {/* Loading States */}
              {isProcessingRecording && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 text-center">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Exportando gravação...</h3>
                    <p className="text-muted-foreground">
                      Aguarde enquanto finalizamos e salvamos a gravação da reunião.
                    </p>
                  </div>
                </div>
              )}

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

              {pendingRecordingRequest && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 text-center">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Aguardando consentimento...</h3>
                    <p className="text-muted-foreground">
                      Aguardando todos os participantes concordarem com a gravação da reunião.
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
                onToggleRecording={toggleRecording}
                isRecording={isRecording}
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

          <InviteModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            meetingLink={`${window.location.origin}/meeting/${roomName}`}
          />

          <RecordingConsentDialog
            isOpen={showRecordingConsent}
            onConsent={handleRecordingConsent}
            onReject={handleRecordingReject}
            roomId={currentRoomId}
            participantName={participantName}
          />
        </LiveKitRoom>
        </div>
      ) : null}
    </div>
  );
};

export default SimpleLiveKitRoom;
