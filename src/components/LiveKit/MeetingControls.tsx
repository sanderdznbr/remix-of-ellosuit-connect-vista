import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Users, 
  MessageSquare, 
  Settings, 
  Phone,
  Share2,
  Shield,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLocalParticipant,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface MeetingControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onShareMeeting: () => void;
  onLeave: () => void;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  onToggleChat,
  onToggleParticipants,
  onShareMeeting,
  onLeave,
  isChatOpen,
  isParticipantsOpen
}) => {
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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

  const handleScreenShare = () => {
    // TODO: Implement screen sharing
    setIsScreenSharing(!isScreenSharing);
  };

  return (
    <div className="meeting-controls">
      <div className="meeting-controls-container">
        {/* Left side - Meeting info */}
        <div className="meeting-controls-left">
          <div className="flex items-center gap-2">
            <div className="recording-indicator" />
            <span className="text-sm text-white/80">Gravando</span>
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

          {/* Security */}
          <Button className="control-button" size="lg">
            <Shield className="h-5 w-5" />
          </Button>

          {/* Participants */}
          <Button
            onClick={onToggleParticipants}
            className={cn(
              "control-button",
              isParticipantsOpen && "control-button-active"
            )}
            size="lg"
          >
            <Users className="h-5 w-5" />
          </Button>

          {/* Chat */}
          <Button
            onClick={onToggleChat}
            className={cn(
              "control-button",
              isChatOpen && "control-button-active"
            )}
            size="lg"
          >
            <MessageSquare className="h-5 w-5" />
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

          {/* Reactions */}
          <Button className="control-button" size="lg">
            <Smile className="h-5 w-5" />
          </Button>

          {/* More options */}
          <Button className="control-button" size="lg">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - Actions */}
        <div className="meeting-controls-right">
          <Button
            onClick={onShareMeeting}
            className="control-button control-button-share"
            size="lg"
          >
            <Share2 className="h-4 w-4" />
            <span className="ml-2 text-sm">Convidar</span>
          </Button>

          <Button
            onClick={onLeave}
            className="control-button control-button-leave"
            size="lg"
          >
            <Phone className="h-5 w-5 rotate-[135deg]" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeetingControls;