// Edge function: chat-creator
// Adaptive conversational AI that guides the user from idea to a generated post.
// Uses Lovable AI Gateway (Gemini) with tool-calling for structured output.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface InMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface BriefState {
  topic?: string;
  format?: 'portrait' | 'square' | 'story';
  contentType?: 'single' | 'carousel';
  cardCount?: number;
  styleId?: string | null;
  styleName?: string | null;
  hasFace?: boolean;
  hasLogo?: boolean;
  hasBrandColors?: boolean;
  brandName?: string;
  audience?: string;
  tone?: string;
  ready?: boolean;
}

const SYSTEM_PROMPT = `Você é a "Ello", uma designer brasileira super simpática e descontraída da plataforma ellocontent. Você conversa por chat ajudando a pessoa a criar posts e carrosséis incríveis pro Instagram.

🎯 PERSONALIDADE:
- Fale como gente fala no WhatsApp: descontraída, calorosa, empolgada
- Use "você", "tá", "ó", "olha só", "show!", "perfeito!", "demais!" — sem exagero
- Emojis com moderação (1 a cada 2-3 mensagens, no máximo)
- NUNCA seja robótica ou formal
- NUNCA use termos técnicos como "wizard", "edge function", "modo extreme"

💬 ESTILO DAS MENSAGENS:
- DIVIDA suas respostas em 2 ou 3 mensagens curtas (campo "messages" array)
- Cada mensagem deve ter no MÁXIMO 1-2 frases curtas
- A primeira mensagem geralmente é uma reação/conexão emocional
- A segunda mensagem faz a pergunta ou apresenta as opções
- Exemplo: ["Adorei essa ideia!", "Pra começar, você prefere fazer um post único ou um carrossel com vários slides?"]

🎨 FLUXO INTELIGENTE (adapte sempre, não siga ordem fixa):
1. Se o tema já está claro, NÃO pergunte de novo. Avance.
2. SEPARE escolhas em etapas distintas:
   - Primeiro: tipo de post (single vs carousel) — widget "content_type_picker"
   - Depois: formato/proporção (4:5, 1:1, 9:16) — widget "format_picker"
   - Nunca pergunte os dois ao mesmo tempo
3. SEMPRE em algum momento ofereça estilos do marketplace (widget "style_picker"). OBRIGATÓRIO.
4. Se fizer sentido, ofereça personalização: rosto, logo, cores (widget "personalization")
5. Quando tiver tema + estilo + tipo + formato, mostre o resumo e peça confirmação (widget "confirm_generate") com ready=true.

📦 WIDGETS DISPONÍVEIS:
- "content_type_picker" → escolher entre Post Único ou Carrossel
- "format_picker" → escolher proporção (Retrato/Quadrado/Stories) — só depois de definir tipo
- "style_picker" → mostrar estilos do marketplace (slider horizontal)
- "personalization" → escolher rosto/logo/cores e fazer upload
- "confirm_generate" → resumo final + botão gerar
- "none" → sem widget (só mensagem)

VOCÊ DEVE SEMPRE chamar a tool "respond" com:
- messages: array de 1 a 3 strings curtas (cada uma vira uma bolha de chat)
- widget: "content_type_picker" | "format_picker" | "style_picker" | "personalization" | "confirm_generate" | "none"
- brief_update: objeto parcial atualizando o estado coletado
- ready: true APENAS quando estiver tudo pronto pra gerar

Não repita widgets já mostrados. Quando o usuário responder um widget, reaja brevemente e avance pra próxima etapa.`;

function buildTool() {
  return {
    type: 'function',
    function: {
      name: 'respond',
      description: 'Send a structured response to the user',
      parameters: {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of 1 to 3 short messages (each becomes a separate chat bubble). Each message: 1-2 short sentences.',
          },
          widget: {
            type: 'string',
            enum: ['content_type_picker', 'format_picker', 'style_picker', 'personalization', 'confirm_generate', 'none'],
            description: 'UI widget to show under the last message. Use "none" if no widget.',
          },
          brief_update: {
            type: 'object',
            description: 'Partial update to the creative brief state',
            properties: {
              topic: { type: 'string' },
              format: { type: 'string', enum: ['portrait', 'square', 'story'] },
              contentType: { type: 'string', enum: ['single', 'carousel'] },
              cardCount: { type: 'number' },
              styleId: { type: 'string' },
              styleName: { type: 'string' },
              hasFace: { type: 'boolean' },
              hasLogo: { type: 'boolean' },
              hasBrandColors: { type: 'boolean' },
              brandName: { type: 'string' },
              audience: { type: 'string' },
              tone: { type: 'string' },
            },
          },
          ready: { type: 'boolean', description: 'true when the brief is complete and we should generate' },
        },
        required: ['messages'],
      },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { messages, brief } = await req.json() as { messages: InMessage[]; brief: BriefState };

    const briefSummary = `Estado atual coletado: ${JSON.stringify(brief || {})}`;

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: briefSummary },
      ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        tools: [buildTool()],
        tool_choice: { type: 'function', function: { name: 'respond' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados no workspace.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { messages: ['Pode me contar um pouco mais sobre o que você quer criar?'], widget: 'none' };
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
        // Backwards compat: if model returned `message` instead of `messages`
        if (!parsed.messages && parsed.message) {
          parsed.messages = [parsed.message];
        }
        if (!Array.isArray(parsed.messages)) parsed.messages = [String(parsed.messages || '...')];
      } catch (e) {
        console.error('Failed to parse tool args:', e);
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('chat-creator error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
