import React, { forwardRef, useImperativeHandle } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
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
  onToggleRecording: () => void;
  isRecording: boolean;
}

const SimpleMeetingControls = forwardRef<any, SimpleMeetingControlsProps>(({
  onToggleChat,
  onToggleParticipants,
  onShareMeeting,
  onLeave,
  onSettingsClick,
  onShowTranscription,
  isChatOpen,
  isParticipantsOpen,
  onToggleRecording,
  isRecording
}, ref) => {
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({}));

  const toggleMic = async () => {
    if (localParticipant) {
      const isMuted = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!isMuted);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const isEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!isEnabled);
    }
  };

  const handleScreenShare = async () => {
    if (localParticipant) {
      try {
        const isSharing = localParticipant.isScreenShareEnabled;
        await localParticipant.setScreenShareEnabled(!isSharing, {
          suppressLocalAudioPlayback: true
        });
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

  const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? true;
  const isCameraEnabled = localParticipant?.isCameraEnabled ?? true;

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Camera */}
      <button
        onClick={toggleCamera}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ width: '57px', height: '57px', backgroundColor: '#161616' }}
        title={isCameraEnabled ? "Desativar câmera" : "Ativar câmera"}
      >
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.58333 0C0.709333 0 0 0.7093 0 1.58333V13.4583C0 14.3323 0.709333 15.0417 1.58333 15.0417H17.4167C18.2907 15.0417 19 14.3323 19 13.4583V1.58333C19 0.7093 18.2907 0 17.4167 0H1.58333ZM17.4167 11.0833H1.58333V1.58333H17.4167V11.0833ZM12.1925 16.625C12.1925 17.8917 13.5733 18.7031 14.25 19H4.75C5.49267 18.7364 6.8075 17.9574 6.8075 16.625H12.1925Z" fill="white"/>
        </svg>
      </button>

      {/* Microphone - Blue */}
      <button
        onClick={toggleMic}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ width: '57px', height: '57px', backgroundColor: '#3600FF' }}
        title={isMicEnabled ? "Desativar microfone" : "Ativar microfone"}
      >
        <svg width="21" height="25" viewBox="0 0 21 25" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 9C13 11.209 11.209 13 9 13C6.791 13 5 11.209 5 9V2C5 -0.209 6.791 -2 9 -2C11.209 -2 13 -0.209 13 2V9ZM17 7V9C17 13.418 13.418 17 9 17C4.582 17 1 13.418 1 9V7H3V9C3 12.309 5.691 15 9 15C12.309 15 15 12.309 15 9V7H17ZM10 20V18H8V20H4V22H14V20H10Z" fill="white"/>
        </svg>
      </button>

      {/* Recording Button */}
      <button
        onClick={onToggleRecording}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ 
          width: '57px', 
          height: '57px', 
          backgroundColor: isRecording ? '#DC2626' : '#161616',
          animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}
        title={isRecording ? "Parar gravação" : "Iniciar gravação"}
      >
        {isRecording ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="white"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2" fill="none"/>
          </svg>
        )}
      </button>

      {/* Emoji */}
      <button
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ width: '57px', height: '57px', backgroundColor: '#161616' }}
        title="Reações"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0C5.029 0 1 4.03 1 9C1 13.971 5.029 18 10 18C14.971 18 19 13.97 19 9C19 4.03 14.971 0 10 0ZM10 13C7.791 13 6 11.209 6 9C6 6.791 7.791 5 10 5C12.209 5 14 6.791 14 9C14 11.209 12.209 13 10 13ZM12 9C12 10.103 11.104 11 10 11C8.897 11 8 10.103 8 9C8 7.897 8.897 7 10 7C11.104 7 12 7.897 12 9Z" fill="white"/>
        </svg>
      </button>

      {/* Settings */}
      <button
        onClick={onSettingsClick}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ width: '57px', height: '57px', backgroundColor: '#161616' }}
        title="Configurações"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.41 14.515C21.647 13.622 22.724 13.626 24 13.307V10.695C23.093 10.468 21.648 10.382 21.408 9.478L21.407 9.472C21.168 8.582 22.046 8.099 23.046 7.132L21.74 4.869C20.829 5.129 19.545 5.772 18.877 5.106C18.231 4.463 18.763 3.554 19.132 2.261L16.869 0.955C16.22 1.626 15.423 2.833 14.521 2.592L14.515 2.591C13.623 2.353 13.626 1.278 13.306 0H10.694C10.466 0.911 10.381 2.351 9.477 2.592L9.471 2.594C8.58 2.832 8.098 1.954 7.131 0.954L4.869 2.261C5.129 3.172 5.772 4.456 5.106 5.124C4.462 5.77 3.553 5.238 2.261 4.869L0.955 7.131C1.625 7.78 2.833 8.577 2.592 9.479L2.591 9.485C2.353 10.378 1.274 10.375 0.001 10.693V13.305C0.908 13.532 2.353 13.618 2.593 14.522L2.595 14.528C2.833 15.419 1.955 15.901 0.955 16.868L2.261 19.131C3.172 18.871 4.456 18.228 5.124 18.894C5.77 19.537 5.238 20.446 4.869 21.739L7.132 23.045C7.781 22.374 8.578 21.167 9.48 21.408L9.486 21.409C10.379 21.647 10.375 22.722 10.694 23.999H13.306C13.534 23.088 13.619 21.648 14.523 21.407L14.529 21.405C15.42 21.167 15.902 22.045 16.869 23.045L19.132 21.739C18.872 20.83 18.228 19.546 18.895 18.876C19.538 18.23 20.447 18.762 21.74 19.131L23.046 16.868C22.375 16.219 21.168 15.422 21.409 14.52L21.41 14.515ZM14 16C11.791 16 10 14.209 10 12C10 9.791 11.791 8 14 8C16.209 8 18 9.791 18 12C18 14.209 16.209 16 14 16Z" fill="white"/>
        </svg>
      </button>

      {/* Leave - Red */}
      <button
        onClick={onLeave}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105"
        style={{ width: '57px', height: '57px', backgroundColor: '#EF4444' }}
        title="Sair da reunião"
      >
        <svg width="21" height="23" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 22.621L17.479 15.826C17.471 15.83 15.505 16.796 15.415 16.837C13.175 17.923 8.616 9.017 10.806 7.843L12.889 6.817L9.396 0L7.29 1.039C0.088 4.794 11.523 27.021 18.89 23.654C19.011 23.599 20.992 22.625 21 22.621Z" fill="white"/>
        </svg>
      </button>
    </div>
  );
});

SimpleMeetingControls.displayName = 'SimpleMeetingControls';

export default SimpleMeetingControls;
