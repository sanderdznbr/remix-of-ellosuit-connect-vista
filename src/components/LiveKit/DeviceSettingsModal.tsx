import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, RefreshCw, Mic, Camera, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose,
  companyId = ''
}) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string>('');
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      console.log('🎛️ [DeviceSettings] Modal aberto, listando dispositivos...');
      
      const getDevices = async () => {
        try {
          console.log('🎥 [DeviceSettings] Solicitando permissões e listando dispositivos...');
          
          // ALWAYS request permissions first to ensure we get device labels
          const stream = await navigator.mediaDevices.getUserMedia({ 
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
          
          console.log('✅ [DeviceSettings] Permissões concedidas');
          
          // Now enumerate devices - they should have labels now
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          console.log('📱 [DeviceSettings] Dispositivos encontrados:', devices.length);
          
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
          
          console.log('🎥 [DeviceSettings] Câmeras:', videoDevices.length);
          console.log('🎤 [DeviceSettings] Microfones:', audioInputDevices.length);
          
          videoDevices.forEach(d => console.log('  Câmera:', d.label || d.deviceId));
          audioInputDevices.forEach(d => console.log('  Microfone:', d.label || d.deviceId));
          
          setCameras(videoDevices);
          setMicrophones(audioInputDevices);
          
          // Load saved preferences or use first device
          const savedCamera = localStorage.getItem('preferred_video_device');
          const savedMic = localStorage.getItem('preferred_audio_device');
          
          if (savedCamera && videoDevices.some(d => d.deviceId === savedCamera)) {
            setSelectedCamera(savedCamera);
            console.log('📹 [DeviceSettings] Usando câmera salva:', savedCamera);
          } else if (videoDevices.length > 0) {
            setSelectedCamera(videoDevices[0].deviceId);
            console.log('📹 [DeviceSettings] Usando primeira câmera disponível');
          }
          
          if (savedMic && audioInputDevices.some(d => d.deviceId === savedMic)) {
            setSelectedMicrophone(savedMic);
            console.log('🎤 [DeviceSettings] Usando microfone salvo:', savedMic);
          } else if (audioInputDevices.length > 0) {
            setSelectedMicrophone(audioInputDevices[0].deviceId);
            console.log('🎤 [DeviceSettings] Usando primeiro microfone disponível');
          }
          
          // Stop the stream after getting device list
          stream.getTracks().forEach(track => track.stop());
          
        } catch (error: any) {
          console.error('❌ [DeviceSettings] Erro ao listar dispositivos:', error);
          
          let errorMessage = "Não foi possível acessar os dispositivos.";
          
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = "Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador e recarregue a página.";
          } else if (error.name === 'NotFoundError') {
            errorMessage = "Nenhum dispositivo de câmera ou microfone foi encontrado.";
          } else if (error.name === 'NotReadableError') {
            errorMessage = "Os dispositivos estão sendo usados por outro aplicativo.";
          }
          
          toast({
            title: "Erro ao acessar dispositivos",
            description: errorMessage,
            variant: "destructive"
          });
        }
      };

      getDevices();
    } else {
      console.log('🎛️ [DeviceSettings] Modal fechado');
    }
  }, [isOpen, toast]);

  const handleSave = () => {
    // Save preferences to localStorage
    if (selectedCamera) {
      localStorage.setItem('preferred_video_device', selectedCamera);
      console.log('💾 [DeviceSettings] Câmera salva:', selectedCamera);
    }
    if (selectedMicrophone) {
      localStorage.setItem('preferred_audio_device', selectedMicrophone);
      console.log('💾 [DeviceSettings] Microfone salvo:', selectedMicrophone);
    }
    
    toast({
      title: "Configurações salvas",
      description: "Suas preferências de dispositivos foram salvas com sucesso.",
    });
    
    onClose();
  };

  const requestPermissionsAgain = async () => {
    setRequestingPermissions(true);
    setPermissionError('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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

      // Enumerar dispositivos agora que temos permissão
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');

      setCameras(videoDevices);
      setMicrophones(audioDevices);

      // Definir dispositivos padrão
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0) {
        setSelectedMicrophone(audioDevices[0].deviceId);
      }

      // Parar tracks
      stream.getTracks().forEach(track => track.stop());

      toast({
        title: "Permissões concedidas!",
        description: "Dispositivos carregados com sucesso",
      });
    } catch (error: any) {
      let errorMsg = 'Erro ao acessar dispositivos';
      
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Você precisa permitir acesso aos dispositivos';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'Nenhum dispositivo encontrado';
      }
      
      setPermissionError(errorMsg);
      
      toast({
        title: "Erro ao acessar dispositivos",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setRequestingPermissions(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent 
        className="sm:max-w-md bg-white border-gray-200 z-[10000]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Configurações de Dispositivos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Permission Error */}
          {permissionError && cameras.length === 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400 mb-2">
                    {permissionError}
                  </p>
                  <Button
                    onClick={requestPermissionsAgain}
                    disabled={requestingPermissions}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {requestingPermissions ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Solicitando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Tentar novamente
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

            {/* Camera Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Câmera
            </Label>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Selecione uma câmera" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 z-[9999]">
                {cameras.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    Nenhuma câmera encontrada
                  </div>
                ) : (
                  cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Câmera ${camera.deviceId.substring(0, 8)}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Microfone
            </Label>
            <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Selecione um microfone" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 z-[9999]">
                {microphones.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    Nenhum microfone encontrado
                  </div>
                ) : (
                  microphones.map((mic) => (
                    <SelectItem key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microfone ${mic.deviceId.substring(0, 8)}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar Configurações
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceSettingsModal;