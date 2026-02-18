import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Telefone é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cleanPhone = phone.replace(/\D/g, '');
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store code in DB
    await supabase.from('phone_verifications').insert({
      phone: cleanPhone,
      code,
      expires_at: expiresAt,
    });

    // Find the admin's connected WhatsApp session to send from
    const ADMIN_USER_ID = 'c63ba931-0c34-4461-ae8d-2908aed7dd20';
    const { data: sessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, status')
      .eq('status', 'connected')
      .eq('user_id', ADMIN_USER_ID)
      .limit(1);

    const session = sessions?.[0];
    if (!session) {
      console.error('[VERIFY] No connected WhatsApp session found');
      return new Response(JSON.stringify({ error: 'Nenhuma sessão WhatsApp disponível. Tente novamente mais tarde.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
    if (!baileysUrl) {
      console.error('[VERIFY] No Baileys server URL configured');
      return new Response(JSON.stringify({ error: 'Servidor WhatsApp não configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format JID - add Brazil country code if missing
    let phoneForJid = cleanPhone;
    if (phoneForJid.length <= 11 && !phoneForJid.startsWith('55')) {
      phoneForJid = '55' + phoneForJid;
    }
    const jid = `${phoneForJid}@s.whatsapp.net`;

    const messageText = `🔐 *Código de verificação Ellosuit*\n\nSeu código é: *${code}*\n\nEle é válido por 10 minutos.\n\nSe você não solicitou este código, ignore esta mensagem.`;

    const sendResponse = await fetch(`${baileysUrl}/api/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName: session.instance_name,
        jid,
        message: { text: messageText },
      }),
    });

    if (!sendResponse.ok) {
      const errText = await sendResponse.text();
      console.error(`[VERIFY] Failed to send WhatsApp message:`, errText);
      return new Response(JSON.stringify({ error: 'Falha ao enviar código via WhatsApp.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[VERIFY] Code sent to ${cleanPhone} via WhatsApp session ${session.instance_name}`);

    return new Response(JSON.stringify({ success: true, message: 'Código enviado via WhatsApp' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
