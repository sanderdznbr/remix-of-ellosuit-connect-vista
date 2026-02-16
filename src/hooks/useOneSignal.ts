import { useEffect, useRef, useState, useCallback } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/hooks/useAuth';

const ONESIGNAL_APP_ID = "61ba07fc-0952-40dc-baa3-1a5783ac0b61";
const SAFARI_WEB_ID = "web.onesignal.auto.4cc30974-98f9-47ba-8e02-4635d2d477f2";

export function useOneSignal() {
  const { user } = useAuth();
  const initialized = useRef(false);
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;

    // Check if Notification API is available
    if (typeof Notification === 'undefined') {
      setInitError('Notificações não suportadas neste navegador/contexto.');
      console.warn('[OneSignal] Notification API not available');
      return;
    }

    // Update permission from browser immediately
    setPermission(Notification.permission as any);

    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: SAFARI_WEB_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    } as any).then(() => {
      initialized.current = true;
      setReady(true);
      setInitError(null);
      console.log('[OneSignal] Initialized');
      setPermission(Notification.permission as any);
    }).catch((err: any) => {
      console.error('[OneSignal] Init error:', err);
      setInitError(err?.message || 'Falha ao inicializar OneSignal');
    });
  }, []);

  // Associate Supabase user with OneSignal external ID
  useEffect(() => {
    if (!ready || !user?.id) return;

    try {
      OneSignal.login(user.id);
      console.log('[OneSignal] Logged in user:', user.id);
    } catch (err) {
      console.error('[OneSignal] Login error:', err);
    }
  }, [user?.id, ready]);

  const requestPermission = useCallback(async () => {
    if (!ready) return;
    try {
      await (OneSignal as any).Notifications.requestPermission();
      const perm = (Notification as any)?.permission || 'default';
      setPermission(perm);
      console.log('[OneSignal] Permission after request:', perm);
    } catch (err) {
      console.error('[OneSignal] Permission request error:', err);
    }
  }, [ready]);

  const requestNativePermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setInitError('Notificações não suportadas neste navegador.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as any);
    } catch (err) {
      console.error('[OneSignal] Native permission error:', err);
    }
  }, []);

  return { permission, ready, requestPermission, requestNativePermission, initError };
}
