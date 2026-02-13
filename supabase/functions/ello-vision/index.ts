import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Get user's company
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!companyUser) throw new Error('No company found');
    const companyId = companyUser.company_id;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();
    const twoWeeksAgoISO = twoWeeksAgo.toISOString();

    // Gather real data in parallel
    const [
      docsRes, clientsRes, eventsRes, emailsRes,
      linkClicksRes, docTrackingRes, trackedLinksRes,
      tasksRes, whatsappRes, emailEventsRes,
      docsPrevRes, emailsPrevRes
    ] = await Promise.all([
      // Current week
      supabase.from('documents').select('id, name, file_type, created_at').eq('company_id', companyId),
      supabase.from('clients').select('id, name, status, created_at').eq('company_id', companyId),
      supabase.from('calendar_events').select('id, title, event_type, start_date, status, created_at').eq('company_id', companyId).gte('start_date', weekAgoISO),
      supabase.from('emails').select('id, status, open_count, sent_at, recipient_email').eq('company_id', companyId).gte('sent_at', weekAgoISO),
      supabase.from('link_clicks').select('id, clicked_at, link_id, device_type').gte('clicked_at', weekAgoISO),
      supabase.from('document_tracking_events').select('id, event_type, timestamp, duration_seconds, page_number, device_type').gte('timestamp', weekAgoISO),
      supabase.from('tracked_links').select('id, click_count, company_id').eq('company_id', companyId),
      supabase.from('task_routines').select('id, title, is_active, created_at').eq('company_id', companyId),
      supabase.from('whatsapp_conversations').select('id, contact_name, last_message_at, unread_count').eq('company_id', companyId).gte('last_message_at', weekAgoISO),
      supabase.from('email_events').select('id, event_type, timestamp').gte('timestamp', weekAgoISO),
      // Previous week for comparison
      supabase.from('documents').select('id').eq('company_id', companyId).gte('created_at', twoWeeksAgoISO).lt('created_at', weekAgoISO),
      supabase.from('emails').select('id').eq('company_id', companyId).gte('sent_at', twoWeeksAgoISO).lt('sent_at', weekAgoISO),
    ]);

    const docs = docsRes.data || [];
    const clients = clientsRes.data || [];
    const events = eventsRes.data || [];
    const emails = emailsRes.data || [];
    const linkClicks = linkClicksRes.data || [];
    const docTracking = docTrackingRes.data || [];
    const trackedLinks = trackedLinksRes.data || [];
    const tasks = tasksRes.data || [];
    const whatsapp = whatsappRes.data || [];
    const emailEvents = emailEventsRes.data || [];
    const docsPrev = docsPrevRes.data || [];
    const emailsPrev = emailsPrevRes.data || [];

    // Calculate metrics
    const totalDocs = docs.length;
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalEmails = emails.length;
    const emailsOpened = emails.filter(e => (e.open_count || 0) > 0).length;
    const emailOpenRate = totalEmails > 0 ? Math.round((emailsOpened / totalEmails) * 100) : 0;
    const totalLinkClicks = linkClicks.length;
    const totalDocViews = docTracking.filter(e => e.event_type === 'view' || e.event_type === 'page_view').length;
    const totalTrackedLinks = trackedLinks.length;
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.is_active).length;
    const whatsappConversations = whatsapp.length;
    const unreadMessages = whatsapp.reduce((sum, w) => sum + (w.unread_count || 0), 0);
    const eventsThisWeek = events.length;

    // Compute trends
    const docsChange = docsPrev.length > 0 ? Math.round(((docs.filter(d => new Date(d.created_at) >= weekAgo).length - docsPrev.length) / docsPrev.length) * 100) : 0;
    const emailsChange = emailsPrev.length > 0 ? Math.round(((totalEmails - emailsPrev.length) / emailsPrev.length) * 100) : 0;

    // Device breakdown from doc tracking
    const deviceTypes = docTracking.reduce((acc: Record<string, number>, e) => {
      const d = e.device_type || 'desktop';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    // Build data summary for AI
    const dataSummary = `
Dados da empresa (última semana):
- Total de documentos: ${totalDocs}
- Documentos criados esta semana: ${docs.filter(d => new Date(d.created_at) >= weekAgo).length}
- Documentos semana anterior: ${docsPrev.length}
- Tipos de documentos: ${[...new Set(docs.map(d => d.file_type))].join(', ') || 'nenhum'}
- Total de clientes: ${totalClients} (${activeClients} ativos)
- Clientes novos esta semana: ${clients.filter(c => new Date(c.created_at) >= weekAgo).length}
- Emails enviados esta semana: ${totalEmails}
- Emails abertos: ${emailsOpened} (taxa: ${emailOpenRate}%)
- Emails semana anterior: ${emailsPrev.length}
- Cliques em links rastreados: ${totalLinkClicks}
- Links rastreados total: ${totalTrackedLinks}
- Visualizações de documentos rastreados: ${totalDocViews}
- Eventos de tracking total: ${docTracking.length}
- Dispositivos: ${JSON.stringify(deviceTypes)}
- Eventos na agenda esta semana: ${eventsThisWeek}
- Hábitos/Rotinas: ${totalTasks} (${activeTasks} ativos)
- Conversas WhatsApp esta semana: ${whatsappConversations}
- Mensagens não lidas: ${unreadMessages}
- Eventos de email (opens, clicks): ${emailEvents.length}
`.trim();

    console.log('📊 Ello Vision data summary length:', dataSummary.length);

    // Call AI to generate insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um analista de negócios especialista. Analise os dados do workspace e gere insights acionáveis em JSON.

Retorne EXATAMENTE este formato JSON (sem markdown, sem \`\`\`):
{
  "insights": [
    {
      "type": "positive" | "warning" | "info",
      "title": "Título curto",
      "description": "Descrição detalhada com números",
      "metric": "+45%" ou "32%" etc
    }
  ],
  "summary": "Parágrafo de resumo executivo com recomendações",
  "performance": {
    "email_engagement": número 0-100,
    "client_growth": número 0-100,
    "content_activity": número 0-100,
    "communication": número 0-100
  }
}

Gere 3-5 insights relevantes baseados nos dados reais. Se os dados forem zero/vazios, dê dicas de como começar a usar a plataforma. Sempre em português brasileiro.`
          },
          { role: 'user', content: dataSummary }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('❌ AI error:', aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response - handle possible markdown wrapping
    let parsed;
    try {
      const cleaned = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      parsed = {
        insights: [{ type: 'info', title: 'Análise disponível', description: 'Os dados do seu workspace foram coletados.', metric: '-' }],
        summary: 'Análise em processamento.',
        performance: { email_engagement: 50, client_growth: 50, content_activity: 50, communication: 50 },
      };
    }

    // Build response with raw metrics + AI insights
    const result = {
      metrics: {
        total_docs: totalDocs,
        total_clients: totalClients,
        active_clients: activeClients,
        emails_sent: totalEmails,
        email_open_rate: emailOpenRate,
        link_clicks: totalLinkClicks,
        doc_views: totalDocViews,
        events_this_week: eventsThisWeek,
        whatsapp_conversations: whatsappConversations,
        unread_messages: unreadMessages,
        active_habits: activeTasks,
        docs_change: docsChange,
        emails_change: emailsChange,
      },
      ai: parsed,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Ello Vision error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
