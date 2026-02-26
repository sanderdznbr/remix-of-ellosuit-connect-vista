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
    const body = await req.json();
    console.log("[ELLOCONTENT-WEBHOOK] Received:", JSON.stringify(body).substring(0, 500));

    const { type, data } = body;

    if (type !== "transaction" || !data) {
      console.log("[ELLOCONTENT-WEBHOOK] Ignoring non-transaction event:", type);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionId = String(data.id);
    const status = data.status;
    const metadata = data.metadata ? JSON.parse(data.metadata) : {};
    const action = metadata.action;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── SUBSCRIPTION WEBHOOK ──
    if (action === "subscribe") {
      const subscriptionId = metadata.subscription_id || data.externalRef;
      if (!subscriptionId) {
        console.log("[ELLOCONTENT-WEBHOOK] No subscription_id found");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {
        beehive_transaction_id: transactionId,
        beehive_status: status,
        card_last_digits: data.card?.lastDigits,
        card_brand: data.card?.brand,
      };

      if (status === "paid") {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        updateData.status = "active";
        updateData.starts_at = now.toISOString();
        updateData.expires_at = expiresAt.toISOString();
        updateData.paid_at = data.paidAt || now.toISOString();

        // Add credits
        const credits = metadata.credits || 40;
        const companyId = metadata.company_id;
        if (companyId) {
          await supabase.rpc("add_ai_credits", {
            p_company_id: companyId,
            p_amount: credits,
            p_description: `Plano ${metadata.plan_name || 'mensal'} - ${credits} créditos`,
          });
        }

        console.log(`[ELLOCONTENT-WEBHOOK] ✅ Subscription ${subscriptionId} ACTIVATED`);
      } else if (status === "refused" || status === "canceled") {
        updateData.status = "canceled";
        updateData.canceled_at = new Date().toISOString();
        console.log(`[ELLOCONTENT-WEBHOOK] ❌ Subscription ${subscriptionId} ${status}`);
      } else if (status === "refunded") {
        updateData.status = "canceled";
        updateData.canceled_at = new Date().toISOString();
        console.log(`[ELLOCONTENT-WEBHOOK] 💰 Subscription ${subscriptionId} REFUNDED`);
      }

      await supabase.from("ellocontent_subscriptions").update(updateData).eq("id", subscriptionId);
    }

    // ── CREDIT PURCHASE WEBHOOK ──
    if (action === "buy_credits" && status === "paid") {
      const companyId = metadata.company_id;
      const credits = metadata.credits || 0;
      if (companyId && credits > 0) {
        await supabase.rpc("add_ai_credits", {
          p_company_id: companyId,
          p_amount: credits,
          p_description: `Compra avulsa - ${credits} créditos`,
        });
        console.log(`[ELLOCONTENT-WEBHOOK] ✅ Added ${credits} credits to company ${companyId}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    console.error("[ELLOCONTENT-WEBHOOK] Error:", e);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
