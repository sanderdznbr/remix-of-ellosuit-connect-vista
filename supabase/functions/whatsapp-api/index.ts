import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Evolution API endpoint (configurable via settings)
const DEFAULT_EVOLUTION_URL = "https://api.evolution.lovable.app";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { action, sessionId, instanceName, companyId, userId, phone, message, evolutionUrl, evolutionApiKey } = await req.json();
    
    const EVOLUTION_URL = evolutionUrl || DEFAULT_EVOLUTION_URL;
    const EVOLUTION_API_KEY = evolutionApiKey || Deno.env.get('EVOLUTION_API_KEY') || '';

    console.log(`[WhatsApp API] Action: ${action}, Instance: ${instanceName}`);

    switch (action) {
      case 'create_instance': {
        // Create new WhatsApp instance
        if (!instanceName || !companyId || !userId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Create session in database
        const { data: session, error: sessionError } = await supabase
          .from('whatsapp_sessions')
          .insert({
            company_id: companyId,
            user_id: userId,
            instance_name: instanceName,
            status: 'connecting',
            settings: { evolution_url: EVOLUTION_URL }
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          return new Response(JSON.stringify({ error: 'Failed to create session' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If Evolution API is configured, create instance there
        if (EVOLUTION_API_KEY) {
          try {
            const evolutionResponse = await fetch(`${EVOLUTION_URL}/instance/create`, {
              method: 'POST',
              headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
              })
            });

            if (evolutionResponse.ok) {
              const evolutionData = await evolutionResponse.json();
              await supabase
                .from('whatsapp_sessions')
                .update({ 
                  instance_id: evolutionData.instance?.instanceId,
                  qr_code: evolutionData.qrcode?.base64
                })
                .eq('id', session.id);
            }
          } catch (e) {
            console.log('Evolution API not available, using demo mode');
          }
        }

        return new Response(JSON.stringify({ success: true, session }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_qr_code': {
        // Get QR code for session
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
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
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If Evolution API is configured, get fresh QR code
        if (EVOLUTION_API_KEY && session.instance_name) {
          try {
            const qrResponse = await fetch(`${EVOLUTION_URL}/instance/connect/${session.instance_name}`, {
              method: 'GET',
              headers: { 'apikey': EVOLUTION_API_KEY }
            });

            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              if (qrData.qrcode?.base64) {
                await supabase
                  .from('whatsapp_sessions')
                  .update({ qr_code: qrData.qrcode.base64 })
                  .eq('id', sessionId);
                
                return new Response(JSON.stringify({ 
                  qrCode: qrData.qrcode.base64,
                  status: session.status
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          } catch (e) {
            console.log('Error fetching QR from Evolution:', e);
          }
        }

        // Return demo QR code for testing
        const demoQrCode = generateDemoQrCode();
        
        return new Response(JSON.stringify({ 
          qrCode: session.qr_code || demoQrCode,
          status: session.status,
          isDemo: !EVOLUTION_API_KEY
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_status': {
        // Check connection status
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
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
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // If Evolution API is configured, check status
        if (EVOLUTION_API_KEY && session.instance_name) {
          try {
            const statusResponse = await fetch(`${EVOLUTION_URL}/instance/connectionState/${session.instance_name}`, {
              headers: { 'apikey': EVOLUTION_API_KEY }
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const isConnected = statusData.state === 'open';
              
              if (isConnected && session.status !== 'connected') {
                // Update session with connection info
                await supabase
                  .from('whatsapp_sessions')
                  .update({
                    status: 'connected',
                    connected_at: new Date().toISOString(),
                    last_seen_at: new Date().toISOString()
                  })
                  .eq('id', sessionId);
              }
              
              return new Response(JSON.stringify({ 
                status: isConnected ? 'connected' : session.status,
                instance: statusData
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.log('Error checking Evolution status:', e);
          }
        }

        return new Response(JSON.stringify({ 
          status: session.status,
          isDemo: !EVOLUTION_API_KEY
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'send_message': {
        // Send WhatsApp message
        if (!sessionId || !phone || !message) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (!session || session.status !== 'connected') {
          return new Response(JSON.stringify({ error: 'Session not connected' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Send via Evolution API if configured
        if (EVOLUTION_API_KEY && session.instance_name) {
          try {
            const sendResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${session.instance_name}`, {
              method: 'POST',
              headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                number: phone.replace(/\D/g, ''),
                text: message
              })
            });

            if (sendResponse.ok) {
              const sendData = await sendResponse.json();
              
              // Save message to database
              await supabase
                .from('whatsapp_messages')
                .insert({
                  session_id: sessionId,
                  company_id: session.company_id,
                  message_id: sendData.key?.id,
                  from_me: true,
                  sender_phone: session.phone_number || 'me',
                  recipient_phone: phone,
                  content: message,
                  message_type: 'text',
                  status: 'sent'
                });

              return new Response(JSON.stringify({ success: true, data: sendData }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          } catch (e) {
            console.error('Error sending via Evolution:', e);
          }
        }

        // Demo mode - just save to database
        await supabase
          .from('whatsapp_messages')
          .insert({
            session_id: sessionId,
            company_id: session.company_id,
            from_me: true,
            sender_phone: session.phone_number || 'me',
            recipient_phone: phone,
            content: message,
            message_type: 'text',
            status: 'sent'
          });

        return new Response(JSON.stringify({ success: true, isDemo: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'disconnect': {
        // Disconnect WhatsApp session
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session && EVOLUTION_API_KEY && session.instance_name) {
          try {
            await fetch(`${EVOLUTION_URL}/instance/logout/${session.instance_name}`, {
              method: 'DELETE',
              headers: { 'apikey': EVOLUTION_API_KEY }
            });
          } catch (e) {
            console.log('Error disconnecting Evolution:', e);
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

      case 'delete_session': {
        // Delete WhatsApp session
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session && EVOLUTION_API_KEY && session.instance_name) {
          try {
            await fetch(`${EVOLUTION_URL}/instance/delete/${session.instance_name}`, {
              method: 'DELETE',
              headers: { 'apikey': EVOLUTION_API_KEY }
            });
          } catch (e) {
            console.log('Error deleting Evolution instance:', e);
          }
        }

        await supabase
          .from('whatsapp_sessions')
          .delete()
          .eq('id', sessionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Generate a demo QR code for testing
function generateDemoQrCode(): string {
  // This is a placeholder QR code data URL
  return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmZmZmZmYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj5RUiBDb2RlIERlbW88L3RleHQ+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI1MCIgeT0iNTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHg9IjEzMCIgeT0iNTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHg9IjUwIiB5PSIxMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzMzMyIvPjxyZWN0IHg9IjkwIiB5PSI5MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMzMzIi8+PC9zdmc+";
}
