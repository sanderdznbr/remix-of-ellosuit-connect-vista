import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    
    console.log('Received Pagar.me webhook:', JSON.stringify(body, null, 2));

    const { type, data } = body;
    const subscriptionId = data?.subscription?.id || data?.id;
    const metadata = data?.subscription?.metadata || data?.metadata;

    if (!subscriptionId) {
      console.log('No subscription ID found in webhook');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = metadata?.company_id;
    
    if (!companyId) {
      console.log('No company_id in metadata, skipping');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing webhook type: ${type} for company: ${companyId}`);

    switch (type) {
      case 'subscription.created':
        console.log('Subscription created:', subscriptionId);
        break;

      case 'subscription.activated':
      case 'subscription.renewed':
        // Subscription is now active (trial ended or payment successful)
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
        
        console.log('Subscription activated for company:', companyId);
        break;

      case 'subscription.canceled':
      case 'subscription.expired':
        // Subscription canceled or expired
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        // Deactivate all modules
        await supabase
          .from('subscription_modules')
          .update({ is_active: false })
          .eq('company_id', companyId);
        
        console.log('Subscription canceled for company:', companyId);
        break;

      case 'subscription.pending':
      case 'subscription.overdue':
        // Payment pending or overdue
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
        
        console.log('Subscription past_due for company:', companyId);
        break;

      case 'charge.paid':
        // Individual charge paid - update period dates
        const paidAt = data?.paid_at || new Date().toISOString();
        const nextBillingDate = new Date(paidAt);
        
        // Check billing cycle from metadata
        if (metadata?.billing_cycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: paidAt,
            current_period_end: nextBillingDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
        
        console.log('Charge paid for company:', companyId);
        break;

      case 'charge.payment_failed':
      case 'charge.refunded':
        // Payment failed or refunded
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
        
        console.log('Charge failed/refunded for company:', companyId);
        break;

      case 'order.paid':
        // Order/invoice paid
        console.log('Order paid, subscription should be active');
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
        break;

      default:
        console.log('Unhandled webhook type:', type);
    }

    // Log the webhook event
    await supabase.from('webhook_logs').insert({
      provider: 'pagarme',
      event_type: type,
      payload: body,
      processed_at: new Date().toISOString(),
    }).catch(err => {
      // Table might not exist, ignore
      console.log('Could not log webhook:', err.message);
    });

    return new Response(
      JSON.stringify({ received: true, type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
