import { useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useOneSignal() {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    // Fetch app ID from edge function
    supabase.functions.invoke('onesignal-config').then(({ data }) => {
      if (!data?.appId) {
        console.log('[OneSignal] No app ID configured');
        return;
      }

      OneSignal.init({
        appId: data.appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      }).then(() => {
        initialized.current = true;
        console.log('[OneSignal] Initialized');
      }).catch((err: any) => {
        console.error('[OneSignal] Init error:', err);
      });
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
