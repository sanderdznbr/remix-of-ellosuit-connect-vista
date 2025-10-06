import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  TrackReference,
} from '@livekit/components-react';
import { Track, Room, RoomEvent } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, RefreshCw, Video, VideoOff, Mic, MicOff, Users, MessageSquare, Share2, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import MeetingControls from './MeetingControls';
import MeetingSidebar from './MeetingSidebar';
import ShareMeetingModal from './ShareMeetingModal';
import { MeetingExitModal } from './MeetingExitModal';
import ZoomPreJoin from './ZoomPreJoin';
import ZoomParticipantGrid from './ZoomParticipantGrid';
import MobileMeetingLayout from './MobileMeetingLayout';
import { RoomContextCapture } from './RoomContextCapture';
import { LiveKitTranscription } from './LiveKitTranscription';
import logoEllo from '@/assets/logoellosuit.png';
import DeviceSettingsModal from './DeviceSettingsModal';
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
  const [isChatOpen, setIsChatOpen] = useState(true); // Auto-open chat
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [transcriptionMessages, setTranscriptionMessages] = useState<Array<{text: string, is_final: boolean, timestamp: string, speaker?: string}>>([]);
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string>('');
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const meetingControlsRef = useRef<any>(null);

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
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'participants' | 'transcription'>('chat');
  const { user } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();
  const roomRef = useRef<Room | null>(null);

  // Enhanced connection management with better visibility handling
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - clear any pending reconnection
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        console.log('Page visible - maintaining stable connection');
      } else {
        // Page hidden - but maintain connection
        console.log('Page hidden - connection maintained');
      }
    };

    const handleFocus = () => {
      console.log('Window focused - ensuring connection stability');
    };

    const handleBlur = () => {
      console.log('Window blurred - maintaining connection');
    };

    // Prevent connection drops on various browser events
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
      // Play connection sound
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

  // Don't generate token initially - wait for pre-join
  useEffect(() => {
    setLoading(false); // Just set loading to false, no token generation yet
  }, []);

  const handlePreJoinSubmit = useCallback(async (values: any) => {
    console.log('PreJoin submitted with values:', values);
    setPreJoinChoices(values);
    
    // Generate token with the actual username entered
    const finalUsername = values.username || participantName || 'Convidado';
    console.log('Using final username:', finalUsername);
    await generateToken(finalUsername);
    
    // Hide pre-join immediately after token generation starts
    setShowPreJoin(false);
  }, [generateToken, participantName]);

  const toggleSidebar = (tab: 'chat' | 'participants' | 'transcription') => {
    if (tab === 'chat') {
      setIsChatOpen(!isChatOpen);
      setIsParticipantsOpen(false);
    } else if (tab === 'participants') {
      setIsParticipantsOpen(!isParticipantsOpen);
      setIsChatOpen(false);
    }
    setSidebarTab(tab);
  };

  const handleLeaveClick = async () => {
    console.log('🚪 Sair - transcrições:', transcriptionMessages.length);
    
    // Get saved audio URL
    let audioUrl = '';
    if (meetingControlsRef.current?.getSavedAudioUrl) {
      audioUrl = meetingControlsRef.current.getSavedAudioUrl();
      console.log('🎙️ Áudio:', audioUrl ? 'Sim' : 'Não');
      setSavedAudioUrl(audioUrl);
    }
    
    // Show modal if we have transcriptions or audio
    if (transcriptionMessages.length > 0 || audioUrl) {
      console.log('✅ Abrindo modal de saída');
      
      // If we have audio, show processing state
      if (audioUrl) {
        setIsProcessingTranscript(true);
        
        // Start speaker diarization
        try {
          const { data, error } = await supabase.functions.invoke('speaker-diarization', {
            body: { audioUrl }
          });
          
          if (!error && data) {
            console.log('✅ Diarização completa:', data);
            // Update transcription messages with speaker info if available
            if (data.segments) {
              // Process segments...
            }
          }
        } catch (error) {
          console.error('Erro na diarização:', error);
        } finally {
          setIsProcessingTranscript(false);
        }
      }
      
      setShowExitModal(true);
    } else {
      console.log('❌ Saindo direto');
      handleDisconnected();
    }
  };
  
  const handleDisconnected = useCallback(async () => {
    console.log('Disconnected from room');
    
    // If I'm the host, mark room as inactive
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
    
    // Play disconnection sound
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAzuJzfPJdSgEJnzE8N+MSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqrl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q9bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIyvXEdCgEJnzE8N+NSg0PVqvl7q5bGgtBluL0u2EaAzqIy';
    audio.play().catch(() => {
      // Fallback if audio doesn't play
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
          <p className="text-muted-foreground">Conectando à sala...</p>
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
            <h3 className="text-lg font-semibold mb-2">Erro na Conexão</h3>
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
    <div className="zoom-meeting-layout-light">
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
            // Enhanced connection options - Better handling of page visibility
            adaptiveStream: true,
            disconnectOnPageLeave: false,
            publishDefaults: {
              simulcast: false,
              stopMicTrackOnMute: false,
              videoCodec: 'vp8', // More stable codec
            },
            // Connection management
            reconnectPolicy: {
              nextRetryDelayInMs: (context) => {
                // More aggressive reconnection for better stability
                if (context.elapsedMs < 10_000) {
                  return 1000; // Quick reconnect for short disconnections
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
          
          {/* Real-time Transcription */}
          <LiveKitTranscription
            isActive={isTranscriptionActive}
            onTranscript={(data) => {
              setTranscriptionMessages(prev => [...prev, data]);
            }}
          />
          
          {isMobile ? (
            <MobileMeetingLayout
              roomName={roomName}
              onLeave={onLeave}
              onShareMeeting={() => setShowShareModal(true)}
            />
          ) : (
            <>
              {/* Modern Meeting Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
                <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <img 
                      src={logoEllo} 
                      alt="ELLOSUIT" 
                      className="h-8 w-8 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-white">Reunião ELLOSUIT</span>
                      <span className="text-xs text-white/70">Sala: {roomName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setShowShareModal(true)}
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-white/90 bg-green-500/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span>Conectado</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex h-screen bg-gray-900">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col">
                  {/* Video Grid */}
                  <div className="flex-1 relative">
                    <ZoomParticipantGrid />
                  </div>
                  
                  {/* Bottom Controls Bar */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeviceSettings(true)}
                          className="text-white hover:bg-white/20 backdrop-blur-sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurações
                        </Button>
                      </div>
                      
                      <MeetingControls
                        ref={meetingControlsRef}
                        onToggleChat={() => toggleSidebar('chat')}
                        onToggleParticipants={() => toggleSidebar('participants')}
                        onShareMeeting={() => setShowShareModal(true)}
                        onLeave={handleLeaveClick}
                        isChatOpen={isChatOpen}
                        isParticipantsOpen={isParticipantsOpen}
                        roomCode={roomName}
                        companyId={companyId}
                        onToggleTranscription={() => {
                          toggleSidebar('transcription');
                          setIsTranscriptionActive(true);
                        }}
                        onTranscriptionMessage={(msg) => setTranscriptionMessages(prev => [...prev, msg])}
                      />
                      
                      <div className="w-32" />
                    </div>
                  </div>
                </div>

                {/* Sidebar Overlay */}
                {(isChatOpen || isParticipantsOpen) && (
                  <div className="absolute right-0 top-0 bottom-0 z-30 w-96 bg-background shadow-2xl">
                    <MeetingSidebar
                      isOpen={isChatOpen || isParticipantsOpen}
                      onClose={() => {
                        setIsChatOpen(false);
                        setIsParticipantsOpen(false);
                      }}
                      activeTab={sidebarTab}
                      onTabChange={(tab) => {
                        if (tab === 'chat') {
                          setIsChatOpen(true);
                          setIsParticipantsOpen(false);
                        } else if (tab === 'participants') {
                          setIsParticipantsOpen(true);
                          setIsChatOpen(false);
                        } else if (tab === 'transcription') {
                          setIsChatOpen(false);
                          setIsParticipantsOpen(false);
                        }
                        setSidebarTab(tab);
                      }}
                      roomId={roomName}
                      transcriptionMessages={transcriptionMessages}
                      onTranscriptionMessagesUpdate={setTranscriptionMessages}
                    />
                  </div>
                )}
              </div>
              
              {/* Device Settings Modal */}
              <DeviceSettingsModal
                isOpen={showDeviceSettings}
                onClose={() => setShowDeviceSettings(false)}
              />
              
              {/* Processing Transcript Loading */}
              {isProcessingTranscript && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-background rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                    <div className="relative inline-block mb-6">
                      <Loader2 className="h-16 w-16 text-primary animate-spin" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Processando Transcrição</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Estamos identificando as vozes e gerando a transcrição completa com identificação de participantes...
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span>Isso pode levar alguns segundos</span>
                    </div>
                  </div>
                </div>
              )}
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
            <p className="text-muted-foreground">Entrando na reunião...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleLiveKitRoom;