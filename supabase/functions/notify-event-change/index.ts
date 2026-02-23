import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      change_type,     // 'rescheduled' | 'completed' | 'cancelled'
      event_title,
      event_date,      // formatted date string
      event_time,      // formatted time string
      new_date,        // for rescheduled
      new_time,        // for rescheduled
      meeting_link,
      attendees,       // array of strings (emails/phones)
      company_id,
    } = body;

    if (!change_type || !event_title || !attendees || attendees.length === 0) {
      return new Response(JSON.stringify({ error: 'change_type, event_title e attendees são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Event Change] ${change_type} - "${event_title}" to ${attendees.length} attendees`);

    // Build message based on change type
    let whatsappMessage = '';
    let emailSubject = '';
    let emailBody = '';

    switch (change_type) {
      case 'rescheduled':
        whatsappMessage = `📅 *Reunião Reagendada*\n\n` +
          `*${event_title}*\n\n` +
          `A reunião foi reagendada:\n` +
          (event_date ? `📆 De: ${event_date}${event_time ? ` às ${event_time}` : ''}\n` : '') +
          (new_date ? `📆 Para: ${new_date}${new_time ? ` às ${new_time}` : ''}\n` : '') +
          (meeting_link ? `\n🔗 *Link:* ${meeting_link}\n` : '') +
          `\n_Enviado via Ellosuit_`;
        emailSubject = `📅 Reunião reagendada: ${event_title}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #3600FF;">📅 Reunião Reagendada</h2>
            <h3>${event_title}</h3>
            <p>A reunião foi reagendada:</p>
            ${event_date ? `<p><strong>De:</strong> ${event_date}${event_time ? ` às ${event_time}` : ''}</p>` : ''}
            ${new_date ? `<p><strong>Para:</strong> ${new_date}${new_time ? ` às ${new_time}` : ''}</p>` : ''}
            ${meeting_link ? `<p><a href="${meeting_link}" style="background: #3600FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Entrar na Reunião</a></p>` : ''}
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">Enviado via Ellosuit</p>
          </div>`;
        break;

      case 'completed':
        whatsappMessage = `✅ *Reunião Concluída*\n\n` +
          `*${event_title}*\n` +
          (event_date ? `📆 Data: ${event_date}\n` : '') +
          `\nA reunião foi marcada como concluída.\n` +
          `\n_Enviado via Ellosuit_`;
        emailSubject = `✅ Reunião concluída: ${event_title}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #22c55e;">✅ Reunião Concluída</h2>
            <h3>${event_title}</h3>
            ${event_date ? `<p><strong>Data:</strong> ${event_date}</p>` : ''}
            <p>A reunião foi marcada como concluída.</p>
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">Enviado via Ellosuit</p>
          </div>`;
        break;

      case 'cancelled':
        whatsappMessage = `❌ *Reunião Cancelada*\n\n` +
          `*${event_title}*\n` +
          (event_date ? `📆 Data: ${event_date}\n` : '') +
          `\nA reunião foi cancelada.\n` +
          `\n_Enviado via Ellosuit_`;
        emailSubject = `❌ Reunião cancelada: ${event_title}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">❌ Reunião Cancelada</h2>
            <h3>${event_title}</h3>
            ${event_date ? `<p><strong>Data:</strong> ${event_date}</p>` : ''}
            <p>A reunião foi cancelada.</p>
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">Enviado via Ellosuit</p>
          </div>`;
        break;

      default:
        return new Response(JSON.stringify({ error: 'change_type inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Get company WhatsApp session
    const resolvedCompanyId = company_id || (await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()
    ).data?.company_id;

    const { data: whatsappSession } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, status')
      .eq('company_id', resolvedCompanyId)
      .eq('status', 'connected')
      .limit(1)
      .single();

    const BAILEYS_URL = whatsappSession?.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '';
    const results: any[] = [];

    for (const attendee of attendees) {
      const isEmail = attendee.includes('@');

      if (isEmail) {
        // Send email
        try {
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-system-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ to: attendee, subject: emailSubject, html: emailBody })
          });
          results.push({ attendee, status: emailResponse.ok ? 'sent' : 'failed', channel: 'email' });
        } catch (err) {
          results.push({ attendee, status: 'failed', channel: 'email', reason: String(err) });
        }
      } else {
        // Send WhatsApp
        let phone = attendee.replace(/\D/g, '');
        if (!phone || phone.length < 8) {
          results.push({ attendee, status: 'skipped', reason: 'Número inválido' });
          continue;
        }
        if (!phone.startsWith('55') && phone.length <= 11) {
          phone = '55' + phone;
        }

        if (whatsappSession && BAILEYS_URL) {
          const normalizedServerUrl = BAILEYS_URL.replace(/\/+$/, '');

          // Resolve real JID via number check
          let resolvedJid = `${phone}@s.whatsapp.net`;
          try {
            const checkResponse = await fetch(`${normalizedServerUrl}/api/number/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instanceName: whatsappSession.instance_name, phone })
            });
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.exists && checkData.jid) {
                resolvedJid = checkData.jid;
                console.log(`[Event Change] Resolved ${phone} -> ${resolvedJid}`);
              }
            }
          } catch (e) {
            console.error(`[Event Change] Number check failed:`, e);
          }

          try {
            const sendResponse = await fetch(`${normalizedServerUrl}/api/message/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instanceName: whatsappSession.instance_name,
                jid: resolvedJid,
                message: { text: whatsappMessage }
              })
            });
            results.push({ attendee, status: sendResponse.ok ? 'sent' : 'failed', channel: 'whatsapp' });
            if (sendResponse.ok) {
              console.log(`[Event Change] ✅ WhatsApp sent to ${resolvedJid}`);
            }
          } catch (err) {
            results.push({ attendee, status: 'failed', channel: 'whatsapp', reason: String(err) });
          }
        } else {
          results.push({ attendee, status: 'skipped', reason: 'WhatsApp não conectado' });
        }
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    console.log(`[Event Change] Done: ${sentCount}/${attendees.length} notifications sent`);

    return new Response(JSON.stringify({ success: true, results, sent: sentCount, total: attendees.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[Event Change] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
