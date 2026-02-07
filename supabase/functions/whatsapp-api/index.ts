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
        
        // Try to get fresh QR from Baileys server
        if (serverUrl) {
          try {
            const qrResponse = await fetch(`${serverUrl}/api/instance/${session.instance_name}/qr`, {
              method: 'GET',
              headers: { 'x-webhook-secret': session.webhook_secret || '' }
            });

            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              if (qrData.qrCode) {
                await supabase
                  .from('whatsapp_sessions')
                  .update({ qr_code: qrData.qrCode })
                  .eq('id', sessionId);
                
                return new Response(JSON.stringify({ 
                  qrCode: qrData.qrCode,
                  status: session.status,
                  isConnected: qrData.isConnected || false
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          } catch (e) {
            console.log('Error fetching QR from Baileys:', e);
          }
        }

        // Return cached QR code or demo
        const demoQr = generateDemoQrCode();
        return new Response(JSON.stringify({ 
          qrCode: session.qr_code || demoQr,
          status: session.status,
          isDemo: !serverUrl,
          message: serverUrl ? 'Aguardando QR do servidor...' : 'Configure o servidor Baileys para conectar'
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

        // Check status from Baileys server
        if (serverUrl) {
          try {
            const statusResponse = await fetch(`${serverUrl}/api/instance/${session.instance_name}/status`, {
              headers: { 'x-webhook-secret': session.webhook_secret || '' }
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
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
                status: isConnected ? 'connected' : session.status,
                phoneNumber: statusData.phoneNumber,
                pushName: statusData.pushName,
                profilePicture: statusData.profilePicture
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.log('Error checking Baileys status:', e);
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
            const sendResponse = await fetch(`${serverUrl}/api/message/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-webhook-secret': session.webhook_secret || ''
              },
              body: JSON.stringify({
                instanceName: session.instance_name,
                jid: jid,
                message: { text: message }
              })
            });

            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              
              // Save message to database
              await supabase
                .from('whatsapp_messages')
                .insert({
                  conversation_id: conversation?.id,
                  session_id: sessionId,
                  company_id: session.company_id,
                  wa_message_id: sendData.messageId || sendData.key?.id,
                  from_me: true,
                  content: message,
                  message_type: 'text',
                  status: 'sent',
                  timestamp: new Date().toISOString()
                });

              // Update conversation
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
              return new Response(JSON.stringify({ error: 'Falha ao enviar mensagem', details: errorText }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.error('Error sending via Baileys:', e);
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
        const { mediaUrl, mediaType, caption } = body;
        
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
        const jid = `${cleanPhone}@s.whatsapp.net`;

        if (serverUrl && session.status === 'connected') {
          try {
            const sendResponse = await fetch(`${serverUrl}/api/message/send-media`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-webhook-secret': session.webhook_secret || ''
              },
              body: JSON.stringify({
                instanceName: session.instance_name,
                jid: jid,
                mediaUrl: mediaUrl,
                mediaType: mediaType || 'image',
                caption: caption
              })
            });

            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              return new Response(JSON.stringify({ success: true, messageId: sendData.messageId }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.error('Error sending media:', e);
          }
        }

        return new Response(JSON.stringify({ error: 'Servidor Baileys não conectado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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