import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all sessions marked as "connected"
    const { data: sessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, phone_number, company_id, updated_at')
      .eq('status', 'connected');

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No connected sessions to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { session_id: string; instance: string; alive: boolean; error?: string }[] = [];

    for (const session of sessions) {
      const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
      if (!baileysUrl || !session.instance_name) {
        results.push({ session_id: session.id, instance: session.instance_name || 'unknown', alive: false, error: 'no_url' });
        continue;
      }

      try {
        // Ping Baileys to check if the instance is actually alive
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const instanceKey = encodeURIComponent(session.instance_name);
        const res = await fetch(`${baileysUrl}/api/instance/${instanceKey}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        let data: any = {};
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = { status: 'parse_error', raw: text.substring(0, 200) }; }
        
        // Baileys can report "open" or "connected" depending on version
        const isAlive = res.ok && (data?.status === 'open' || data?.status === 'connected');

        if (!isAlive) {
          console.log(`[HEALTH-CHECK] Session ${session.id} (${session.instance_name}) is DEAD. Baileys status: ${data?.status || 'unknown'}. Marking as disconnected.`);
          
          // Mark session as disconnected
          await supabase
            .from('whatsapp_sessions')
            .update({ status: 'disconnected', updated_at: new Date().toISOString() })
            .eq('id', session.id);

          results.push({ session_id: session.id, instance: session.instance_name, alive: false, error: `baileys_status: ${data?.status || 'unreachable'}` });
        } else {
          console.log(`[HEALTH-CHECK] Session ${session.id} (${session.instance_name}) is ALIVE.`);
          
          // Touch updated_at to show last successful check
          await supabase
            .from('whatsapp_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', session.id);

          results.push({ session_id: session.id, instance: session.instance_name, alive: true });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'unknown';
        console.log(`[HEALTH-CHECK] Session ${session.id} (${session.instance_name}) UNREACHABLE: ${errorMsg}. Marking as disconnected.`);

        // If we can't reach Baileys at all, mark as disconnected
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected', updated_at: new Date().toISOString() })
          .eq('id', session.id);

        results.push({ session_id: session.id, instance: session.instance_name, alive: false, error: errorMsg });
      }
    }

    const deadCount = results.filter(r => !r.alive).length;
    console.log(`[HEALTH-CHECK] Checked ${results.length} sessions. ${deadCount} dead.`);

    return new Response(JSON.stringify({ checked: results.length, dead: deadCount, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[HEALTH-CHECK] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
