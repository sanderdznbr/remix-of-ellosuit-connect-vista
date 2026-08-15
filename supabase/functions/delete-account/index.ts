import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('[delete-account] Missing Supabase environment variables');
    return json({ error: 'Server configuration error' }, 500);
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const accessToken = authHeader.slice('Bearer '.length);
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userId = userData.user.id;
    const { data: memberships, error: membershipError } = await adminClient
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', userId);

    if (membershipError) throw membershipError;

    for (const membership of memberships ?? []) {
      const { count: memberCount, error: countError } = await adminClient
        .from('company_users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', membership.company_id);

      if (countError) throw countError;

      // A company owned by a single user contains that user's private app data.
      // Deleting it first lets the existing ON DELETE CASCADE constraints clean
      // up company-scoped records before the Auth account is removed.
      if ((memberCount ?? 0) <= 1) {
        const { data: subscription } = await adminClient
          .from('subscriptions')
          .select('pagarme_subscription_id, status')
          .eq('company_id', membership.company_id)
          .maybeSingle();

        if (
          subscription?.pagarme_subscription_id &&
          ['active', 'trialing', 'past_due'].includes(subscription.status)
        ) {
          const cancelResponse = await fetch(`${supabaseUrl}/functions/v1/pagarme-cancel`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              apikey: anonKey,
              'Content-Type': 'application/json',
            },
            body: '{}',
          });

          if (!cancelResponse.ok) {
            console.error('[delete-account] Subscription cancellation failed', await cancelResponse.text());
            return json(
              { error: 'Não foi possível cancelar a assinatura antes de excluir a conta.' },
              409,
            );
          }
        }

        const { error: companyDeleteError } = await adminClient
          .from('companies')
          .delete()
          .eq('id', membership.company_id);

        if (companyDeleteError) throw companyDeleteError;
      }
    }

    // Older tables were created before all user foreign keys used CASCADE.
    await Promise.all([
      adminClient.from('notification_settings').delete().eq('user_id', userId),
      adminClient.from('event_notification_settings').delete().eq('user_id', userId),
      adminClient.from('user_sidebar_settings').delete().eq('user_id', userId),
      adminClient.from('calendar_events').update({ assigned_user_id: null }).eq('assigned_user_id', userId),
      adminClient.from('workflow_cards').update({ assigned_user_id: null }).eq('assigned_user_id', userId),
    ]);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    console.log(`[delete-account] Deleted user ${userId}`);
    return json({ success: true });
  } catch (error) {
    console.error('[delete-account] Unexpected error', error);
    return json({ error: error instanceof Error ? error.message : 'Account deletion failed' }, 500);
  }
});
