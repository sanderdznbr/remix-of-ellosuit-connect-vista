import React, { useState, useEffect, useRef } from 'react';
import { useParticipants, useLocalParticipant, useRoomContext, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, MessageSquare, Users, 
  FileText, Share2, Monitor, MonitorOff, X, ChevronLeft, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { LiveKitAudioCapture } from './LiveKitAudioCapture';
import DeviceSettingsModal from './DeviceSettingsModal';
import logoEllo from '@/assets/logoellosuit.png';
import ResizableVideoTile from './ResizableVideoTile';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { TrackReference } from '@livekit/components-react';
import '@/styles/mobile-meeting-improved.css';

interface TranscriptionMessage {
  text: string;
  is_final: boolean;
  timestamp: string;
  speaker?: string;
}

interface MobileMeetingLayoutProps {
  roomName: string;
  onLeave: () => void;
  onShareMeeting?: () => void;
}

const MobileMeetingLayout: React.FC<MobileMeetingLayoutProps> = ({
  roomName,
  onLeave,
  onShareMeeting
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'transcription'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    time: string;
    userId?: string;
  }>>([]);
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

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
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      }
    };

    room.on('dataReceived', handleDataReceived);
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const enabled = !isMicOn;
    await localParticipant.setMicrophoneEnabled(enabled);
    setIsMicOn(enabled);
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    const enabled = !isCameraOn;
    await localParticipant.setCameraEnabled(enabled);
    setIsCameraOn(enabled);
  };

  const handleScreenShare = async () => {
    if (!localParticipant) return;

    try {
      const isSharing = localParticipant.isScreenShareEnabled;
      
      if (isSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast({ title: 'Compartilhamento encerrado' });
      } else {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        toast({ title: 'Compartilhando tela' });
      }
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
      toast({
        title: 'Erro ao compartilhar tela',
        description: 'Verifique as permissões do navegador',
        variant: 'destructive'
      });
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
    setActiveTab(tab);
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleTranscriptionUpdate = (message: TranscriptionMessage) => {
    setTranscriptionMessages(prev => {
      if (message.is_final) {
        return [...prev, message];
      }
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && !lastMessage.is_final) {
        return [...prev.slice(0, -1), message];
      }
      return [...prev, message];
    });
  };

  // Swipe gesture handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isSidebarOpen) {
        touchStartX.current = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSidebarOpen) return;
      
      const touchX = e.touches[0].clientX;
      const diff = touchX - touchStartX.current;
      
      if (diff > 100) {
        closeSidebar();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isSidebarOpen]);

  return (
    <div className="mobile-meeting-container">
      {/* Header */}
      <div className="mobile-meeting-header">
        <img 
          src={logoEllo}
          alt="ElloSuit Meeting" 
          className="mobile-meeting-header-logo"
        />
      </div>

      {/* Video Grid */}
      <div className="mobile-video-grid">
        {hasScreenShare ? (
          <div className="mobile-screenshare-layout">
            <div className="mobile-screenshare-main">
              {screenShareTracks.map((trackRef: TrackReference, index: number) => (
                <div key={`screenshare-${trackRef.participant.identity}-${index}`} className="w-full h-full">
                  <ResizableVideoTile
                    trackRef={trackRef}
                    isScreenShare={true}
                    defaultWidth={window.innerWidth - 16}
                    defaultHeight={window.innerHeight * 0.6}
                  />
                </div>
              ))}
            </div>
            <div className="mobile-participants-strip">
              {cameraTracks.map((trackRef: TrackReference, index: number) => (
                <div 
                  key={`camera-strip-${trackRef.participant.identity}-${index}`} 
                  className="mobile-video-tile"
                >
                  <ResizableVideoTile
                    trackRef={trackRef}
                    isScreenShare={false}
                    defaultWidth={120}
                    defaultHeight={90}
                  />
                  <div className="mobile-participant-name">
                    {trackRef.participant.name || `P${trackRef.participant.identity.slice(-4)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          cameraTracks.map((trackRef: TrackReference, index: number) => (
            <div 
              key={`camera-${trackRef.participant.identity}-${index}`} 
              className="mobile-video-tile"
            >
              <ResizableVideoTile
                trackRef={trackRef}
                isScreenShare={false}
                defaultWidth={window.innerWidth - 32}
                defaultHeight={window.innerHeight * 0.65}
              />
              <div className="mobile-participant-name">
                {trackRef.participant.name || `P${trackRef.participant.identity.slice(-4)}`}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Controls Bar with Horizontal Scroll */}
      <div className="mobile-controls-bar">
        <div className="mobile-controls-scroll">
          <button
            onClick={toggleMic}
            className={`mobile-control-btn ${isMicOn ? 'active' : ''}`}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={toggleCamera}
            className={`mobile-control-btn ${isCameraOn ? 'active' : ''}`}
          >
            {isCameraOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={handleScreenShare}
            className={`mobile-control-btn ${isScreenSharing ? 'active' : ''}`}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <button
            onClick={() => openSidebar('chat')}
            className="mobile-control-btn"
          >
            <MessageSquare size={20} />
          </button>

          <button
            onClick={() => openSidebar('participants')}
            className="mobile-control-btn"
          >
            <Users size={20} />
          </button>

          <button
            onClick={() => openSidebar('transcription')}
            className="mobile-control-btn"
          >
            <FileText size={20} />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="mobile-control-btn"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => onShareMeeting?.()}
            className="mobile-control-btn"
          >
            <Share2 size={20} />
          </button>

          <button
            onClick={onLeave}
            className="mobile-control-btn danger"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={cn("mobile-sidebar-overlay", isSidebarOpen && "visible")}
        onClick={closeSidebar}
        style={{ zIndex: 199 }}
      />

      {/* Sidebar Sheet */}
      <div 
        ref={sidebarRef}
        className={cn("mobile-sidebar-sheet", isSidebarOpen && "open")}
        style={{ zIndex: 200 }}
      >
        <div className="mobile-modal-header">
          <h3 className="text-lg font-semibold text-white">
            {activeTab === 'chat' && 'Chat'}
            {activeTab === 'participants' && 'Participantes'}
            {activeTab === 'transcription' && 'Transcrição'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mobile-modal-content">
          {activeTab === 'chat' && (
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
                          <span className="text-xs font-medium text-white">
                            {msg.sender}
                          </span>
                          <span className="text-xs text-white/50">
                            {msg.time}
                          </span>
                        </div>
                        <p className="text-sm text-white/90 bg-white/5 px-3 py-2 rounded-lg break-words">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-white/50">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma mensagem ainda</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="mobile-modal-footer">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    size="icon"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.identity}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                      {(participant.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {participant.name || `Participante ${participant.identity.slice(-4)}`}
                        {participant.identity === localParticipant?.identity && ' (Você)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {participant.isMicrophoneEnabled === false && (
                        <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                          <MicOff className="w-3 h-3 text-red-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {activeTab === 'transcription' && (
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {transcriptionMessages.filter(m => m.is_final).map((msg, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary">
                        {msg.speaker || 'Participante'}
                      </span>
                      <span className="text-xs text-white/40">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-white/90">{msg.text}</p>
                  </div>
                ))}
                {transcriptionMessages.filter(m => m.is_final).length === 0 && (
                  <div className="text-center py-12 text-white/50">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aguardando transcrição...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* LiveKit Audio Capture for Transcription */}
      <LiveKitAudioCapture 
        isActive={true}
        roomName={roomName}
        onTranscriptionUpdate={handleTranscriptionUpdate} 
      />

      {/* Device Settings Modal */}
      <DeviceSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default MobileMeetingLayout;
