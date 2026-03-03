import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Plan pricing (cents)
const PLANS: Record<string, { name: string; price: number; credits: number }> = {
  starter: { name: 'Starter', price: 6700, credits: 50 },
  pro: { name: 'Pro', price: 12700, credits: 120 },
  growth: { name: 'Growth', price: 24700, credits: 300 },
};

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
      const { plan_id, card } = body;
      const plan = PLANS[plan_id];

      if (!plan) {
        return new Response(JSON.stringify({ error: 'Plano inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!card?.number) {
        return new Response(JSON.stringify({ error: 'Dados do cartão são obrigatórios para planos mensais' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[SUBSCRIBE] Plan: ${plan_id}, Company: ${companyId}`);

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
          pricing_scheme: { scheme_type: 'unit', price: plan.price },
        }],
        metadata: {
          company_id: companyId,
          user_id: userId,
          plan_id,
          credits: plan.credits,
          action: 'subscribe',
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
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[SUBSCRIBE] Created:', data.id, 'Status:', data.status);

      // Update subscription in DB
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await adminClient.from('subscriptions').upsert({
        company_id: companyId,
        plan_type: plan_id as any,
        billing_cycle: 'monthly',
        status: data.status === 'active' ? 'active' : 'trialing',
        monthly_price: plan.price / 100,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        pagarme_subscription_id: data.id,
        pagarme_customer_id: customerId,
        updated_at: now.toISOString(),
      }, { onConflict: 'company_id' });

      // Add initial credits if active
      if (data.status === 'active') {
        await adminClient.rpc('add_ai_credits', {
          p_company_id: companyId,
          p_amount: plan.credits,
          p_description: `Plano ${plan.name} - ${plan.credits} créditos mensais`,
        });
        console.log(`[SUBSCRIBE] Added ${plan.credits} credits`);
      }

      return new Response(JSON.stringify({
        success: true,
        subscription_id: data.id,
        status: data.status,
        plan: plan.name,
        credits: plan.credits,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

      const orderPayload: any = {
        customer_id: customerId,
        items: [{
          amount: price_cents,
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
          amount: price_cents,
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
          amount: price_cents,
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

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'subscribe' ou 'buy_credits'" }), {
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
