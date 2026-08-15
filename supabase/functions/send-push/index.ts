import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5";

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
// Keep ellocontent credentials isolated from the existing Ellosuit APNs key in
// this shared Supabase project. Reusing APNS_* here would make one app replace
// the credentials used by the other.
const APNS_BUNDLE_ID = Deno.env.get("ELLOCONTENT_APNS_BUNDLE_ID") || "com.ellocontent.app";
const APNS_TEAM_ID = Deno.env.get("ELLOCONTENT_APNS_TEAM_ID");
const APNS_KEY_ID = Deno.env.get("ELLOCONTENT_APNS_KEY_ID");
const APNS_KEY = Deno.env.get("ELLOCONTENT_APNS_KEY");

function normalizePrivateKey(raw: string) {
  const normalized = raw.replace(/\\n/g, "\n").trim();
  if (normalized.includes("BEGIN PRIVATE KEY")) return normalized;
  try { return atob(normalized); } catch { return normalized; }
}

async function createApnsJwt() {
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error("APNs credentials are not configured");
  }

  const privateKey = await jose.importPKCS8(normalizePrivateKey(APNS_KEY), "ES256");
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuer(APNS_TEAM_ID)
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(privateKey);
}

async function sendToEnvironment(
  token: string,
  environment: "production" | "development",
  jwt: string,
  payload: Record<string, unknown>,
  collapseId?: string,
) {
  const host = environment === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const response = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": "0",
      ...(collapseId ? { "apns-collapse-id": collapseId.slice(0, 64) } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let reason = "";
  try { reason = JSON.parse(text)?.reason || ""; } catch { reason = text; }
  return { ok: response.ok, status: response.status, reason, environment };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return json({ error: "Authentication required" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const isServiceCall = accessToken === SERVICE_ROLE_KEY;
    let targetUserId: string | null = null;

    if (isServiceCall) {
      targetUserId = typeof body.userId === "string" ? body.userId : null;
      if (!targetUserId) return json({ error: "userId is required for service calls" }, 400);
    } else {
      const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
      if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
      targetUserId = authData.user.id;
    }

    const title = String(body.title || "").trim().slice(0, 80);
    const message = String(body.body || "").trim().slice(0, 220);
    if (!title || !message) return json({ error: "title and body are required" }, 400);

    const { data: devices, error: devicesError } = await admin
      .from("device_tokens")
      .select("token, environment")
      .eq("user_id", targetUserId)
      .eq("enabled", true);
    if (devicesError) throw devicesError;

    if (!devices?.length) {
      return json({ success: true, sent: 0, message: "No registered devices" });
    }

    const jwt = await createApnsJwt();
    const actionUrl = typeof body.actionUrl === "string" ? body.actionUrl : "/";
    const notificationType = typeof body.type === "string" ? body.type : "info";
    const payload = {
      aps: {
        alert: { title, body: message },
        sound: "default",
        badge: 1,
      },
      type: notificationType,
      action_url: actionUrl,
      ...(body.carouselId ? { carousel_id: String(body.carouselId) } : {}),
      timestamp: Date.now(),
    };

    let sent = 0;
    const results = [];
    for (const device of devices) {
      const preferred = device.environment === "development" ? "development" : "production";
      let result = await sendToEnvironment(device.token, preferred, jwt, payload, body.collapseId);

      if (!result.ok && result.reason === "BadDeviceToken") {
        const fallback = preferred === "production" ? "development" : "production";
        result = await sendToEnvironment(device.token, fallback, jwt, payload, body.collapseId);
      }

      if (result.ok) sent++;
      if (!result.ok && (result.status === 410 || result.reason === "Unregistered")) {
        await admin.from("device_tokens").delete().eq("token", device.token);
      }

      results.push({
        token: `${device.token.slice(0, 8)}…`,
        success: result.ok,
        status: result.status,
        reason: result.reason || undefined,
        environment: result.environment,
      });
    }

    return json({ success: sent > 0, sent, total: devices.length, results });
  } catch (error) {
    console.error("send-push error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
