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
    // Try OneSignal first, fallback to native
    if (ready) {
      try {
        await (OneSignal as any).Notifications.requestPermission();
        setPermission(Notification.permission as any);
        console.log('[OneSignal] Permission granted via SDK');
        return;
      } catch (err) {
        console.warn('[OneSignal] SDK permission failed, trying native:', err);
      }
    }

    // Native fallback - always works if Notification API exists
    if (typeof Notification !== 'undefined') {
      try {
        const result = await Notification.requestPermission();
        setPermission(result as any);
        console.log('[OneSignal] Permission via native:', result);
      } catch (err) {
        console.error('[OneSignal] Native permission error:', err);
        setInitError('Não foi possível solicitar permissão. Tente nas configurações do navegador.');
      }
    } else {
      setInitError('Notificações não suportadas neste navegador/contexto (iframe).');
    }
  }, [ready]);

  return { permission, ready, requestPermission, initError };
}
