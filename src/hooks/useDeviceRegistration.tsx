
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeviceRegistration = () => {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  const registerDevice = async (token: string) => {
    try {
      console.log('📱 Registrando device token:', token);
      
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: { token }
      });

      if (error) {
        console.error('❌ Erro ao registrar device:', error);
        throw error;
      }

      console.log('✅ Device registrado com sucesso:', data);
      setIsRegistered(true);
      setDeviceToken(token);
      
      return data;
    } catch (error: any) {
      console.error('💥 Erro ao registrar device:', error);
      toast({
        title: "Erro",
        description: `Falha ao registrar dispositivo: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('❌ Este navegador não suporta notificações');
      return false;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Solicitar permissão para notificações
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Permissão para notificações concedida');
          
          // Registrar service worker (para PWA)
          const registration = await navigator.serviceWorker.register('/sw.js').catch(() => null);
          
          if (registration) {
            // Obter token de push (simulado para desenvolvimento)
            const token = `web_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await registerDevice(token);
            return true;
          }
        } else {
          console.log('❌ Permissão para notificações negada');
          toast({
            title: "Permissão negada",
            description: "Para receber notificações, permita o acesso nas configurações do navegador.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ Erro ao solicitar permissão:', error);
      }
    }
    
    return false;
  };

  // Auto-registrar ao carregar o app
  useEffect(() => {
    if (!isRegistered) {
      requestNotificationPermission();
    }
  }, []);

  return {
    deviceToken,
    isRegistered,
    registerDevice,
    requestNotificationPermission
  };
};
