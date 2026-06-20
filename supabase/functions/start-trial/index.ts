import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 7;
const TRIAL_PLAN = "pro";
const TRIAL_CREDITS = 30;
const TRIAL_MONTHLY_CREDITS = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email || "";
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: companyUser } = await admin
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!companyUser) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyId = companyUser.company_id;

    // Prevent duplicate trial / existing subscription
    const { data: existing } = await admin
      .from("ellocontent_subscriptions")
      .select("id, status, metadata")
      .eq("company_id", companyId)
      .in("status", ["trialing", "active", "past_due"])
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({
        error: "already_subscribed",
        message: "Você já tem um plano ativo ou trial em andamento.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if trial was ever used (look at metadata)
    const { data: pastTrial } = await admin
      .from("ellocontent_subscriptions")
      .select("id")
      .eq("company_id", companyId)
      .contains("metadata", { is_trial: true })
      .limit(1);

    if (pastTrial && pastTrial.length > 0) {
      return new Response(JSON.stringify({
        error: "trial_used",
        message: "Esta conta já usou o trial gratuito.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { data: sub, error: subErr } = await admin
      .from("ellocontent_subscriptions")
      .insert({
        company_id: companyId,
        user_id: userId,
        plan_name: TRIAL_PLAN,
        monthly_credits: TRIAL_MONTHLY_CREDITS,
        monthly_price: 0,
        status: "trialing",
        payment_method: "trial",
        customer_email: userEmail,
        customer_name: userEmail.split("@")[0],
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: expiresAt.toISOString(),
        metadata: { is_trial: true, trial_days: TRIAL_DAYS },
      })
      .select()
      .single();

    if (subErr || !sub) {
      console.error("[START-TRIAL] insert error:", subErr);
      return new Response(JSON.stringify({ error: "Falha ao iniciar trial" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Grant trial credits
    await admin.rpc("add_ai_credits", {
      p_company_id: companyId,
      p_amount: TRIAL_CREDITS,
      p_description: `Trial gratuito de ${TRIAL_DAYS} dias - ${TRIAL_CREDITS} créditos`,
    });

    return new Response(JSON.stringify({
      success: true,
      trial_credits: TRIAL_CREDITS,
      expires_at: expiresAt.toISOString(),
      days: TRIAL_DAYS,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[START-TRIAL] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
