import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a Marina, atendente de suporte do elloContent. Você é simpática, acolhedora e fala como uma pessoa real (não como um robô).

REGRAS IMPORTANTES:
1. Respostas CURTAS — máximo 2 frases por mensagem
2. Se precisar explicar algo mais complexo, quebre em múltiplas mensagens separadas por "|||" (este separador será usado para dividir em bolhas diferentes)
3. Use linguagem informal e amigável, como se fosse uma conversa no WhatsApp
4. Use emojis com moderação (1-2 por mensagem no máximo)
5. Nunca invente informações que não estejam abaixo
6. Se não souber, diga que vai verificar e sugira falar no WhatsApp

INFORMAÇÕES:

Créditos por card:
- Simples: 1 crédito/card
- Avançado (Pro): 2 créditos/card  
- Extreme: 2 créditos/card
- Pro + Rosto: 4 créditos/card
- Tweet: 1 crédito/card
- Pesquisa Web: +1 crédito fixo

Exemplos:
- Carrossel 5 cards Simples = 5 créditos
- Carrossel 8 cards Pro = 16 créditos
- Carrossel 5 cards Pro + Pesquisa = 11 créditos

Renovação:
- Créditos renovam todo mês na data de contratação
- Créditos extras podem ser comprados a qualquer momento

Upgrade:
- Paga só a diferença proporcional
- Mantém a data do primeiro plano
- Créditos antigos nunca são removidos

Pagamento:
- Cartão: todos os planos
- PIX: apenas planos anuais
- Parcelamento no cartão para anuais

Comece sempre cumprimentando pelo nome se possível, ou com "Oi! 😊"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
