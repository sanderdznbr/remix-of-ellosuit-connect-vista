
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout utilities
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
};

serve(async (req) => {
  console.log('🚀 Google Calendar Function:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();
    
    console.log('🔧 Environment check:', {
      supabaseUrl: !!supabaseUrl,
      serviceKey: !!supabaseServiceKey,
      googleClientId: !!googleClientId,
      googleClientSecret: !!googleClientSecret
    });

    if (!supabaseUrl || !supabaseServiceKey || !googleClientId || !googleClientSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.text();
    if (!body) {
      throw new Error('Request body is required');
    }
    
    const { action, ...payload } = JSON.parse(body);
    console.log('📝 Action:', action);

    switch (action) {
      case 'get_client_id': {
        console.log('🔑 Returning Google Client ID');
        return new Response(JSON.stringify({ 
          client_id: googleClientId,
          success: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, user_id } = payload;
        
        if (!code || !user_id) {
          throw new Error('Code and user_id are required');
        }

        console.log('🔄 Exchanging code for user:', user_id);
        
        // CRITICAL FIX: Use the API callback URL
        const redirectUri = `${supabaseUrl}/functions/v1/google-calendar`;
        console.log('🔗 Using redirect URI:', redirectUri);
        
        const tokenParams = new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });

        console.log('📤 Token exchange request:');
        console.log('  - Client ID:', googleClientId.substring(0, 20) + '...');
        console.log('  - Redirect URI:', redirectUri);
        console.log('  - Code length:', code.length);

        const tokenResponse = await withTimeout(
          fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenParams,
          }),
          15000 // 15 second timeout
        );

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('❌ Token exchange failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            error: tokenData
          });
          
          let errorMessage = `Token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`;
          
          if (tokenData.error === 'redirect_uri_mismatch') {
            errorMessage = `Erro de configuração OAuth. Configure no Google Cloud Console:

Authorized JavaScript origins:
https://ellosuit.online

Authorized redirect URIs:
${redirectUri}

Verifique se as URLs estão EXATAMENTE como mostrado acima.`;
          } else if (tokenData.error === 'invalid_grant') {
            errorMessage = 'Código de autorização expirado ou inválido. Tente conectar novamente.';
          }
          
          throw new Error(errorMessage);
        }

        console.log('✅ Token obtained successfully');

        // Get user info with timeout
        const userResponse = await withTimeout(
          fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          }),
          10000
        );

        const userData = await userResponse.json();
        
        if (!userResponse.ok) {
          console.error('❌ User info failed:', userData);
          throw new Error('Failed to get user info from Google');
        }

        console.log('👤 User info obtained:', { email: userData.email, id: userData.id });

        // Get company_id
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

        // Save integration with proper error handling
        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
        
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

        console.log('💾 Saving integration data...');

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

        console.log('✅ Integration saved successfully:', saveData.id);
        
        // Redirect back to dashboard after successful connection
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': 'https://ellosuit.online/dashboard?google_connected=true'
          }
        });
      }

      case 'create_event': {
        const { eventData, accessToken } = payload;
        
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

        const response = await withTimeout(
          fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarEvent),
          }),
          15000
        );

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
        
        if (!refreshToken || !userId) {
          throw new Error('Refresh token and user ID are required');
        }

        const tokenResponse = await withTimeout(
          fetch('https://oauth2.googleapis.com/token', {
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
          }),
          10000
        );

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
    console.error('💥 Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
