
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useNativePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const { toast } = useToast();

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Não é uma plataforma nativa, usando notificações web');
      return;
    }

    console.log('🍎 Inicializando notificações push nativas...');

    // Verificar status da permissão
    const permResult = await PushNotifications.checkPermissions();
    setPermissionStatus(permResult.receive);
    console.log('🔔 Status atual da permissão:', permResult.receive);

    // Se já tem permissão, registrar automaticamente
    if (permResult.receive === 'granted') {
      await registerForPushNotifications();
    }

    // Listeners para eventos de notificação
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('✅ Token de push registrado:', token.value);
      setDeviceToken(token.value);
      setIsRegistered(true);
      registerDeviceToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Erro no registro de push:', error);
      setIsRegistering(false);
      toast({
        title: "❌ Erro",
        description: "Falha ao registrar para notificações push",
        variant: "destructive"
      });
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📱 Notificação recebida:', notification);
      toast({
        title: notification.title || "Nova notificação",
        description: notification.body || "",
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('👆 Notificação tocada:', notification);
    });
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "ℹ️ Aviso",
        description: "Notificações push só funcionam em dispositivos móveis nativos",
        variant: "destructive"
      });
      return false;
    }

    setIsRegistering(true);
    console.log('🔔 Solicitando permissões para notificações push...');

    try {
      const permResult = await PushNotifications.requestPermissions();
      console.log('📋 Resultado da permissão:', permResult);
      
      setPermissionStatus(permResult.receive);

      if (permResult.receive === 'granted') {
        console.log('✅ Permissão concedida! Registrando para notificações...');
        await registerForPushNotifications();
        return true;
      } else {
        console.log('❌ Permissão negada');
        toast({
          title: "❌ Permissão negada",
          description: "Para receber notificações, ative nas configurações do dispositivo",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('💥 Erro ao solicitar permissões:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao solicitar permissões para notificações",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsRegistering(false);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      console.log('📱 Registrando para notificações push...');
      await PushNotifications.register();
    } catch (error) {
      console.error('❌ Erro ao registrar para push:', error);
      setIsRegistering(false);
    }
  };

  const registerDeviceToken = async (token: string) => {
    try {
      console.log('📤 Enviando token para o servidor:', token.substring(0, 20) + '...');
      
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: { token }
      });

      if (error) {
        console.error('❌ Erro ao registrar token no servidor:', error);
        throw error;
      }

      console.log('✅ Token registrado no servidor com sucesso');
      
      // Salvar no localStorage
      localStorage.setItem('nativeDeviceToken', token);
      localStorage.setItem('isNativeRegistered', 'true');
      
      toast({
        title: "✅ Sucesso",
        description: "Notificações push ativadas com sucesso!",
      });
      
    } catch (error: any) {
      console.error('💥 Erro ao registrar token:', error);
      toast({
        title: "❌ Erro",
        description: `Falha ao registrar: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const sendTestNotification = async () => {
    if (!deviceToken) {
      toast({
        title: "❌ Erro",
        description: "Device token não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🧪 Enviando notificação teste...');
      
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: "🎉 Teste iOS",
          body: "Notificação push funcionando no seu iPhone!",
          deviceToken: deviceToken
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar teste:', error);
        throw error;
      }

      console.log('✅ Teste enviado:', data);
      
      toast({
        title: "📤 Teste enviado",
        description: "Verifique se a notificação chegou no seu iPhone",
      });
      
    } catch (error: any) {
      console.error('💥 Erro no teste:', error);
      toast({
        title: "❌ Erro",
        description: `Erro no teste: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const resetRegistration = () => {
    setDeviceToken(null);
    setIsRegistered(false);
    setPermissionStatus('prompt');
    localStorage.removeItem('nativeDeviceToken');
    localStorage.removeItem('isNativeRegistered');
    console.log('🔄 Registro resetado');
  };

  return {
    isRegistered,
    isRegistering,
    deviceToken,
    permissionStatus,
    isNativePlatform: Capacitor.isNativePlatform(),
    requestPermissions,
    sendTestNotification,
    resetRegistration
  };
};
