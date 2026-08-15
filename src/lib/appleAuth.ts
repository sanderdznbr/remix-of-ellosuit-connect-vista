import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl, isNativeIOS } from '@/lib/platform';

const APPLE_BUNDLE_ID = 'com.ellocontent.app';
const APPLE_CALLBACK_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co/auth/v1/callback';

const createNoncePair = async () => {
  const rawNonce = crypto.randomUUID();
  const encodedNonce = new TextEncoder().encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { rawNonce, hashedNonce };
};

export const isAppleSignInCancellation = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel|canceled|cancelled|1001/i.test(message);
};

export const signInWithApple = async () => {
  if (!isNativeIOS()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: getAuthRedirectUrl('/') },
    });

    if (error) throw error;
    return;
  }

  const { rawNonce, hashedNonce } = await createNoncePair();
  const credential = await SignInWithApple.authorize({
    clientId: APPLE_BUNDLE_ID,
    redirectURI: APPLE_CALLBACK_URL,
    scopes: 'email name',
    state: crypto.randomUUID(),
    nonce: hashedNonce,
  });

  const identityToken = credential.response.identityToken;
  if (!identityToken) {
    throw new Error('A Apple não retornou um token de identidade. Tente novamente.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  const givenName = credential.response.givenName?.trim() || null;
  const familyName = credential.response.familyName?.trim() || null;
  const fullName = [givenName, familyName].filter(Boolean).join(' ');

  // Apple sends the name only on the user's first authorization.
  if (fullName) {
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: givenName,
        family_name: familyName,
        source: 'ellocontent',
      },
    });
  }
};
