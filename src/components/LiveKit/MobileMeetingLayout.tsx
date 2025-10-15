import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, X, Send, Mic, MicOff, Video, VideoOff, Monitor, Phone, Share2, FileText, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ResizableVideoTile from './ResizableVideoTile';
import { useTracks, TrackReference } from '@livekit/components-react';
import { Track } from 'livekit-client';
import logoEllosuit from '@/assets/logoellosuit.png';
import '@/styles/mobile-meeting-improved.css';

interface MobileMeetingLayoutProps {
  roomName: string;
  onLeave: () => void;
  onShareMeeting: () => void;
}

const MobileMeetingLayout: React.FC<MobileMeetingLayoutProps> = ({
  roomName,
  onLeave,
  onShareMeeting
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'participants' | 'transcription'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState('00:00');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    time: string;
    userId?: string;
  }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { user } = useAuth();
  const { toast } = useToast();

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);
  const hasScreenShare = screenShareTracks.length > 0;

  // Meeting duration timer
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setMeetingDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for chat messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));
      
      if (data.type === 'chat') {
        const newMessage = {
          id: Date.now().toString(),
          sender: participant?.name || 'Participante',
          message: data.message,
          time: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          userId: participant?.identity
        };
        
        setMessages(prev => [...prev, newMessage]);
        if (!sidebarOpen || sidebarTab !== 'chat') {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    room.on('dataReceived', handleDataReceived);
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, sidebarOpen, sidebarTab]);

  const toggleMic = async () => {
    if (localParticipant) {
      const enabled = !micEnabled;
      await localParticipant.setMicrophoneEnabled(enabled);
      setMicEnabled(enabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = !cameraEnabled;
      await localParticipant.setCameraEnabled(enabled);
      setCameraEnabled(enabled);
    }
  };

  const handleScreenShare = async () => {
    if (localParticipant) {
      try {
        if (isScreenSharing) {
          await localParticipant.setScreenShareEnabled(false);
          setIsScreenSharing(false);
        } else {
          await localParticipant.setScreenShareEnabled(true);
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && localParticipant) {
      const messageData = {
        type: 'chat',
        message: inputMessage.trim(),
        sender: localParticipant.name || user?.user_metadata?.full_name || 'Você',
        timestamp: Date.now()
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      await localParticipant.publishData(data, { reliable: true });

      const newMessage = {
        id: Date.now().toString(),
        sender: 'Você',
        message: inputMessage.trim(),
        time: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        userId: localParticipant.identity
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    }
  };

  const openSidebar = (tab: 'chat' | 'participants' | 'transcription') => {
    setSidebarTab(tab);
    setSidebarOpen(true);
    if (tab === 'chat') {
      setUnreadCount(0);
    }
  };

  return (
    <div className="mobile-meeting-container">
      {/* Clean Header - Dark Theme */}
      <div className="mobile-meeting-header">
        <div className="flex items-center gap-3">
          <img 
            src={logoEllosuit} 
            alt="Ellosuit Meeting" 
            className="mobile-meeting-header-logo"
          />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="mobile-meeting-time">{meetingDuration}</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/10"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Grid - Adaptive Layout */}
      <div className="mobile-video-grid">
        {hasScreenShare ? (
          <div className="mobile-screenshare-layout">
            <div className="mobile-screenshare-main">
              {screenShareTracks.map((trackRef: TrackReference, index: number) => (
                <ResizableVideoTile
                  key={`screenshare-${trackRef.participant.identity}-${index}`}
                  trackRef={trackRef}
                  isScreenShare={true}
                  defaultWidth={window.innerWidth - 32}
                  defaultHeight={window.innerHeight * 0.5}
                />
              ))}
            </div>
            <div className="mobile-participants-strip">
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div key={`camera-strip-${trackRef.participant.identity}-${index}`} className="mobile-video-tile">
                  <ResizableVideoTile
                    trackRef={trackRef}
                    isScreenShare={false}
                    defaultWidth={120}
                    defaultHeight={90}
                  />
                  <div className="mobile-participant-name">
                    {trackRef.participant.name || `Participante ${trackRef.participant.identity.slice(-4)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div 
            className="grid gap-2 p-2 h-full"
            style={{
              gridTemplateColumns: cameraTracks.length === 1 
                ? '1fr'
                : cameraTracks.length === 2
                  ? '1fr'
                  : 'repeat(2, 1fr)',
              gridTemplateRows: cameraTracks.length <= 2 
                ? 'repeat(auto-fit, minmax(0, 1fr))'
                : 'auto'
            }}
          >
            {cameraTracks.map((trackRef: TrackReference, index: number) => (
              <div key={`camera-${trackRef.participant.identity}-${index}`} className="mobile-video-tile">
                <ResizableVideoTile
                  trackRef={trackRef}
                  isScreenShare={false}
                  defaultWidth={window.innerWidth / (cameraTracks.length > 2 ? 2 : 1) - 24}
                  defaultHeight={(window.innerHeight - 200) / Math.ceil(cameraTracks.length / 2)}
                />
                <div className="mobile-participant-name">
                  {trackRef.participant.name || `Participante ${trackRef.participant.identity.slice(-4)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Buttons - Clean Design */}
      <div className="mobile-fab-container">
        <button 
          onClick={() => openSidebar('chat')}
          className="mobile-fab"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="mobile-fab-badge">{unreadCount}</div>
          )}
        </button>

        <button 
          onClick={() => openSidebar('participants')}
          className="mobile-fab"
        >
          <Users className="h-5 w-5" />
          <div className="mobile-fab-badge">{participants.length}</div>
        </button>

        <button 
          onClick={() => openSidebar('transcription')}
          className="mobile-fab"
        >
          <FileText className="h-5 w-5" />
        </button>
      </div>

      {/* Clean Control Bar - Bottom */}
      <div className="mobile-controls-bar">
        <div className="mobile-controls-grid">
          <button
            onClick={toggleMic}
            className={cn(
              "mobile-control-btn",
              micEnabled ? "active" : "danger"
            )}
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={cn(
              "mobile-control-btn",
              cameraEnabled ? "active" : "danger"
            )}
          >
            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          <button
            onClick={handleScreenShare}
            className={cn(
              "mobile-control-btn",
              isScreenSharing && "active"
            )}
          >
            <Monitor className="h-5 w-5" />
          </button>

          <button
            onClick={onShareMeeting}
            className="mobile-control-btn active"
          >
            <Share2 className="h-5 w-5" />
          </button>

          <button
            onClick={onLeave}
            className="mobile-control-btn danger"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </button>
        </div>
      </div>

      {/* Sidebar Modal - Sheet Component */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setSidebarTab('chat')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  sidebarTab === 'chat'
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setSidebarTab('participants')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  sidebarTab === 'participants'
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Participantes ({participants.length})
              </button>
              <button
                onClick={() => setSidebarTab('transcription')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  sidebarTab === 'transcription'
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Transcrição
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {msg.sender.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">
                                {msg.sender}
                              </span>
                              <span className="text-xs text-gray-500">
                                {msg.time}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg break-words">
                              {msg.message}
                            </p>
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma mensagem ainda</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        size="icon"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {sidebarTab === 'participants' && (
                <ScrollArea className="h-full p-4">
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div
                        key={participant.identity}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                          {(participant.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {participant.name || `Participante ${participant.identity.slice(-4)}`}
                            {participant.identity === localParticipant?.identity && ' (Você)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {participant.isMicrophoneEnabled === false && (
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                              <MicOff className="w-3 h-3 text-red-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {sidebarTab === 'transcription' && (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <div className="text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Transcrição em tempo real</p>
                    <p className="text-xs mt-1">Em breve disponível</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileMeetingLayout;