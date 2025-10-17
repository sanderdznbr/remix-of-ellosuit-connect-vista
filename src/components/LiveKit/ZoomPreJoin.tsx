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
  console.log('🎭 [ZoomPreJoin] Componente montado:', { roomName, participantName });
  
  const [name, setName] = useState(participantName === 'Convidado' ? '' : participantName);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const requestPermissions = async () => {
    try {
      console.log('🎥 [ZoomPreJoin] Solicitando acesso à câmera e microfone...');
      setPermissionDenied(false);
      setPermissionError('');
      
      // Request permissions explicitly
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ [ZoomPreJoin] Acesso concedido');
      setStream(mediaStream);
      setPermissionDenied(false);
      setVideoEnabled(true);
      setAudioEnabled(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error('❌ [ZoomPreJoin] Erro ao acessar dispositivos:', error);
      
      // Handle permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.warn('⚠️ [ZoomPreJoin] Permissões negadas pelo usuário');
        setPermissionDenied(true);
        setPermissionError('Você precisa permitir o acesso à câmera e microfone para entrar na reunião.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.warn('⚠️ [ZoomPreJoin] Dispositivos não encontrados');
        setPermissionDenied(true);
        setPermissionError('Nenhuma câmera ou microfone foi encontrado no seu dispositivo.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        console.warn('⚠️ [ZoomPreJoin] Dispositivos em uso ou não acessíveis');
        setPermissionDenied(true);
        setPermissionError('Os dispositivos estão sendo usados por outro aplicativo. Feche outros aplicativos e tente novamente.');
      } else {
        console.error('❌ [ZoomPreJoin] Erro desconhecido:', error.name, error.message);
        setPermissionDenied(true);
        setPermissionError('Erro ao acessar dispositivos. Verifique suas configurações do navegador.');
      }
      
      setVideoEnabled(false);
      setAudioEnabled(false);
    }
  };

  useEffect(() => {
    requestPermissions();

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
    if (!stream) {
      console.warn('⚠️ [ZoomPreJoin] Tentativa de entrar sem permissões');
      return;
    }
    
    const finalName = name.trim() || participantName || 'Convidado';
    console.log('✅ [ZoomPreJoin] === BOTÃO ENTRAR CLICADO ===');
    console.log('✅ [ZoomPreJoin] Entrando na sala:', {
      finalName,
      videoEnabled,
      audioEnabled
    });
    
    onSubmit({
      username: finalName,
      videoEnabled,
      audioEnabled
    });
    
    console.log('✅ [ZoomPreJoin] onSubmit chamado');
  };

  console.log('🎭 [ZoomPreJoin] Renderizando PreJoin');

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: '#101010', zIndex: 9999 }}>
      <div className="w-full max-w-[600px] bg-[#1a1a1a] border border-gray-700 rounded-2xl p-6 sm:p-8 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Logo ELLOSUIT */}
        <div className="text-center mb-8">
          <img 
            src={logoEllosuit} 
            alt="ELLOSUIT" 
            className="h-12 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            Preparar para entrar
          </h1>
          <p className="text-gray-300">
            Sala: <span className="font-semibold text-white">{roomName}</span>
          </p>
        </div>

        {/* Permission Error - BLOCKING */}
        {permissionDenied && (
          <div className="mb-4 p-5 rounded-lg bg-red-500/10 border-2 border-red-500/50">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-3">
                <VideoOff className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-base text-red-200 font-semibold mb-2">
                Acesso aos dispositivos necessário
              </p>
              <p className="text-sm text-red-300/80 mb-4">
                {permissionError}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={requestPermissions}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Solicitar permissão novamente
              </Button>
              <Button
                onClick={() => setShowDeviceSettings(true)}
                variant="outline"
                className="w-full bg-red-500/10 border-red-500/50 text-red-200 hover:bg-red-500/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Abrir configurações
              </Button>
            </div>
            <p className="text-xs text-red-300/60 text-center mt-3">
              💡 Se o problema persistir, verifique as configurações do seu navegador
            </p>
          </div>
        )}

        {/* Video Preview - Suporte para câmera vertical */}
        <div className="relative w-full rounded-xl overflow-hidden mb-6 border border-gray-700 flex items-center justify-center" style={{ minHeight: '280px', maxHeight: '400px', backgroundColor: '#000' }}>
          {videoEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-w-full max-h-full object-contain"
              style={{ backgroundColor: '#000' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#2a2a2a', minHeight: '280px' }}>
              <div className="text-center">
                <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">
                  {permissionDenied ? 'Permissão negada' : (!stream ? 'Câmera não disponível' : 'Câmera desligada')}
                </p>
              </div>
            </div>
          )}
          
          {/* Preview Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border"
              style={{
                backgroundColor: videoEnabled ? '#3600FF' : '#EF4444',
                borderColor: videoEnabled ? '#3600FF' : '#EF4444',
                color: 'white'
              }}
            >
              {videoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border"
              style={{
                backgroundColor: audioEnabled ? '#3600FF' : '#EF4444',
                borderColor: audioEnabled ? '#3600FF' : '#EF4444',
                color: 'white'
              }}
            >
              {audioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
            
            <button 
              onClick={() => setShowDeviceSettings(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border"
              style={{
                backgroundColor: '#3600FF',
                borderColor: '#3600FF',
                color: 'white'
              }}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Seu nome
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome"
            className="rounded-lg px-4 py-3 focus:ring-1 text-white"
            style={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #444'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!stream}
            className="flex-1 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: !stream ? '#666' : '#3600FF' }}
          >
            {!stream ? 'Permita o acesso aos dispositivos' : 'Entrar na reunião'}
          </Button>
        </div>

        {/* Device Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
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