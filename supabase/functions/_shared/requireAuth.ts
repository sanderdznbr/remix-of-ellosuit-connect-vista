// Shared auth guard for content generation edge functions.
// Blocks anonymous callers and forces registration on the frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export type AuthGuardResult =
  | { ok: true; userId: string | null; internal: boolean }
  | { ok: false; response: Response };

/**
 * Ensures the request comes from an authenticated end user (or an internal
 * service-role invocation). If not, returns a 401 Response that instructs
 * the client to redirect the visitor to the register flow.
 */
export async function requireAuthenticatedUser(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AuthGuardResult> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const unauthorized = () =>
    new Response(
      JSON.stringify({
        success: false,
        error: 'auth_required',
        message: 'É necessário criar uma conta gratuita para gerar conteúdo.',
        redirect: '/auth?mode=register',
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  if (!token) return { ok: false, response: unauthorized() };

  // Internal edge-to-edge calls use the service role token — allow them through.
  if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, userId: null, internal: true };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub as string | undefined;
    if (error || !userId) return { ok: false, response: unauthorized() };
    return { ok: true, userId, internal: false };
  } catch {
    return { ok: false, response: unauthorized() };
  }
}
