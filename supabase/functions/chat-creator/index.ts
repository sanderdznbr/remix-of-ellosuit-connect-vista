// Edge function: chat-creator
// Adaptive conversational AI that guides the user from idea to a generated post.
// Uses Lovable AI Gateway (Gemini) with tool-calling for structured output.

import { corsHeaders } from '@supabase/supabase-js/cors';

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

const SYSTEM_PROMPT = `Você é a "Ello", uma IA criativa, simpática e direta da plataforma ellocontent (geração de posts e carrosséis para Instagram). Você conduz uma conversa natural com o usuário em português brasileiro para entender exatamente o que ele quer criar e produzir o melhor resultado possível.

REGRAS DE OURO:
1. Seja BREVE e HUMANA. Mensagens curtas, 1-2 frases. Sem formalidade exagerada.
2. UMA pergunta por vez. Nunca empilhe perguntas.
3. Não repita o que o usuário disse. Avance.
4. Sempre ofereça opções/atalhos quando possível (use os widgets).
5. Seja imprevisível: cada conversa é diferente, mas todas devem terminar em um resultado impressionante.
6. NUNCA mencione termos técnicos como "wizard", "modo extreme", "edge function".

FLUXO INTELIGENTE (adapte a ordem conforme o contexto):
- Se o tema já está claro no primeiro prompt, NÃO pergunte de novo. Avance.
- SEMPRE em algum momento pergunte se quer escolher um estilo do marketplace (use widget "style_picker"). Isso é OBRIGATÓRIO.
- Pergunte sobre formato (carrossel vs post único) e proporção quando relevante (widget "format_picker").
- Se fizer sentido, ofereça personalização: rosto, logo, cores da marca (widget "personalization").
- Quando tiver informação suficiente (mínimo: tema + estilo + formato), peça confirmação e marque ready=true.

VOCÊ DEVE SEMPRE responder chamando a tool "respond" com:
- message: texto curto e natural para o usuário
- widget: opcional, um dos: "style_picker" | "format_picker" | "personalization" | "confirm_generate" | null
- brief_update: objeto parcial atualizando o estado coletado
- ready: true APENAS quando estiver tudo pronto para gerar

Não ofereça widgets repetidos. Quando o usuário responder um widget, agradeça brevemente e avance.`;

function buildTool() {
  return {
    type: 'function',
    function: {
      name: 'respond',
      description: 'Send a structured response to the user',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Short natural text to show in the chat bubble' },
          widget: {
            type: ['string', 'null'],
            enum: ['style_picker', 'format_picker', 'personalization', 'confirm_generate', null],
            description: 'Optional UI widget to show under the message',
          },
          brief_update: {
            type: 'object',
            description: 'Partial update to the creative brief state',
            properties: {
              topic: { type: 'string' },
              format: { type: 'string', enum: ['portrait', 'square', 'story'] },
              contentType: { type: 'string', enum: ['single', 'carousel'] },
              cardCount: { type: 'number' },
              styleId: { type: ['string', 'null'] },
              styleName: { type: ['string', 'null'] },
              hasFace: { type: 'boolean' },
              hasLogo: { type: 'boolean' },
              hasBrandColors: { type: 'boolean' },
              brandName: { type: 'string' },
              audience: { type: 'string' },
              tone: { type: 'string' },
            },
            additionalProperties: true,
          },
          ready: { type: 'boolean', description: 'true when the brief is complete and we should generate' },
        },
        required: ['message'],
        additionalProperties: false,
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
    let parsed: any = { message: 'Pode me contar um pouco mais sobre o que você quer criar?' };
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
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
