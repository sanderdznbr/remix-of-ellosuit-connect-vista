import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface AudioDeviceSelectorProps {
  onDeviceSelect: (deviceId: string) => void;
  selectedDeviceId?: string;
}

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  onDeviceSelect,
  selectedDeviceId
}) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  const loadDevices = async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.slice(0, 5)}`
        }));
      
      console.log('🎤 Dispositivos de áudio encontrados:', audioInputs);
      setDevices(audioInputs);
      
      // Auto-select first device if none selected
      if (!selectedDeviceId && audioInputs.length > 0) {
        onDeviceSelect(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar os dispositivos de áudio",
        variant: "destructive"
      });
    }
  };

  const testMicrophone = async () => {
    if (!selectedDeviceId) {
      toast({
        title: "Selecione um microfone",
        description: "Por favor, selecione um microfone antes de testar",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedDeviceId } }
      });

      // Test for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      stream.getTracks().forEach(track => track.stop());
      
      toast({
        title: "Teste Concluído",
        description: "Microfone funcionando corretamente!",
      });
    } catch (error) {
      console.error('Erro no teste:', error);
      toast({
        title: "Erro no Teste",
        description: "Não foi possível testar o microfone",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Dispositivo de Áudio</Label>
      </div>
      
      <div className="space-y-2">
        <Select value={selectedDeviceId} onValueChange={onDeviceSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um microfone" />
          </SelectTrigger>
          <SelectContent>
            {devices.map(device => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedDeviceId && (
          <Button
            onClick={testMicrophone}
            variant="outline"
            size="sm"
            disabled={testing}
            className="w-full"
          >
            {testing ? 'Testando...' : 'Testar Microfone'}
          </Button>
        )}
      </div>
    </div>
  );
};
