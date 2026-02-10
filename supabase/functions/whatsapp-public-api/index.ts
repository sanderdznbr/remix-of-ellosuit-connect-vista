import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get API Key from header
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing X-API-Key header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate API Key
  const { data: keyData, error: keyError } = await supabase
    .from('whatsapp_api_keys')
    .select('*, whatsapp_sessions(*)')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (keyError || !keyData) {
    return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get client IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 'unknown';

  // Rate limiting check
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count: recentCount } = await supabase
    .from('whatsapp_api_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyData.id)
    .gte('created_at', oneMinuteAgo);

  if ((recentCount || 0) >= keyData.rate_limit_per_minute) {
    // Log rate limited
    await supabase.from('whatsapp_api_logs').insert({
      api_key_id: keyData.id,
      phone: 'N/A',
      status: 'rate_limited',
      error_message: `Exceeded ${keyData.rate_limit_per_minute} msgs/min`,
      ip_address: ip,
    });

    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded', 
      limit: keyData.rate_limit_per_minute,
      retry_after_seconds: 60 
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { action } = body;

  const session = keyData.whatsapp_sessions;

  switch (action) {
    // ==================== CHECK STATUS ====================
    case 'check_status': {
      const isConnected = session?.status === 'connected';
      return new Response(JSON.stringify({
        success: true,
        status: session?.status || 'unknown',
        is_connected: isConnected,
        phone_number: session?.phone_number,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== SEND TEXT ====================
    case 'send_text': {
      const { phone, message } = body;
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: 'phone and message are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (session?.status !== 'connected') {
        await supabase.from('whatsapp_api_logs').insert({
          api_key_id: keyData.id, phone, 
          message_preview: message.substring(0, 100),
          status: 'failed', error_message: 'Session not connected', ip_address: ip,
        });
        return new Response(JSON.stringify({ error: 'WhatsApp session is not connected' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send via existing whatsapp-api edge function
      const baileysUrl = session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '';
      if (!baileysUrl) {
        await supabase.from('whatsapp_api_logs').insert({
          api_key_id: keyData.id, phone,
          message_preview: message.substring(0, 100),
          status: 'failed', error_message: 'No Baileys server configured', ip_address: ip,
        });
        return new Response(JSON.stringify({ error: 'Baileys server not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const normalizedUrl = baileysUrl.replace(/\/+$/, '');
        const instanceKey = encodeURIComponent(session.instance_name);
        
        const sendResponse = await fetch(`${normalizedUrl}/api/instance/${instanceKey}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.replace(/\D/g, ''),
            message,
          }),
        });

        if (sendResponse.ok) {
          // Log success
          await supabase.from('whatsapp_api_logs').insert({
            api_key_id: keyData.id, phone,
            message_preview: message.substring(0, 100),
            status: 'sent', ip_address: ip,
          });
          // Update counters
          await supabase.from('whatsapp_api_keys').update({
            total_messages_sent: (keyData.total_messages_sent || 0) + 1,
            last_used_at: new Date().toISOString(),
          }).eq('id', keyData.id);

          const result = await sendResponse.json();
          return new Response(JSON.stringify({ success: true, message_id: result.messageId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errText = await sendResponse.text();
          await supabase.from('whatsapp_api_logs').insert({
            api_key_id: keyData.id, phone,
            message_preview: message.substring(0, 100),
            status: 'failed', error_message: errText, ip_address: ip,
          });
          return new Response(JSON.stringify({ error: 'Failed to send message', details: errText }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await supabase.from('whatsapp_api_logs').insert({
          api_key_id: keyData.id, phone,
          message_preview: message.substring(0, 100),
          status: 'failed', error_message: errMsg, ip_address: ip,
        });
        return new Response(JSON.stringify({ error: 'Internal error', details: errMsg }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ==================== SEND MEDIA ====================
    case 'send_media': {
      const { phone: mediaPhone, media_url, caption, media_type } = body;
      if (!mediaPhone || !media_url) {
        return new Response(JSON.stringify({ error: 'phone and media_url are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (session?.status !== 'connected') {
        await supabase.from('whatsapp_api_logs').insert({
          api_key_id: keyData.id, phone: mediaPhone,
          message_preview: `[media] ${caption || media_url}`.substring(0, 100),
          status: 'failed', error_message: 'Session not connected', ip_address: ip,
        });
        return new Response(JSON.stringify({ error: 'WhatsApp session is not connected' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const bUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
      if (!bUrl) {
        return new Response(JSON.stringify({ error: 'Baileys server not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const iKey = encodeURIComponent(session.instance_name);
        const sendRes = await fetch(`${bUrl}/api/instance/${iKey}/send-media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: mediaPhone.replace(/\D/g, ''),
            mediaUrl: media_url,
            caption: caption || '',
            mediaType: media_type || 'image',
          }),
        });

        const logPreview = `[${media_type || 'media'}] ${caption || media_url}`.substring(0, 100);
        if (sendRes.ok) {
          await supabase.from('whatsapp_api_logs').insert({
            api_key_id: keyData.id, phone: mediaPhone,
            message_preview: logPreview, status: 'sent', ip_address: ip,
          });
          await supabase.from('whatsapp_api_keys').update({
            total_messages_sent: (keyData.total_messages_sent || 0) + 1,
            last_used_at: new Date().toISOString(),
          }).eq('id', keyData.id);

          const result = await sendRes.json();
          return new Response(JSON.stringify({ success: true, message_id: result.messageId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errText = await sendRes.text();
          await supabase.from('whatsapp_api_logs').insert({
            api_key_id: keyData.id, phone: mediaPhone,
            message_preview: logPreview, status: 'failed', error_message: errText, ip_address: ip,
          });
          return new Response(JSON.stringify({ error: 'Failed to send media', details: errText }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: 'Internal error', details: errMsg }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    default:
      return new Response(JSON.stringify({ 
        error: 'Unknown action', 
        available_actions: ['send_text', 'send_media', 'check_status'] 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
});
