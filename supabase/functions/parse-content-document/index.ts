import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== "admin@gmail.com") {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { textContent } = await req.json();
    if (!textContent || typeof textContent !== "string") {
      return new Response(JSON.stringify({ error: "textContent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um parser de conteúdo para redes sociais. Receba o texto de um documento e extraia TODOS os posts individuais.

Para cada post, retorne um objeto JSON com:
- "id": número sequencial (1, 2, 3...)
- "type": "carrossel" ou "estatico"
- "title": título do post
- "cards": array de objetos com os textos de cada card/slide:
  - "cardNumber": número do slide/card
  - "text": texto principal do card
  - "imageDirection": direcionamento da imagem (se houver)
- "caption": legenda do post (texto da seção "Legenda")
- "hashtags": string com as hashtags

REGRAS IMPORTANTES:
- Identifique posts por padrões como "POST C1", "POST E1", "POST C2 — CARROSSEL", "POST E2 — ESTÁTICO", etc.
- Para carrosseis: cada "Slide" é um card separado
- Para estáticos: o "Texto da imagem" é o card único
- SEMPRE extraia a legenda completa
- SEMPRE extraia as hashtags
- Retorne APENAS o JSON array, sem markdown, sem explicação

Retorne o JSON no formato:
[
  {
    "id": 1,
    "type": "carrossel",
    "title": "Título do post",
    "cards": [
      { "cardNumber": 1, "text": "Texto do slide 1", "imageDirection": "direcionamento" },
      { "cardNumber": 2, "text": "Texto do slide 2", "imageDirection": "direcionamento" }
    ],
    "caption": "Legenda completa do post",
    "hashtags": "#tag1 #tag2"
  }
]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: textContent },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "Failed to parse with AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";
    
    // Clean markdown code blocks if present
    let cleanJson = content.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let posts;
    try {
      posts = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse AI response:", cleanJson);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: cleanJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ posts, totalPosts: posts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
