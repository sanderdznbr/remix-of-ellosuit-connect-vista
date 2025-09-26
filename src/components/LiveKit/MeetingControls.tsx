import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Phone,
  Circle,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLocalParticipant,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MeetingControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onShareMeeting: () => void;
  onLeave: () => void;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  roomCode: string;
  companyId: string;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  onToggleChat,
  onToggleParticipants,
  onShareMeeting,
  onLeave,
  isChatOpen,
  isParticipantsOpen,
  roomCode,
  companyId
}) => {
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string>('');
  const [livekitRecordingId, setLivekitRecordingId] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionWs, setTranscriptionWs] = useState<WebSocket | null>(null);

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
          // Stop screen sharing
          await localParticipant.setScreenShareEnabled(false);
          setIsScreenSharing(false);
        } else {
          // Start screen sharing
          await localParticipant.setScreenShareEnabled(true);
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
      }
    }
  };

  const handleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        const { error } = await supabase.functions.invoke('meeting-recording', {
          body: {
            action: 'stop',
            recordingId,
            livekitRecordingId
          }
        });

        if (error) throw error;

        setIsRecording(false);
        setRecordingId('');
        setLivekitRecordingId('');
        
        // Stop transcription if active
        if (isTranscribing && transcriptionWs) {
          transcriptionWs.send(JSON.stringify({ type: 'stop_transcription' }));
          transcriptionWs.close();
          setTranscriptionWs(null);
          setIsTranscribing(false);
        }
        
        toast({
          title: "Gravação finalizada",
          description: "Sua reunião foi gravada com sucesso! Confira 'Ver Gravações' para baixar sua reunião ou assisti-la.",
          duration: 5000,
        });
      } else {
        // Start recording
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('User not authenticated');

        const { data, error } = await supabase.functions.invoke('meeting-recording', {
          body: {
            action: 'start',
            roomName: roomCode,
            userId: user.user.id,
            companyId
          }
        });

        if (error) throw error;

        setIsRecording(true);
        setRecordingId(data.recording_id);
        setLivekitRecordingId(data.livekit_recording_id);
        
        // Auto-start transcription when recording starts
        startTranscription();
        
        toast({
          title: "Gravação iniciada",
          description: "A reunião está sendo gravada e transcrita em tempo real",
        });
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Erro na gravação",
        description: "Não foi possível iniciar/parar a gravação",
        variant: "destructive"
      });
    }
  };

  const startTranscription = () => {
    try {
      const wsUrl = `wss://jwddiyuezqrpuakazvgg.functions.supabase.co/functions/v1/realtime-transcription`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to transcription service');
        ws.send(JSON.stringify({
          type: 'start_transcription',
          roomId: roomCode
        }));
        setIsTranscribing(true);
        setTranscriptionWs(ws);
      };

      ws.onerror = (error) => {
        console.error('Transcription WebSocket error:', error);
        toast({
          title: "Erro na transcrição",
          description: "Não foi possível conectar ao serviço de transcrição",
          variant: "destructive"
        });
      };

      ws.onclose = () => {
        setTranscriptionWs(null);
        setIsTranscribing(false);
      };
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  // Auto-stop recording when component unmounts (user leaves meeting)
  React.useEffect(() => {
    return () => {
      if (isRecording) {
        // Auto-stop recording when leaving
        supabase.functions.invoke('meeting-recording', {
          body: {
            action: 'stop',
            recordingId,
            livekitRecordingId
          }
        });
      }
      if (transcriptionWs) {
        transcriptionWs.send(JSON.stringify({ type: 'stop_transcription' }));
        transcriptionWs.close();
      }
    };
  }, [isRecording, recordingId, livekitRecordingId, transcriptionWs]);

  return (
    <div className="meeting-controls">
      <div className="meeting-controls-container">
        {/* Left side - Meeting info */}
        <div className="meeting-controls-left">
          <div className="flex items-center gap-2">
            <div className={cn(
              "recording-indicator",
              isRecording && "recording-active"
            )} />
            <span className="text-sm text-gray-700 font-medium">
              {isRecording ? "Gravando" : "Conectado"}
            </span>
          </div>
        </div>

        {/* Center - Main controls */}
        <div className="meeting-controls-center">
          {/* Audio Control */}
          <Button
            onClick={toggleMic}
            className={cn(
              "control-button",
              !micEnabled && "control-button-muted"
            )}
            size="lg"
          >
            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={toggleCamera}
            className={cn(
              "control-button",
              !cameraEnabled && "control-button-muted"
            )}
            size="lg"
          >
            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={handleScreenShare}
            className={cn(
              "control-button",
              isScreenSharing && "control-button-active"
            )}
            size="lg"
          >
            <Monitor className="h-5 w-5" />
          </Button>

          {/* Recording Control */}
          <Button
            onClick={handleRecording}
            className={cn(
              "control-button",
              isRecording && "control-button-recording"
            )}
            size="lg"
          >
            {isRecording ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </Button>

          {/* End Call */}
          <Button
            onClick={onLeave}
            className="control-button control-button-leave"
            size="lg"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>

        {/* Right side - Empty for mobile responsiveness */}
        <div className="meeting-controls-right">
        </div>
      </div>
    </div>
  );
};

export default MeetingControls;
