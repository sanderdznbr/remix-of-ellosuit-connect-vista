
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...payload } = await req.json();
    console.log('🎯 Teams Integration Action:', action);

    switch (action) {
      case 'get_auth_url': {
        const teamsClientId = Deno.env.get('TEAMS_CLIENT_ID');
        if (!teamsClientId) {
          throw new Error('TEAMS_CLIENT_ID não configurado');
        }

        const redirectUri = `${req.headers.get('origin')}/dashboard`;
        const scopes = 'https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/User.Read';
        
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${teamsClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `response_mode=query`;

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, userId } = payload;
        const teamsClientId = Deno.env.get('TEAMS_CLIENT_ID');
        const teamsClientSecret = Deno.env.get('TEAMS_CLIENT_SECRET');

        if (!teamsClientId || !teamsClientSecret) {
          throw new Error('Credenciais Teams não configuradas');
        }

        const redirectUri = `${req.headers.get('origin')}/dashboard`;
        
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: teamsClientId,
            client_secret: teamsClientSecret,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          throw new Error(`Erro ao obter token: ${tokenData.error_description}`);
        }

        // Obter informações do usuário
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        const userData = await userResponse.json();

        // Salvar integração
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error } = await supabase
          .from('meeting_integrations')
          .upsert({
            user_id: userId,
            provider: 'teams',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            provider_user_id: userData.id,
            provider_email: userData.mail || userData.userPrincipalName
          }, {
            onConflict: 'user_id,provider'
          });

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_meeting': {
        const { accessToken, eventData } = payload;
        
        const meetingData = {
          startDateTime: eventData.start_date,
          endDateTime: eventData.end_date,
          subject: eventData.title,
          participants: {
            organizer: {
              identity: {
                user: {
                  id: eventData.organizerId
                }
              }
            }
          }
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(meetingData)
        });

        const meeting = await response.json();
        
        if (!response.ok) {
          throw new Error(`Erro ao criar reunião Teams: ${meeting.error?.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          meetingLink: meeting.joinWebUrl,
          meetingId: meeting.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'renew_token': {
        const { refreshToken, userId } = payload;
        const teamsClientId = Deno.env.get('TEAMS_CLIENT_ID');
        const teamsClientSecret = Deno.env.get('TEAMS_CLIENT_SECRET');

        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: teamsClientId,
            client_secret: teamsClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          })
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          throw new Error(`Erro ao renovar token: ${tokenData.error_description}`);
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
          .eq('provider', 'teams');

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
        throw new Error(`Ação não suportada: ${action}`);
    }

  } catch (error) {
    console.error('💥 Erro na integração Teams:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
