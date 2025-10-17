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
import { Volume2, Mic, Camera, Monitor, Upload, Trash2 } from 'lucide-react';
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
  const [audioFiles, setAudioFiles] = useState<{
    joined: File | null;
    waiting: File | null;
    left: File | null;
  }>({
    joined: null,
    waiting: null,
    left: null,
  });
  const { toast } = useToast();

  useEffect(() => {
    const getDevices = async () => {
      try {
        console.log('🎥 [DeviceSettings] Solicitando permissões e listando dispositivos...');
        
        // Request permissions first
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
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
        toast({
          title: "Erro ao acessar dispositivos",
          description: error.name === 'NotAllowedError' 
            ? "Permissão negada. Permita o acesso à câmera e microfone."
            : "Não foi possível acessar os dispositivos.",
          variant: "destructive"
        });
      }
    };

    if (isOpen) {
      getDevices();
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

  const handleFileUpload = (type: 'joined' | 'waiting' | 'left', file: File | null) => {
    if (file && file.size > 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O áudio deve ter no máximo 1MB",
        variant: "destructive"
      });
      return;
    }
    
    setAudioFiles(prev => ({ ...prev, [type]: file }));
    
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem(`meeting_audio_${type}_${companyId}`, reader.result as string);
        toast({
          title: "Áudio salvo",
          description: `Áudio de ${type === 'joined' ? 'entrada' : type === 'waiting' ? 'solicitação' : 'saída'} atualizado`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAudio = (type: 'joined' | 'waiting' | 'left') => {
    setAudioFiles(prev => ({ ...prev, [type]: null }));
    localStorage.removeItem(`meeting_audio_${type}_${companyId}`);
    toast({
      title: "Áudio removido",
      description: "O áudio personalizado foi removido",
    });
  };

  const handleTestAudio = (type: 'joined' | 'waiting' | 'left') => {
    const savedAudio = localStorage.getItem(`meeting_audio_${type}_${companyId}`);
    if (savedAudio) {
      const audio = new Audio(savedAudio);
      audio.play().catch(console.error);
    } else {
      toast({
        title: "Nenhum áudio",
        description: "Carregue um áudio primeiro",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Configurações de Dispositivos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
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