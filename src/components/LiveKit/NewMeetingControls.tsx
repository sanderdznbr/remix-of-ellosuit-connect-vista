import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { useToast } from '@/hooks/use-toast';
import { FileText } from 'lucide-react';

interface NewMeetingControlsProps {
  onLeave: () => void;
  onSettingsClick: () => void;
  onTranscriptionClick: () => void;
  onToggleRecording: () => void;
  isRecording: boolean;
}

const NewMeetingControls = forwardRef<any, NewMeetingControlsProps>(({
  onLeave,
  onSettingsClick,
  onTranscriptionClick,
  onToggleRecording,
  isRecording,
}, ref) => {
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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
    if (!localParticipant) return;
    
    try {
      const isCurrentlySharing = localParticipant.isScreenShareEnabled;
      
      if (isCurrentlySharing) {
        // Stop screen sharing
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast({
          title: "Compartilhamento encerrado",
          description: "Você parou de compartilhar sua tela",
        });
      } else {
        // Start screen sharing
        await localParticipant.setScreenShareEnabled(true, {
          suppressLocalAudioPlayback: true,
        });
        setIsScreenSharing(true);
        toast({
          title: "Compartilhamento iniciado",
          description: "Você está compartilhando sua tela",
        });
      }
    } catch (error: any) {
      console.error('Screen share error:', error);
      setIsScreenSharing(false);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir o compartilhamento de tela",
          variant: "destructive"
        });
      } else {
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
    <div className="flex items-center gap-4 px-8 py-4 rounded-full" style={{ backgroundColor: 'rgba(22, 22, 22, 0.95)', backdropFilter: 'blur(12px)' }}>
      {/* Camera/Webcam Button */}
      <button
        onClick={toggleCamera}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ width: '52px', height: '52px', backgroundColor: isCameraEnabled ? '#2D2D2D' : '#1A1A1A' }}
        title={isCameraEnabled ? "Desligar câmera" : "Ligar câmera"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C7.029 0 3 4.03 3 9C3 13.971 7.029 18 12 18C16.971 18 21 13.97 21 9C21 4.03 16.971 0 12 0ZM12 13C9.791 13 8 11.209 8 9C8 6.791 9.791 5 12 5C14.209 5 16 6.791 16 9C16 11.209 14.209 13 12 13ZM14 9C14 10.103 13.104 11 12 11C10.897 11 10 10.103 10 9C10 7.897 10.897 7 12 7C13.104 7 14 7.897 14 9ZM20.596 21.501C21.601 22.641 20.586 24.179 19.148 23.982C17.353 23.737 15.912 22.28 12.001 22.28C8.09 22.28 6.649 23.738 4.854 23.982C3.415 24.179 2.4 22.64 3.406 21.501L6.2 18.33C7.887 19.382 9.87 20 12 20C14.13 20 16.113 19.381 17.8 18.329L20.596 21.501Z" fill="white"/>
        </svg>
      </button>

      {/* Microphone Button - Blue when enabled */}
      <button
        onClick={toggleMic}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ 
          width: '52px', 
          height: '52px', 
          backgroundColor: isMicEnabled ? '#3600FF' : '#1A1A1A',
          boxShadow: isMicEnabled ? '0 0 20px rgba(54, 0, 255, 0.4)' : 'none'
        }}
        title={isMicEnabled ? "Mutar microfone" : "Desmutar microfone"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 11C16 13.209 14.209 15 12 15C9.791 15 8 13.209 8 11V4C8 1.791 9.791 0 12 0C14.209 0 16 1.791 16 4V11ZM20 9V11C20 15.418 16.418 19 12 19C7.582 19 4 15.418 4 11V9H6V11C6 14.309 8.691 17 12 17C15.309 17 18 14.309 18 11V9H20ZM13 22V20H11V22H7V24H17V22H13Z" fill="white"/>
        </svg>
      </button>

      {/* Screen Share Button */}
      <button
        onClick={handleScreenShare}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ 
          width: '52px', 
          height: '52px', 
          backgroundColor: isScreenSharing ? '#3600FF' : '#2D2D2D',
          boxShadow: isScreenSharing ? '0 0 20px rgba(54, 0, 255, 0.4)' : 'none'
        }}
        title={isScreenSharing ? "Parar compartilhamento" : "Transmitir tela"}
      >
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_175_13)">
            <path d="M1.58333 0C0.709333 0 0 0.709333 0 1.58333V13.4583C0 14.3323 0.709333 15.0417 1.58333 15.0417H17.4167C18.2907 15.0417 19 14.3323 19 13.4583V1.58333C19 0.709333 18.2907 0 17.4167 0H1.58333ZM17.4167 11.0833H1.58333V1.58333H17.4167V11.0833ZM12.1925 16.625C12.1925 17.8917 13.5731 18.7031 14.25 19H4.75C5.49258 18.7364 6.80754 17.9574 6.80754 16.625H12.1925Z" fill="white"/>
          </g>
          <defs>
            <clipPath id="clip0_175_13">
              <rect width="19" height="19" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </button>

      {/* Recording Button */}
      <button
        onClick={onToggleRecording}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ 
          width: '52px', 
          height: '52px', 
          backgroundColor: isRecording ? '#DC2626' : '#2D2D2D',
          boxShadow: isRecording ? '0 0 20px rgba(220, 38, 38, 0.6)' : 'none',
          animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}
        title={isRecording ? "Parar gravação" : "Iniciar gravação"}
      >
        {isRecording ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="7" fill="white"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none"/>
          </svg>
        )}
      </button>

      {/* Transcription Button */}
      <button
        onClick={onTranscriptionClick}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ width: '52px', height: '52px', backgroundColor: '#2D2D2D' }}
        title="Ver transcrição"
      >
        <FileText className="w-5 h-5 text-white" />
      </button>

      {/* Settings Button */}
      <button
        onClick={onSettingsClick}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ width: '52px', height: '52px', backgroundColor: '#2D2D2D' }}
        title="Configurações"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_175_34)">
            <path d="M21.41 14.515C21.647 13.622 22.724 13.626 24 13.307V10.695C23.093 10.468 21.648 10.382 21.408 9.478L21.407 9.472C21.168 8.582 22.046 8.099 23.046 7.132L21.74 4.869C20.829 5.129 19.545 5.772 18.877 5.106C18.231 4.463 18.763 3.554 19.132 2.261L16.869 0.955C16.22 1.626 15.423 2.833 14.521 2.592L14.515 2.591C13.623 2.353 13.626 1.278 13.306 0H10.694C10.466 0.911 10.381 2.351 9.477 2.592L9.471 2.594C8.58 2.832 8.098 1.954 7.131 0.954L4.869 2.261C5.129 3.172 5.772 4.456 5.106 5.124C4.462 5.77 3.553 5.238 2.261 4.869L0.955 7.131C1.625 7.78 2.833 8.577 2.592 9.479L2.591 9.485C2.353 10.378 1.274 10.375 0.001 10.693V13.305C0.908 13.532 2.353 13.618 2.593 14.522L2.595 14.528C2.833 15.419 1.955 15.901 0.955 16.868L2.261 19.131C3.172 18.871 4.456 18.228 5.124 18.894C5.77 19.537 5.238 20.446 4.869 21.739L7.132 23.045C7.781 22.374 8.578 21.167 9.48 21.408L9.486 21.409C10.379 21.647 10.375 22.722 10.694 23.999H13.306C13.534 23.088 13.619 21.648 14.523 21.407L14.529 21.405C15.42 21.167 15.902 22.045 16.869 23.045L19.132 21.739C18.872 20.83 18.228 19.546 18.895 18.876C19.538 18.23 20.447 18.762 21.74 19.131L23.046 16.868C22.375 16.219 21.168 15.422 21.409 14.52L21.41 14.515ZM14 16C11.791 16 10 14.209 10 12C10 9.791 11.791 8 14 8C16.209 8 18 9.791 18 12C18 14.209 16.209 16 14 16Z" fill="white"/>
          </g>
          <defs>
            <clipPath id="clip0_175_34">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </button>

      {/* Leave/Hang Up Button - Red */}
      <button
        onClick={onLeave}
        className="flex items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-lg"
        style={{ width: '52px', height: '52px', backgroundColor: '#DC2626', boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' }}
        title="Desligar chamada"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 22.621L16.479 15.826C16.471 15.83 14.505 16.796 14.415 16.837C12.175 17.923 7.61604 9.017 9.80604 7.843L11.889 6.817L8.39604 0L6.29004 1.039C-0.911963 4.794 10.523 27.021 17.89 23.654C18.011 23.599 19.992 22.625 20 22.621Z" fill="white"/>
        </svg>
      </button>
    </div>
  );
});

NewMeetingControls.displayName = 'NewMeetingControls';

export default NewMeetingControls;
