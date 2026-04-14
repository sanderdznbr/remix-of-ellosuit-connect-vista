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

    // Validate user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company
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

    // Get trend config
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

    console.log(`Generating trends for company ${cu.company_id}, niche: ${config.niche}`);

    // Step 1: Fetch Google Trends via SerpAPI
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    let googleTrends: string[] = [];

    if (serpApiKey) {
      try {
        const searchQuery = encodeURIComponent(config.niche);
        const serpUrl = `https://serpapi.com/search.json?engine=google_trends_trending_now&geo=${config.country || "BR"}&api_key=${serpApiKey}`;
        const serpResp = await fetch(serpUrl);
        
        if (serpResp.ok) {
          const serpData = await serpResp.json();
          const trending = serpData.trending_searches || serpData.daily_searches || [];
          
          // Extract trend titles
          if (Array.isArray(trending)) {
            googleTrends = trending.slice(0, 20).map((t: any) => {
              if (typeof t === "string") return t;
              return t.query || t.title || t.name || JSON.stringify(t);
            });
          }
        }
        console.log(`Found ${googleTrends.length} Google Trends`);
      } catch (e) {
        console.error("SerpAPI error:", e);
      }
    }

    // Step 2: Use AI to generate contextual content ideas
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trendsContext = googleTrends.length > 0
      ? `\n\nTendências reais do Google Trends hoje:\n${googleTrends.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

    const prompt = `Você é um especialista em marketing de conteúdo e trends digitais.

Contexto do cliente:
- Nicho/Setor: ${config.niche}
- Público-alvo: ${config.target_audience || "geral"}
- Palavras-chave: ${config.keywords || "nenhuma especificada"}
- País: ${config.country || "BR"}
- Idioma: ${config.language || "pt-BR"}
${trendsContext}

Gere exatamente 8 ideias de conteúdo para posts (carrosseis ou estáticos) que sejam tendência HOJE. 
Cada ideia deve ser relevante para o nicho do cliente.
${googleTrends.length > 0 ? "Use as tendências do Google como inspiração quando fizerem sentido para o nicho." : ""}

Para cada ideia, retorne:
- title: título chamativo e curto (máx 60 chars)
- description: descrição com o ângulo do conteúdo e por que é relevante (2-3 frases)
- category: categoria (ex: "educativo", "engajamento", "autoridade", "trend", "case", "dica")
- relevance_score: de 0 a 100, quão relevante é para o nicho`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você retorna APENAS JSON válido, sem markdown, sem explicações." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_trends",
            description: "Return trend ideas as structured data",
            parameters: {
              type: "object",
              properties: {
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      relevance_score: { type: "number" },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar trends com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const trends = parsed.trends || [];

    // Step 3: Delete old trends for today and insert new ones
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
      source: googleTrends.length > 0 ? "google_trends_ai" : "ai_generated",
      trend_date: today,
      relevance_score: Math.min(100, Math.max(0, t.relevance_score || 50)),
      metadata: { google_trends_used: googleTrends.length > 0 },
    }));

    const { error: insertError } = await supabase.from("daily_trends").insert(rows);
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar trends" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Saved ${rows.length} trends for ${today}`);

    return new Response(JSON.stringify({ success: true, count: rows.length, trends: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
