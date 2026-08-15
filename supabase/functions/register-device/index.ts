import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return json({ error: "Authentication required" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "register";

    if (action === "unregister-all") {
      const { error } = await admin
        .from("device_tokens")
        .delete()
        .eq("user_id", authData.user.id);
      if (error) throw error;
      return json({ success: true, message: "Device tokens removed" });
    }

    const token = String(payload.token || "").trim();
    if (!/^[a-fA-F0-9]{64}$/.test(token)) {
      return json({ error: "Invalid APNs device token" }, 400);
    }

    const environment = payload.environment === "development" ? "development" : "production";
    const registration = {
        token,
        user_id: authData.user.id,
        platform: "ios",
        environment,
        enabled: true,
        updated_at: new Date().toISOString(),
    };

    const { data: existing } = await admin
      .from("device_tokens")
      .select("id")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    const { error } = existing
      ? await admin.from("device_tokens").update(registration).eq("id", existing.id)
      : await admin.from("device_tokens").insert(registration);

    if (error) throw error;
    return json({ success: true, message: "Device registered" });
  } catch (error) {
    console.error("register-device error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
