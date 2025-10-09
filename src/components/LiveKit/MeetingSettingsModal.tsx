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
import { Upload, X, Camera, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MeetingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeetingSettingsModal: React.FC<MeetingSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [provisionalImage, setProvisionalImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Load saved image on mount
    const saved = localStorage.getItem('meeting_provisional_image');
    if (saved) {
      setProvisionalImage(saved);
    }

    // Get available devices
    getDevices();
  }, []);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);

      // Load saved preferences
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `provisional-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('meeting-audios')
        .getPublicUrl(filePath);

      setProvisionalImage(data.publicUrl);
      
      // Save to localStorage for persistence
      localStorage.setItem('meeting_provisional_image', data.publicUrl);

      toast({
        title: "Sucesso!",
        description: "Imagem provisória salva com sucesso.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setProvisionalImage(null);
    localStorage.removeItem('meeting_provisional_image');
    toast({
      title: "Imagem removida",
      description: "A imagem provisória foi removida.",
    });
  };

  const handleSave = () => {
    // Save device preferences
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Provisional Image Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Imagem Provisória (quando câmera estiver desligada)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Esta imagem será exibida no lugar do vídeo quando sua câmera estiver desligada.
            </p>
            
            {provisionalImage ? (
              <div className="relative">
                <img
                  src={provisionalImage}
                  alt="Imagem provisória"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  onClick={handleRemoveImage}
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="provisional-image"
                  disabled={uploading}
                />
                <Button
                  onClick={() => document.getElementById('provisional-image')?.click()}
                  disabled={uploading}
                  variant="outline"
                >
                  {uploading ? 'Enviando...' : 'Selecionar Imagem'}
                </Button>
              </div>
            )}
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
