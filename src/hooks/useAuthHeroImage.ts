import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import defaultAuthHero from '@/assets/auth-hero-julia.jpg';

let cachedUrl: string | null | undefined = undefined;

/**
 * Reads the public auth-screen hero image URL stored in `ellocontent_settings`.
 * Cached in-memory across mounts so the request only happens once per session.
 */
export function useAuthHeroImage() {
  const [url, setUrl] = useState<string | null>(cachedUrl ?? defaultAuthHero);
  const [loading, setLoading] = useState(cachedUrl === undefined);

  useEffect(() => {
    if (cachedUrl !== undefined) return;
    let active = true;
    supabase
      .from('ellocontent_settings')
      .select('value')
      .eq('key', 'auth_hero_image')
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as any)?.url ?? defaultAuthHero;
        cachedUrl = v;
        if (active) {
          setUrl(v);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  return { url, loading };
}
