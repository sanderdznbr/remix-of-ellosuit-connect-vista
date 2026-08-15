import { Capacitor } from '@capacitor/core';

export const isNativeIOS = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const getAuthRedirectUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Supabase confirmation and recovery emails must use an HTTPS URL that is
  // already allowed in the project's redirect configuration. The web flow
  // completes on ElloSuit and the user can then return to the installed app.
  if (isNativeIOS()) {
    return `https://www.ellosuit.app${normalizedPath}`;
  }

  return `${window.location.origin}${normalizedPath}`;
};
