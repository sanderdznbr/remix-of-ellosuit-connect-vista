
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
  console.log('📍 Headers:', Object.fromEntries(req.headers.entries()));
  
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

    // Parse request body com timeout
    let requestBody;
    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 10000); // 10s timeout
      
      requestBody = await req.json();
      clearTimeout(timeoutId);
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
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

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
        const redirectUri = 'https://84320702-4971-42e0-bb91-6756570feabc.lovableproject.com/dashboard';
        
        console.log('🔄 Processando exchange_code...', { 
          code: code ? `presente (${code.substring(0, 20)}...)` : 'AUSENTE', 
          user_id,
          redirectUri 
        });
        
        // Validação de entrada
        if (!code) {
          console.error('❌ Código de autorização não fornecido');
          throw new Error('Código de autorização é obrigatório');
        }
        
        if (!user_id) {
          console.error('❌ User ID não fornecido');
          throw new Error('User ID é obrigatório');
        }
        
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
        const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();

        console.log('🔧 Verificando credenciais no exchange_code:', {
          clientId: googleClientId ? `Configurado (${googleClientId.substring(0, 20)}...)` : 'NÃO CONFIGURADO',
          clientSecret: googleClientSecret ? `Configurado (${googleClientSecret.substring(0, 10)}...)` : 'NÃO CONFIGURADO',
          clientIdLength: googleClientId?.length || 0,
          clientSecretLength: googleClientSecret?.length || 0
        });

        if (!googleClientId || !googleClientSecret) {
          console.error('❌ Credenciais Google não configuradas no exchange_code');
          throw new Error('Credenciais Google não configuradas');
        }
        
        // Verificar se as credenciais parecem válidas
        if (!googleClientId.endsWith('.apps.googleusercontent.com')) {
          console.error('❌ Client ID não parece válido (deve terminar com .apps.googleusercontent.com)');
          throw new Error('Client ID inválido');
        }
        
        const tokenPayload = {
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        };
        
        console.log('📡 Fazendo request para Google token API...', {
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          clientIdUsed: googleClientId.substring(0, 20) + '...',
          codeUsed: code.substring(0, 20) + '...',
          redirectUri: redirectUri
        });
        
        const tokenController = new AbortController();
        const tokenTimeout = setTimeout(() => {
          console.error('⏰ Timeout na requisição do token');
          tokenController.abort();
        }, 15000); // 15s timeout

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenPayload),
          signal: tokenController.signal,
        });

        clearTimeout(tokenTimeout);

        const tokenData = await tokenResponse.json();
        console.log('📡 Resposta completa do token:', { 
          ok: tokenResponse.ok, 
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          error: tokenData.error,
          errorDescription: tokenData.error_description,
          fullResponse: tokenData
        });
        
        if (!tokenResponse.ok) {
          console.error('❌ Erro detalhado ao obter token:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            error: tokenData.error,
            errorDescription: tokenData.error_description,
            fullTokenData: tokenData
          });
          
          // Mensagens de erro mais específicas
          let errorMessage = 'Erro ao obter token do Google';
          if (tokenData.error === 'invalid_grant') {
            errorMessage = 'Código de autorização inválido ou expirado. Tente conectar novamente.';
          } else if (tokenData.error === 'invalid_client') {
            errorMessage = 'Credenciais Google inválidas. Verifique o Client ID e Client Secret.';
          } else if (tokenData.error === 'redirect_uri_mismatch') {
            errorMessage = 'Redirect URI não configurado corretamente no Google Console.';
          } else if (tokenData.error_description) {
            errorMessage = `Erro Google: ${tokenData.error_description}`;
          }
          
          throw new Error(errorMessage);
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
    console.error('💥 Stack trace:', error.stack);
    console.error('💥 Error name:', error.name);
    console.error('💥 Error message:', error.message);
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.name === 'AbortError') {
      statusCode = 408; // Request Timeout
      errorMessage = 'Request timeout - operação demorou muito para completar';
    } else if (error.message.includes('JWT')) {
      statusCode = 401; // Unauthorized
      errorMessage = 'Erro de autenticação JWT';
    } else if (error.message.includes('não configurado') || error.message.includes('not configured')) {
      statusCode = 500; // Server configuration error
      errorMessage = 'Erro de configuração do servidor';
    } else if (error.message.includes('Invalid JSON') || error.message.includes('Action not specified')) {
      statusCode = 400; // Bad Request
    } else if (error.message.includes('não encontrado') || error.message.includes('não associado')) {
      statusCode = 404; // Not Found
      errorMessage = 'Recurso não encontrado';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack?.split('\n').slice(0, 5) // Primeiras 5 linhas do stack
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
