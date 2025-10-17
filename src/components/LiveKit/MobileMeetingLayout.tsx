import React, { useState, useEffect, useRef } from 'react';
import { useParticipants, useLocalParticipant, useRoomContext, useTracks, VideoTrack } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, 
  PhoneOff, MessageSquare, Users, 
  FileText, Monitor, MonitorOff, X, Settings, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LiveKitAudioCapture } from './LiveKitAudioCapture';
import DeviceSettingsModal from './DeviceSettingsModal';
import { useAuth } from '@/hooks/useAuth';
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
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Array<{
    sender: string;
    text: string;
  }>>([]);
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);

  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const { user } = useAuth();
  const { toast } = useToast();

  // Debug logs para mobile
  console.log('[MobileMeetingLayout] Total de participantes:', allParticipants.length);
  allParticipants.forEach(p => {
    console.log('[MobileMeetingLayout] Participante:', p.identity, 'Nome:', p.name, 'Câmera:', p.isCameraEnabled);
  });

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  const cameraParticipants = allParticipants;
  
  console.log('[MobileMeetingLayout] Participantes na câmera:', cameraParticipants.length);

  // Grid classes
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2';
  };

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
    
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
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
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() && localParticipant) {
      const messageData = {
        type: 'chat',
        message: inputMessage.trim(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      await localParticipant.publishData(data, { reliable: true });

      setMessages(prev => [...prev, {
        sender: 'Você',
        text: inputMessage.trim()
      }]);
      
      setInputMessage('');
    }
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

  return (
    <div className="fixed inset-0 flex flex-col bg-[#101010] overflow-hidden">
      {/* Video Grid - sem header branco */}
      <div className="flex-1 relative pb-20 bg-[#101010]">
        {screenShareTrack ? (
          <div className="h-full flex flex-col p-2 gap-2">
            {/* Screen share - área maior, sem cortar */}
            {screenShareTrack && screenShareTrack.publication && (
              <div 
                className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center"
                style={{ 
                  minHeight: 0
                }}
              >
                <VideoTrack
                  trackRef={{
                    participant: screenShareTrack.participant,
                    source: Track.Source.ScreenShare,
                    publication: screenShareTrack.publication
                  }}
                  className="w-full h-full object-contain"
                  style={{ backgroundColor: '#000' }}
                />
              </div>
            )}

            {/* Participants - strip horizontal fixo na parte inferior */}
            <div className="flex-shrink-0 h-28 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 h-full">
                {cameraParticipants.map((participant) => {
                  const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
                  
                  return (
                    <div
                      key={participant.identity}
                      className="relative flex-shrink-0 w-36 h-full bg-[#1f1f1f] rounded-lg overflow-hidden"
                    >
                      {cameraTrack ? (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <VideoTrack
                            trackRef={{ participant, source: Track.Source.Camera, publication: cameraTrack }}
                            className="w-full h-full object-contain"
                            style={{ backgroundColor: '#000' }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1f1f1f]">
                          <div className="w-12 h-12 rounded-full bg-[#3600FF] flex items-center justify-center text-white font-semibold">
                            {getParticipantInitial(participant)}
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-white bg-black/80 px-2 py-1 rounded truncate">
                        {getParticipantName(participant)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-2 p-2 h-full bg-[#101010]",
            getGridClass(cameraParticipants.length)
          )}>
            {cameraParticipants.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white/60">
                  <p>Aguardando participantes...</p>
                </div>
              </div>
            ) : (
              cameraParticipants.map((participant) => {
                const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
                
                return (
                  <div
                    key={participant.identity}
                    className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center"
                  >
                    {cameraTrack ? (
                      <VideoTrack
                        trackRef={{ participant, source: Track.Source.Camera, publication: cameraTrack }}
                        className="w-full h-full object-contain"
                        style={{ backgroundColor: '#000' }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#3600FF] flex items-center justify-center text-white text-2xl font-semibold">
                        {getParticipantInitial(participant)}
                      </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 px-3 py-2 rounded">
                      <span className="text-sm text-white font-medium truncate">
                        {getParticipantName(participant)}
                      </span>
                      {isMuted(participant) && (
                        <MicOff className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#101010]/95 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex items-center justify-center gap-3 max-w-xl mx-auto">
          <Button
            onClick={toggleMic}
            variant="outline"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full bg-[#2a2a2a] border-white/20 hover:bg-[#3a3a3a] text-white",
              !isAudioEnabled && "bg-red-500 hover:bg-red-600 text-white border-red-500"
            )}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={toggleCamera}
            variant="outline"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full bg-[#2a2a2a] border-white/20 hover:bg-[#3a3a3a] text-white",
              !isVideoEnabled && "bg-red-500 hover:bg-red-600 text-white border-red-500"
            )}
          >
            {isVideoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleScreenShare}
            variant="outline"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full bg-[#2a2a2a] border-white/20 hover:bg-[#3a3a3a] text-white",
              isScreenSharing && "bg-[#3600FF] hover:bg-[#4510FF] text-white border-[#3600FF]"
            )}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          <Button
            onClick={() => setShowSidebar(!showSidebar)}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full relative bg-[#2a2a2a] border-white/20 hover:bg-[#3a3a3a] text-white"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            onClick={onToggleRecording}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-white/20 hover:bg-[#3a3a3a] text-white"
            style={{
              backgroundColor: isRecording ? '#DC2626' : '#2a2a2a',
              borderColor: isRecording ? '#DC2626' : 'rgba(255,255,255,0.2)',
              animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          >
            {isRecording ? (
              <div className="w-3 h-3 rounded-full bg-white" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-white" />
            )}
          </Button>

          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-[#2a2a2a] border-white/20 hover:bg-[#3a3a3a] text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>

          <Button
            onClick={onLeave}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Drawer */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#1a1a1a] z-[70] shadow-2xl transform transition-transform duration-300 ease-out">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === 'chat' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('chat')}
                    className={activeTab === 'chat' ? 'bg-[#3600FF] text-white' : 'bg-[#2a2a2a] text-white border-white/20'}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Button
                    variant={activeTab === 'participants' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('participants')}
                    className={activeTab === 'participants' ? 'bg-[#3600FF] text-white' : 'bg-[#2a2a2a] text-white border-white/20'}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Participantes
                  </Button>
                  <Button
                    variant={activeTab === 'transcription' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('transcription')}
                    className={activeTab === 'transcription' ? 'bg-[#3600FF] text-white' : 'bg-[#2a2a2a] text-white border-white/20'}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    IA
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(false)}
                  className="text-white hover:bg-[#2a2a2a]"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
                {activeTab === 'chat' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">Chat</h3>
                    <div className="space-y-2">
                      {messages.map((msg, i) => (
                        <div key={i} className="p-3 bg-[#2a2a2a] rounded-lg">
                          <div className="font-medium text-sm text-white">{msg.sender}</div>
                          <div className="text-sm text-white/80">{msg.text}</div>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="text-center text-white/40 py-8">
                          Nenhuma mensagem ainda
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">Participantes ({allParticipants.length})</h3>
                    <div className="space-y-2">
                      {allParticipants.map((participant) => (
                        <div
                          key={participant.identity}
                          className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#3600FF] flex items-center justify-center text-white font-semibold">
                            {getParticipantInitial(participant)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-white">{getParticipantName(participant)}</div>
                          </div>
                          {isMuted(participant) && (
                            <MicOff className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'transcription' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">Transcrição</h3>
                    <div className="space-y-2">
                      {transcriptionMessages.map((msg, i) => (
                        <div key={i} className="p-3 bg-[#2a2a2a] rounded-lg">
                          <div className="font-medium text-sm text-white">{msg.speaker || 'Participante'}</div>
                          <div className="text-sm text-white/80">{msg.text}</div>
                        </div>
                      ))}
                      {transcriptionMessages.length === 0 && (
                        <div className="text-center text-white/40 py-8">
                          Nenhuma transcrição disponível
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {activeTab === 'chat' && (
                <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-3 py-2 bg-[#2a2a2a] text-white border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3600FF] placeholder-white/40"
                    />
                    <Button onClick={handleSendMessage} size="icon" className="bg-[#3600FF] hover:bg-[#4510FF]">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Device Settings Modal */}
      <DeviceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Audio Capture */}
      <LiveKitAudioCapture 
        isActive={true}
        roomName={roomName}
        onTranscriptionUpdate={handleTranscriptionUpdate} 
      />
    </div>
  );
};

export default MobileMeetingLayout;
