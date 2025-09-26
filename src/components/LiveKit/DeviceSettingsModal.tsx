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
import { Slider } from '@/components/ui/slider';
import { Volume2, Mic, Camera, Monitor } from 'lucide-react';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [micVolume, setMicVolume] = useState([80]);
  const [speakerVolume, setSpeakerVolume] = useState([70]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
        
        setCameras(videoDevices);
        setMicrophones(audioInputDevices);
        setSpeakers(audioOutputDevices);
        
        // Set default selections
        if (videoDevices.length > 0) setSelectedCamera(videoDevices[0].deviceId);
        if (audioInputDevices.length > 0) setSelectedMicrophone(audioInputDevices[0].deviceId);
        if (audioOutputDevices.length > 0) setSelectedSpeaker(audioOutputDevices[0].deviceId);
        
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
      microphone: selectedMicrophone,
      speaker: selectedSpeaker,
      micVolume: micVolume[0],
      speakerVolume: speakerVolume[0]
    });
    onClose();
  };

  const testSpeaker = () => {
    // TODO: Play test sound
    console.log('Testing speaker...');
  };

  const testMicrophone = () => {
    // TODO: Test microphone
    console.log('Testing microphone...');
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

        <div className="space-y-6">
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
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-600">Volume do Microfone</Label>
                <span className="text-xs text-gray-500">{micVolume[0]}%</span>
              </div>
              <Slider
                value={micVolume}
                onValueChange={setMicVolume}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <Button
                onClick={testMicrophone}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Testar Microfone
              </Button>
            </div>
          </div>

          {/* Speaker Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Alto-falante
            </Label>
            <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Selecione um alto-falante" />
              </SelectTrigger>
              <SelectContent>
                {speakers.map((speaker) => (
                  <SelectItem key={speaker.deviceId} value={speaker.deviceId}>
                    {speaker.label || `Alto-falante ${speaker.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-600">Volume do Alto-falante</Label>
                <span className="text-xs text-gray-500">{speakerVolume[0]}%</span>
              </div>
              <Slider
                value={speakerVolume}
                onValueChange={setSpeakerVolume}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <Button
                onClick={testSpeaker}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Testar Alto-falante
              </Button>
            </div>
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