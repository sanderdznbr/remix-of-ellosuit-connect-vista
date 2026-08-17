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
const APNS_BUNDLE_ID = Deno.env.get("ELLOCONTENT_APNS_BUNDLE_ID") || "com.ellocontent.app";
const APNS_TEAM_ID = Deno.env.get("ELLOCONTENT_APNS_TEAM_ID");
const APNS_KEY_ID = Deno.env.get("ELLOCONTENT_APNS_KEY_ID");
const APNS_KEY = Deno.env.get("ELLOCONTENT_APNS_KEY");

type AuthContext = {
  admin: ReturnType<typeof createClient>;
  userId: string | null;
  isServiceCall: boolean;
};

function normalizePrivateKey(raw: string) {
  const normalized = raw.replace(/\\n/g, "\n").trim();
  if (normalized.includes("BEGIN PRIVATE KEY")) return normalized;
  try {
    return atob(normalized);
  } catch {
    return normalized;
  }
}

async function authenticate(req: Request): Promise<AuthContext | Response> {
  const authorization = req.headers.get("Authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ error: "Authentication required" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  if (accessToken === SERVICE_ROLE_KEY) {
    return { admin, userId: null, isServiceCall: true };
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return json({ error: "Invalid session" }, 401);
  return { admin, userId: data.user.id, isServiceCall: false };
}

async function registerDevice(context: AuthContext, body: Record<string, unknown>) {
  if (!context.userId || context.isServiceCall) {
    return json({ error: "A user session is required" }, 401);
  }

  if (body.action === "unregister-all") {
    const { error } = await context.admin
      .from("ellocontent_device_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return json({ success: true, message: "Device tokens removed" });
  }

  const token = String(body.token || "").trim();
  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    return json({ error: "Invalid APNs device token" }, 400);
  }

  const environment = body.environment === "development" ? "development" : "production";
  const registration = {
    token,
    user_id: context.userId,
    platform: "ios",
    environment,
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await context.admin
    .from("ellocontent_device_tokens")
    .upsert(registration, { onConflict: "token" });
  if (error) throw error;

  return json({ success: true, message: "Device registered" });
}

async function createApnsJwt() {
  if (!APNS_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error("APNs credentials are not configured");
  }

  const privateKey = await jose.importPKCS8(normalizePrivateKey(APNS_KEY), "ES256");
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuer(APNS_TEAM_ID)
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(privateKey);
}

async function sendToApns(
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

  const responseText = await response.text();
  let reason = "";
  try {
    reason = JSON.parse(responseText)?.reason || "";
  } catch {
    reason = responseText;
  }
  return { ok: response.ok, status: response.status, reason, environment };
}

async function sendNotification(context: AuthContext, body: Record<string, unknown>) {
  const targetUserId = context.isServiceCall
    ? (typeof body.userId === "string" ? body.userId : null)
    : context.userId;

  if (!targetUserId) return json({ error: "userId is required for service calls" }, 400);

  const title = String(body.title || "").trim().slice(0, 80);
  const message = String(body.body || "").trim().slice(0, 220);
  if (!title || !message) return json({ error: "title and body are required" }, 400);

  const { data: devices, error } = await context.admin
    .from("ellocontent_device_tokens")
    .select("token, environment")
    .eq("user_id", targetUserId)
    .eq("enabled", true);
  if (error) throw error;

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
  const results: Array<Record<string, unknown>> = [];
  for (const device of devices) {
    const preferred = device.environment === "development" ? "development" : "production";
    let result = await sendToApns(
      device.token,
      preferred,
      jwt,
      payload,
      typeof body.collapseId === "string" ? body.collapseId : undefined,
    );

    if (!result.ok && result.reason === "BadDeviceToken") {
      const fallback = preferred === "production" ? "development" : "production";
      result = await sendToApns(
        device.token,
        fallback,
        jwt,
        payload,
        typeof body.collapseId === "string" ? body.collapseId : undefined,
      );
    }

    if (result.ok) sent += 1;
    if (!result.ok && (result.status === 410 || result.reason === "Unregistered")) {
      await context.admin.from("ellocontent_device_tokens").delete().eq("token", device.token);
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const context = await authenticate(req);
    if (context instanceof Response) return context;

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action === "register" || body.action === "unregister-all") {
      return await registerDevice(context, body);
    }
    return await sendNotification(context, body);
  } catch (error) {
    console.error("ellocontent-push error:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
