import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM_PROMPT = `Você é a Marina, atendente de suporte do elloContent. Você é simpática, acolhedora e fala como uma pessoa real (não como um robô).

REGRAS IMPORTANTES:
1. Respostas CURTAS — máximo 2 frases por mensagem
2. Se precisar explicar algo mais complexo, quebre em múltiplas mensagens separadas por "|||" (este separador será usado para dividir em bolhas diferentes)
3. Use linguagem informal e amigável, como se fosse uma conversa no WhatsApp
4. Use emojis com moderação (1-2 por mensagem no máximo)
5. Nunca invente informações que não estejam abaixo
6. Se não souber, diga que vai verificar e sugira falar no WhatsApp
7. Você tem acesso aos dados da conta do usuário. Use essas informações para dar respostas personalizadas.
8. NÃO exponha dados sensíveis como IDs internos, company_id etc. Pode mencionar saldo de créditos, plano, quantidade de posts etc.

INFORMAÇÕES GERAIS:

Créditos por card:
- Simples: 1 crédito/card
- Avançado (Pro): 2 créditos/card  
- Extreme: 2 créditos/card
- Pro + Rosto: 4 créditos/card
- Tweet: 1 crédito/card
- Pesquisa Web: +1 crédito fixo

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

    // Fetch user account data using their auth token
    let userContext = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from token
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const userId = user.id;
          const userEmail = user.email || "desconhecido";
          const userName = user.user_metadata?.full_name || user.user_metadata?.username || userEmail.split("@")[0];

          // Get company_id
          const { data: cu } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (cu) {
            const companyId = cu.company_id;

            // Fetch all account data in parallel
            const [credits, subscription, carousels, transactions, profile] = await Promise.all([
              supabase
                .from("ai_credit_balances")
                .select("balance, extra_credits, extra_credits_expires_at, total_consumed, total_purchased")
                .eq("company_id", companyId)
                .maybeSingle(),
              supabase
                .from("ellocontent_subscriptions")
                .select("plan_name, monthly_credits, status, billing_period, starts_at, expires_at, created_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              supabase
                .from("generated_carousels")
                .select("id, created_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false }),
              supabase
                .from("ai_credit_transactions")
                .select("amount, transaction_type, description, created_at")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })
                .limit(20),
              supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", userId)
                .maybeSingle(),
            ]);

            const creditData = credits.data;
            const sub = subscription.data;
            const totalPosts = carousels.data?.length || 0;
            const recentTransactions = transactions.data || [];
            const profileName = profile.data?.full_name || profile.data?.username || userName;

            userContext = `\n\n--- DADOS DA CONTA DO USUÁRIO ---
Nome: ${profileName}
Email: ${userEmail}
Plano: ${sub?.plan_name || "Sem plano (free)"}
Status do plano: ${sub?.status || "inativo"}
Período: ${sub?.billing_period || "N/A"}
Plano criado em: ${sub?.created_at ? new Date(sub.created_at).toLocaleDateString("pt-BR") : "N/A"}
Expira em: ${sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "N/A"}
Créditos mensais do plano: ${sub?.monthly_credits || 0}
Saldo atual de créditos: ${creditData?.balance || 0}
Créditos extras: ${creditData?.extra_credits || 0}${creditData?.extra_credits_expires_at ? ` (expiram em ${new Date(creditData.extra_credits_expires_at).toLocaleDateString("pt-BR")})` : ""}
Total consumido (histórico): ${creditData?.total_consumed || 0}
Total comprado (histórico): ${creditData?.total_purchased || 0}
Total de posts gerados: ${totalPosts}
Últimas transações de crédito:
${recentTransactions.slice(0, 10).map(t => `  - ${new Date(t.created_at).toLocaleDateString("pt-BR")}: ${t.transaction_type} ${t.amount > 0 ? "+" : ""}${t.amount} (${t.description || "sem descrição"})`).join("\n") || "  Nenhuma transação encontrada"}
--- FIM DOS DADOS ---`;
          }
        }
      } catch (e) {
        console.error("Error fetching user data:", e);
        // Continue without user context
      }
    }

    const fullSystemPrompt = BASE_SYSTEM_PROMPT + userContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
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
