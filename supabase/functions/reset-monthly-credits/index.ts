import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan credit allocation
const PLAN_CREDITS: Record<string, number> = {
  test: 5,
  starter: 50,
  pro: 100,
  growth: 200,
  business: 200,
  enterprise: 500,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    console.log(`[CREDIT-RESET] Running at ${now.toISOString()}`);

    // Find active subscriptions where it's time to reset credits
    // Logic: credits_last_reset_at + 1 month <= now
    // Or: current_period_start anniversary day has passed since last reset
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, company_id, plan_type, current_period_start, credits_last_reset_at")
      .eq("status", "active")
      .not("plan_type", "eq", "free");

    if (error) {
      console.error("[CREDIT-RESET] Query error:", error);
      throw error;
    }

    let resetCount = 0;

    for (const sub of subs || []) {
      const periodStart = new Date(sub.current_period_start);
      const lastReset = sub.credits_last_reset_at ? new Date(sub.credits_last_reset_at) : periodStart;

      // Calculate next reset date: same day/time as period start, but next month after last reset
      const nextReset = new Date(lastReset);
      nextReset.setMonth(nextReset.getMonth() + 1);

      // If next reset is still in the future, skip
      if (nextReset > now) continue;

      const planKey = sub.plan_type || "starter";
      const credits = PLAN_CREDITS[planKey] || 50;

      console.log(`[CREDIT-RESET] Resetting ${credits} credits for company ${sub.company_id} (plan: ${planKey})`);

      // Reset balance to plan credits (not add — reset)
      await supabase
        .from("ai_credit_balances")
        .upsert({
          company_id: sub.company_id,
          balance: credits,
          updated_at: now.toISOString(),
        }, { onConflict: "company_id" });

      // Log the transaction
      await supabase.from("ai_credit_transactions").insert({
        company_id: sub.company_id,
        transaction_type: "reset",
        amount: credits,
        balance_after: credits,
        description: `Reset mensal — Plano ${planKey} — ${credits} créditos renovados`,
      });

      // Update last reset timestamp
      await supabase
        .from("subscriptions")
        .update({ credits_last_reset_at: now.toISOString() })
        .eq("id", sub.id);

      resetCount++;
    }

    // Also check ellocontent_subscriptions
    const { data: elloSubs } = await supabase
      .from("ellocontent_subscriptions")
      .select("id, company_id, plan_name, monthly_credits, starts_at, current_period_start")
      .eq("status", "active");

    for (const sub of elloSubs || []) {
      const startRef = sub.current_period_start || sub.starts_at;
      if (!startRef) continue;

      const periodStart = new Date(startRef);
      const nextReset = new Date(periodStart);
      // Find next reset after now
      while (nextReset <= now) {
        nextReset.setMonth(nextReset.getMonth() + 1);
      }
      // Check if we just passed the reset point (within last hour for cron safety)
      const resetPoint = new Date(nextReset);
      resetPoint.setMonth(resetPoint.getMonth() - 1);
      const timeSinceReset = now.getTime() - resetPoint.getTime();
      
      // Only reset if within last 2 hours (cron runs every hour)
      if (timeSinceReset < 0 || timeSinceReset > 2 * 60 * 60 * 1000) continue;

      // Check if already reset this period
      const { data: recentTx } = await supabase
        .from("ai_credit_transactions")
        .select("id")
        .eq("company_id", sub.company_id)
        .eq("transaction_type", "reset")
        .gte("created_at", resetPoint.toISOString())
        .limit(1);

      if (recentTx && recentTx.length > 0) continue;

      const credits = sub.monthly_credits || 50;

      await supabase
        .from("ai_credit_balances")
        .upsert({
          company_id: sub.company_id,
          balance: credits,
          updated_at: now.toISOString(),
        }, { onConflict: "company_id" });

      await supabase.from("ai_credit_transactions").insert({
        company_id: sub.company_id,
        transaction_type: "reset",
        amount: credits,
        balance_after: credits,
        description: `Reset mensal — ${credits} créditos renovados`,
      });

      // Update period
      await supabase
        .from("ellocontent_subscriptions")
        .update({
          current_period_start: resetPoint.toISOString(),
          current_period_end: nextReset.toISOString(),
        })
        .eq("id", sub.id);

      resetCount++;
    }

    console.log(`[CREDIT-RESET] ✅ Done. Reset ${resetCount} subscriptions.`);

    return new Response(JSON.stringify({ success: true, reset_count: resetCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("[CREDIT-RESET] Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
