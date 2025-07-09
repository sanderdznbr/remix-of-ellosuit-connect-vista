
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Edge function atualizada - 2025-01-09 17:30 - Forçar redeploy com secrets
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    console.log('📨 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { action, ...payload } = requestBody;
    console.log('🎯 Action:', action);
    
    // Log para verificar se a função está sendo executada com as secrets corretas
    console.log('🔍 Verificando secrets no início da função:', {
      GOOGLE_CLIENT_ID: Deno.env.get('GOOGLE_CLIENT_ID') ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
      GOOGLE_CLIENT_SECRET: Deno.env.get('GOOGLE_CLIENT_SECRET') ? 'CONFIGURADO' : 'NÃO CONFIGURADO'
    });

    switch (action) {
      case 'get_client_id': {
        console.log('🔍 Obtendo Client ID...');
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
        const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();
        
        console.log('🔧 Status das secrets:', {
          clientId: googleClientId ? `Configurado (${googleClientId.substring(0, 20)}...)` : 'NÃO CONFIGURADO',
          clientSecret: googleClientSecret ? 'Configurado' : 'NÃO CONFIGURADO'
        });
        
        if (!googleClientId) {
          console.error('❌ GOOGLE_CLIENT_ID não encontrado nas secrets');
          throw new Error('Google Client ID não configurado');
        }
        
        if (!googleClientSecret) {
          console.error('❌ GOOGLE_CLIENT_SECRET não encontrado nas secrets');
          throw new Error('Google Client Secret não configurado');
        }
        
        console.log('✅ Ambas as credenciais encontradas com sucesso');
        return new Response(JSON.stringify({ client_id: googleClientId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, user_id } = payload;
        const redirectUri = 'https://www.ellosuit.online/dashboard';
        console.log('🔄 Processando exchange_code...', { 
          code: code ? 'presente' : 'ausente', 
          user_id,
          redirectUri 
        });
        
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
        const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();

        console.log('🔧 Verificando credenciais no exchange_code:', {
          clientId: googleClientId ? `Configurado (${googleClientId.substring(0, 20)}...)` : 'NÃO CONFIGURADO',
          clientSecret: googleClientSecret ? 'Configurado' : 'NÃO CONFIGURADO'
        });

        if (!googleClientId || !googleClientSecret) {
          console.error('❌ Credenciais Google não configuradas no exchange_code');
          throw new Error('Credenciais Google não configuradas');
        }
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = await tokenResponse.json();
        console.log('📡 Resposta do token:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          hasAccessToken: !!tokenData.access_token,
          error: tokenData.error 
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro ao obter token:', tokenData);
          throw new Error(`Erro ao obter token: ${tokenData.error || 'Erro desconhecido'}`);
        }

        // Obter informações do usuário
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        const userData = await userResponse.json();
        console.log('👤 Dados do usuário:', { 
          id: userData.id, 
          email: userData.email,
          status: userResponse.status 
        });

        if (!userResponse.ok) {
          console.error('❌ Erro ao obter dados do usuário:', userData);
          throw new Error('Erro ao obter dados do usuário');
        }

        // Obter company_id do usuário
        const { data: companyData } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .single();

        if (!companyData?.company_id) {
          console.error('❌ Usuário não associado a empresa:', { user_id });
          throw new Error('Usuário não está associado a uma empresa');
        }

        console.log('🏢 Company ID encontrado:', companyData.company_id);

        // Salvar integração
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error } = await supabase
          .from('meeting_integrations')
          .upsert({
            user_id: user_id,
            company_id: companyData.company_id,
            provider: 'google_meet',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            provider_user_id: userData.id,
            provider_email: userData.email
          }, {
            onConflict: 'user_id,provider'
          });

        if (error) {
          console.error('❌ Erro ao salvar integração:', error);
          throw error;
        }

        console.log('✅ Integração salva com sucesso');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_event': {
        const { eventData, accessToken } = payload;
        
        console.log('🔍 Creating Google Meet event with:', { accessToken: accessToken ? 'present' : 'missing', eventData });
        
        if (!accessToken) {
          console.error('❌ Access token missing for Google Calendar event creation');
          throw new Error('Access token is required for creating Google Calendar events');
        }
        
        if (!eventData || !eventData.title || !eventData.start_date) {
          console.error('❌ Invalid event data:', eventData);
          throw new Error('Missing required event data (title, start_date)');
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

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent),
        });

        const event = await response.json();
        
        if (!response.ok) {
          console.error('❌ Erro ao criar evento:', event);
          throw new Error(`Erro ao criar evento: ${event.error?.message || 'Erro desconhecido'}`);
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
        console.log('🔄 Renovando token para usuário:', userId);
        
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
        const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();

        if (!googleClientId || !googleClientSecret) {
          console.error('❌ Credenciais Google não configuradas para renovação');
          throw new Error('Credenciais Google não configuradas');
        }

        console.log('📡 Fazendo request para renovar token...');
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
        console.log('📡 Resposta renovação token:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          hasAccessToken: !!tokenData.access_token,
          error: tokenData.error 
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro ao renovar token:', tokenData);
          throw new Error(`Erro ao renovar token: ${tokenData.error || 'Erro desconhecido'}`);
        }

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        console.log('🕐 Novo token expira em:', expiresAt.toISOString());
        
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
          console.error('❌ Erro ao salvar token renovado:', error);
          throw error;
        }

        console.log('✅ Token renovado e salvo com sucesso');
        return new Response(JSON.stringify({ 
          success: true, 
          access_token: tokenData.access_token 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'import_events': {
        const { accessToken, userId } = payload;
        
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`Erro ao importar eventos: ${data.error?.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          imported: data.items?.length || 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

  } catch (error) {
    console.error('💥 Erro na edge function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
