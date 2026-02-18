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
    const { phone, action } = await req.json();

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

    // VERIFY action — check code
    if (action === 'verify') {
      const { code } = await req.json().catch(() => ({ code: '' }));
      // code is passed in the original body, re-parse
    }

    if (action === 'verify') {
      // Re-read body was already parsed, get code from initial parse
      return new Response(JSON.stringify({ error: 'Use verify-phone-code endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SEND action — generate and send code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store code in DB
    await supabase.from('phone_verifications').insert({
      phone: cleanPhone,
      code,
      expires_at: expiresAt,
    });

    // Find the admin master WhatsApp session to send from
    // Look for admin@gmail.com's company sessions
    const { data: adminUsers } = await supabase
      .from('company_users')
      .select('company_id, user_id')
      .eq('role', 'adminmaster');

    let sent = false;

    if (adminUsers && adminUsers.length > 0) {
      for (const adminUser of adminUsers) {
        const { data: sessions } = await supabase
          .from('whatsapp_sessions')
          .select('id, instance_name, baileys_server_url, status')
          .eq('company_id', adminUser.company_id)
          .eq('status', 'connected')
          .limit(1);

        const session = sessions?.[0];
        if (!session) continue;

        const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
        if (!baileysUrl) continue;

        // Format JID
        let phoneForJid = cleanPhone;
        // Add Brazil country code if missing
        if (phoneForJid.length <= 11 && !phoneForJid.startsWith('55')) {
          phoneForJid = '55' + phoneForJid;
        }
        const jid = `${phoneForJid}@s.whatsapp.net`;

        const messageText = `🔐 *Código de verificação Ellosuit*\n\nSeu código é: *${code}*\n\nEle é válido por 10 minutos.\n\nSe você não solicitou este código, ignore esta mensagem.`;

        try {
          const sendResponse = await fetch(`${baileysUrl}/api/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instanceName: session.instance_name,
              jid,
              message: { text: messageText },
            }),
          });

          if (sendResponse.ok) {
            sent = true;
            console.log(`[VERIFY] Code sent to ${cleanPhone} via WhatsApp`);
            break;
          } else {
            console.error(`[VERIFY] Failed to send:`, await sendResponse.text());
          }
        } catch (err) {
          console.error(`[VERIFY] Send error:`, err);
        }
      }
    }

    if (!sent) {
      console.error('[VERIFY] No WhatsApp session available to send code');
      return new Response(JSON.stringify({ error: 'Não foi possível enviar o código. Tente novamente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
