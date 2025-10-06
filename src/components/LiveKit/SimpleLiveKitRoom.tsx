import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Room } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, RefreshCw, Share2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import MeetingControls from './MeetingControls';
import MeetingSidebar from './MeetingSidebar';
import ShareMeetingModal from './ShareMeetingModal';
import { MeetingExitModal } from './MeetingExitModal';
import ZoomPreJoin from './ZoomPreJoin';
import ZoomParticipantGrid from './ZoomParticipantGrid';
import MobileMeetingLayout from './MobileMeetingLayout';
import { RoomContextCapture } from './RoomContextCapture';
import logoEllo from '@/assets/logoellosuit.png';
import DeviceSettingsModal from './DeviceSettingsModal';
import TranscriptionModal from './TranscriptionModal';
import { MeetingAIChat } from './MeetingAIChat';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [preJoinChoices, setPreJoinChoices] = useState<any>();
  const [showPreJoin, setShowPreJoin] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string>('');
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const meetingControlsRef = useRef<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const roomRef = useRef<Room | null>(null);
  const audioRecordersRef = useRef<Map<string, { recorder: MediaRecorder; chunks: Blob[] }>>(new Map());

  useEffect(() => {
    const getCompanyId = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: companyUsers } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.user.id)
          .limit(1);
        
        if (companyUsers && companyUsers.length > 0) {
          setCompanyId(companyUsers[0].company_id);
        }
      }
    };
    
    getCompanyId();
  }, []);

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
      setLoading(true);
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
      
    } catch (err) {
      console.error('Error generating token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar na sala';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roomName, toast]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handlePreJoinSubmit = useCallback(async (values: any) => {
    console.log('PreJoin submitted with values:', values);
    setPreJoinChoices(values);
    
    const finalUsername = values.username || participantName || 'Convidado';
    console.log('Using final username:', finalUsername);
    await generateToken(finalUsername);
    
    setShowPreJoin(false);
  }, [generateToken, participantName]);

  const handleLeaveClick = async () => {
    console.log('🚪 Iniciando processo de saída...');
    
    // Stop audio capture first
    if (meetingControlsRef.current?.stopAudioCapture) {
      console.log('⏸️ Parando captura de áudio...');
      await meetingControlsRef.current.stopAudioCapture();
    }
    
    // Get saved audio URL
    let audioUrl = '';
    if (meetingControlsRef.current?.getSavedAudioUrl) {
      audioUrl = meetingControlsRef.current.getSavedAudioUrl();
      console.log('🎙️ URL do áudio salvo:', audioUrl || 'Nenhum');
      setSavedAudioUrl(audioUrl);
    }
    
    // If we have audio, process speaker diarization
    if (audioUrl) {
      console.log('🎤 Processando identificação de speakers...');
      setIsProcessingTranscript(true);
      
      try {
        toast({
          title: "🎙️ Identificando Vozes",
          description: "Analisando tom de voz para identificar cada pessoa... Isso pode levar alguns minutos.",
          duration: 10000,
        });
        
        const { data, error } = await supabase.functions.invoke('speaker-diarization', {
          body: { audioUrl }
        });
        
        if (error) {
          console.error('❌ Erro na diarização:', error);
          throw error;
        }
        
        if (data && data.success && data.segments && data.segments.length > 0) {
          console.log(`✅ AssemblyAI retornou ${data.speakerCount} speakers`);
          console.log('📊 Segments:', data.segments.length);
          
          // Convert segments to transcription messages format
          const transcriptMsgs: TranscriptionMessage[] = data.segments.map((seg: any) => ({
            text: seg.text,
            is_final: true,
            timestamp: new Date().toISOString(),
            speaker: seg.speaker
          }));
          
          setTranscriptionMessages(transcriptMsgs);
          
          toast({
            title: "✅ Transcrição Completa",
            description: `${data.speakerCount} voz${data.speakerCount > 1 ? 'es' : ''} identificada${data.speakerCount > 1 ? 's' : ''}!`,
          });
        } else {
          console.warn('⚠️ Nenhum segmento retornado da diarização');
        }
      } catch (error) {
        console.error('❌ Erro ao processar diarização:', error);
        toast({
          title: "Erro na Transcrição",
          description: "Não foi possível processar a transcrição completa",
          variant: "destructive"
        });
      } finally {
        setIsProcessingTranscript(false);
      }
    }
    
    // Show exit modal if we have any data
    if (transcriptionMessages.length > 0 || audioUrl) {
      console.log('✅ Abrindo modal de saída com dados');
      setShowExitModal(true);
    } else {
      console.log('ℹ️ Nenhum dado de transcrição, saindo direto');
      handleDisconnected();
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground">Conectando à sala...</p>
        </div>
      </div>
    );
  }

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

  return (
    <>
      {showPreJoin ? (
        <ZoomPreJoin 
          roomName={roomName}
          participantName={participantName}
          onSubmit={handlePreJoinSubmit}
          onCancel={onLeave}
        />
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

              <div className="h-screen w-full flex flex-col bg-background">
                {/* Header Clean - Light Theme */}
                <div className="bg-background px-6 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-foreground font-medium">{roomName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowShareModal(true)}
                      size="sm"
                      variant="outline"
                      className="h-8"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-2" />
                      Convidar
                    </Button>
                    <div className="text-xs text-muted-foreground ml-2">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Main content area - no overlap */}
                <div className="flex-1 flex overflow-hidden bg-background">
                  {/* Video Grid Area */}
                  <div className={cn(
                    "flex-1 flex items-center justify-center p-4 transition-all duration-300",
                    (activeTab === 'chat' || activeTab === 'participants') && "mr-80"
                  )}>
                    <div className="w-full h-full max-w-5xl max-h-[calc(100vh-180px)]">
                      <ZoomParticipantGrid />
                    </div>
                  </div>

                  {/* Sidebar - Light Theme */}
                  {(activeTab === 'chat' || activeTab === 'participants') && (
                    <div className="w-80 bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
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

                {/* Bottom Controls Bar - Clean, No Shadow, No Overlap */}
                <div className="bg-background border-t border-border px-6 py-3">
                  <MeetingControls
                    ref={meetingControlsRef}
                    onToggleChat={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
                    onToggleParticipants={() => setActiveTab(activeTab === 'participants' ? null : 'participants')}
                    onShareMeeting={() => setShowShareModal(true)}
                    onLeave={handleLeaveClick}
                    onSettingsClick={() => setShowDeviceSettings(true)}
                    isChatOpen={activeTab === 'chat'}
                    isParticipantsOpen={activeTab === 'participants'}
                    roomCode={roomName}
                    companyId={companyId}
                    onToggleTranscription={() => {
                      setShowTranscriptionModal(true);
                      if (!isTranscribing) {
                        setIsTranscribing(true);
                      }
                    }}
                    onTranscriptionMessage={(msg) => setTranscriptionMessages(prev => [...prev, msg])}
                  />
                </div>
              </div>
              
              {/* Device Settings Modal */}
              <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
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
      ) : (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-foreground">Entrando na reunião...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleLiveKitRoom;
