import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Plan pricing (cents) — monthly prices
const PLANS: Record<string, { name: string; price: number; credits: number }> = {
  test: { name: 'Teste', price: 100, credits: 5 },
  starter: { name: 'Starter', price: 8990, credits: 50 },
  pro: { name: 'Pro', price: 15990, credits: 100 },
  growth: { name: 'Growth', price: 26990, credits: 200 },
};

// Helper to apply coupon discount server-side
async function applyCouponDiscount(
  adminClient: any,
  couponCode: string | undefined,
  userId: string,
  priceInCents: number,
): Promise<{ finalPrice: number; couponId: string | null; discountApplied: number }> {
  if (!couponCode) return { finalPrice: priceInCents, couponId: null, discountApplied: 0 };

  const { data: coupon } = await adminClient
    .from('coupons')
    .select('id, code, discount_percent, discount_fixed, max_uses, current_uses, expires_at, is_active')
    .eq('code', couponCode.toUpperCase())
    .eq('is_active', true)
    .eq('coupon_type', 'discount')
    .maybeSingle();

  if (!coupon) return { finalPrice: priceInCents, couponId: null, discountApplied: 0 };

  // Validate expiry and usage
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { finalPrice: priceInCents, couponId: null, discountApplied: 0 };
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return { finalPrice: priceInCents, couponId: null, discountApplied: 0 };

  // Check if user already used
  const { data: existing } = await adminClient
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return { finalPrice: priceInCents, couponId: null, discountApplied: 0 };

  let discount = 0;
  if (coupon.discount_percent > 0) {
    discount = Math.round(priceInCents * (coupon.discount_percent / 100));
  } else if (coupon.discount_fixed > 0) {
    discount = Math.round(coupon.discount_fixed * 100);
  }

  const finalPrice = Math.max(100, priceInCents - discount); // min 1 real
  return { finalPrice, couponId: coupon.id, discountApplied: discount };
}

function getPagarmeAuth(): string {
  const key = Deno.env.get('PAGARME_SECRET_KEY');
  if (!key) throw new Error('PAGARME_SECRET_KEY not configured');
  return `Basic ${btoa(`${key}:`)}`;
}

