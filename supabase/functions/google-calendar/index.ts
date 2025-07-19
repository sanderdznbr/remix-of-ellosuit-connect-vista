
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações de timeout mais robustas
const REQUEST_TIMEOUT = 10000; // 10 segundos
const MAX_RETRIES = 2;

// Função helper para fazer requests com timeout e retry
async function fetchWithTimeout(url: string, options: any, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt + 1}/${retries + 1} para: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || attempt === retries) {
        return response;
      }
      
      console.log(`⚠️ Tentativa ${attempt + 1} falhou com status: ${response.status}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff
      
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt + 1}:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw new Error('Máximo de tentativas excedido');
}

serve(async (req) => {
  console.log('🚀 Google Calendar Edge Function iniciada');
  console.log('📍 Method:', req.method, 'URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar variáveis de ambiente essenciais
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();
    
    console.log('🔧 Verificando credenciais:', {
      supabaseUrl: supabaseUrl ? 'OK' : 'MISSING',
      serviceKey: supabaseServiceKey ? 'OK' : 'MISSING',
      googleClientId: googleClientId ? 'OK' : 'MISSING',
      googleClientSecret: googleClientSecret ? 'OK' : 'MISSING'
    });

    // Validação rigorosa das credenciais
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials missing');
    }

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client created');

    // Parse request body com timeout
    let requestBody;
    try {
      const rawBody = await Promise.race([
        req.text(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request body timeout')), 5000)
        )
      ]);
      
      console.log('📨 Raw body received:', rawBody ? 'YES' : 'NO');
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(rawBody);
      console.log('📨 Parsed action:', requestBody.action);
    } catch (parseError) {
      console.error('❌ Body parse error:', parseError.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        details: parseError.message
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const { action, ...payload } = requestBody;

    if (!action) {
      return new Response(JSON.stringify({ 
        error: 'Action not specified' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    switch (action) {
      case 'get_client_id': {
        console.log('🔍 Getting Client ID...');
        return new Response(JSON.stringify({ 
          client_id: googleClientId,
          success: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, user_id } = payload;
        
        console.log('🔄 Processing OAuth code exchange...', { 
          hasCode: !!code, 
          user_id,
          codeLength: code?.length || 0
        });
        
        if (!code || !user_id) {
          throw new Error('Code and user_id are required');
        }

        // Usar sempre o mesmo redirect URI
        const redirectUri = 'https://ellosuit.online/dashboard';
        
        const tokenPayload = new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });
        
        console.log('📡 Requesting Google token...');
        
        const tokenResponse = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenPayload,
        });

        const tokenData = await tokenResponse.json();
        console.log('📡 Token response:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          error: tokenData.error
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Token exchange failed:', tokenData);
          
          let errorMessage = 'Failed to exchange OAuth code';
          if (tokenData.error === 'invalid_grant') {
            errorMessage = 'Authorization code expired. Please try connecting again.';
          } else if (tokenData.error === 'invalid_client') {
            errorMessage = 'Invalid Google credentials configured.';
          } else if (tokenData.error === 'redirect_uri_mismatch') {
            errorMessage = `Redirect URI mismatch. Expected: ${redirectUri}`;
          }
          
          throw new Error(errorMessage);
        }

        // Get user info from Google
        console.log('👤 Getting user info...');
        const userResponse = await fetchWithTimeout('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        const userData = await userResponse.json();
        console.log('👤 User data:', { 
          id: userData.id, 
          email: userData.email,
          ok: userResponse.ok
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to get user info: ${userData.error?.message || 'Unknown error'}`);
        }

        // Get company_id
        console.log('🏢 Getting company for user:', user_id);
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .single();

        if (companyError || !companyData?.company_id) {
          console.error('❌ Company lookup failed:', companyError);
          throw new Error('User not associated with a company');
        }

        console.log('🏢 Company found:', companyData.company_id);

        // Calculate expiration
        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
        
        // Save integration
        const integrationData = {
          user_id: user_id,
          company_id: companyData.company_id,
          provider: 'google_meet',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
          provider_user_id: userData.id,
          provider_email: userData.email
        };

        console.log('💾 Saving integration...');
        
        const { data: saveData, error: saveError } = await supabase
          .from('meeting_integrations')
          .upsert(integrationData, {
            onConflict: 'user_id,provider'
          })
          .select()
          .single();

        if (saveError) {
          console.error('❌ Save failed:', saveError);
          throw new Error(`Failed to save integration: ${saveError.message}`);
        }

        console.log('✅ Integration saved successfully');
        
        return new Response(JSON.stringify({ 
          success: true,
          integration_id: saveData?.id,
          message: 'Google Meet connected successfully!'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_event': {
        const { eventData, accessToken } = payload;
        
        console.log('📅 Creating Google Meet event');
        
        if (!accessToken || !eventData?.title || !eventData?.start_date) {
          throw new Error('Missing required parameters for event creation');
        }
        
        const calendarEvent = {
          summary: eventData.title,
          description: eventData.description || '',
          start: {
            dateTime: eventData.start_date,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: eventData.end_date || new Date(new Date(eventData.start_date).getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
            },
          },
          attendees: eventData.attendees?.map((attendee: any) => ({
            email: attendee.email,
            displayName: attendee.displayName || attendee.name,
          })) || [],
        };

        const response = await fetchWithTimeout('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent),
        });

        const event = await response.json();
        
        if (!response.ok) {
          console.error('❌ Event creation failed:', event);
          throw new Error(`Failed to create event: ${event.error?.message || 'Unknown error'}`);
        }

        const meetLink = event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;

        return new Response(JSON.stringify({ 
          success: true, 
          googleEventId: event.id,
          meetLink: meetLink || event.htmlLink 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'renew_token': {
        const { refreshToken, userId } = payload;
        console.log('🔄 Renewing token for user:', userId);
        
        if (!refreshToken || !userId) {
          throw new Error('Refresh token and user ID are required');
        }

        const tokenResponse = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('❌ Token renewal failed:', tokenData);
          throw new Error(`Failed to renew token: ${tokenData.error || 'Unknown error'}`);
        }

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error } = await supabase
          .from('meeting_integrations')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || refreshToken,
            expires_at: expiresAt.toISOString()
          })
          .eq('user_id', userId)
          .eq('provider', 'google_meet');

        if (error) {
          console.error('❌ Failed to save renewed token:', error);
          throw error;
        }

        return new Response(JSON.stringify({ 
          success: true, 
          access_token: tokenData.access_token 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('💥 Edge function error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';
    
    if (error.name === 'AbortError') {
      statusCode = 408;
      errorMessage = 'Request timeout - operation took too long';
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Operation timed out';
    } else if (error.message.includes('credentials') || error.message.includes('not configured')) {
      statusCode = 500;
      errorMessage = 'Server configuration error';
    } else if (error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('Empty')) {
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      success: false
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
