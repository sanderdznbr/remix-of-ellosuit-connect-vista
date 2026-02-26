import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEEHIVE_API_URL = "https://api.conta.paybeehive.com.br/v1";

// Ellocontent plan definitions (prices in cents)
const PLANS: Record<string, { label: string; price: number; credits: number; extraCreditPrice: number }> = {
  starter:  { label: "Starter",  price: 4900,  credits: 40,  extraCreditPrice: 2.50 },
  pro:      { label: "Pro",      price: 9700,  credits: 100, extraCreditPrice: 2.00 },
  growth:   { label: "Growth",   price: 19700, credits: 250, extraCreditPrice: 1.50 },
};

function getBeehiveAuth(): string {
  const secretKey = Deno.env.get("BEEHIVE_SECRET_KEY");
  if (!secretKey) throw new Error("BEEHIVE_SECRET_KEY not configured");
  return `Basic ${btoa(`${secretKey}:x`)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
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
    const body = await req.json();
    const {
      action, // 'subscribe' or 'buy_credits'
      plan_name,
      payment_method, // 'credit_card' or 'pix'
      card_token,
      credit_package_id,
      customer_name,
      customer_document,
      customer_phone,
      customer_address,
    } = body;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get company_id
    const { data: companyUser } = await adminClient
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!companyUser) {
      return new Response(JSON.stringify({ error: "User not associated with a company" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyId = companyUser.company_id;

    // ── SUBSCRIBE TO A PLAN ──
    if (action === "subscribe") {
      const plan = PLANS[plan_name];
      if (!plan) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create subscription record
      const { data: sub, error: subErr } = await adminClient
        .from("ellocontent_subscriptions")
        .insert({
          company_id: companyId,
          user_id: userId,
          plan_name,
          monthly_credits: plan.credits,
          extra_credit_price: plan.extraCreditPrice,
          monthly_price: plan.price / 100,
          status: "pending",
          payment_method: payment_method || "credit_card",
          customer_name: customer_name || userEmail.split("@")[0],
          customer_email: userEmail,
          customer_document,
          customer_phone,
        })
        .select()
        .single();

      if (subErr || !sub) {
        console.error("[ELLOCONTENT] Subscription insert error:", subErr);
        return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const postbackUrl = `${supabaseUrl}/functions/v1/ellocontent-webhook`;

      const txPayload: Record<string, unknown> = {
        amount: plan.price,
        paymentMethod: payment_method === "pix" ? "pix" : "credit_card",
        postbackUrl,
        metadata: JSON.stringify({
          subscription_id: sub.id,
          company_id: companyId,
          plan_name,
          action: "subscribe",
          credits: plan.credits,
        }),
        externalRef: sub.id,
        customer: {
          name: customer_name || "Cliente elloContent",
          email: userEmail,
          document: {
            number: (customer_document || "").replace(/\D/g, ""),
            type: (customer_document || "").replace(/\D/g, "").length > 11 ? "cnpj" : "cpf",
          },
          phone: customer_phone ? `+55${customer_phone.replace(/\D/g, "")}` : undefined,
          ...(customer_address ? {
            address: {
              street: customer_address.street || "",
              number: customer_address.number || "",
              complement: customer_address.complement || "",
              neighborhood: customer_address.neighborhood || "",
              city: customer_address.city || "",
              state: customer_address.state || "",
              zipcode: (customer_address.zipcode || "").replace(/\D/g, ""),
              country: "BR",
            },
          } : {}),
        },
        items: [{
          title: `elloContent - Plano ${plan.label} (Mensal)`,
          unitPrice: plan.price,
          quantity: 1,
          tangible: false,
        }],
      };

      if (payment_method !== "pix" && card_token) {
        (txPayload as any).card = { hash: card_token };
      }

      console.log("[ELLOCONTENT] Creating transaction for subscription:", sub.id);

      const beehiveRes = await fetch(`${BEEHIVE_API_URL}/transactions`, {
        method: "POST",
        headers: {
          Authorization: getBeehiveAuth(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txPayload),
      });

      const beehiveData = await beehiveRes.json();

      if (!beehiveRes.ok) {
        console.error("[ELLOCONTENT] Transaction failed:", beehiveData);
        await adminClient.from("ellocontent_subscriptions").update({
          beehive_status: "refused",
          status: "canceled",
          metadata: { error: beehiveData },
        }).eq("id", sub.id);

        return new Response(JSON.stringify({
          error: "Payment failed",
          details: beehiveData.message || beehiveData.error || "Transaction refused",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update subscription with Beehive data
      const updateData: Record<string, unknown> = {
        beehive_transaction_id: String(beehiveData.id),
        beehive_status: beehiveData.status,
        beehive_secure_id: beehiveData.secureId,
        beehive_secure_url: beehiveData.secureUrl,
        card_last_digits: beehiveData.card?.lastDigits,
        card_brand: beehiveData.card?.brand,
      };

      if (beehiveData.status === "paid") {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        updateData.status = "active";
        updateData.starts_at = now.toISOString();
        updateData.expires_at = expiresAt.toISOString();
        updateData.paid_at = beehiveData.paidAt || now.toISOString();

        // Add credits to company
        await adminClient.rpc("add_ai_credits", {
          p_company_id: companyId,
          p_amount: plan.credits,
          p_description: `Plano ${plan.label} - ${plan.credits} créditos mensais`,
        });
      }

      await adminClient.from("ellocontent_subscriptions").update(updateData).eq("id", sub.id);

      console.log("[ELLOCONTENT] ✅ Transaction created:", beehiveData.id, "status:", beehiveData.status);

      return new Response(JSON.stringify({
        success: true,
        subscription_id: sub.id,
        transaction_id: beehiveData.id,
        status: beehiveData.status,
        secure_url: beehiveData.secureUrl,
        pix_qr_code: beehiveData.pixQrCode,
        pix_qr_code_url: beehiveData.pixQrCodeUrl,
        pix_expiration_date: beehiveData.pixExpirationDate,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── BUY EXTRA CREDITS ──
    if (action === "buy_credits") {
      // Get package
      const { data: pkg } = await adminClient
        .from("ai_credit_packages")
        .select("*")
        .eq("id", credit_package_id)
        .single();

      if (!pkg) {
        return new Response(JSON.stringify({ error: "Invalid credit package" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const priceInCents = Math.round(pkg.price_brl * 100);

      const postbackUrl = `${supabaseUrl}/functions/v1/ellocontent-webhook`;

      const txPayload: Record<string, unknown> = {
        amount: priceInCents,
        paymentMethod: payment_method === "pix" ? "pix" : "credit_card",
        postbackUrl,
        metadata: JSON.stringify({
          company_id: companyId,
          action: "buy_credits",
          package_id: pkg.id,
          credits: pkg.credits,
        }),
        externalRef: `credits-${companyId}-${Date.now()}`,
        customer: {
          name: customer_name || "Cliente elloContent",
          email: userEmail,
          document: {
            number: (customer_document || "").replace(/\D/g, ""),
            type: (customer_document || "").replace(/\D/g, "").length > 11 ? "cnpj" : "cpf",
          },
          phone: customer_phone ? `+55${customer_phone.replace(/\D/g, "")}` : undefined,
        },
        items: [{
          title: `elloContent - ${pkg.name} (${pkg.credits} créditos)`,
          unitPrice: priceInCents,
          quantity: 1,
          tangible: false,
        }],
      };

      if (payment_method !== "pix" && card_token) {
        (txPayload as any).card = { hash: card_token };
      }

      const beehiveRes = await fetch(`${BEEHIVE_API_URL}/transactions`, {
        method: "POST",
        headers: {
          Authorization: getBeehiveAuth(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txPayload),
      });

      const beehiveData = await beehiveRes.json();

      if (!beehiveRes.ok) {
        console.error("[ELLOCONTENT] Credit purchase failed:", beehiveData);
        return new Response(JSON.stringify({
          error: "Payment failed",
          details: beehiveData.message || beehiveData.error || "Transaction refused",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If immediately paid, add credits
      if (beehiveData.status === "paid") {
        await adminClient.rpc("add_ai_credits", {
          p_company_id: companyId,
          p_amount: pkg.credits,
          p_description: `Compra avulsa - ${pkg.name}`,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        transaction_id: beehiveData.id,
        status: beehiveData.status,
        secure_url: beehiveData.secureUrl,
        pix_qr_code: beehiveData.pixQrCode,
        pix_qr_code_url: beehiveData.pixQrCodeUrl,
        pix_expiration_date: beehiveData.pixExpirationDate,
        credits: pkg.credits,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'subscribe' or 'buy_credits'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    console.error("[ELLOCONTENT] Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
