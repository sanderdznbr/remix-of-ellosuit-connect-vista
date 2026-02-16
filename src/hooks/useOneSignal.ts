import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/hooks/useAuth';

const ONESIGNAL_APP_ID = "61ba07fc-0952-40dc-baa3-1a5783ac0b61";
const SAFARI_WEB_ID = "web.onesignal.auto.4cc30974-98f9-47ba-8e02-4635d2d477f2";

export function useOneSignal() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: SAFARI_WEB_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    } as any).then(() => {
      initialized.current = true;
      console.log('[OneSignal] Initialized');
    }).catch((err: any) => {
      console.error('[OneSignal] Init error:', err);
    });
  }, []);

  // Associate Supabase user with OneSignal external ID
  useEffect(() => {
    if (!initialized.current || !user?.id) return;

    try {
      OneSignal.login(user.id);
      console.log('[OneSignal] Logged in user:', user.id);
    } catch (err) {
      console.error('[OneSignal] Login error:', err);
    }
  }, [user?.id]);
}
