import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoEllosuit from '@/assets/logoellosuit.png';
import DeviceSettingsModal from './DeviceSettingsModal';

interface ZoomPreJoinProps {
  roomName: string;
  participantName: string;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

const ZoomPreJoin: React.FC<ZoomPreJoinProps> = ({
  roomName,
  participantName,
  onSubmit,
  onCancel
}) => {
  const [name, setName] = useState(participantName === 'Convidado' ? '' : participantName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    getMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
      }
      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [videoEnabled, audioEnabled, stream]);

  const handleJoin = () => {
    const finalName = name.trim() || participantName || 'Convidado';
    onSubmit({
      username: finalName,
      videoEnabled,
      audioEnabled
    });
  };

  return (
    <div className="zoom-prejoin-container-light">
      <div className="zoom-prejoin-card-light">
        {/* Logo ELLOSUIT */}
        <div className="text-center mb-8">
          <img 
            src={logoEllosuit} 
            alt="ELLOSUIT" 
            className="h-12 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Preparar para entrar
          </h1>
          <p className="text-gray-600">
            Sala: <span className="font-semibold text-gray-900">{roomName}</span>
          </p>
        </div>

        {/* Video Preview */}
        <div className="zoom-prejoin-preview-light">
          {videoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <VideoOff className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-500">Câmera desligada</p>
              </div>
            </div>
          )}
          
          {/* Preview Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={cn(
                "zoom-prejoin-button-light",
                videoEnabled ? "active-light" : "inactive-light"
              )}
            >
              {videoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={cn(
                "zoom-prejoin-button-light",
                audioEnabled ? "active-light" : "inactive-light"
              )}
            >
              {audioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
            
            <button 
              onClick={() => setShowDeviceSettings(true)}
              className="zoom-prejoin-button-light active-light"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seu nome
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome"
            className="zoom-prejoin-name-light"
          />
        </div>

        {/* Action Buttons */}
        <div className="zoom-prejoin-actions">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleJoin}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Entrar na reunião
          </Button>
        </div>

        {/* Device Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Ao entrar, você concorda em permitir acesso à câmera e microfone
          </p>
        </div>
      </div>

      {/* Device Settings Modal */}
      <DeviceSettingsModal 
        isOpen={showDeviceSettings}
        onClose={() => setShowDeviceSettings(false)}
      />
    </div>
  );
};

export default ZoomPreJoin;