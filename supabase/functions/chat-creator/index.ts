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
  visualType?: 'marketplace' | 'custom';
  customStyleUrls?: string[];
  styleId?: string | null;
  styleName?: string | null;
  hasFace?: boolean;
  hasLogo?: boolean;
  hasBrandColors?: boolean;
  brandName?: string;
  audience?: string;
  tone?: string;
  ready?: boolean;
  imageModel?: 'ello-pro' | 'ello-fast';
  suggested_content?: Array<{ title?: string; subtitle?: string; body?: string; searchTerm?: string }>;
  userIdea?: string;
  imageSource?: 'ai' | 'real';
  faceFusionMode?: 'merge' | 'side_by_side';
}

interface SanitizedBriefState extends BriefState {
  faceProvided?: boolean;
  logoProvided?: boolean;
}

interface ApiResponse {
  ok: boolean;
  messages?: string[];
  widget?: 'content_type_picker' | 'format_picker' | 'style_picker' | 'personalization' | 'approve_content' | 'confirm_generate' | 'image_model_picker' | 'none';
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
    userIdea: trimText(brief?.userIdea, 500),
    imageSource: brief?.imageSource,
  };
}

const SYSTEM_PROMPT = `Você é a "Ello", uma designer brasileira super simpática e descontraída da plataforma ellocontent. Você conversa por chat ajudando a pessoa a criar posts e carrosséis incríveis pro Instagram.

🎯 PERSONALIDADE:
- Fale de forma calorosa e empolgada, use gírias leves como "tá", "show!", "bora".
- Emojis com moderação.

🎨 FLUXO (Adapte ao contexto):
1. Defina o TEMA.
2. Identifique Post Único ou Carrossel (widget "content_type_picker").
3. SE CARROSSEL: Pergunte obrigatoriamente "Quantos slides você quer?" (campo cardCount).
4. Escolha FORMATO (format_picker).
5. ESCOLHA DE DNA VISUAL (visual_type_picker): Pergunte se o visual deve ser "Baseado em Estilos" (marketplace) ou "Inspirado em fotos minhas" (custom).
   - SE "Inspirado em fotos minhas": Peça para subir as imagens (widget "style_uploader"). Essas imagens serão o DNA visual. Pule a seleção de estilos do marketplace.
   - SE "Baseado em Estilos": Mostre os estilos disponíveis (widget "style_picker").
6. PERSONALIZAÇÃO (widget "personalization") — SEMPRE pergunte se a pessoa quer adicionar ROSTO, LOGO ou CORES da marca antes de seguir. É opcional, mas a etapa precisa aparecer.
6. Escolha IMAGENS (image_source_picker): Ilustrações IA ou Fotos Reais.
   - SE "Fotos Reais" E o usuário enviou ROSTO em personalização: Pergunte se ele quer fundir o rosto (merge) ou aparecer ao lado da pessoa da foto (side_by_side). Use o widget "face_fusion_picker".
   - SE "Fotos Reais": Explique que precisaremos de termos de busca precisos.
7. ETAPA DE TEXTO E BUSCA (CRÍTICA):
   - Sugira o texto de cada slide no campo 'suggested_content'.
   - SE imageSource for 'real': Você DEVE preencher o 'searchTerm' para CADA slide.
   - REGRAS DO searchTerm:
     * DEVE ser em INGLÊS.
     * DEVE ser ultra-específico ao assunto + o slide.
     * Exemplo (Michael Jackson): "Michael Jackson Moonwalk stage performance 1980s", "Michael Jackson Thriller music video zombie makeup", "Michael Jackson portrait smiling professional photography".
     * NUNCA use termos genéricos como "photo" ou "man". Seja fiel ao tema do post.
   - Use o widget "approve_content".
7. SELEÇÃO DE MODELO (image_model_picker) e CONFIRMAÇÃO (confirm_generate).

⚠️ REGRAS CRÍTICAS:
- A etapa de PERSONALIZAÇÃO (widget "personalization") é OBRIGATÓRIA no fluxo, sempre depois do estilo e antes da escolha de imagens. Mesmo que a pessoa não queira enviar nada, o widget precisa aparecer.
- CAPACIDADE ESPECIAL: Se o usuário enviar um ROSTO e escolher "Fotos Reais" (ex: Michael Jackson), o sistema vai INTEGRAR o rosto da pessoa no personagem da foto (tipo um face swap inteligente). Explique isso se o usuário perguntar.
- 'searchTerm' é MANDATÓRIO no suggested_content quando o usuário escolhe Fotos Reais.
- O searchTerm DEVE ser focado no assunto principal (ex: se o post é sobre Michael Jackson, as buscas DEVEM ser sobre ele).
- NUNCA envie suggested_content sem o widget "approve_content".
- NUNCA marque ready=true sem o widget "confirm_generate".`;


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
            enum: ['content_type_picker', 'format_picker', 'visual_type_picker', 'style_uploader', 'style_picker', 'personalization', 'approve_content', 'confirm_generate', 'image_model_picker', 'image_source_picker', 'face_fusion_picker', 'none'],
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
              visualType: { type: 'string', enum: ['marketplace', 'custom'], description: 'Se o usuário quer usar estilos do marketplace ou subir referências próprias' },
              customStyleUrls: { type: 'array', items: { type: 'string' }, description: 'URLs das imagens de referência enviadas pelo usuário como DNA visual' },
              styleId: { type: 'string', description: 'UUID of the style. NEVER invent — only use IDs the user picked from the style_picker widget.' },
              styleName: { type: 'string' },
              hasFace: { type: 'boolean' },
              hasLogo: { type: 'boolean' },
              hasBrandColors: { type: 'boolean' },
              brandName: { type: 'string' },
              audience: { type: 'string' },
              tone: { type: 'string' },
              imageModel: { type: 'string', enum: ['ello-pro', 'ello-fast'] },
              suggested_content: { 
                type: 'array', 
                items: { 
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    subtitle: { type: 'string' },
                    body: { type: 'string' },
                    searchTerm: { type: 'string', description: 'Termo de busca ultra-específico em INGLÊS para este slide (obrigatório para Fotos Reais)' }
                  }
                },
                description: 'Array of slides/cards content. For single post, array of 1. For carousel, array of cardCount.'
              },
              userIdea: { type: 'string', description: 'Idéia específica do usuário para o post ou carrossel' },
              imageSource: { type: 'string', enum: ['ai', 'real'], description: 'Se o usuário prefere ilustrações geradas ou fotos reais' },
              faceFusionMode: { type: 'string', enum: ['merge', 'side_by_side'], description: 'Se deve fundir o rosto com a pessoa da foto ou aparecer ao lado' },
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