import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, X, Send, Mic, MicOff, Video, VideoOff, Monitor, Phone, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ResizableVideoTile from './ResizableVideoTile';
import { useTracks, TrackReference } from '@livekit/components-react';
import { Track } from 'livekit-client';
import logoEllosuit from '@/assets/logoellosuit.png';

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
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoScale, setVideoScale] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    time: string;
    userId?: string;
  }>>([]);

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

  return (
    <div className="mobile-meeting-layout">
      {/* Mobile Header - Simplified with centered logo */}
      <div className="mobile-meeting-header bg-white border-b border-gray-200">
        <div className="flex items-center justify-center w-full">
          <img 
            src={logoEllosuit} 
            alt="ELLOSUIT" 
            className="h-10 w-auto object-contain"
          />
        </div>
        
        {/* Zoom Controls - Discrete corner position */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <Button
            onClick={() => setVideoScale(Math.max(0.5, videoScale - 0.1))}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            onClick={() => setVideoScale(Math.min(2, videoScale + 0.1))}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="mobile-video-area">
        {/* Screen Share */}
        {hasScreenShare && (
          <div className="mobile-screenshare">
            {screenShareTracks.map((trackRef: TrackReference, index: number) => (
              <ResizableVideoTile
                key={`screenshare-mobile-${trackRef.participant.identity}-${index}`}
                trackRef={trackRef}
                isScreenShare={true}
                defaultWidth={350}
                defaultHeight={200}
              />
            ))}
          </div>
        )}

        {/* Participants Grid with Zoom - Fixed positioning */}
        <div 
          className={cn(
            "mobile-participants-grid-fixed",
            hasScreenShare ? "with-screenshare" : "full-screen"
          )}
          style={{ transform: `scale(${videoScale})`, transformOrigin: 'center' }}
        >
          {cameraTracks.map((trackRef: TrackReference, index: number) => (
            <div
              key={`camera-mobile-${trackRef.participant.identity}-${index}`}
              className="mobile-participant-card"
            >
              <ResizableVideoTile
                trackRef={trackRef}
                isScreenShare={false}
                defaultWidth={hasScreenShare ? 180 : 200}
                defaultHeight={hasScreenShare ? 135 : 150}
              />
              <div className="mobile-participant-name">
                <p className="text-xs font-medium text-white truncate bg-black/50 px-2 py-1 rounded">
                  {trackRef.participant.name || `Participante ${trackRef.participant.identity.slice(-4)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="mobile-floating-buttons">
        {/* Chat Button */}
        <Button
          onClick={() => setShowChat(true)}
          className={cn(
            "mobile-fab",
            messages.length > 0 && "with-badge"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {messages.length > 0 && (
            <div className="fab-badge">{messages.length}</div>
          )}
        </Button>

        {/* Participants Button */}
        <Button
          onClick={() => setShowParticipants(true)}
          className="mobile-fab"
        >
          <Users className="h-5 w-5" />
          <div className="fab-badge">{participants.length}</div>
        </Button>
      </div>

      {/* Mobile Controls - Updated with Invite Icon */}
      <div className="mobile-controls bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-center gap-6 p-4">
          <Button
            onClick={toggleMic}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg border-2 transition-all duration-200",
              micEnabled 
                ? "bg-primary hover:bg-primary/90 text-white border-primary" 
                : "bg-red-500 hover:bg-red-600 text-white border-red-500"
            )}
          >
            {micEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            onClick={toggleCamera}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg border-2 transition-all duration-200",
              cameraEnabled 
                ? "bg-primary hover:bg-primary/90 text-white border-primary" 
                : "bg-red-500 hover:bg-red-600 text-white border-red-500"
            )}
          >
            {cameraEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          <Button
            onClick={handleScreenShare}
            className={cn(
              "w-14 h-14 rounded-full shadow-lg border-2 transition-all duration-200",
              isScreenSharing 
                ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300"
            )}
          >
            <Monitor className="h-6 w-6" />
          </Button>

          <Button
            onClick={() => setShowInviteModal(true)}
            className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500 shadow-lg transition-all duration-200"
          >
            <Share2 className="h-6 w-6" />
          </Button>

          <Button
            onClick={onLeave}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-500 shadow-lg transition-all duration-200"
          >
            <Phone className="h-6 w-6 rotate-[135deg]" />
          </Button>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="mobile-modal-overlay">
          <div className="mobile-modal chat-modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Chat</h3>
              <Button
                onClick={() => setShowChat(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="modal-content">
              <div className="space-y-3 p-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="chat-message-mobile">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
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
                        <p className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="modal-footer">
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
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={!inputMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <div className="mobile-modal-overlay">
          <div className="mobile-modal participants-modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Participantes ({participants.length})</h3>
              <Button
                onClick={() => setShowParticipants(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="modal-content">
              <div className="space-y-2 p-4">
                {participants.map((participant) => (
                  <div
                    key={participant.identity}
                    className="participant-item-mobile"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(participant.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {participant.name || `Participante ${participant.identity.slice(-4)}`}
                          {participant.identity === localParticipant?.identity && ' (Você)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {participant.isMicrophoneEnabled === false && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <MicOff className="w-3 h-3 text-white" />
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {showInviteModal && (
        <div className="mobile-modal-overlay">
          <div className="mobile-modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Convidar Participantes</h3>
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="modal-content p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link da Reunião
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://www.ellosuit.online/livekit/${roomName}`}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://www.ellosuit.online/livekit/${roomName}`);
                        toast({
                          title: "Link copiado!",
                          description: "O link da reunião foi copiado para a área de transferência",
                          duration: 2000,
                        });
                      }}
                      size="sm"
                      className="px-3"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Compartilhe este link com os participantes para que eles possam entrar na reunião.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMeetingLayout;