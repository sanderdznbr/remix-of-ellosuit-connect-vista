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
  imageModel?: 'ello-image-1' | 'chat-gpt-2';
  suggested_content?: Array<{ title?: string; subtitle?: string; body?: string }>;
}

interface SanitizedBriefState extends BriefState {
  faceProvided?: boolean;
  logoProvided?: boolean;
}

interface ApiResponse {
  ok: boolean;
  messages?: string[];
  widget?: 'content_type_picker' | 'format_picker' | 'style_picker' | 'personalization' | 'approve_content' | 'confirm_generate' | 'none';
  brief_update?: Partial<BriefState>;
  ready?: boolean;
  error?: string;
  fallback?: boolean;
}

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;
const MAX_BRIEF_TEXT_LENGTH = 240;

function jsonResponse(payload: ApiResponse, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function trimText(value?: string, maxLength = MAX_BRIEF_TEXT_LENGTH) {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength) || undefined;
}

function sanitizeMessages(messages: InMessage[] = []) {
  return messages
    .filter((message) => message.role !== 'system')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: (message.content || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.content.length > 0);
}

function sanitizeBrief(brief?: BriefState): SanitizedBriefState {
  return {
    topic: trimText(brief?.topic, 320),
    format: brief?.format,
    contentType: brief?.contentType,
    cardCount: typeof brief?.cardCount === 'number' ? brief.cardCount : undefined,
    styleId: brief?.styleId ?? null,
    styleName: trimText(brief?.styleName, 120),
    hasFace: !!brief?.hasFace,
    hasLogo: !!brief?.hasLogo,
    hasBrandColors: !!brief?.hasBrandColors,
    brandName: trimText(brief?.brandName, 120),
    audience: trimText(brief?.audience, 160),
    tone: trimText(brief?.tone, 120),
    imageModel: brief?.imageModel,
    faceProvided: !!(brief as Record<string, unknown> | undefined)?.faceUrl,
    logoProvided: !!(brief as Record<string, unknown> | undefined)?.logoUrl,
    suggested_content: brief?.suggested_content,
  };
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
2. SEMPRE pergunte se o post deve ser Único (estático) ou Carrossel antes de qualquer outra configuração técnica. É a primeira escolha estrutural.
   - Use o widget "content_type_picker".
3. SE FOR CARROSSEL: a PRÓXIMA pergunta DEVE ser obrigatoriamente "Quantos slides você quer?" — NÃO avance para formato ou estilo sem antes saber o cardCount.
4. DETECTE O CONTEXTO: Se o usuário quer falar de um PRODUTO, SISTEMA, SOFTWARE ou APP específico (ex: "ellocontent", "meu sistema de vendas", "app de exercícios"), você deve ser inteligente e pedir Prints/Screenshots do sistema além de fotos e logos.
   - Nesse caso, na etapa de personalização, destaque que seria ótimo ter "alguns prints da tela" para a IA se basear.
5. Depois: formato/proporção (4:5, 1:1, 9:16) — widget "format_picker". Nunca pergunte proporção antes de saber se é único ou carrossel.
6. SEMPRE em algum momento ofereça estilos do marketplace (widget "style_picker"). OBRIGATÓRIO.
7. Ofereça personalização (widget "personalization"): rosto, logo, prints do sistema, cores.
8. ETAPA DE TEXTO (CRÍTICA): Sempre antes de gerar, sugira o TEXTO que irá na arte.
   - OBRIGATÓRIO: Se for carrossel, você DEVE gerar conteúdo para EXATAMENTE o número de slides (cardCount) definido anteriormente. Se cardCount=7, sugira 7 slides no 'suggested_content'.
   - MANDATÓRIO: Quando você apresentar as sugestões de texto nas "messages", você DEVE OBRIGATORIAMENTE usar o widget "approve_content" e preencher o array 'suggested_content' no 'brief_update' na MESMA resposta. Nunca envie as mensagens de texto sem o widget de aprovação.
   - VARIE O FORMATO DOS CARDS: Não use o padrão "título + subtítulo + corpo" em todos os slides.
     * Use cards de "apenas texto" (somente o campo 'body') para explicar detalhes, contar histórias ou dar continuidade ao slide anterior.
     * Deixe títulos e subtítulos apenas para a capa e cards de transição/destaque.
    - REGRAS DE LIMITE DE TEXTO (MANDATÓRIO):
      * Título/Hook: Máximo 12 palavras.
      * Subtítulo: Máximo 20 palavras.
      * Corpo: Máximo 45 palavras.
   - O conteúdo deve combinar com o estilo visual selecionado (styleName).
   - Use o widget "approve_content" e preencha 'suggested_content' no brief_update.



 9. SELEÇÃO DE MODELO DE IMAGEM (ÚLTIMA ETAPA): Antes de confirmar a geração final, o usuário deve selecionar qual IA de imagem quer usar.
    - OBRIGATÓRIO: Apresente as opções "Ello image 1" (atual, padrão) e "chat-gpt-2".
    - Explique brevemente que a "Ello image 1" é otimizada para o nosso design e a "chat-gpt-2" é uma alternativa.
    - Use as "messages" para perguntar e deixe o usuário responder via texto ou você pode sugerir que ele escolha no próximo passo.
    - O campo 'imageModel' no 'brief_update' deve ser preenchido com 'ello-image-1' ou 'chat-gpt-2'.

 10. Quando o usuário aprovar o texto e o modelo de imagem, mostre o resumo e peça confirmação final (widget "confirm_generate") com ready=true.

⚠️ REGRAS CRÍTICAS:
- NUNCA marque ready=true sem antes mostrar o widget "confirm_generate" ao usuário.
- O widget "approve_content" deve vir antes do "confirm_generate".
- Se o usuário pedir alterações no texto, gere novas sugestões e mostre o widget "approve_content" novamente.
- O usuário precisa SEMPRE clicar em "Gerar agora" no resumo final (confirm_generate) antes de você marcar ready=true.
- Quando o usuário disser "Pode gerar!" ou similar (após ver o resumo), aí sim você marca ready=true.

📦 WIDGETS DISPONÍVEIS:
- "content_type_picker" → escolher entre Post Único ou Carrossel.
- "format_picker" → escolher proporção.
- "style_picker" → mostrar estilos do marketplace.
- "personalization" → escolher rostos/logos/cores.
- "approve_content" → Sugestão de texto para a arte. O brief_update deve conter o campo 'suggested_content'.
- "confirm_generate" → resumo final + botão gerar.
- "none" → sem widget (só mensagem)

VOCÊ DEVE SEMPRE chamar a tool "respond" com:
- messages: array de 1 a 3 strings curtas (cada uma vira uma bolha de chat)
- widget: "content_type_picker" | "format_picker" | "style_picker" | "personalization" | "approve_content" | "confirm_generate" | "none"
- brief_update: objeto parcial atualizando o estado coletado
- ready: true APENAS após o usuário confirmar no widget "confirm_generate"

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
            enum: ['content_type_picker', 'format_picker', 'style_picker', 'personalization', 'approve_content', 'confirm_generate', 'none'],
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
              styleId: { type: 'string', description: 'UUID of the style. NEVER invent — only use IDs the user picked from the style_picker widget.' },
              styleName: { type: 'string' },
              hasFace: { type: 'boolean' },
              hasLogo: { type: 'boolean' },
              hasBrandColors: { type: 'boolean' },
              brandName: { type: 'string' },
              audience: { type: 'string' },
              tone: { type: 'string' },
              imageModel: { type: 'string', enum: ['ello-image-1', 'chat-gpt-2'] },
              suggested_content: { 
                type: 'array', 
                items: { 
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    subtitle: { type: 'string' },
                    body: { type: 'string' }
                  }
                },
                description: 'Array of slides/cards content. For single post, array of 1. For carousel, array of cardCount.'
              },
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
    if (!LOVABLE_API_KEY) {
      return jsonResponse({
        ok: false,
        error: 'LOVABLE_API_KEY not configured',
        fallback: true,
        messages: ['Tive um problema interno pra continuar daqui.'],
        widget: 'none',
      });
    }

    const { messages, brief } = await req.json() as { messages: InMessage[]; brief: BriefState };
    const safeMessages = sanitizeMessages(messages || []);
    const safeBrief = sanitizeBrief(brief);

    const briefSummary = `Estado atual coletado: ${JSON.stringify(safeBrief)}`;

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: briefSummary },
      ...safeMessages,
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
      return jsonResponse({
        ok: false,
        error: 'Limite de requisições atingido. Tente novamente em alguns segundos.',
        fallback: true,
        messages: ['Recebi muitas requisições agora 😅', 'Tenta de novo em alguns segundos pra eu continuar.'],
        widget: 'none',
      });
    }
    if (response.status === 402) {
      return jsonResponse({
        ok: false,
        error: 'Créditos de IA esgotados no workspace.',
        fallback: true,
        messages: ['Os créditos de IA do workspace acabaram.', 'Depois de recarregar, eu sigo daqui com você.'],
        widget: 'none',
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return jsonResponse({
        ok: false,
        error: 'AI gateway error',
        fallback: true,
        messages: ['A conversa ficou grande demais pra IA processar de uma vez.'],
        widget: 'confirm_generate',
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

    return jsonResponse({ ok: true, ...parsed });
  } catch (e) {
    console.error('chat-creator error:', e);
    return jsonResponse({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      fallback: true,
      messages: ['Tive um imprevisto aqui do meu lado.'],
      widget: 'none',
    });
  }
});