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
  const [isCheckingHost, setIsCheckingHost] = useState(false); // Começar false para convidados
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

  // Check if user is host on mount (ONLY if authenticated)
  useEffect(() => {
    const checkHostAndSetup = async () => {
      console.log('🔍 [SimpleLiveKitRoom] Iniciando verificação...');
      
      // SEMPRE buscar a sala primeiro para obter o room_id (preciso para guests também)
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('meeting_rooms')
          .select('id, created_by')
          .eq('room_code', roomName)
          .single();

        if (roomError) {
          console.error('❌ [SimpleLiveKitRoom] Erro ao buscar sala:', roomError);
          setIsCheckingHost(false);
          setIsHost(false);
          setShowPreJoin(true);
          return;
        }
        
        if (!roomData) {
          console.error('❌ [SimpleLiveKitRoom] Sala não encontrada');
          setIsCheckingHost(false);
          setIsHost(false);
          setShowPreJoin(true);
          return;
        }

        console.log('🚪 [SimpleLiveKitRoom] Sala encontrada:', roomData.id);
        setCurrentRoomId(roomData.id);
        
        // Se não tem usuário, é convidado - mostrar prejoin após ter o room_id
        if (!user) {
          console.log('👤 [SimpleLiveKitRoom] SEM USUÁRIO - Modo convidado com room_id:', roomData.id);
          setIsCheckingHost(false);
          setIsHost(false);
          setShowPreJoin(true);
          return;
        }
      } catch (err) {
        console.error('❌ [SimpleLiveKitRoom] Erro ao buscar sala:', err);
        setIsCheckingHost(false);
        setIsHost(false);
        setShowPreJoin(true);
        return;
      }

      // Tem usuário - verificar se é host
      setIsCheckingHost(true);
      
      try {
        console.log('🔍 [SimpleLiveKitRoom] Usuário autenticado, verificando host...');
        
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.log('❌ [SimpleLiveKitRoom] Erro ao buscar usuário, continuando como convidado');
          setIsCheckingHost(false);
          setIsHost(false);
          setShowPreJoin(true);
          return;
        }

        console.log('✅ [SimpleLiveKitRoom] Usuário confirmado:', userData.user.id);

        // Get company ID
        const { data: companyUsers, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', userData.user.id)
          .limit(1);
        
        if (companyError) {
          console.error('❌ [SimpleLiveKitRoom] Erro ao buscar company:', companyError);
        } else if (companyUsers && companyUsers.length > 0) {
          console.log('🏢 [SimpleLiveKitRoom] Company ID:', companyUsers[0].company_id);
          setCompanyId(companyUsers[0].company_id);
        }

        // Check if user is host
        const { data: roomData, error: roomError } = await supabase
          .from('meeting_rooms')
          .select('id, created_by')
          .eq('room_code', roomName)
          .single();

        if (roomError) {
          console.error('❌ [SimpleLiveKitRoom] Erro ao buscar sala:', roomError);
          console.log('⚠️ [SimpleLiveKitRoom] Sala não encontrada, mas continuando como convidado');
          setIsCheckingHost(false);
          setIsHost(false);
          return;
        }

        if (roomData) {
          console.log('🚪 [SimpleLiveKitRoom] Sala encontrada:', roomData.id, 'Criado por:', roomData.created_by);
          const userIsHost = userData.user && roomData.created_by === userData.user.id;
          setIsHost(userIsHost);

          console.log(userIsHost ? '👑 [SimpleLiveKitRoom] Usuário é HOST' : '👥 [SimpleLiveKitRoom] Usuário é CONVIDADO');

          // If host, skip PreJoin and enter directly
          if (userIsHost) {
            console.log('🎯 [SimpleLiveKitRoom] Host entrando diretamente na sala');
            const finalUsername = userData.user.user_metadata?.full_name || participantName || 'Anfitrião';
            
            // Create participant record as host
            const peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const { error: insertError } = await supabase
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

            if (insertError) {
              console.error('❌ [SimpleLiveKitRoom] Erro ao criar participante:', insertError);
            } else {
              console.log('✅ [SimpleLiveKitRoom] Participante criado como host');
            }

            // Generate token and enter
            console.log('🎫 [SimpleLiveKitRoom] Gerando token...');
            await generateToken(finalUsername);
            setShowPreJoin(false);
            console.log('✅ [SimpleLiveKitRoom] Host pronto para entrar');
          }
        } else {
          console.warn('⚠️ [SimpleLiveKitRoom] Sala não encontrada');
          setIsHost(false);
        }
        
        console.log('✅ [SimpleLiveKitRoom] Verificação concluída');
        setIsCheckingHost(false);
      } catch (err) {
        console.error('❌ [SimpleLiveKitRoom] Erro fatal na verificação:', err);
        setIsCheckingHost(false);
        setIsHost(false);
        setShowPreJoin(true);
      }
    };
    
    checkHostAndSetup();
  }, [roomName]); // Only depend on roomName, not user or participantName

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
    console.log('✅ [PreJoin] Submetido com valores:', values);
    console.log('🆔 [PreJoin] Room ID atual:', currentRoomId);
    
    if (!currentRoomId) {
      console.error('❌ [PreJoin] Erro: currentRoomId está vazio!');
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
        console.error('❌ [PreJoin] Erro ao criar participante:', insertError);
        toast({
          title: "Erro",
          description: "Não foi possível entrar na sala. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (participantData) {
        console.log('✅ [PreJoin] Participante criado:', participantData.id);
        setParticipantId(participantData.id);
        setIsWaitingApproval(true);
        setShowPreJoin(false);
        console.log('⏳ [PreJoin] Aguardando aprovação do anfitrião...');
      }
    } catch (err) {
      console.error('❌ [PreJoin] Erro fatal:', err);
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
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
      <div className="min-h-screen bg-[#101010] flex items-center justify-center">
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
    console.log('🔄 [Render] Mostrando tela de verificação de acesso');
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-white text-lg font-medium">Verificando acesso...</p>
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
