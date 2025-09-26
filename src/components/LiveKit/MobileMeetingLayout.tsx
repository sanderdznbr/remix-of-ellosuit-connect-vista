import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, X, Send, Mic, MicOff, Video, VideoOff, Monitor, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { useAuth } from '@/hooks/useAuth';
import ResizableVideoTile from './ResizableVideoTile';
import { useTracks, TrackReference } from '@livekit/components-react';
import { Track } from 'livekit-client';

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
      {/* Mobile Header */}
      <div className="mobile-meeting-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Reunião ELLOSUIT</h2>
            <p className="text-xs text-gray-300">{roomName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onShareMeeting}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1"
          >
            <Share2 className="h-3 w-3 mr-1" />
            Convidar
          </Button>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300">Online</span>
          </div>
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

        {/* Participants Grid */}
        <div className={cn(
          "mobile-participants-grid",
          hasScreenShare ? "with-screenshare" : "full-screen"
        )}>
          {cameraTracks.map((trackRef: TrackReference, index: number) => (
            <ResizableVideoTile
              key={`camera-mobile-${trackRef.participant.identity}-${index}`}
              trackRef={trackRef}
              isScreenShare={false}
              defaultWidth={hasScreenShare ? 160 : 170}
              defaultHeight={hasScreenShare ? 120 : 128}
            />
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

      {/* Mobile Controls */}
      <div className="mobile-controls">
        <Button
          onClick={toggleMic}
          className={cn(
            "mobile-control-btn",
            !micEnabled && "muted"
          )}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleCamera}
          className={cn(
            "mobile-control-btn",
            !cameraEnabled && "muted"
          )}
        >
          {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          onClick={handleScreenShare}
          className={cn(
            "mobile-control-btn",
            isScreenSharing && "active"
          )}
        >
          <Monitor className="h-5 w-5" />
        </Button>

        <Button
          onClick={onLeave}
          className="mobile-control-btn leave"
        >
          <Phone className="h-5 w-5 rotate-[135deg]" />
        </Button>
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
                      {participant.isCameraEnabled === false && (
                        <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                          <VideoOff className="w-3 h-3 text-white" />
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
    </div>
  );
};

export default MobileMeetingLayout;