
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Google Calendar Edge Function iniciada');
  console.log('📍 Method:', req.method);
  console.log('📍 URL:', req.url);
  
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
    
    console.log('🔧 Verificando variáveis de ambiente:', {
      supabaseUrl: supabaseUrl ? 'OK' : 'FALTANDO',
      serviceKey: supabaseServiceKey ? 'OK' : 'FALTANDO',
      googleClientId: googleClientId ? 'OK' : 'FALTANDO',
      googleClientSecret: googleClientSecret ? 'OK' : 'FALTANDO'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente do Supabase faltando');
      return new Response(JSON.stringify({ 
        error: 'Configuração do servidor incompleta',
        details: 'Supabase credentials missing'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!googleClientId || !googleClientSecret) {
      console.error('❌ Credenciais Google faltando');
      return new Response(JSON.stringify({ 
        error: 'Google credentials not configured',
        details: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client criado');

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📨 Request body recebido:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao parsear request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const { action, ...payload } = requestBody;
    console.log('🎯 Action:', action);

    if (!action) {
      console.error('❌ Action não especificada');
      return new Response(JSON.stringify({ 
        error: 'Action not specified' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    switch (action) {
      case 'get_client_id': {
        console.log('🔍 Obtendo Client ID...');
        
        if (!googleClientId || !googleClientSecret) {
          console.error('❌ Credenciais Google não configuradas');
          throw new Error('Google credentials not configured');
        }
        
        console.log('✅ Credenciais encontradas com sucesso');
        return new Response(JSON.stringify({ client_id: googleClientId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const { code, user_id } = payload;
        
        console.log('🔄 Processando exchange_code...', { 
          code: code ? `presente (${code.substring(0, 20)}...)` : 'AUSENTE', 
          user_id
        });
        
        // Validação rigorosa
        if (!code) {
          console.error('❌ Código de autorização não fornecido');
          throw new Error('Código de autorização é obrigatório');
        }
        
        if (!user_id) {
          console.error('❌ User ID não fornecido');
          throw new Error('User ID é obrigatório');
        }

        if (!googleClientId || !googleClientSecret) {
          console.error('❌ Credenciais Google não configuradas no exchange_code');
          throw new Error('Credenciais Google não configuradas');
        }
        
        // CORREÇÃO: Usar redirect_uri dinâmico baseado no origin da requisição
        const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
        let redirectUri = `${origin}/dashboard`;
        
        // Se não conseguir detectar o origin, usar fallback padrão
        if (!origin) {
          redirectUri = 'https://ellosuit.online/dashboard';
        }
        
        console.log('🔗 Redirect URI detectado:', redirectUri);
        
        const tokenPayload = {
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        };
        
        console.log('📡 Fazendo request para Google token API...');
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenPayload),
        });

        const tokenData = await tokenResponse.json();
        console.log('📡 Resposta do token:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          error: tokenData.error,
          errorDescription: tokenData.error_description
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro detalhado ao obter token:', tokenData);
          
          let errorMessage = 'Erro ao obter token do Google';
          if (tokenData.error === 'invalid_grant') {
            errorMessage = 'Código de autorização inválido ou expirado. Tente conectar novamente.';
          } else if (tokenData.error === 'invalid_client') {
            errorMessage = 'Credenciais Google inválidas. Verifique o Client ID e Client Secret.';
          } else if (tokenData.error === 'redirect_uri_mismatch') {
            errorMessage = `Redirect URI não configurado corretamente no Google Console. URI usado: ${redirectUri}`;
          }
          
          throw new Error(errorMessage);
        }

        // Obter informações do usuário
        console.log('👤 Obtendo dados do usuário do Google...');
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
          throw new Error(`Erro ao obter dados do usuário: ${userData.error?.message || userResponse.statusText}`);
        }

        // Obter company_id do usuário
        console.log('🏢 Buscando company_id para user_id:', user_id);
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .single();

        if (companyError) {
          console.error('❌ Erro ao buscar company_id:', companyError);
          throw new Error(`Erro ao buscar dados da empresa: ${companyError.message}`);
        }

        if (!companyData?.company_id) {
          console.error('❌ Usuário não associado a empresa:', { user_id, companyData });
          throw new Error('Usuário não está associado a uma empresa');
        }

        console.log('🏢 Company ID encontrado:', companyData.company_id);

        // Calcular data de expiração
        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
        
        // Dados para salvar na integração
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

        console.log('💾 Salvando integração:', {
          user_id,
          company_id: companyData.company_id,
          provider: 'google_meet',
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresAt: expiresAt.toISOString(),
          provider_user_id: userData.id,
          provider_email: userData.email
        });
        
        // Salvar integração com upsert mais robusto
        const { data: saveData, error: saveError } = await supabase
          .from('meeting_integrations')
          .upsert(integrationData, {
            onConflict: 'user_id,provider'
          })
          .select()
          .single();

        if (saveError) {
          console.error('❌ Erro ao salvar integração:', saveError);
          throw new Error(`Erro ao salvar integração: ${saveError.message}`);
        }

        console.log('✅ Integração salva com sucesso:', saveData);
        
        return new Response(JSON.stringify({ 
          success: true,
          integration_id: saveData?.id,
          message: 'Google Meet conectado com sucesso!'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_event': {
        const { eventData, accessToken } = payload;
        
        console.log('🔍 Creating Google Meet event');
        
        if (!accessToken) {
          throw new Error('Access token is required for creating Google Calendar events');
        }
        
        if (!eventData || !eventData.title || !eventData.start_date) {
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
        
        if (!googleClientId || !googleClientSecret) {
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
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro ao renovar token:', tokenData);
          throw new Error(`Erro ao renovar token: ${tokenData.error || 'Erro desconhecido'}`);
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
          console.error('❌ Erro ao salvar token renovado:', error);
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
    console.error('💥 Erro na edge function:', error);
    
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.name === 'AbortError') {
      statusCode = 408;
      errorMessage = 'Request timeout - operação demorou muito para completar';
    } else if (error.message.includes('JWT')) {
      statusCode = 401;
      errorMessage = 'Erro de autenticação JWT';
    } else if (error.message.includes('não configurado') || error.message.includes('not configured')) {
      statusCode = 500;
      errorMessage = 'Erro de configuração do servidor';
    } else if (error.message.includes('Invalid JSON') || error.message.includes('Action not specified')) {
      statusCode = 400;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
