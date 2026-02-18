import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function resolveJid(baileysUrl: string, instanceName: string, phone: string): Promise<string> {
  const cleanPhone = phone.replace(/\D/g, '');
  const checkUrl = `${baileysUrl}/api/number/check`;

  async function checkNumber(phoneToCheck: string): Promise<string | null> {
    try {
      const res = await fetch(checkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phone: phoneToCheck }),
      });
      const text = await res.text();
      console.log(`[VERIFY] number/check ${phoneToCheck}: ${text}`);
      try {
        const data = JSON.parse(text);
        if (data?.exists && data?.jid) return data.jid;
      } catch (_) {}
      return null;
    } catch (e) {
      console.error(`[VERIFY] Error checking number ${phoneToCheck}:`, e);
      return null;
    }
  }

  // 1. Try original number
  const originalJid = await checkNumber(cleanPhone);
  if (originalJid) return originalJid;

  // 2. If Brazilian, try 9th digit variation
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    const ddd = cleanPhone.substring(2, 4);
    const rest = cleanPhone.substring(4);
    let altPhone: string | null = null;

    if (rest.length === 9 && rest.startsWith('9')) {
      altPhone = `55${ddd}${rest.substring(1)}`;
    } else if (rest.length === 8) {
      altPhone = `55${ddd}9${rest}`;
    }

    if (altPhone) {
      console.log(`[VERIFY] Trying Brazilian variant: ${altPhone}`);
      const altJid = await checkNumber(altPhone);
      if (altJid) return altJid;
    }
  }

  // 3. Fallback: use original number as JID
  console.log(`[VERIFY] Fallback: using ${cleanPhone}@s.whatsapp.net`);
  return `${cleanPhone}@s.whatsapp.net`;
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

    // Find the admin's connected WhatsApp session
    const ADMIN_USER_ID = 'c63ba931-0c34-4461-ae8d-2908aed7dd20';
    const { data: sessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, status')
      .eq('status', 'connected')
      .eq('user_id', ADMIN_USER_ID)
      .limit(1);

    const session = sessions?.[0];
    if (!session) {
      console.error('[VERIFY] No connected WhatsApp session found for admin');
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

    // Format phone - add Brazil country code if missing
    let phoneForJid = cleanPhone;
    if (phoneForJid.length <= 11 && !phoneForJid.startsWith('55')) {
      phoneForJid = '55' + phoneForJid;
    }

    // Resolve the correct JID using Baileys number check
    const jid = await resolveJid(baileysUrl, session.instance_name, phoneForJid);
    console.log(`[VERIFY] Resolved JID: ${jid}`);

    const messageText = `🔐 *Código de verificação Ellosuit*\n\nSeu código é: *${code}*\n\nEle é válido por 10 minutos.\n\nSe você não solicitou este código, ignore esta mensagem.`;

    console.log(`[VERIFY] Sending to ${jid} via instance ${session.instance_name}`);

    const sendResponse = await fetch(`${baileysUrl}/api/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName: session.instance_name,
        jid,
        message: { text: messageText },
      }),
    });

    const responseText = await sendResponse.text();
    console.log(`[VERIFY] Baileys response: ${sendResponse.status} - ${responseText}`);

    if (!sendResponse.ok) {
      console.error(`[VERIFY] Failed to send WhatsApp message:`, responseText);
      return new Response(JSON.stringify({ error: 'Falha ao enviar código via WhatsApp.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[VERIFY] Code ${code} sent to ${phoneForJid} via session ${session.instance_name}`);

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
