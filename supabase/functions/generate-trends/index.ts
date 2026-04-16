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

    // ── Brave Search for real-world context ──
    const braveApiKey = Deno.env.get("BRAVE_SEARCH_API_KEY");
    let topNews: { text: string; thumbnail?: string; url?: string }[] = [];
    let nicheNews: { text: string; thumbnail?: string; url?: string }[] = [];

    if (braveApiKey) {
      const lang = (config.language || "pt-BR").split("-")[0];
      const country = (config.country || "BR").toLowerCase();
      const headers = { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": braveApiKey };

      const [generalResult, nicheResult] = await Promise.allSettled([
        fetch(`https://api.search.brave.com/res/v1/news/search?q=noticias+do+dia&country=${country}&search_lang=${lang}&count=15&freshness=pd`, { headers })
          .then(r => r.ok ? r.json() : null),
        fetch(`https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(config.niche + " " + (config.keywords || ""))}&country=${country}&search_lang=${lang}&count=10&freshness=pw`, { headers })
          .then(r => r.ok ? r.json() : null),
      ]);

      if (generalResult.status === "fulfilled" && generalResult.value) {
        const results = generalResult.value.results || [];
        topNews = results.map((a: any) => ({
          text: `${a.title || ""}${a.description ? ` — ${a.description}` : ""}`,
          thumbnail: a.thumbnail?.src || null,
          url: a.url || null,
        })).filter((n: any) => n.text);
      }

      if (nicheResult.status === "fulfilled" && nicheResult.value) {
        const results = nicheResult.value.results || [];
        nicheNews = results.map((a: any) => ({
          text: `${a.title || ""}${a.description ? ` — ${a.description}` : ""}`,
          thumbnail: a.thumbnail?.src || null,
          url: a.url || null,
        })).filter((n: any) => n.text);
      }

      console.log(`Brave Search: ${topNews.length} general news, ${nicheNews.length} niche news`);
    } else {
      console.warn("BRAVE_SEARCH_API_KEY not set, generating trends without news context");
    }

    // Build thumbnail lookup for AI to reference
    const allNewsWithThumbs: { index: number; text: string; thumbnail: string }[] = [];
    topNews.forEach((n, i) => { if (n.thumbnail) allNewsWithThumbs.push({ index: i, text: n.text.slice(0, 80), thumbnail: n.thumbnail }); });
    nicheNews.forEach((n, i) => { if (n.thumbnail) allNewsWithThumbs.push({ index: 100 + i, text: n.text.slice(0, 80), thumbnail: n.thumbnail }); });

    // ── Also fetch images via Brave Image Search for visual content ──
    let nicheImages: { src: string; title: string }[] = [];
    if (braveApiKey) {
      try {
        const imgResp = await fetch(`https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(config.niche + " " + (config.products_services || ""))}&count=10&safesearch=strict`, {
          headers: { "Accept": "application/json", "X-Subscription-Token": braveApiKey },
        });
        if (imgResp.ok) {
          const imgData = await imgResp.json();
          nicheImages = (imgData.results || []).slice(0, 10).map((img: any) => ({
            src: img.thumbnail?.src || img.properties?.url || "",
            title: img.title || "",
          })).filter((i: any) => i.src);
          console.log(`Brave Images: ${nicheImages.length} niche images found`);
        }
      } catch (e) {
        console.warn("Brave image search failed:", e);
      }
    }

    // ── Expert AI prompt ──
    const todayStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const prompt = `Você é um ESTRATEGISTA DE CONTEÚDO DE ELITE para redes sociais (Instagram).

Sua missão: gerar 9 ideias de conteúdo PRONTAS PARA USAR, cada uma com:
- Título curto e impactante
- Descrição persuasiva explicando o ângulo
- FORMATO RECOMENDADO: "carrossel" (múltiplos slides) ou "estatico" (post único)
- TEXTO DA ARTE: Para ESTÁTICO = texto único (máx 80 chars). Para CARROSSEL = array de textos, um por slide (EXATAMENTE 5 slides, máx 40 chars cada)
- LEGENDA PRONTA: a legenda completa do Instagram (máx 500 chars, sem hashtags, com CTA)
- SUGESTÃO DE BUSCA DE IMAGEM: uma frase curta para buscar a foto ideal

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
NOTÍCIAS E TENDÊNCIAS DE HOJE (Brave Search)
═══════════════════════════════════
${topNews.length > 0 ? `📰 MANCHETES DO DIA:\n${topNews.map((n, i) => `${i + 1}. ${n.text}`).join("\n")}` : "Sem notícias disponíveis"}

${nicheNews.length > 0 ? `\n🎯 NOTÍCIAS DO NICHO "${config.niche}":\n${nicheNews.map((n, i) => `${i + 1}. ${n.text}`).join("\n")}` : ""}

${allNewsWithThumbs.length > 0 ? `\n🖼️ IMAGENS DISPONÍVEIS DAS FONTES (use o news_source_index para referenciar):\n${allNewsWithThumbs.map(t => `index=${t.index}: ${t.text}`).join("\n")}` : ""}

═══════════════════════════════════
REGRAS
═══════════════════════════════════
1. 5 das 9 ideias DEVEM ser cross-pollination: notícia geral do dia → conexão criativa com o nicho
2. As outras 4: tendências diretas, dicas, cases ou educativo do nicho
3. Para cada ideia, decida se funciona melhor como CARROSSEL (conteúdo rico, passo a passo, storytelling) ou ESTÁTICO (frase de impacto, provocação, dica rápida)
4. Para ESTÁTICO: "card_text" = texto único. Para CARROSSEL: "card_texts" = array com EXATAMENTE 5 objetos {title, subtitle} (um por slide). O title é o título principal do slide (máx 40 chars), o subtitle é o texto de apoio/complemento (máx 80 chars)
5. A "caption" é a legenda do Instagram — deve ter gancho, desenvolvimento e CTA
6. Tom: ${config.brand_tone || "profissional"}
7. "image_search_query" deve ser uma frase ESPECÍFICA para buscar foto ideal (ex: "dentista sorrindo consultório moderno")

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
                      card_text: { type: "string", description: "Texto da arte para post ESTÁTICO (máx 80 chars)" },
                      card_texts: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", properties: { title: { type: "string", description: "Título principal do slide, máx 40 chars" }, subtitle: { type: "string", description: "Texto de apoio/subtítulo do slide, máx 80 chars" } }, required: ["title", "subtitle"] }, description: "Array de objetos {title, subtitle} dos slides para CARROSSEL (EXATAMENTE 5 items)" },
                      caption: { type: "string", description: "Legenda completa do Instagram, máx 500 chars, sem hashtags" },
                      news_source_index: { type: "number", description: "Index da fonte de notícia que tem imagem disponível, ou -1" },
                      image_search_query: { type: "string", description: "Frase de busca para encontrar foto ideal para este post" },
                    },
                    required: ["title", "description", "category", "relevance_score", "format", "card_text", "caption", "image_search_query"],
                  },
                },
              },
              required: ["trends"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_trends" } },
        max_tokens: 16384,
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
    const trends = (parsed.trends || []).map((trend: any) => {
      const format = trend?.format || "estatico";
      // Normalize card_texts to array of {title, subtitle} objects
      let cardTexts: { title: string; subtitle: string }[] = [];
      if (Array.isArray(trend?.card_texts)) {
        cardTexts = trend.card_texts
          .map((item: any) => {
            if (typeof item === "object" && item !== null) {
              return { title: (item.title || "").trim(), subtitle: (item.subtitle || "").trim() };
            }
            // Backward compat: plain string → title only
            if (typeof item === "string") {
              return { title: item.trim(), subtitle: "" };
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 5);
      }

      if (format === "carrossel") {
        const fallbackTexts = [
          { title: trend?.title?.trim() || "Capa", subtitle: "Descubra tudo sobre este assunto" },
          { title: "Ponto principal", subtitle: "O conceito mais importante" },
          { title: "Detalhe importante", subtitle: "Entenda o porquê" },
          { title: "Como aplicar", subtitle: "Coloque em prática agora" },
          { title: "Próximo passo", subtitle: "Siga para mais conteúdo!" },
        ];

        while (cardTexts.length < 5) {
          cardTexts.push(fallbackTexts[cardTexts.length] || { title: `Slide ${cardTexts.length + 1}`, subtitle: "" });
        }
      }

      return {
        ...trend,
        format,
        card_texts: format === "carrossel" ? cardTexts : [],
        card_text: format === "estatico" ? (trend?.card_text || "") : "",
      };
    });

    // ── For each trend, try to fetch a real photo via Brave Image Search ──
    const imageResults: (string | null)[] = [];
    if (braveApiKey) {
      const imagePromises = trends.map(async (t: any) => {
        try {
          const query = t.image_search_query || t.title;
          const imgResp = await fetch(
            `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=3&safesearch=strict`,
            { headers: { "Accept": "application/json", "X-Subscription-Token": braveApiKey } }
          );
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            const firstImg = (imgData.results || [])[0];
            return firstImg?.thumbnail?.src || firstImg?.properties?.url || null;
          }
        } catch (e) {
          console.warn("Image search failed for:", t.title, e);
        }
        return null;
      });
      const results = await Promise.allSettled(imagePromises);
      results.forEach((r) => imageResults.push(r.status === "fulfilled" ? r.value : null));
    }

    // Save — move existing today's trends to yesterday so they appear in "Anteriores"
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    await supabase
      .from("daily_trends")
      .update({ trend_date: yesterday } as any)
      .eq("company_id", cu.company_id)
      .eq("trend_date", today);

    const rows = trends.map((t: any, idx: number) => {
      // Resolve image: first try Brave image search, then news source
      let imageUrl: string | null = imageResults[idx] || null;
      if (!imageUrl && typeof t.news_source_index === "number" && t.news_source_index >= 0) {
        const match = allNewsWithThumbs.find(n => n.index === t.news_source_index);
        if (match) imageUrl = match.thumbnail;
      }

      return {
        company_id: cu.company_id,
        title: t.title,
        description: t.description,
        category: t.category,
        source: topNews.length > 0 ? "brave_news_ai" : "ai_generated",
        trend_date: today,
        relevance_score: Math.min(100, Math.max(0, t.relevance_score || 50)),
        metadata: {
          news_hook: t.news_hook || null,
          format: t.format || "estatico",
          card_text: t.card_text || "",
          card_texts: Array.isArray(t.card_texts) ? t.card_texts : [],
          caption: t.caption || "",
          image_url: imageUrl,
          image_search_query: t.image_search_query || "",
          sources_count: { top_news: topNews.length, niche_news: nicheNews.length },
        },
      };
    });

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
