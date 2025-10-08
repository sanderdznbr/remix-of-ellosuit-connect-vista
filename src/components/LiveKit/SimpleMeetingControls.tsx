import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Phone,
  MessageSquare,
  Users,
  Settings,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLocalParticipant,
} from '@livekit/components-react';
import { useToast } from '@/hooks/use-toast';

interface SimpleMeetingControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onShareMeeting: () => void;
  onLeave: () => void;
  onSettingsClick: () => void;
  onShowTranscription: () => void;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
}

const SimpleMeetingControls = forwardRef<any, SimpleMeetingControlsProps>(({
  onToggleChat,
  onToggleParticipants,
  onShareMeeting,
  onLeave,
  onSettingsClick,
  onShowTranscription,
  isChatOpen,
  isParticipantsOpen
}, ref) => {
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useImperativeHandle(ref, () => ({}));

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
          await localParticipant.setScreenShareEnabled(true, {
            suppressLocalAudioPlayback: true
          });
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
        toast({
          title: "Erro no compartilhamento",
          description: "Não foi possível compartilhar a tela",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Microphone */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMic}
        className={cn(
          "h-14 w-14 rounded-2xl transition-all",
          micEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 text-white hover:bg-red-600"
        )}
        title={micEnabled ? "Desativar Microfone" : "Ativar Microfone"}
      >
        {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      {/* Camera */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleCamera}
        className={cn(
          "h-14 w-14 rounded-2xl transition-all",
          cameraEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 text-white hover:bg-red-600"
        )}
        title={cameraEnabled ? "Desativar Câmera" : "Ativar Câmera"}
      >
        {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      {/* Screen Share */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleScreenShare}
        className={cn(
          "h-14 w-14 rounded-2xl transition-all",
          isScreenSharing ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white/10 hover:bg-white/20 text-white"
        )}
        title={isScreenSharing ? "Parar Compartilhamento" : "Compartilhar Tela"}
      >
        <Monitor className="h-5 w-5" />
      </Button>

      {/* Transcription */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onShowTranscription}
        className="h-14 w-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
        title="Ver Transcrição"
      >
        <FileText className="h-5 w-5" />
      </Button>

      {/* Chat */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleChat}
        className={cn(
          "h-14 w-14 rounded-2xl transition-all",
          isChatOpen ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white/10 hover:bg-white/20 text-white"
        )}
        title="Chat"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Participants */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleParticipants}
        className={cn(
          "h-14 w-14 rounded-2xl transition-all",
          isParticipantsOpen ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white/10 hover:bg-white/20 text-white"
        )}
        title="Participantes"
      >
        <Users className="h-5 w-5" />
      </Button>

      {/* Settings */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        className="h-14 w-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
        title="Configurações"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {/* Leave */}
      <Button
        onClick={onLeave}
        size="icon"
        className="h-14 w-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-all"
        title="Sair da Reunião"
      >
        <Phone className="h-5 w-5 rotate-[135deg]" />
      </Button>
    </div>
  );
});

SimpleMeetingControls.displayName = 'SimpleMeetingControls';

export default SimpleMeetingControls;
