
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Este é o user_id
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Erro OAuth:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `http://www.ellosuit.online/dashboard?error=${error}`
        }
      });
    }

    if (!code || !state) {
      throw new Error('Código ou state ausente');
    }

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${supabaseUrl}/functions/v1/google-auth-callback`
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Erro ao obter tokens: ${tokenData.error}`);
    }

    // Calcular timestamp de expiração
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Salvar conexão no banco
    await supabase.from('google_connections').upsert({
      user_id: state,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      expires_at: expiresAt
    });

    console.log('Conexão Google salva com sucesso para usuário:', state);

    // Redirecionar de volta para o dashboard
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'http://www.ellosuit.online/dashboard?google_connected=true'
      }
    });

  } catch (error) {
    console.error('Erro no callback:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `http://www.ellosuit.online/dashboard?error=${encodeURIComponent(error.message)}`
      }
    });
  }
});
