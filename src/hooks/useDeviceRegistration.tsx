
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeviceRegistration = () => {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const registerDevice = async (token: string) => {
    if (isRegistering) return;
    
    setIsRegistering(true);
    
    try {
      console.log('📱 Registrando device token:', token.substring(0, 20) + '...');
      
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
      
      toast({
        title: "Sucesso",
        description: "Dispositivo registrado para notificações",
      });
      
      return data;
    } catch (error: any) {
      console.error('💥 Erro ao registrar device:', error);
      toast({
        title: "Erro",
        description: `Falha ao registrar dispositivo: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  const requestNotificationPermission = async () => {
    console.log('🔔 Solicitando permissão para notificações...');
    
    if (!('Notification' in window)) {
      console.log('❌ Este navegador não suporta notificações');
      return false;
    }

    try {
      // Solicitar permissão para notificações
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Permissão para notificações concedida');
        
        // Para web app, simular token APNs
        if ('serviceWorker' in navigator) {
          try {
            // Registrar service worker para PWA
            const registration = await navigator.serviceWorker.register('/sw.js').catch(() => null);
            
            if (registration) {
              console.log('✅ Service Worker registrado');
            }
            
            // Gerar token simulado para desenvolvimento web
            const simulatedToken = `web_apns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('🔧 Usando token simulado para web:', simulatedToken.substring(0, 20) + '...');
            
            await registerDevice(simulatedToken);
            return true;
          } catch (error) {
            console.error('❌ Erro ao registrar service worker:', error);
          }
        }
        
        // Fallback: usar token básico se não conseguir registrar SW
        const fallbackToken = `fallback_token_${Date.now()}`;
        await registerDevice(fallbackToken);
        return true;
        
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
      toast({
        title: "Erro",
        description: "Erro ao solicitar permissão para notificações",
        variant: "destructive"
      });
    }
    
    return false;
  };

  // Auto-registrar ao carregar o app
  useEffect(() => {
    if (!isRegistered && !isRegistering) {
      console.log('🚀 Iniciando registro automático de notificações...');
      requestNotificationPermission();
    }
  }, [isRegistered, isRegistering]);

  return {
    deviceToken,
    isRegistered,
    isRegistering,
    registerDevice,
    requestNotificationPermission
  };
};
