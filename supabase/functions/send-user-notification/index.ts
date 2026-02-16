import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      user_id,
      company_id,
      title,
      message,
      type = "info",
      category = "system",
      icon,
      action_url,
      metadata = {},
      send_whatsapp = true,
    } = body;

    if (!user_id || !company_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, company_id, title, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[USER-NOTIFY] Creating notification for user ${user_id}: ${title}`);

    // 1. Insert notification into DB
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id,
        company_id,
        title,
        message,
        type,
        category,
        icon,
        action_url,
        metadata,
        whatsapp_sent: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[USER-NOTIFY] Insert error:", insertError);
      throw insertError;
    }

    // 2. Send WhatsApp notification if enabled
    let whatsappSent = false;

    if (send_whatsapp) {
      try {
        // Check user preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user_id)
          .single();

        const whatsappEnabled = prefs?.whatsapp_enabled !== false;
        const categoryEnabled = prefs?.categories?.[category] !== false;

        // Check quiet hours
        let inQuietHours = false;
        if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
          const now = new Date();
          const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
          const hours = brTime.getHours();
          const minutes = brTime.getMinutes();
          const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          inQuietHours = currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end;
        }

        if (whatsappEnabled && categoryEnabled && !inQuietHours) {
          // Get user's WhatsApp number from preferences or from clients table
          let userPhone = prefs?.whatsapp_number;

          if (!userPhone) {
            // Try to get from auth user metadata
            const { data: userData } = await supabase.auth.admin.getUserById(user_id);
            userPhone = userData?.user?.phone || userData?.user?.user_metadata?.whatsapp;
          }

          if (userPhone) {
            // Find admin's connected WhatsApp session to send from
            const { data: adminUser } = await supabase
              .from("company_users")
              .select("company_id")
              .eq("role", "adminmaster")
              .limit(1)
              .single();

            if (adminUser) {
              const { data: session } = await supabase
                .from("whatsapp_sessions")
                .select("id, baileys_server_url, instance_name")
                .eq("company_id", adminUser.company_id)
                .eq("status", "connected")
                .limit(1)
                .single();

              if (session?.baileys_server_url) {
                // Clean phone number
                const cleanPhone = userPhone.replace(/\D/g, "");
                const jid = `${cleanPhone}@s.whatsapp.net`;

                const whatsappMessage = formatWhatsAppMessage(title, message, category, action_url);

                const sendRes = await fetch(`${session.baileys_server_url}/api/message/send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    instanceName: session.instance_name,
                    jid,
                    message: { text: whatsappMessage },
                  }),
                });

                if (sendRes.ok) {
                  whatsappSent = true;
                  console.log(`[USER-NOTIFY] WhatsApp sent to ${cleanPhone}`);
                } else {
                  console.error(`[USER-NOTIFY] WhatsApp send failed:`, await sendRes.text());
                }
              }
            }
          } else {
            console.log(`[USER-NOTIFY] No WhatsApp number for user ${user_id}`);
          }
        } else {
          console.log(`[USER-NOTIFY] WhatsApp disabled or in quiet hours for user ${user_id}`);
        }
      } catch (whatsappErr: any) {
        console.error("[USER-NOTIFY] WhatsApp error:", whatsappErr);
      }

      // Update notification with WhatsApp status
      if (whatsappSent) {
        await supabase
          .from("notifications")
          .update({ whatsapp_sent: true })
          .eq("id", notification.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification_id: notification.id, whatsapp_sent: whatsappSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[USER-NOTIFY] Error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatWhatsAppMessage(
  title: string,
  message: string,
  category: string,
  actionUrl?: string
): string {
  const icons: Record<string, string> = {
    system: "🔔",
    calendar: "📅",
    crm: "💬",
    task: "✅",
    meeting: "🎥",
    email: "📧",
    drive: "📁",
  };

  const icon = icons[category] || "🔔";
  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  let msg = `${icon} *ELLOSUIT*\n\n`;
  msg += `*${title}*\n`;
  msg += `${message}\n`;
  msg += `\n🕐 ${timestamp}`;

  if (actionUrl) {
    msg += `\n\n🔗 Acesse: ${actionUrl}`;
  }

  return msg;
}