async function getOrCreateCustomer(
  auth: string,
  customer: { name: string; email: string; document: string; phone: string },
  supabase: any,
  companyId: string,
): Promise<string> {
  // Check if customer already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('pagarme_customer_id')
    .eq('company_id', companyId)
    .not('pagarme_customer_id', 'is', null)
    .maybeSingle();

  if (existing?.pagarme_customer_id) {
    console.log('Reusing existing customer:', existing.pagarme_customer_id);
    return existing.pagarme_customer_id;
  }

  const doc = customer.document.replace(/\D/g, '');
  const phone = customer.phone.replace(/\D/g, '');

  const res = await fetch('https://api.pagar.me/core/v5/customers', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      document: doc,
      type: doc.length > 11 ? 'company' : 'individual',
      phones: {
        mobile_phone: {
          country_code: '55',
          area_code: phone.substring(0, 2),
          number: phone.substring(2),
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Customer creation error:', data);
    throw new Error(data.message || 'Falha ao criar cliente');
  }

  console.log('Created customer:', data.id);
  return data.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = getPagarmeAuth();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const userClient = createClient(supabaseUrl, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || '';

    // Get company
    const { data: cu } = await userClient
      .from('company_users')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!cu) {
      return new Response(JSON.stringify({ error: 'Usuário sem empresa' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = cu.company_id;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { action, customer } = body;

    if (!customer?.name || !customer?.document) {
      return new Response(JSON.stringify({ error: 'Nome e CPF são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    customer.email = customer.email || userEmail;
    customer.phone = customer.phone || '11999999999';

    const customerId = await getOrCreateCustomer(auth, customer, adminClient, companyId);

    // ════════════════════════════════════════
    //  ACTION: SUBSCRIBE (monthly plan, card only)
    // ════════════════════════════════════════
    if (action === 'subscribe') {
      const { plan_id, card, payment_method: subPayMethod } = body;
      const plan = PLANS[plan_id];

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plano inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const usePix = subPayMethod === 'pix';

      if (!usePix && !card?.number) {
        return new Response(JSON.stringify({ error: 'Dados do cartão são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[SUBSCRIBE] Plan: ${plan_id}, Method: ${usePix ? 'pix' : 'card'}, Company: ${companyId}`);

      const { finalPrice, couponId, discountApplied } = await applyCouponDiscount(
        adminClient, body.coupon_code, userId, plan.price,
      );
      console.log(`[SUBSCRIBE] Original: ${plan.price}, Discount: ${discountApplied}, Final: ${finalPrice}`);

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Helper to activate subscription in DB
      const activateSubscription = async (pagarmeId: string, status: string, isPix: boolean) => {
        await adminClient.from('subscriptions').upsert({
          company_id: companyId,
          plan_type: plan_id as any,
          billing_cycle: 'monthly',
          status: status === 'active' || status === 'paid' ? 'active' : 'pending',
          monthly_price: finalPrice / 100,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          credits_last_reset_at: now.toISOString(),
          pagarme_subscription_id: isPix ? null : pagarmeId,
          pagarme_customer_id: customerId,
          updated_at: now.toISOString(),
        }, { onConflict: 'company_id' });

        if (status === 'active' || status === 'paid') {
          await adminClient.rpc('add_ai_credits', {
            p_company_id: companyId,
            p_amount: plan.credits,
            p_description: `Plano ${plan.name} - ${plan.credits} créditos mensais`,
          });
          console.log(`[SUBSCRIBE] Added ${plan.credits} credits`);

          if (couponId) {
            await adminClient.from('coupon_redemptions').insert({
              coupon_id: couponId, user_id: userId, company_id: companyId,
            });
            await adminClient.rpc('increment_coupon_uses', { p_coupon_id: couponId }).catch(() => {});
          }
        }
      };

      if (usePix) {
        // PIX: create a one-time order, activate plan on payment
        const orderPayload = {
          customer_id: customerId,
          items: [{
            amount: finalPrice,
            description: `elloContent - Plano ${plan.name} (1º mês)`,
            quantity: 1,
          }],
          payments: [{
            payment_method: 'pix',
            pix: { expires_in: 3600 },
            amount: finalPrice,
          }],
          metadata: {
            company_id: companyId,
            user_id: userId,
            plan_id,
            credits: plan.credits,
            action: 'subscribe_pix',
            coupon_id: couponId || undefined,
          },
        };

        const res = await fetch('https://api.pagar.me/core/v5/orders', {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error('[SUBSCRIBE_PIX] Error:', data);
          return new Response(JSON.stringify({
            error: 'Falha ao gerar PIX',
            details: data.message || JSON.stringify(data.errors || data),
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('[SUBSCRIBE_PIX] Order:', data.id, 'Status:', data.status);

        // If paid immediately (unlikely for PIX), activate
        if (data.status === 'paid') {
          await activateSubscription(data.id, 'paid', true);
        } else {
          // Set pending subscription
          await adminClient.from('subscriptions').upsert({
            company_id: companyId,
            plan_type: plan_id as any,
            billing_cycle: 'monthly',
            status: 'pending' as any,
            monthly_price: finalPrice / 100,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            credits_last_reset_at: now.toISOString(),
            pagarme_customer_id: customerId,
            updated_at: now.toISOString(),
          }, { onConflict: 'company_id' });
        }

        let pixData = null;
        if (data.charges?.[0]?.last_transaction) {
          const tx = data.charges[0].last_transaction;
          pixData = { qr_code: tx.qr_code, qr_code_url: tx.qr_code_url, expires_at: tx.expires_at };
        }

        return new Response(JSON.stringify({
          success: true,
          order_id: data.id,
          status: data.status,
          plan: plan.name,
          credits: plan.credits,
          pix: pixData,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        // CARD: create recurring subscription
        const subscriptionPayload = {
          customer_id: customerId,
          payment_method: 'credit_card',
          interval: 'month',
          interval_count: 1,
          billing_type: 'prepaid',
          installments: 1,
          statement_descriptor: 'ELLOCONTENT',
          currency: 'BRL',
          card: {
            number: card.number.replace(/\D/g, ''),
            holder_name: card.holder_name,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            cvv: card.cvv,
            billing_address: {
              line_1: customer.address || 'Rua Exemplo, 123',
              zip_code: customer.zip_code?.replace(/\D/g, '') || '01001000',
              city: customer.city || 'São Paulo',
              state: customer.state || 'SP',
              country: 'BR',
            },
          },
          items: [{
            description: `elloContent - Plano ${plan.name} (Mensal)`,
            quantity: 1,
            pricing_scheme: { scheme_type: 'unit', price: finalPrice },
          }],
          metadata: {
            company_id: companyId,
            user_id: userId,
            plan_id,
            credits: plan.credits,
            action: 'subscribe',
            coupon_id: couponId || undefined,
          },
        };

        const res = await fetch('https://api.pagar.me/core/v5/subscriptions', {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error('[SUBSCRIBE] Error:', data);
          return new Response(JSON.stringify({
            error: 'Falha ao criar assinatura',
            details: data.message || JSON.stringify(data.errors || data),
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('[SUBSCRIBE] Created:', data.id, 'Status:', data.status);
        await activateSubscription(data.id, data.status, false);

        return new Response(JSON.stringify({
          success: true,
          subscription_id: data.id,
          status: data.status,
          plan: plan.name,
          credits: plan.credits,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ════════════════════════════════════════
    //  ACTION: BUY_CREDITS (one-time, card or PIX)
    // ════════════════════════════════════════
    if (action === 'buy_credits') {
      const { credits, price_cents, payment_method, card } = body;

      if (!credits || !price_cents) {
        return new Response(JSON.stringify({ error: 'Créditos e preço são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (payment_method === 'credit_card' && !card?.number) {
        return new Response(JSON.stringify({ error: 'Dados do cartão são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[BUY_CREDITS] ${credits} credits, method: ${payment_method}, company: ${companyId}`);

      // Apply coupon discount server-side
      const { finalPrice: creditFinalPrice, couponId: creditCouponId } = await applyCouponDiscount(
        adminClient, body.coupon_code, userId, price_cents,
      );

      const orderPayload: any = {
        customer_id: customerId,
        items: [{
          amount: creditFinalPrice,
          description: `elloContent - ${credits} créditos avulsos`,
          quantity: 1,
        }],
        payments: [],
        metadata: {
          company_id: companyId,
          user_id: userId,
          credits,
          action: 'buy_credits',
        },
      };

      if (payment_method === 'pix') {
        orderPayload.payments.push({
          payment_method: 'pix',
          pix: {
            expires_in: 3600, // 1 hour
          },
          amount: creditFinalPrice,
        });
      } else {
        orderPayload.payments.push({
          payment_method: 'credit_card',
          credit_card: {
            card: {
              number: card.number.replace(/\D/g, ''),
              holder_name: card.holder_name,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              cvv: card.cvv,
              billing_address: {
                line_1: customer.address || 'Rua Exemplo, 123',
                zip_code: customer.zip_code?.replace(/\D/g, '') || '01001000',
                city: customer.city || 'São Paulo',
                state: customer.state || 'SP',
                country: 'BR',
              },
            },
            installments: 1,
            statement_descriptor: 'ELLOCONTENT',
          },
          amount: creditFinalPrice,
        });
      }

      const res = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[BUY_CREDITS] Error:', data);
        return new Response(JSON.stringify({
          error: 'Falha no pagamento',
          details: data.message || JSON.stringify(data.errors || data),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[BUY_CREDITS] Order created:', data.id, 'Status:', data.status);

      // If paid immediately (credit card), add credits
      if (data.status === 'paid') {
        await adminClient.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: credits,
          p_description: `Compra avulsa - ${credits} créditos`,
        });
        console.log(`[BUY_CREDITS] Added ${credits} credits immediately`);
      }

      // Extract PIX data if applicable
      let pixData = null;
      if (payment_method === 'pix' && data.charges?.[0]?.last_transaction) {
        const tx = data.charges[0].last_transaction;
        pixData = {
          qr_code: tx.qr_code,
          qr_code_url: tx.qr_code_url,
          expires_at: tx.expires_at,
        };
      }

      return new Response(JSON.stringify({
        success: true,
        order_id: data.id,
        status: data.status,
        credits,
        pix: pixData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ════════════════════════════════════════
    //  ACTION: BUY_STYLE (marketplace style, card or PIX)
    // ════════════════════════════════════════
    if (action === 'buy_style') {
      const { style_id, price_cents, payment_method, card } = body;

      if (!style_id || !price_cents) {
        return new Response(JSON.stringify({ error: 'ID do estilo e preço são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate price server-side
      const { data: styleData } = await adminClient
        .from('marketplace_styles')
        .select('id, name, price_brl, is_free')
        .eq('id', style_id)
        .single();

      if (!styleData) {
        return new Response(JSON.stringify({ error: 'Estilo não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (styleData.is_free) {
        return new Response(JSON.stringify({ error: 'Este estilo é gratuito' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use server-side price (security)
      const serverPriceCents = Math.round(styleData.price_brl * 100);

      if (payment_method === 'credit_card' && !card?.number) {
        return new Response(JSON.stringify({ error: 'Dados do cartão são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[BUY_STYLE] Style: ${styleData.name}, Price: ${serverPriceCents} cents, Company: ${companyId}`);

      const orderPayload: any = {
        customer_id: customerId,
        items: [{
          amount: serverPriceCents,
          description: `elloContent - Estilo "${styleData.name}"`,
          quantity: 1,
        }],
        payments: [],
        metadata: {
          company_id: companyId,
          user_id: userId,
          style_id,
          action: 'buy_style',
        },
      };

      if (payment_method === 'pix') {
        orderPayload.payments.push({
          payment_method: 'pix',
          pix: { expires_in: 3600 },
          amount: serverPriceCents,
        });
      } else {
        orderPayload.payments.push({
          payment_method: 'credit_card',
          credit_card: {
            card: {
              number: card.number.replace(/\D/g, ''),
              holder_name: card.holder_name,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
              cvv: card.cvv,
              billing_address: {
                line_1: customer.address || 'Rua Exemplo, 123',
                zip_code: customer.zip_code?.replace(/\D/g, '') || '01001000',
                city: customer.city || 'São Paulo',
                state: customer.state || 'SP',
                country: 'BR',
              },
            },
            installments: 1,
            statement_descriptor: 'ELLOCONTENT',
          },
          amount: serverPriceCents,
        });
      }

      const res = await fetch('https://api.pagar.me/core/v5/orders', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[BUY_STYLE] Error:', data);
        return new Response(JSON.stringify({
          error: 'Falha no pagamento',
          details: data.message || JSON.stringify(data.errors || data),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[BUY_STYLE] Order created:', data.id, 'Status:', data.status);

      // If paid immediately, grant the style
      if (data.status === 'paid') {
        await adminClient.from('purchased_styles').insert({
          user_id: userId,
          company_id: companyId,
          style_id,
          payment_method: 'brl',
        });
        console.log(`[BUY_STYLE] Style granted to user ${userId}`);
      }

      let pixInfo = null;
      if (payment_method === 'pix' && data.charges?.[0]?.last_transaction) {
        const tx = data.charges[0].last_transaction;
        pixInfo = {
          qr_code: tx.qr_code,
          qr_code_url: tx.qr_code_url,
          expires_at: tx.expires_at,
        };
      }

      return new Response(JSON.stringify({
        success: true,
        order_id: data.id,
        status: data.status,
        style_id,
        pix: pixInfo,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'subscribe', 'buy_credits' ou 'buy_style'" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('[CHECKOUT] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
