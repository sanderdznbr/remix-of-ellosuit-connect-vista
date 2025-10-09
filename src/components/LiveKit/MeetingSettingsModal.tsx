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
import { Camera, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MeetingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeetingSettingsModal: React.FC<MeetingSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    getDevices();
  }, []);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      const savedAudio = localStorage.getItem('preferred_audio_device');
      const savedVideo = localStorage.getItem('preferred_video_device');

      if (savedAudio && audioInputs.some(d => d.deviceId === savedAudio)) {
        setSelectedAudioDevice(savedAudio);
      } else if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      if (savedVideo && videoInputs.some(d => d.deviceId === savedVideo)) {
        setSelectedVideoDevice(savedVideo);
      } else if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
      toast({
        title: "Erro ao listar dispositivos",
        description: "Não foi possível acessar câmera e microfone.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    if (selectedAudioDevice) {
      localStorage.setItem('preferred_audio_device', selectedAudioDevice);
    }
    if (selectedVideoDevice) {
      localStorage.setItem('preferred_video_device', selectedVideoDevice);
    }

    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram salvas com sucesso.",
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações da Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Camera Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Câmera
            </Label>
            <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma câmera" />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Câmera ${device.deviceId.substring(0, 5)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Microfone
            </Label>
            <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um microfone" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microfone ${device.deviceId.substring(0, 5)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button onClick={handleSave} style={{ backgroundColor: '#3600FF' }}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSettingsModal;
