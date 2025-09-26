import React, { useEffect, useState, useCallback } from 'react';
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
import { Loader2, AlertCircle, RefreshCw, Video, VideoOff, Mic, MicOff, Users, MessageSquare, Share2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import MeetingControls from './MeetingControls';
import MeetingSidebar from './MeetingSidebar';
import ShareMeetingModal from './ShareMeetingModal';
import ZoomPreJoin from './ZoomPreJoin';
import ZoomParticipantGrid from './ZoomParticipantGrid';
import MobileMeetingLayout from './MobileMeetingLayout';
import logoEllo from '@/assets/logoellosuit.png';
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
    await generateToken(values.username || participantName || 'Convidado');
    
    // Only hide pre-join after token is ready
    setTimeout(() => {
      setShowPreJoin(false);
    }, 500);
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

  const handleDisconnected = useCallback(() => {
    console.log('Disconnected from room');
    
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
    
    // Ensure complete disconnection and redirect
    setTimeout(() => {
      onLeave();
    }, 500);
  }, [onLeave, toast]);

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

  // Not ready state
  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Preparando sala...</p>
          <Button onClick={() => generateToken(participantName || 'Convidado')} variant="outline" size="sm">
            Recarregar
          </Button>
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
          <RoomAudioRenderer />
          
          {isMobile ? (
            <MobileMeetingLayout
              roomName={roomName}
              onLeave={onLeave}
              onShareMeeting={() => setShowShareModal(true)}
            />
          ) : (
            <>
              {/* Meeting Header with Logo */}
              <div className="zoom-meeting-header">
                <div className="flex items-center gap-4">
                  <img 
                    src={logoEllo} 
                    alt="ELLOSUIT" 
                    className="zoom-meeting-logo"
                  />
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-gray-800">Reunião ELLOSUIT</span>
                    <span className="text-sm text-gray-500">Sala: {roomName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setShowShareModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Convidar</span>
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Conectado</span>
                  </div>
                </div>
              </div>

              <div className="zoom-meeting-main">
                <div className="zoom-meeting-content">
                  <ZoomParticipantGrid />
                  
                  <MeetingControls
                    onToggleChat={() => toggleSidebar('chat')}
                    onToggleParticipants={() => toggleSidebar('participants')}
                    onShareMeeting={() => setShowShareModal(true)}
                    onLeave={onLeave}
                    isChatOpen={isChatOpen}
                    isParticipantsOpen={isParticipantsOpen}
                    roomCode={roomName}
                    companyId={companyId}
                  />
                </div>

                {/* Fixed Sidebar - Always Show Chat */}
                <div className="zoom-meeting-sidebar-container">
                  <MeetingSidebar
                    isOpen={true}
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
                      }
                      setSidebarTab(tab);
                    }}
                    roomId={roomName}
                  />
                </div>
              </div>
            </>
          )}

          <ShareMeetingModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            roomName={roomName}
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