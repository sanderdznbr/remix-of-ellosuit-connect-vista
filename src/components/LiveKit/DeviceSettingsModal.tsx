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
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        
        setCameras(videoDevices);
        setMicrophones(audioInputDevices);
        
        // Set default selections
        if (videoDevices.length > 0) setSelectedCamera(videoDevices[0].deviceId);
        if (audioInputDevices.length > 0) setSelectedMicrophone(audioInputDevices[0].deviceId);
        
      } catch (error) {
        console.error('Error getting media devices:', error);
      }
    };

    if (isOpen) {
      getDevices();
    }
  }, [isOpen]);

  const handleSave = () => {
    // TODO: Apply device settings
    console.log('Saving device settings:', {
      camera: selectedCamera,
      microphone: selectedMicrophone
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
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Câmera ${camera.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
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
              <SelectContent>
                {microphones.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microfone ${mic.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
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