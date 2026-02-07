import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { action, sessionId, instanceName, companyId, userId, phone, message, baileysServerUrl } = body;
    
    // Get Baileys server URL from request, session, or env
    let BAILEYS_URL = baileysServerUrl || Deno.env.get('BAILEYS_SERVER_URL') || '';
    
    console.log(`[WhatsApp API] Action: ${action}, Instance: ${instanceName || sessionId}`);

    switch (action) {
      // ==================== CREATE INSTANCE ====================
      case 'create_instance': {
        if (!instanceName || !companyId || !userId) {
          return new Response(JSON.stringify({ error: 'instanceName, companyId e userId são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Generate webhook secret for this session
        const webhookSecret = crypto.randomUUID();
        const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

        // Create session in database
        const { data: session, error: sessionError } = await supabase
          .from('whatsapp_sessions')
          .insert({
            company_id: companyId,
            user_id: userId,
            instance_name: instanceName,
            status: 'connecting',
            webhook_secret: webhookSecret,
            baileys_server_url: baileysServerUrl || BAILEYS_URL,
            settings: { 
              webhook_url: webhookUrl,
              created_from: 'lovable'
            }
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          return new Response(JSON.stringify({ error: 'Falha ao criar sessão', details: sessionError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If Baileys server is configured, create instance there
        if (BAILEYS_URL || baileysServerUrl) {
          const serverUrl = baileysServerUrl || BAILEYS_URL;
          try {
            const baileysResponse = await fetch(`${serverUrl}/api/instance/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: session.id,
                instanceName: instanceName,
                webhookUrl: webhookUrl,
                webhookSecret: webhookSecret
              })
            });

            if (baileysResponse.ok) {
              const baileysData = await baileysResponse.json();
              console.log('Baileys instance created:', baileysData);
              
              // Update session with QR code if available
              if (baileysData.qrCode) {
                await supabase
                  .from('whatsapp_sessions')
                  .update({ qr_code: baileysData.qrCode })
                  .eq('id', session.id);
              }
            } else {
              const errorText = await baileysResponse.text();
              console.error('Baileys server error:', errorText);
            }
          } catch (e) {
            console.error('Error connecting to Baileys server:', e);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          session,
          webhookUrl,
          webhookSecret,
          message: BAILEYS_URL ? 'Conectando ao servidor Baileys...' : 'Sessão criada. Configure o servidor Baileys externo.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== GET QR CODE ====================
      case 'get_qr_code': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const serverUrl = session.baileys_server_url || BAILEYS_URL;
        
        // v2.2.0: Rate-limiting - calcular idade da sessão
        const sessionAge = Date.now() - new Date(session.created_at).getTime();
        
        console.log(`[QR] Fetching QR for session ${sessionId}, server: ${serverUrl}, age: ${Math.round(sessionAge/1000)}s`);
        
        // Try to get fresh QR from Baileys server
        if (serverUrl) {
          try {
            const qrResponse = await fetch(`${serverUrl}/api/instance/${sessionId}/qr`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            console.log(`[QR] Server response status: ${qrResponse.status}`);

            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              console.log(`[QR] Got data:`, { hasQR: !!qrData.qrCode, isConnected: qrData.isConnected });
              
              if (qrData.isConnected) {
                // Session is already connected
                await supabase
                  .from('whatsapp_sessions')
                  .update({ 
                    status: 'connected',
                    phone_number: qrData.phoneNumber,
                    push_name: qrData.pushName,
                    connected_at: new Date().toISOString()
                  })
                  .eq('id', sessionId);
                
                return new Response(JSON.stringify({ 
                  qrCode: null,
                  status: 'connected',
                  isConnected: true,
                  phoneNumber: qrData.phoneNumber,
                  pushName: qrData.pushName
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
              
              if (qrData.qrCode) {
                // Save QR to database for caching
                await supabase
                  .from('whatsapp_sessions')
                  .update({ qr_code: qrData.qrCode, status: 'waiting_qr' })
                  .eq('id', sessionId);
                
                return new Response(JSON.stringify({ 
                  qrCode: qrData.qrCode,
                  status: 'waiting_qr',
                  isConnected: false
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
            
            // If 404, check session age before recreating
            if (qrResponse.status === 404) {
              // v2.2.0: NÃO recriar se a sessão é muito recente (< 30s)
              if (sessionAge < 30000) {
                console.log(`[QR] Session is recent (${Math.round(sessionAge/1000)}s), waiting for server to initialize...`);
                return new Response(JSON.stringify({ 
                  qrCode: null,
                  status: 'initializing',
                  message: 'Aguardando servidor inicializar sessão...',
                  sessionAge: Math.round(sessionAge/1000)
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
              
              console.log(`[QR] Session not found on server (age: ${Math.round(sessionAge/1000)}s), recreating...`);
              
              const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
              const createResponse = await fetch(`${serverUrl}/api/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: session.id,
                  instanceName: session.instance_name,
                  webhookUrl: webhookUrl,
                  webhookSecret: session.webhook_secret || ''
                })
              });
              
              if (createResponse.ok) {
                console.log(`[QR] Instance recreated, waiting for QR...`);
                // Wait a moment for QR to generate
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try to get QR again
                const retryResponse = await fetch(`${serverUrl}/api/instance/${sessionId}/qr`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.qrCode) {
                    await supabase
                      .from('whatsapp_sessions')
                      .update({ qr_code: retryData.qrCode, status: 'waiting_qr' })
                      .eq('id', sessionId);
                    
                    return new Response(JSON.stringify({ 
                      qrCode: retryData.qrCode,
                      status: 'waiting_qr',
                      isConnected: false
                    }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error('[QR] Error fetching QR from Baileys:', e);
          }
        }

        // Return status indicating waiting for QR
        return new Response(JSON.stringify({ 
          qrCode: null,
          status: 'generating',
          message: serverUrl ? 'Gerando QR Code, aguarde...' : 'Configure o servidor Baileys para conectar'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== CHECK STATUS ====================
      case 'check_status': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const serverUrl = session.baileys_server_url || BAILEYS_URL;

        console.log(`[STATUS] Checking status for session ${sessionId}, server: ${serverUrl}`);

        // Check status from Baileys server
        if (serverUrl) {
          try {
            // Use session.id (sessionId) not instance_name
            const statusResponse = await fetch(`${serverUrl}/api/instance/${sessionId}/status`, {
              headers: { 'Content-Type': 'application/json' }
            });

            console.log(`[STATUS] Server response: ${statusResponse.status}`);

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log(`[STATUS] Data:`, statusData);
              
              const isConnected = statusData.status === 'connected' || statusData.isConnected;
              
              if (isConnected && session.status !== 'connected') {
                await supabase
                  .from('whatsapp_sessions')
                  .update({
                    status: 'connected',
                    connected_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString(),
                    phone_number: statusData.phoneNumber,
                    push_name: statusData.pushName,
                    profile_picture: statusData.profilePicture
                  })
                  .eq('id', sessionId);
              }
              
              return new Response(JSON.stringify({ 
                status: isConnected ? 'connected' : (statusData.status || session.status),
                phoneNumber: statusData.phoneNumber,
                pushName: statusData.pushName,
                profilePicture: statusData.profilePicture,
                isConnected
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.error('[STATUS] Error checking Baileys status:', e);
          }
        }

        return new Response(JSON.stringify({ 
          status: session.status,
          isDemo: !serverUrl,
          phoneNumber: session.phone_number,
          pushName: session.push_name
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== REGENERATE QR CODE ====================
      case 'regenerate_qr': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const serverUrl = session.baileys_server_url || BAILEYS_URL;
        
        if (!serverUrl) {
          return new Response(JSON.stringify({ error: 'Servidor Baileys não configurado' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`[REGENERATE] Force regenerating QR for session ${sessionId}`);

        try {
          // v2.3.0: Usar novo endpoint /regenerate-qr do servidor
          console.log(`[REGENERATE] Calling server regenerate endpoint...`);
          const regenerateResponse = await fetch(`${serverUrl}/api/instance/${sessionId}/regenerate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (regenerateResponse.status === 404) {
            // Sessão não existe no servidor, criar nova
            console.log(`[REGENERATE] Session not found, creating new...`);
            const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
            await fetch(`${serverUrl}/api/instance/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: session.id,
                instanceName: session.instance_name,
                webhookUrl: webhookUrl,
                webhookSecret: session.webhook_secret || ''
              })
            });
          }
          
          console.log(`[REGENERATE] Waiting for QR to generate...`);
          
          // Poll for QR code (up to 15 seconds with more retries)
          let qrCode = null;
          for (let i = 0; i < 8; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const qrResponse = await fetch(`${serverUrl}/api/instance/${sessionId}/qr`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              console.log(`[REGENERATE] QR poll ${i+1}/8:`, { hasQR: !!qrData.qrCode, isConnected: qrData.isConnected, qrRetryCount: qrData.qrRetryCount });
              
              if (qrData.qrCode) {
                qrCode = qrData.qrCode;
                
                // Save to database
                await supabase
                  .from('whatsapp_sessions')
                  .update({ qr_code: qrCode, status: 'waiting_qr' })
                  .eq('id', sessionId);
                
                break;
              }
              
              if (qrData.isConnected) {
                return new Response(JSON.stringify({ 
                  qrCode: null,
                  status: 'connected',
                  isConnected: true,
                  phoneNumber: qrData.phoneNumber,
                  pushName: qrData.pushName
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          }
          
          if (qrCode) {
            return new Response(JSON.stringify({ 
              qrCode,
              status: 'waiting_qr',
              isConnected: false,
              message: 'QR Code regenerado com sucesso'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          // QR not generated yet, return status
          return new Response(JSON.stringify({ 
            qrCode: null,
            status: 'generating',
            message: 'QR Code em geração, servidor tentando automaticamente...'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } catch (e) {
          console.error('[REGENERATE] Error:', e);
          return new Response(JSON.stringify({ 
            error: 'Erro ao regenerar QR Code',
            details: e.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ==================== SEND MESSAGE ====================
      case 'send_message': {
        if (!sessionId || !phone || !message) {
          return new Response(JSON.stringify({ error: 'sessionId, phone e message são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const serverUrl = session.baileys_server_url || BAILEYS_URL;
        const cleanPhone = phone.replace(/\D/g, '');
        const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

        // Find or create conversation
        let { data: conversation } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('session_id', sessionId)
          .eq('contact_phone', phone)
          .single();

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('whatsapp_conversations')
            .insert({
              session_id: sessionId,
              company_id: session.company_id,
              contact_phone: phone,
              status: 'open',
              last_message_at: new Date().toISOString()
            })
            .select()
            .single();
          conversation = newConv;
        }

        // Send via Baileys if connected
        if (serverUrl && session.status === 'connected') {
          try {
            console.log(`[SEND] Sending to ${jid} via ${serverUrl}`);
            
            // Use the correct endpoint: /api/message/send (v3.7.0)
            const sendResponse = await fetch(`${serverUrl}/api/message/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                sessionId: sessionId,
                phone: cleanPhone,
                message: message
              })
            });

            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              
              // DON'T insert message here - the webhook will handle it
              // This prevents duplicate messages (one from API, one from webhook)
              // The webhook has proper deduplication by wa_message_id
              
              // Just update conversation last_message
              await supabase
                .from('whatsapp_conversations')
                .update({
                  last_message: message,
                  last_message_at: new Date().toISOString()
                })
                .eq('id', conversation?.id);

              return new Response(JSON.stringify({ 
                success: true, 
                messageId: sendData.messageId || sendData.key?.id 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            } else {
              const errorText = await sendResponse.text();
              console.error('Baileys send error:', errorText);
              
              // Parse error message for better user feedback
              let errorMessage = 'Falha ao enviar mensagem';
              let errorDetails = errorText;
              
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error === 'Session not connected') {
                  errorMessage = 'WhatsApp desconectado no servidor';
                  errorDetails = 'A sessão foi desconectada. Reconecte escaneando o QR Code novamente.';
                  
                  // Update session status in database
                  await supabase
                    .from('whatsapp_sessions')
                    .update({ status: 'disconnected', connected_at: null })
                    .eq('id', sessionId);
                }
              } catch {
                // Not JSON, use raw error
              }
              
              return new Response(JSON.stringify({ error: errorMessage, details: errorDetails }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e: any) {
            console.error('Error sending via Baileys:', e);
            return new Response(JSON.stringify({ 
              error: 'Erro de conexão com servidor', 
              details: e.message || 'Não foi possível conectar ao servidor WhatsApp'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Demo mode - save locally
        await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversation?.id,
            session_id: sessionId,
            company_id: session.company_id,
            from_me: true,
            content: message,
            message_type: 'text',
            status: 'sent',
            timestamp: new Date().toISOString()
          });

        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message: message,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversation?.id);

        return new Response(JSON.stringify({ 
          success: true, 
          isDemo: !serverUrl || session.status !== 'connected',
          message: 'Mensagem salva localmente (modo demo)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== SEND MEDIA ====================
      case 'send_media': {
        const { mediaUrl, mediaType, caption, fileName } = body;
        
        if (!sessionId || !phone || !mediaUrl) {
          return new Response(JSON.stringify({ error: 'sessionId, phone e mediaUrl são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const serverUrl = session.baileys_server_url || BAILEYS_URL;
        const cleanPhone = phone.replace(/\D/g, '');

        // Check if server is configured and session is connected
        if (!serverUrl) {
          return new Response(JSON.stringify({ error: 'Servidor Baileys não configurado' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (session.status !== 'connected') {
          return new Response(JSON.stringify({ 
            error: 'WhatsApp desconectado', 
            details: 'Reconecte escaneando o QR Code' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          console.log(`[SEND MEDIA] Sending ${mediaType} to ${cleanPhone} via ${serverUrl}`);
          
          // Use the correct endpoint and parameters matching the Baileys server
          const sendResponse = await fetch(`${serverUrl}/api/message/send-media`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: sessionId,
              phone: cleanPhone,
              mediaUrl: mediaUrl,
              mediaType: mediaType || 'image',
              caption: caption || '',
              fileName: fileName || ''
            })
          });

          if (sendResponse.ok) {
            const sendData = await sendResponse.json();
            console.log(`[SEND MEDIA] Success:`, sendData);
            
            return new Response(JSON.stringify({ 
              success: true, 
              messageId: sendData.messageId || sendData.key?.id 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            const errorText = await sendResponse.text();
            console.error('[SEND MEDIA] Server error:', errorText);
            
            // Try to parse error
            let errorMessage = 'Falha ao enviar mídia';
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
                
                // Update session status if disconnected
                if (errorJson.error.includes('not connected') || errorJson.error.includes('disconnected')) {
                  await supabase
                    .from('whatsapp_sessions')
                    .update({ status: 'disconnected', connected_at: null })
                    .eq('id', sessionId);
                }
              }
            } catch {
              // Not JSON
            }
            
            return new Response(JSON.stringify({ error: errorMessage, details: errorText }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (e: any) {
          console.error('[SEND MEDIA] Exception:', e);
          return new Response(JSON.stringify({ 
            error: 'Erro de conexão', 
            details: e.message || 'Não foi possível conectar ao servidor' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ==================== GET CONVERSATIONS ====================
      case 'get_conversations': {
        if (!companyId) {
          return new Response(JSON.stringify({ error: 'companyId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: conversations, error } = await supabase
          .from('whatsapp_conversations')
          .select(`
            *,
            whatsapp_messages!inner (
              id,
              content,
              from_me,
              status,
              timestamp
            )
          `)
          .eq('company_id', companyId)
          .order('last_message_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching conversations:', error);
        }

        return new Response(JSON.stringify({ conversations: conversations || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== GET MESSAGES ====================
      case 'get_messages': {
        const { conversationId, limit = 50 } = body;
        
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: messages } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('timestamp', { ascending: true })
          .limit(limit);

        return new Response(JSON.stringify({ messages: messages || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== DISCONNECT ====================
      case 'disconnect': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session) {
          const serverUrl = session.baileys_server_url || BAILEYS_URL;
          
          if (serverUrl) {
            try {
              await fetch(`${serverUrl}/api/instance/${session.instance_name}/logout`, {
                method: 'POST',
                headers: { 'x-webhook-secret': session.webhook_secret || '' }
              });
            } catch (e) {
              console.log('Error disconnecting from Baileys:', e);
            }
          }
        }

        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected' })
          .eq('id', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== DELETE SESSION ====================
      case 'delete_session': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'sessionId é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session) {
          const serverUrl = session.baileys_server_url || BAILEYS_URL;
          
          if (serverUrl) {
            try {
              await fetch(`${serverUrl}/api/instance/${session.instance_name}/delete`, {
                method: 'DELETE',
                headers: { 'x-webhook-secret': session.webhook_secret || '' }
              });
            } catch (e) {
              console.log('Error deleting from Baileys:', e);
            }
          }
        }

        // Delete related data
        await supabase.from('whatsapp_messages').delete().eq('session_id', sessionId);
        await supabase.from('whatsapp_conversations').delete().eq('session_id', sessionId);
        await supabase.from('whatsapp_sessions').delete().eq('id', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ==================== CONFIGURE SERVER ====================
      case 'configure_server': {
        if (!sessionId || !baileysServerUrl) {
          return new Response(JSON.stringify({ error: 'sessionId e baileysServerUrl são obrigatórios' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Test connection to Baileys server
        try {
          const testResponse = await fetch(`${baileysServerUrl}/api/health`);
          if (!testResponse.ok) {
            return new Response(JSON.stringify({ error: 'Servidor Baileys não respondeu corretamente' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Não foi possível conectar ao servidor Baileys' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update session with server URL
        await supabase
          .from('whatsapp_sessions')
          .update({ baileys_server_url: baileysServerUrl })
          .eq('id', sessionId);

        return new Response(JSON.stringify({ success: true, message: 'Servidor configurado com sucesso' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Generate demo QR code
function generateDemoQrCode(): string {
  return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSI0MCIgeT0iNDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzI1RDM2NiIvPjxyZWN0IHg9IjEyMCIgeT0iNDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzI1RDM2NiIvPjxyZWN0IHg9IjQwIiB5PSIxMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzI1RDM2NiIvPjxyZWN0IHg9IjgwIiB5PSI4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjVEMzY2Ii8+PHRleHQgeD0iMTAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+RXNjYW5laWUgY29tIFdoYXRzQXBwPC90ZXh0Pjwvc3ZnPg==";
}