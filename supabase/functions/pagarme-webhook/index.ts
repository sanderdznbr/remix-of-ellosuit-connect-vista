import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    console.log('[WEBHOOK] Received:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    // Extract metadata from different event structures
    const metadata =
      data?.subscription?.metadata ||
      data?.metadata ||
      data?.order?.metadata ||
      data?.charges?.[0]?.metadata ||
      {};

    const companyId = metadata?.company_id;
    const action = metadata?.action;

    if (!companyId) {
      console.log('[WEBHOOK] No company_id in metadata, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[WEBHOOK] Type: ${type}, Action: ${action}, Company: ${companyId}`);

    // ── SUBSCRIPTION EVENTS ──
    if (type === 'subscription.created') {
      console.log('[WEBHOOK] Subscription created');
    }

    if (type === 'subscription.activated' || type === 'subscription.renewed') {
      await supabase.from('subscriptions').update({
        status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('company_id', companyId);

      // On renewal, add monthly credits
      if (type === 'subscription.renewed' && metadata?.credits) {
        const credits = Number(metadata.credits);
        if (credits > 0) {
          await supabase.rpc('add_ai_credits', {
            p_company_id: companyId,
            p_amount: credits,
            p_description: `Renovação mensal - ${credits} créditos`,
          });
          console.log(`[WEBHOOK] Added ${credits} renewal credits`);
        }
      }

      console.log('[WEBHOOK] Subscription active for company:', companyId);
    }

    if (type === 'subscription.canceled' || type === 'subscription.expired') {
      await supabase.from('subscriptions').update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('company_id', companyId);

      console.log('[WEBHOOK] Subscription canceled/expired for company:', companyId);
    }

    if (type === 'subscription.pending' || type === 'subscription.overdue') {
      await supabase.from('subscriptions').update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      }).eq('company_id', companyId);

      console.log('[WEBHOOK] Subscription past_due for company:', companyId);
    }

    // ── CHARGE EVENTS ──
    if (type === 'charge.paid') {
      const paidAt = data?.paid_at || new Date().toISOString();

      // If it's a credit purchase (order), add credits
      if (action === 'buy_credits' && metadata?.credits) {
        const credits = Number(metadata.credits);
        await supabase.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: credits,
          p_description: `Compra avulsa confirmada - ${credits} créditos`,
        });
        console.log(`[WEBHOOK] PIX payment confirmed, added ${credits} credits`);
      }

      // If it's a subscription charge, update period
      if (action === 'subscribe') {
        const nextBilling = new Date(paidAt);
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await supabase.from('subscriptions').update({
          status: 'active',
          current_period_start: paidAt,
          current_period_end: nextBilling.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('company_id', companyId);

        console.log('[WEBHOOK] Charge paid, subscription active');
      }
    }

    if (type === 'charge.payment_failed' || type === 'charge.refunded') {
      if (action === 'subscribe') {
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('company_id', companyId);
      }
      console.log('[WEBHOOK] Charge failed/refunded for company:', companyId);
    }

    // ── ORDER EVENTS ──
    if (type === 'order.paid') {
      if (action === 'buy_credits' && metadata?.credits) {
        const credits = Number(metadata.credits);
        await supabase.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: credits,
          p_description: `Pagamento confirmado - ${credits} créditos`,
        });
        console.log(`[WEBHOOK] Order paid, added ${credits} credits`);
      }
    }

    return new Response(JSON.stringify({ received: true, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
