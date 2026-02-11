import React, { useState, useEffect } from 'react';
import { useParticipants, useLocalParticipant, useRoomContext, useTracks, VideoTrack } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, MessageSquare, Users, 
  FileText, Monitor, MonitorOff, X, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  onToggleRecording: () => void;
  isRecording: boolean;
}

const MobileMeetingLayout: React.FC<MobileMeetingLayoutProps> = ({
  roomName,
  onLeave,
  onToggleRecording,
  isRecording,
}) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'transcription'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([]);
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);

  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { toast } = useToast();

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);

  const getParticipantName = (participant: Participant) => {
    return participant.name || participant.identity || 'Participante';
  };

  const getParticipantInitial = (participant: Participant) => {
    return getParticipantName(participant).charAt(0).toUpperCase();
  };

  const isMuted = (participant: Participant) => {
    return !participant.isMicrophoneEnabled;
  };

  // Listen for chat messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            sender: participant?.name || 'Participante',
            text: data.message
          }]);
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => { room.off('dataReceived', handleDataReceived); };
  }, [room]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const enabled = !isAudioEnabled;
    await localParticipant.setMicrophoneEnabled(enabled);
    setIsAudioEnabled(enabled);
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    const enabled = !isVideoEnabled;
    await localParticipant.setCameraEnabled(enabled);
    setIsVideoEnabled(enabled);
  };

  const handleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      const isSharing = localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(!isSharing);
      setIsScreenSharing(!isSharing);
      toast({ title: isSharing ? 'Compartilhamento encerrado' : 'Compartilhando tela' });
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
      toast({ title: 'Erro ao compartilhar tela', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && localParticipant) {
      const messageData = { type: 'chat', message: inputMessage.trim() };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      await localParticipant.publishData(data, { reliable: true });

      setMessages(prev => [...prev, { sender: 'Você', text: inputMessage.trim() }]);
      setInputMessage('');
    }
  };

  // Render a single participant tile
  const renderParticipantTile = (participant: Participant, className?: string) => {
    const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
    
    return (
      <div key={participant.identity} className={cn("relative bg-[#1a1a1a] rounded-xl overflow-hidden", className)}>
        {cameraTrack ? (
          <VideoTrack
            trackRef={{ participant, source: Track.Source.Camera, publication: cameraTrack }}
            className="w-full h-full object-cover"
            style={{ backgroundColor: '#1a1a1a' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
            <div className="w-16 h-16 rounded-full bg-[#3600FF] flex items-center justify-center text-white text-xl font-semibold">
              {getParticipantInitial(participant)}
            </div>
          </div>
        )}
        
        {/* Name badge */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg max-w-full">
            <span className="text-xs text-white font-medium truncate">
              {getParticipantName(participant)}
            </span>
            {isMuted(participant) && (
              <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Grid layout for participants
  const renderVideoGrid = () => {
    const count = allParticipants.length;

    if (count === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-white/40 text-sm">Aguardando participantes...</p>
        </div>
      );
    }

    if (count === 1) {
      return (
        <div className="h-full p-2">
          {renderParticipantTile(allParticipants[0], "h-full w-full")}
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="h-full flex flex-col gap-1.5 p-2">
          {allParticipants.map(p => renderParticipantTile(p, "flex-1 min-h-0"))}
        </div>
      );
    }

    // 3-4 participants: 2x2 grid
    if (count <= 4) {
      return (
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-1.5 p-2">
          {allParticipants.map(p => renderParticipantTile(p, "min-h-0"))}
        </div>
      );
    }

    // 5+ participants: scrollable 2-column grid
    return (
      <div className="h-full overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5" style={{ gridAutoRows: '45vw' }}>
          {allParticipants.map(p => renderParticipantTile(p))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d0d]">
      {/* Header - minimal */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-medium">REC</span>
            </div>
          )}
          <span className="text-xs text-white/40 font-mono">{roomName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/40">{allParticipants.length}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 min-h-0 relative">
        {screenShareTrack && screenShareTrack.publication ? (
          <div className="h-full flex flex-col gap-1.5 p-2">
            <div className="flex-1 min-h-0 bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <VideoTrack
                trackRef={{
                  participant: screenShareTrack.participant,
                  source: Track.Source.ScreenShare,
                  publication: screenShareTrack.publication
                }}
                className="w-full h-full object-contain"
              />
            </div>
            {/* Participants strip */}
            <div className="flex-shrink-0 h-20 overflow-x-auto">
              <div className="flex gap-1.5 h-full">
                {allParticipants.map(p => (
                  <div key={p.identity} className="flex-shrink-0 w-28 h-full">
                    {renderParticipantTile(p, "h-full w-full")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          renderVideoGrid()
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-[#0d0d0d] pb-[env(safe-area-inset-bottom,8px)] pt-2 px-3">
        <div className="flex items-center justify-center gap-2.5 max-w-sm mx-auto">
          <Button
            onClick={toggleMic}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 transition-colors",
              isAudioEnabled 
                ? "bg-white/10 hover:bg-white/20 text-white" 
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={toggleCamera}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 transition-colors",
              isVideoEnabled 
                ? "bg-white/10 hover:bg-white/20 text-white" 
                : "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {isVideoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleScreenShare}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 transition-colors",
              isScreenSharing 
                ? "bg-[#3600FF] hover:bg-[#4510FF] text-white" 
                : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>

          <Button
            onClick={() => setShowSidebar(!showSidebar)}
            size="icon"
            className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Button
            onClick={onToggleRecording}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full border-0 transition-colors",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            {isRecording ? (
              <div className="w-3 h-3 rounded-sm bg-white" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-white" />
            )}
          </Button>

          <Button
            onClick={onLeave}
            size="icon"
            className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Drawer - slides from bottom on mobile */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed left-0 right-0 bottom-0 max-h-[70vh] bg-[#141414] z-[70] rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Tab header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex gap-1.5">
                {[
                  { key: 'chat' as const, icon: MessageSquare, label: 'Chat' },
                  { key: 'participants' as const, icon: Users, label: `(${allParticipants.length})` },
                  { key: 'transcription' as const, icon: FileText, label: 'IA' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      activeTab === tab.key 
                        ? "bg-[#3600FF] text-white" 
                        : "bg-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
              {activeTab === 'chat' && (
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-white/30 text-sm py-8">Nenhuma mensagem</p>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className="p-2.5 bg-white/5 rounded-lg">
                        <span className="text-xs font-medium text-white/70">{msg.sender}</span>
                        <p className="text-sm text-white/90 mt-0.5">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'participants' && (
                <div className="space-y-1.5">
                  {allParticipants.map(participant => (
                    <div key={participant.identity} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-[#3600FF] flex items-center justify-center text-white text-sm font-semibold">
                        {getParticipantInitial(participant)}
                      </div>
                      <span className="flex-1 text-sm text-white font-medium">{getParticipantName(participant)}</span>
                      {isMuted(participant) && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'transcription' && (
                <div className="space-y-2">
                  {transcriptionMessages.length === 0 ? (
                    <p className="text-center text-white/30 text-sm py-8">Nenhuma transcrição disponível</p>
                  ) : (
                    transcriptionMessages.map((msg, i) => (
                      <div key={i} className="p-2.5 bg-white/5 rounded-lg">
                        <span className="text-xs font-medium text-white/70">{msg.speaker || 'Participante'}</span>
                        <p className="text-sm text-white/90 mt-0.5">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Chat input */}
            {activeTab === 'chat' && (
              <div className="px-4 py-3 border-t border-white/5 pb-[env(safe-area-inset-bottom,12px)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Mensagem..."
                    className="flex-1 px-3 py-2 bg-white/5 text-white text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3600FF] placeholder-white/30"
                  />
                  <Button onClick={handleSendMessage} size="icon" className="h-9 w-9 rounded-xl bg-[#3600FF] hover:bg-[#4510FF] border-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MobileMeetingLayout;
