import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export const isNativePushSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export async function registerNativeDeviceToken(token: string) {
  if (!token) return;

  const { error } = await supabase.functions.invoke('register-device', {
    body: {
      action: 'register',
      token,
      platform: 'ios',
      environment: import.meta.env.DEV ? 'development' : 'production',
    },
  });

  if (error) throw error;
}

export async function requestNativePushRegistration() {
  if (!isNativePushSupported()) return { supported: false, granted: false };

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    return { supported: true, granted: false };
  }

  await PushNotifications.register();
  return { supported: true, granted: true };
}

export async function disableNativePushNotifications() {
  if (!isNativePushSupported()) return;

  try {
    await supabase.functions.invoke('register-device', {
      body: { action: 'unregister-all' },
    });
  } finally {
    await PushNotifications.unregister().catch(() => undefined);
  }
}

export function pushNotificationsEnabled(metadata: Record<string, any> | undefined) {
  return metadata?.notification_preferences?.push_notifications !== false;
}
