import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o assistente de suporte do elloContent, uma plataforma de criação de carrosséis para redes sociais com IA.

Responda SEMPRE em português brasileiro, de forma clara, amigável e concisa.

Aqui estão as informações que você conhece:

## Créditos e Custos
- Modo Simples: 1 crédito por card
- Modo Avançado (Pro): 2 créditos por card
- Modo Extreme: 2 créditos por card
- Pro + Rosto (Face): 4 créditos por card
- Tweet: 1 crédito por card
- Pesquisa Web: +1 crédito fixo quando ativada

## Exemplos
- Post Simples (1 card) = 1 crédito
- Carrossel 5 cards Simples = 5 créditos
- Carrossel 8 cards Pro = 16 créditos
- Carrossel 5 cards Pro + Pesquisa = 11 créditos
- Carrossel 6 cards Pro + Face = 24 créditos

## Renovação
- Créditos mensais renovam todo mês na data de contratação
- Créditos não acumulam entre meses
- Créditos extras podem ser comprados a qualquer momento e não expiram com o plano

## Upgrade de Plano
- O usuário paga apenas a diferença proporcional ao tempo restante
- A data de renovação mantém a data original do primeiro plano
- Créditos antigos NUNCA são removidos, apenas somam os novos

## Pagamento
- Cartão de crédito: disponível para todos os planos
- PIX: disponível APENAS para planos anuais
- Planos anuais podem ser parcelados no cartão

## Funcionalidades
- Geração de carrosséis com IA
- Estilos do marketplace
- Galeria de imagens e prompts
- Comunidade para compartilhar posts
- Programa de afiliados

Se você não souber a resposta, sugira ao usuário falar com o suporte humano via WhatsApp.
Mantenha respostas curtas (máximo 3-4 frases). Não invente informações.`;

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
