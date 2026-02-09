import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the requesting user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }

    const adminUserId = claimsData.claims.sub

    // Use service role to check adminmaster status
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: adminCheck } = await serviceClient
      .from('company_users')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'adminmaster')
      .single()

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: adminmaster role required' }), { status: 403, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'impersonate'

    if (action === 'impersonate') {
      const { targetUserId, reason } = await req.json()

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'targetUserId required' }), { status: 400, headers: corsHeaders })
      }

      // Generate magic link for impersonation
      const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(targetUserId)
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders })
      }

      // Log the impersonation
      await serviceClient.from('admin_impersonation_logs').insert({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        reason: reason || 'Admin investigation',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      })

      // Generate a session for the target user
      const { data: sessionData, error: sessionError } = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email!,
      })

      if (sessionError) {
        return new Response(JSON.stringify({ error: 'Failed to generate impersonation link' }), { status: 500, headers: corsHeaders })
      }

      return new Response(JSON.stringify({
        success: true,
        link: sessionData.properties?.action_link,
        user: { id: userData.user.id, email: userData.user.email }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'stats') {
      // Get platform-wide stats
      const [companies, subscriptions, users] = await Promise.all([
        serviceClient.from('companies').select('id, name, created_at', { count: 'exact' }),
        serviceClient.from('subscriptions').select('*'),
        serviceClient.from('company_users').select('user_id, role, company_id, created_at', { count: 'exact' }),
      ])

      const activeSubscriptions = (subscriptions.data || []).filter(s => s.status === 'active')
      const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.monthly_price || 0), 0)

      return new Response(JSON.stringify({
        totalCompanies: companies.count || 0,
        totalUsers: users.count || 0,
        activeSubscriptions: activeSubscriptions.length,
        monthlyRevenue,
        subscriptions: subscriptions.data || [],
        recentCompanies: (companies.data || []).slice(0, 20),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'company-details') {
      const companyId = url.searchParams.get('companyId')
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'companyId required' }), { status: 400, headers: corsHeaders })
      }

      const [company, users, clients, events, agents, flows] = await Promise.all([
        serviceClient.from('companies').select('*').eq('id', companyId).single(),
        serviceClient.from('company_users').select('*').eq('company_id', companyId),
        serviceClient.from('clients').select('id', { count: 'exact' }).eq('company_id', companyId),
        serviceClient.from('calendar_events').select('id', { count: 'exact' }).eq('company_id', companyId),
        serviceClient.from('ai_agents').select('id, name, is_active').eq('company_id', companyId),
        serviceClient.from('chatbot_flows').select('id, name, is_active').eq('company_id', companyId),
      ])

      return new Response(JSON.stringify({
        company: company.data,
        users: users.data || [],
        clientsCount: clients.count || 0,
        eventsCount: events.count || 0,
        agents: agents.data || [],
        flows: flows.data || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'all-companies') {
      const { data: allCompanies } = await serviceClient
        .from('companies')
        .select('id, name, domain, created_at')
        .order('created_at', { ascending: false })

      // Get user counts per company
      const { data: userCounts } = await serviceClient
        .from('company_users')
        .select('company_id')

      const companyCounts: Record<string, number> = {}
      ;(userCounts || []).forEach(u => {
        companyCounts[u.company_id] = (companyCounts[u.company_id] || 0) + 1
      })

      const enriched = (allCompanies || []).map(c => ({
        ...c,
        userCount: companyCounts[c.id] || 0,
      }))

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
