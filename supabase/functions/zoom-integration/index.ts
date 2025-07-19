
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

    const requestBody = await req.json();
    console.log('📨 Zoom request body:', JSON.stringify(requestBody, null, 2));
    
    const { action, ...payload } = requestBody;
    console.log('🎯 Zoom Integration Action:', action);

    switch (action) {
      case 'get_auth_url': {
        const { user_id } = payload;
        const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID');
        
        if (!zoomClientId) {
          console.error('❌ ZOOM_CLIENT_ID não configurado');
          throw new Error('ZOOM_CLIENT_ID não configurado');
        }

        if (!user_id) {
          console.error('❌ user_id é obrigatório');
          throw new Error('user_id é obrigatório');
        }

        const redirectUri = 'https://www.ellosuit.online/dashboard';
        const state = `zoom_auth_${user_id}`; // Include user_id in state for security
        
        const authUrl = `https://zoom.us/oauth/authorize?` +
          `client_id=${zoomClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=meeting:write&` +
          `state=${encodeURIComponent(state)}`;

        console.log('🔗 Generated Zoom auth URL with state:', state);

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, user_id } = payload;
        console.log('🔄 Processando exchange_code para Zoom...', { 
          code: code ? 'presente' : 'ausente', 
          user_id 
        });
        
        const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID');
        const zoomClientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

        if (!zoomClientId || !zoomClientSecret) {
          console.error('❌ Credenciais Zoom não configuradas');
          throw new Error('Credenciais Zoom não configuradas');
        }

        if (!code || !user_id) {
          console.error('❌ Parâmetros obrigatórios ausentes:', { code: !!code, user_id: !!user_id });
          throw new Error('Código OAuth e user_id são obrigatórios');
        }

        const redirectUri = 'https://www.ellosuit.online/dashboard';
        
        console.log('🔄 Trocando código por token no Zoom...');
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
          })
        });

        const tokenData = await tokenResponse.json();
        console.log('📡 Resposta do token Zoom:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          hasAccessToken: !!tokenData.access_token,
          error: tokenData.error,
          errorDescription: tokenData.error_description
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro ao obter token Zoom:', tokenData);
          let errorMessage = `Erro ao obter token: ${tokenData.error || 'Erro desconhecido'}`;
          if (tokenData.error_description) {
            errorMessage += ` - ${tokenData.error_description}`;
          }
          throw new Error(errorMessage);
        }

        // Obter informações do usuário
        console.log('👤 Obtendo dados do usuário Zoom...');
        const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        const userData = await userResponse.json();
        console.log('👤 Dados do usuário Zoom:', { 
          id: userData.id, 
          email: userData.email,
          status: userResponse.status 
        });

        if (!userResponse.ok) {
          console.error('❌ Erro ao obter dados do usuário Zoom:', userData);
          throw new Error('Erro ao obter dados do usuário Zoom');
        }

        // Obter company_id do usuário
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .single();

        if (companyError || !companyData?.company_id) {
          console.error('❌ Usuário não associado a empresa:', { user_id, error: companyError });
          throw new Error('Usuário não está associado a uma empresa');
        }

        console.log('🏢 Company ID encontrado:', companyData.company_id);

        // Salvar/atualizar integração
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error: upsertError } = await supabase
          .from('meeting_integrations')
          .upsert({
            user_id: user_id,
            company_id: companyData.company_id,
            provider: 'zoom',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            provider_user_id: userData.id,
            provider_email: userData.email
          }, {
            onConflict: 'user_id,provider'
          });

        if (upsertError) {
          console.error('❌ Erro ao salvar integração Zoom:', upsertError);
          throw upsertError;
        }

        console.log('✅ Integração Zoom salva com sucesso');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_meeting': {
        const { accessToken, eventData } = payload;
        
        console.log('🔍 Creating Zoom meeting with:', { 
          accessToken: accessToken ? 'present' : 'missing', 
          eventData 
        });
        
        if (!accessToken) {
          console.error('❌ Access token missing for Zoom meeting creation');
          throw new Error('Access token is required for creating Zoom meetings');
        }
        
        if (!eventData || !eventData.title || !eventData.start_date) {
          console.error('❌ Invalid event data:', eventData);
          throw new Error('Missing required event data (title, start_date)');
        }
        
        const meetingData = {
          topic: eventData.title,
          type: 2, // Scheduled meeting
          start_time: eventData.start_date,
          duration: 60, // default 60 minutes
          agenda: eventData.description || '',
          settings: {
            join_before_host: true,
            mute_participants_upon_entry: true,
            waiting_room: false,
            auto_recording: "none"
          }
        };

        console.log('📅 Criando reunião Zoom com dados:', meetingData);
        const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(meetingData)
        });

        const meeting = await response.json();
        console.log('📅 Resposta da criação de reunião:', { 
          ok: response.ok, 
          status: response.status,
          meetingId: meeting.id,
          joinUrl: meeting.join_url 
        });
        
        if (!response.ok) {
          console.error('❌ Erro ao criar reunião Zoom:', meeting);
          throw new Error(`Erro ao criar reunião Zoom: ${meeting.message || 'Erro desconhecido'}`);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          meetingLink: meeting.join_url,
          meetingId: meeting.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'renew_token': {
        const { refreshToken, user_id } = payload;
        
        if (!refreshToken || !user_id) {
          throw new Error('Refresh token e user_id são obrigatórios');
        }
        
        const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID');
        const zoomClientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

        if (!zoomClientId || !zoomClientSecret) {
          throw new Error('Credenciais Zoom não configuradas');
        }

        console.log('🔄 Renovando token Zoom...');
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          })
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro ao renovar token Zoom:', tokenData);
          throw new Error(`Erro ao renovar token: ${tokenData.error}`);
        }

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        
        const { error } = await supabase
          .from('meeting_integrations')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || refreshToken,
            expires_at: expiresAt.toISOString()
          })
          .eq('user_id', user_id)
          .eq('provider', 'zoom');

        if (error) {
          console.error('❌ Erro ao atualizar token Zoom:', error);
          throw error;
        }

        console.log('✅ Token Zoom renovado com sucesso');
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
    console.error('💥 Erro na integração Zoom:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
