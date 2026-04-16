import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cu } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (!cu || !["admin", "adminmaster", "manager"].includes(cu.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("trend_configs")
      .select("*")
      .eq("company_id", cu.company_id)
      .single();

    if (!config || !config.niche) {
      return new Response(JSON.stringify({ error: "Configure seu nicho primeiro" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Consume 1 trend credit ──
    const { data: balance } = await supabase
      .from("ai_credit_balances")
      .select("balance")
      .eq("company_id", cu.company_id)
      .maybeSingle();

    if (!balance || balance.balance < 1) {
      return new Response(JSON.stringify({ error: "Sem créditos disponíveis" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct 1 credit
    await supabase.rpc("consume_ai_credits", {
      p_company_id: cu.company_id,
      p_agent_id: null,
      p_amount: 1,
      p_description: "Busca de trends (1 crédito)",
    });

    console.log(`Generating expert trends for company ${cu.company_id}, niche: ${config.niche}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Gather real-world context ──
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    let googleTrends: string[] = [];
    let topNews: { text: string; thumbnail?: string }[] = [];
    let nicheNews: { text: string; thumbnail?: string }[] = [];

    if (serpApiKey) {
      const [trendsResult, newsResult, nicheNewsResult] = await Promise.allSettled([
        fetch(`https://serpapi.com/search.json?engine=google_trends_trending_now&geo=${config.country || "BR"}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
        fetch(`https://serpapi.com/search.json?engine=google_news&gl=${(config.country || "BR").toLowerCase()}&hl=${(config.language || "pt-BR").split("-")[0]}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
        fetch(`https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(config.niche)}&gl=${(config.country || "BR").toLowerCase()}&hl=${(config.language || "pt-BR").split("-")[0]}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
      ]);

      if (trendsResult.status === "fulfilled" && trendsResult.value) {
        const trending = trendsResult.value.trending_searches || trendsResult.value.daily_searches || [];
        if (Array.isArray(trending)) {
          googleTrends = trending.slice(0, 25).map((t: any) => {
            if (typeof t === "string") return t;
            return t.query || t.title || t.name || JSON.stringify(t);
          });
        }
      }

      if (newsResult.status === "fulfilled" && newsResult.value) {
        const articles = newsResult.value.news_results || [];
        topNews = articles.slice(0, 15).map((a: any) => {
          const title = a.title || "";
          const snippet = a.snippet || a.description || "";
          const thumbnail = a.thumbnail || a.images?.thumbnail || null;
          return { text: `${title}${snippet ? ` — ${snippet}` : ""}`, thumbnail };
        }).filter((n: any) => n.text);
      }

      if (nicheNewsResult.status === "fulfilled" && nicheNewsResult.value) {
        const articles = nicheNewsResult.value.news_results || [];
        nicheNews = articles.slice(0, 10).map((a: any) => {
          const title = a.title || "";
          const snippet = a.snippet || a.description || "";
          const thumbnail = a.thumbnail || a.images?.thumbnail || null;
          return { text: `${title}${snippet ? ` — ${snippet}` : ""}`, thumbnail };
        }).filter((n: any) => n.text);
      }

      console.log(`Sources: ${googleTrends.length} trends, ${topNews.length} top news, ${nicheNews.length} niche news`);
    }

    // Build thumbnail lookup for AI to reference
    const allNewsWithThumbs: { index: number; text: string; thumbnail: string }[] = [];
    topNews.forEach((n, i) => { if (n.thumbnail) allNewsWithThumbs.push({ index: i, text: n.text.slice(0, 80), thumbnail: n.thumbnail }); });
    nicheNews.forEach((n, i) => { if (n.thumbnail) allNewsWithThumbs.push({ index: 100 + i, text: n.text.slice(0, 80), thumbnail: n.thumbnail }); });

    // ── Expert AI prompt ──
    const todayStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const prompt = `Você é um ESTRATEGISTA DE CONTEÚDO DE ELITE para redes sociais (Instagram).

Sua missão: gerar 9 ideias de conteúdo PRONTAS PARA USAR, cada uma com:
- Título curto e impactante
- Descrição persuasiva explicando o ângulo
- FORMATO RECOMENDADO: "carrossel" (múltiplos slides) ou "estatico" (post único)
- TEXTO DA ARTE: o texto exato que vai na imagem/card (máx 80 chars para estático, máx 40 chars por slide para carrossel)
- LEGENDA PRONTA: a legenda completa do Instagram (máx 500 chars, sem hashtags, com CTA)

📌 DATA DE HOJE: ${todayStr}

═══════════════════════════════════
PERFIL DO CLIENTE
═══════════════════════════════════
• Nicho/Setor: ${config.niche}
• Sobre a empresa: ${config.company_description || "não informado"}
• Público-alvo: ${config.target_audience || "geral"}
• Produtos/Serviços: ${config.products_services || "não informado"}
• Tom de comunicação: ${config.brand_tone || "profissional"}
• Objetivos: ${(config.content_goals || []).join(", ") || "não informado"}
• Palavras-chave: ${config.keywords || "nenhuma"}

═══════════════════════════════════
NOTÍCIAS E TENDÊNCIAS DE HOJE
═══════════════════════════════════
${topNews.length > 0 ? `📰 MANCHETES DO DIA:\n${topNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : "Sem notícias disponíveis"}

${googleTrends.length > 0 ? `\n🔥 TRENDING NO GOOGLE:\n${googleTrends.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : ""}

${nicheNews.length > 0 ? `\n🎯 NOTÍCIAS DO NICHO "${config.niche}":\n${nicheNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : ""}

═══════════════════════════════════
REGRAS
═══════════════════════════════════
1. 5 das 9 ideias DEVEM ser cross-pollination: notícia geral do dia → conexão criativa com o nicho
2. As outras 4: tendências diretas, dicas, cases ou educativo do nicho
3. Para cada ideia, decida se funciona melhor como CARROSSEL (conteúdo rico, passo a passo, storytelling) ou ESTÁTICO (frase de impacto, provocação, dica rápida)
4. O "card_text" é o que vai ESCRITO na arte — deve ser curto, impactante e visual
5. A "caption" é a legenda do Instagram — deve ter gancho, desenvolvimento e CTA
6. Tom: ${config.brand_tone || "profissional"}

CATEGORIAS:
- "trend" (usa tendência/notícia - OBRIGATÓRIO em 5+)
- "vendas", "educativo", "engajamento", "autoridade", "case", "dica"`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um estrategista de conteúdo premiado. Retorna APENAS dados estruturados via tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_trends",
            description: "Return expert trend ideas as structured data",
            parameters: {
              type: "object",
              properties: {
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Título curto e impactante, máx 60 chars" },
                      description: { type: "string", description: "Descrição com ângulo persuasivo, 2-3 frases" },
                      category: { type: "string", enum: ["trend", "vendas", "educativo", "engajamento", "autoridade", "case", "dica"] },
                      relevance_score: { type: "number", description: "0-100 relevância para o nicho" },
                      news_hook: { type: "string", description: "A notícia/trend que inspirou, ou vazio" },
                      format: { type: "string", enum: ["carrossel", "estatico"], description: "Formato recomendado" },
                      card_text: { type: "string", description: "Texto que vai na arte/imagem" },
                      caption: { type: "string", description: "Legenda completa do Instagram, máx 500 chars, sem hashtags" },
                    },
                    required: ["title", "description", "category", "relevance_score", "format", "card_text", "caption"],
                  },
                },
              },
              required: ["trends"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_trends" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar trends com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const trends = parsed.trends || [];

    // Save
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("daily_trends")
      .delete()
      .eq("company_id", cu.company_id)
      .eq("trend_date", today);

    const rows = trends.map((t: any) => ({
      company_id: cu.company_id,
      title: t.title,
      description: t.description,
      category: t.category,
      source: topNews.length > 0 ? "expert_news_ai" : googleTrends.length > 0 ? "google_trends_ai" : "ai_generated",
      trend_date: today,
      relevance_score: Math.min(100, Math.max(0, t.relevance_score || 50)),
      metadata: {
        news_hook: t.news_hook || null,
        format: t.format || "estatico",
        card_text: t.card_text || "",
        caption: t.caption || "",
        sources_count: { google_trends: googleTrends.length, top_news: topNews.length, niche_news: nicheNews.length },
      },
    }));

    const { error: insertError } = await supabase.from("daily_trends").insert(rows);
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar trends" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Saved ${rows.length} expert trends for ${today}`);

    return new Response(JSON.stringify({ success: true, count: rows.length, trends: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
