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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cu } = await supabase
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (!cu || !["admin", "adminmaster", "manager"].includes(cu.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("trend_configs")
      .select("*")
      .eq("company_id", cu.company_id)
      .single();

    if (!config || !config.niche) {
      return new Response(JSON.stringify({ error: "Configure seu nicho primeiro" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating expert trends for company ${cu.company_id}, niche: ${config.niche}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // STEP 1: Gather real-world context from MULTIPLE sources
    // ============================================================

    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    let googleTrends: string[] = [];
    let topNews: string[] = [];
    let nicheNews: string[] = [];

    if (serpApiKey) {
      // Fetch in parallel: general trends + general news + niche news
      const [trendsResult, newsResult, nicheNewsResult] = await Promise.allSettled([
        // 1) Google Trends - GENERAL (not filtered by niche)
        fetch(`https://serpapi.com/search.json?engine=google_trends_trending_now&geo=${config.country || "BR"}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
        // 2) Google News - TOP headlines today
        fetch(`https://serpapi.com/search.json?engine=google_news&gl=${(config.country || "BR").toLowerCase()}&hl=${(config.language || "pt-BR").split("-")[0]}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
        // 3) Google News - niche-specific
        fetch(`https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(config.niche)}&gl=${(config.country || "BR").toLowerCase()}&hl=${(config.language || "pt-BR").split("-")[0]}&api_key=${serpApiKey}`)
          .then(r => r.ok ? r.json() : null),
      ]);

      // Parse general trends
      if (trendsResult.status === "fulfilled" && trendsResult.value) {
        const trending = trendsResult.value.trending_searches || trendsResult.value.daily_searches || [];
        if (Array.isArray(trending)) {
          googleTrends = trending.slice(0, 25).map((t: any) => {
            if (typeof t === "string") return t;
            return t.query || t.title || t.name || JSON.stringify(t);
          });
        }
      }

      // Parse general news
      if (newsResult.status === "fulfilled" && newsResult.value) {
        const articles = newsResult.value.news_results || [];
        topNews = articles.slice(0, 15).map((a: any) => {
          const title = a.title || "";
          const snippet = a.snippet || a.description || "";
          return `${title}${snippet ? ` — ${snippet}` : ""}`;
        }).filter(Boolean);
      }

      // Parse niche news
      if (nicheNewsResult.status === "fulfilled" && nicheNewsResult.value) {
        const articles = nicheNewsResult.value.news_results || [];
        nicheNews = articles.slice(0, 10).map((a: any) => {
          const title = a.title || "";
          const snippet = a.snippet || a.description || "";
          return `${title}${snippet ? ` — ${snippet}` : ""}`;
        }).filter(Boolean);
      }

      console.log(`Sources: ${googleTrends.length} trends, ${topNews.length} top news, ${nicheNews.length} niche news`);
    }

    // ============================================================
    // STEP 2: Expert AI prompt with creative cross-pollination
    // ============================================================

    const todayStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const prompt = `Você é um ESTRATEGISTA DE CONTEÚDO DE ELITE, especialista em marketing viral e storytelling persuasivo.

Sua missão: gerar ideias de conteúdo IRRESISTÍVEIS que misturam o que está acontecendo NO MUNDO REAL HOJE com o nicho do cliente, criando conexões inesperadas e persuasivas.

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
• Instagram: ${config.instagram_url || "não informado"}

═══════════════════════════════════
NOTÍCIAS E TENDÊNCIAS DE HOJE
═══════════════════════════════════
${topNews.length > 0 ? `📰 MANCHETES DO DIA:\n${topNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : "Sem notícias disponíveis"}

${googleTrends.length > 0 ? `\n🔥 TRENDING NO GOOGLE:\n${googleTrends.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : ""}

${nicheNews.length > 0 ? `\n🎯 NOTÍCIAS DO NICHO "${config.niche}":\n${nicheNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : ""}

═══════════════════════════════════
REGRAS DE OURO
═══════════════════════════════════
1. MISTURE mundos: pegue uma notícia/trend GERAL e conecte ao nicho de forma criativa e persuasiva
   Exemplo: "MC Ryan preso por lavagem de dinheiro" → para um dentista: "Investir no sorriso nunca dá problema com a justiça 😄 Mas investir errado sim..."
   Exemplo: "Dólar bate recorde" → para um restaurante: "Enquanto o dólar sobe, nosso cardápio continua acessível..."
   
2. Pelo menos 3 das 8 ideias devem ser CROSS-POLLINATION (notícia geral → conexão criativa com o nicho)
3. As outras podem ser tendências diretas do nicho, dicas, cases ou conteúdo educativo
4. Tom: ${config.brand_tone || "profissional"} mas SEMPRE com um gancho de curiosidade
5. Títulos CURTOS e impactantes (máx 60 chars), que façam a pessoa parar o scroll
6. Descrições com o ÂNGULO persuasivo: explique POR QUE esse conteúdo vai engajar

CATEGORIAS PERMITIDAS:
- "trend" → quando usa uma tendência/notícia do momento
- "vendas" → quando o objetivo é converter
- "educativo" → quando ensina algo
- "engajamento" → quando provoca interação
- "autoridade" → quando posiciona como expert
- "case" → estudo de caso / prova social
- "dica" → dica prática e rápida

Gere exatamente 8 ideias diversificadas e BRILHANTES.`;

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
                      news_hook: { type: "string", description: "A notícia/trend que inspirou esta ideia, ou vazio se for ideia original" },
                    },
                    required: ["title", "description", "category", "relevance_score"],
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

    // Step 3: Save
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
