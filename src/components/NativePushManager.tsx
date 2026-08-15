import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuth } from '@/components/AuthProvider';
import {
  isNativePushSupported,
  pushNotificationsEnabled,
  registerNativeDeviceToken,
  requestNativePushRegistration,
} from '@/lib/nativePush';

const NativePushManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isNativePushSupported()) return;

    let cancelled = false;
    const handles: PluginListenerHandle[] = [];

    const setup = async () => {
      handles.push(await PushNotifications.addListener('registration', async ({ value }) => {
        try {
          await registerNativeDeviceToken(value);
        } catch (error) {
          console.error('Não foi possível registrar o dispositivo para push:', error);
        }
      }));

      handles.push(await PushNotifications.addListener('registrationError', (error) => {
        console.error('Falha no registro de push:', error);
      }));

      handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const rawActionUrl = notification.data?.action_url || notification.data?.actionUrl;
        if (typeof rawActionUrl !== 'string') return;

        try {
          const url = new URL(rawActionUrl, 'https://ellocontent.com');
          if (url.hostname === 'ellocontent.com' || url.hostname === 'www.ellocontent.com') {
            navigate(`${url.pathname}${url.search}${url.hash}`);
          }
        } catch (error) {
          console.error('Link de notificação inválido:', error);
        }
      }));

      if (!cancelled && pushNotificationsEnabled(user.user_metadata)) {
        await requestNativePushRegistration();
      }
    };

    setup().catch((error) => console.error('Falha ao configurar notificações push:', error));

    return () => {
      cancelled = true;
      handles.forEach((handle) => handle.remove().catch(() => undefined));
    };
  }, [navigate, user?.id, user?.user_metadata?.notification_preferences?.push_notifications]);

  return null;
};

export default NativePushManager;
