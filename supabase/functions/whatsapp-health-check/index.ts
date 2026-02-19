import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FAILURES_BEFORE_DISCONNECT = 3; // Need 3 consecutive failures (15min) before marking disconnected
const AUTO_RECONNECT_WINDOW_MS = 24 * 60 * 60 * 1000; // Try auto-reconnect for sessions disconnected < 24h
const PING_TIMEOUT_MS = 12000; // 12s timeout (more generous than before)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    // ====== PHASE 1: Check sessions marked as "connected" ======
    const { data: connectedSessions, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, phone_number, company_id, updated_at, session_data, webhook_secret')
      .eq('status', 'connected');

    if (error) throw error;

    const results: { session_id: string; instance: string; action: string; detail?: string }[] = [];

    // Check each connected session
    for (const session of (connectedSessions || [])) {
      const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
      if (!baileysUrl || !session.instance_name) {
        results.push({ session_id: session.id, instance: session.instance_name || 'unknown', action: 'skipped', detail: 'no_url' });
        continue;
      }

      const isAlive = await pingBaileys(baileysUrl, session.instance_name);

      if (isAlive) {
        // Session is healthy - reset failure count and update last_seen
        const sessionData = (session.session_data || {}) as Record<string, unknown>;
        sessionData.consecutive_failures = 0;
        sessionData.last_healthy_at = new Date().toISOString();

        await supabase
          .from('whatsapp_sessions')
          .update({ 
            last_seen_at: new Date().toISOString(),
            session_data: sessionData
          })
          .eq('id', session.id);

        results.push({ session_id: session.id, instance: session.instance_name, action: 'alive' });
      } else {
        // Session failed ping - increment failure counter
        const sessionData = (session.session_data || {}) as Record<string, unknown>;
        const failures = ((sessionData.consecutive_failures as number) || 0) + 1;
        sessionData.consecutive_failures = failures;
        sessionData.last_failure_at = new Date().toISOString();

        if (failures >= MAX_FAILURES_BEFORE_DISCONNECT) {
          // Too many failures - mark as disconnected
          console.log(`[HEALTH-CHECK] Session ${session.id} (${session.instance_name}) DEAD after ${failures} consecutive failures. Marking disconnected.`);
          
          sessionData.disconnected_by = 'health_check';
          sessionData.disconnected_at = new Date().toISOString();
          
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              status: 'disconnected', 
              session_data: sessionData
            })
            .eq('id', session.id);

          results.push({ session_id: session.id, instance: session.instance_name, action: 'disconnected', detail: `${failures} failures` });
        } else {
          // Grace period - keep as connected but track failure
          console.log(`[HEALTH-CHECK] Session ${session.id} (${session.instance_name}) failed ping (${failures}/${MAX_FAILURES_BEFORE_DISCONNECT}). Grace period.`);
          
          await supabase
            .from('whatsapp_sessions')
            .update({ session_data: sessionData })
            .eq('id', session.id);

          results.push({ session_id: session.id, instance: session.instance_name, action: 'grace_period', detail: `failure ${failures}/${MAX_FAILURES_BEFORE_DISCONNECT}` });
        }
      }
    }

    // ====== PHASE 2: Auto-reconnect recently disconnected sessions ======
    const cutoffTime = new Date(Date.now() - AUTO_RECONNECT_WINDOW_MS).toISOString();
    
    const { data: disconnectedSessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, baileys_server_url, phone_number, company_id, session_data, webhook_secret, connected_at')
      .eq('status', 'disconnected')
      .not('phone_number', 'is', null) // Only sessions that were previously connected with a phone
      .gte('updated_at', cutoffTime); // Only recently disconnected

    for (const session of (disconnectedSessions || [])) {
      const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
      if (!baileysUrl || !session.instance_name) continue;

      const sessionData = (session.session_data || {}) as Record<string, unknown>;
      
      // Skip if we already tried reconnecting recently (within last 10 min)
      const lastReconnectAttempt = sessionData.last_reconnect_attempt as string;
      if (lastReconnectAttempt) {
        const timeSinceAttempt = Date.now() - new Date(lastReconnectAttempt).getTime();
        if (timeSinceAttempt < 10 * 60 * 1000) {
          results.push({ session_id: session.id, instance: session.instance_name, action: 'reconnect_cooldown' });
          continue;
        }
      }

      console.log(`[AUTO-RECONNECT] Attempting to reconnect session ${session.id} (${session.instance_name}, phone: ${session.phone_number})`);
      
      sessionData.last_reconnect_attempt = new Date().toISOString();
      sessionData.reconnect_attempts = ((sessionData.reconnect_attempts as number) || 0) + 1;

      // First check if the instance is actually alive on Baileys but we just didn't know
      const isAlive = await pingBaileys(baileysUrl, session.instance_name);

      if (isAlive) {
        // It was alive all along! Mark as connected
        console.log(`[AUTO-RECONNECT] Session ${session.id} is actually ALIVE! Restoring connected status.`);
        
        sessionData.consecutive_failures = 0;
        sessionData.reconnected_by = 'health_check_discovery';
        sessionData.reconnected_at = new Date().toISOString();
        
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            status: 'connected', 
            last_seen_at: new Date().toISOString(),
            session_data: sessionData
          })
          .eq('id', session.id);

        results.push({ session_id: session.id, instance: session.instance_name, action: 'reconnected_discovered' });
        continue;
      }

      // Try to recreate instance on Baileys (forced reconnection using existing credentials)
      try {
        const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
        
        const createResponse = await fetch(`${baileysUrl}/api/instance/create`, {
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
          const createData = await createResponse.json();
          console.log(`[AUTO-RECONNECT] Instance recreated for ${session.id}:`, { 
            status: createData.status, 
            hasQR: !!createData.qrCode,
            isConnected: createData.isConnected 
          });

          // Wait a moment and check if it auto-connected (credentials still valid)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const reconnected = await pingBaileys(baileysUrl, session.instance_name);
          
          if (reconnected) {
            console.log(`[AUTO-RECONNECT] ✅ Session ${session.id} successfully reconnected without QR!`);
            
            sessionData.consecutive_failures = 0;
            sessionData.reconnected_by = 'health_check_auto';
            sessionData.reconnected_at = new Date().toISOString();
            
            await supabase
              .from('whatsapp_sessions')
              .update({ 
                status: 'connected', 
                last_seen_at: new Date().toISOString(),
                session_data: sessionData
              })
              .eq('id', session.id);

            results.push({ session_id: session.id, instance: session.instance_name, action: 'auto_reconnected' });
          } else {
            // Reconnection attempt didn't work immediately - might need QR
            // Update status to "connecting" so the user knows we're trying
            await supabase
              .from('whatsapp_sessions')
              .update({ 
                status: 'connecting',
                session_data: sessionData
              })
              .eq('id', session.id);

            results.push({ session_id: session.id, instance: session.instance_name, action: 'reconnect_pending', detail: 'awaiting_connection' });
          }
        } else {
          const errorText = await createResponse.text();
          console.log(`[AUTO-RECONNECT] Failed to recreate instance for ${session.id}: ${errorText}`);
          
          await supabase
            .from('whatsapp_sessions')
            .update({ session_data: sessionData })
            .eq('id', session.id);

          results.push({ session_id: session.id, instance: session.instance_name, action: 'reconnect_failed', detail: errorText.substring(0, 200) });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'unknown';
        console.error(`[AUTO-RECONNECT] Error for ${session.id}:`, errorMsg);
        
        await supabase
          .from('whatsapp_sessions')
          .update({ session_data: sessionData })
          .eq('id', session.id);

        results.push({ session_id: session.id, instance: session.instance_name, action: 'reconnect_error', detail: errorMsg });
      }
    }

    // ====== PHASE 3: Clean up zombie sessions (connecting for > 30 min) ======
    const { data: zombieSessions } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name')
      .in('status', ['connecting', 'waiting_qr'])
      .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    for (const zombie of (zombieSessions || [])) {
      await supabase
        .from('whatsapp_sessions')
        .update({ status: 'disconnected' })
        .eq('id', zombie.id);
      
      results.push({ session_id: zombie.id, instance: zombie.instance_name, action: 'zombie_cleaned' });
    }

    const summary = {
      checked_connected: connectedSessions?.length || 0,
      checked_disconnected: disconnectedSessions?.length || 0,
      zombies_cleaned: zombieSessions?.length || 0,
      actions: results
    };

    console.log(`[HEALTH-CHECK] Summary:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[HEALTH-CHECK] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ====== HELPER: Ping Baileys to check if instance is alive ======
async function pingBaileys(baileysUrl: string, instanceName: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const instanceKey = encodeURIComponent(instanceName);
    const res = await fetch(`${baileysUrl}/api/instance/${instanceKey}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;

    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { return false; }

    return data?.status === 'open' || data?.status === 'connected' || data?.isConnected === true;
  } catch {
    return false;
  }
}
