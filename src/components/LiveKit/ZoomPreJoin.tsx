import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [name, setName] = useState(participantName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
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
    if (stream && videoRef.current) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
      }
    }
  }, [videoEnabled, stream]);

  const handleJoin = () => {
    onSubmit({
      username: name,
      videoEnabled,
      audioEnabled
    });
  };

  return (
    <div className="zoom-prejoin-container">
      <div className="zoom-prejoin-card">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Preparar para entrar
          </h1>
          <p className="text-gray-400">
            Sala: <span className="font-semibold text-white">{roomName}</span>
          </p>
        </div>

        {/* Video Preview */}
        <div className="zoom-prejoin-preview">
          {videoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <div className="text-center">
                <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Câmera desligada</p>
              </div>
            </div>
          )}
          
          {/* Preview Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={cn(
                "zoom-prejoin-button",
                videoEnabled ? "active" : "inactive"
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
                "zoom-prejoin-button",
                audioEnabled ? "active" : "inactive"
              )}
            >
              {audioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
            
            <button className="zoom-prejoin-button active">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Name Input */}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite seu nome"
          className="zoom-prejoin-name"
        />

        {/* Action Buttons */}
        <div className="zoom-prejoin-actions">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!name.trim()}
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
    </div>
  );
};

export default ZoomPreJoin;