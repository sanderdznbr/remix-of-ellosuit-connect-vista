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
  hasProduct?: boolean;
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
  productProvided?: boolean;
}

interface ApiResponse {
  ok: boolean;
  messages?: string[];
  widget?: 'content_type_picker' | 'format_picker' | 'visual_type_picker' | 'style_uploader' | 'style_picker' | 'personalization' | 'approve_content' | 'confirm_generate' | 'image_model_picker' | 'image_source_picker' | 'face_fusion_picker' | 'none';
  brief_update?: Partial<BriefState>;
  suggestions?: string[];
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
    styleName: trimText(brief?.styleName ?? undefined, 120),
    hasFace: !!brief?.hasFace,
    hasLogo: !!brief?.hasLogo,
    hasProduct: !!brief?.hasProduct,
    hasBrandColors: !!brief?.hasBrandColors,
    brandName: trimText(brief?.brandName, 120),
    audience: trimText(brief?.audience, 160),
    tone: trimText(brief?.tone, 120),
    imageModel: brief?.imageModel,
    faceProvided: !!(brief as Record<string, unknown> | undefined)?.faceUrl,
    logoProvided: !!(brief as Record<string, unknown> | undefined)?.logoUrl,
    productProvided: !!(brief as Record<string, unknown> | undefined)?.productUrl,
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
5. DNA VISUAL (visual_type_picker): Marketplace ou Custom.
6. PERSONALIZAÇÃO (widget "personalization"): ROSTO, LOGO ou CORES.
7. ETAPA DE TEXTO (CRÍTICA): Sugira o texto de cada slide no campo 'suggested_content' e use SEMPRE o widget "approve_content".
8. Escolha IMAGENS (image_source_picker) e FINALIZAÇÃO — EXCETO quando já houver produto anexado.

⚠️ REGRAS CRÍTICAS:
- NUNCA pergunte se o usuário tem rosto/logo/produto/cores quando o estado já indicar faceProvided/logoProvided/productProvided/hasBrandColors=true. Trate como JÁ FORNECIDO e siga adiante sem reabrir o widget de personalização para esse item.
- Se productProvided=true OU hasProduct=true, NUNCA pergunte "você tem foto do produto?" e NUNCA peça upload de produto de novo. Apenas confirme rápido ("Show, já vi as fotos do produto!") e avance.
- 🚫 SE productProvided=true OU hasProduct=true: NUNCA mostre o widget "image_source_picker" e NUNCA pergunte se a pessoa quer "ilustrações geradas por IA" ou "fotos reais". Já temos a foto real do produto. NÃO defina imageSource='real', porque isso dispara busca de foto web no frontend. Siga direto para composição usando a foto anexada como referência fiel do produto/embalagem.
- NUNCA diga "Olha o que eu preparei" ou "Aqui estão as sugestões" sem preencher o campo 'suggested_content' e usar o widget 'approve_content' na mesma resposta.
- Se você sugerir textos, o widget "approve_content" é MANDATÓRIO. Sem ele, o usuário não consegue ver nem aprovar o que você criou.
- O usuário deve ver os textos e clicar em "Aprovar conteúdo" antes de você seguir para a escolha de imagens.
- Se o usuário pedir para mudar algo no texto, atualize 'suggested_content' e mostre o widget "approve_content" novamente.
- CAPACIDADE ESPECIAL: Se o usuário enviar um ROSTO e escolher "Fotos Reais", o sistema vai INTEGRAR o rosto dele na foto (face swap).
- NUNCA marque ready=true sem o widget "confirm_generate".
- 'searchTerm' é MANDATÓRIO no suggested_content quando o usuário escolhe Fotos Reais (deve ser em INGLÊS e ultra-específico).

💬 SUGESTÕES DE RESPOSTA RÁPIDA (OBRIGATÓRIO):
- SEMPRE que widget == "none", você DEVE preencher o campo 'suggestions' com 3 a 4 respostas curtas e prontas que o usuário pode clicar. O usuário NUNCA deve depender de digitar para continuar.
- Mesmo em perguntas abertas sobre tema, público, tom, marca, nicho, ideia ou ajustes de texto, dê opções prontas plausíveis.
- As sugestões devem ser respostas plausíveis, específicas e em primeira pessoa, escritas como o usuário escreveria (ex: "Quero algo divertido e descontraído", "Público feminino 25-40 anos", "Tema: lançamento do meu curso de inglês").
- Cada sugestão: máximo 8 palavras, sem aspas, sem emojis.
- Se houver widget (qualquer um da lista acima), NÃO envie suggestions — o widget já é a opção de escolha.
- O usuário sempre pode digitar livremente; as sugestões são atalhos, não as únicas opções.`;


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
              hasProduct: { type: 'boolean', description: 'True when the user provided a product/package photo reference' },
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
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Quick-reply chips shown under the assistant message. Provide 3-4 plausible short user-style replies (max 8 words each) ONLY when widget=="none" and you are asking an open question. Leave empty/omit when using any picker widget.',
          },
        },
        required: ['messages'],
      },
    },
  };
}

function normalizeSuggestions(suggestions?: unknown) {
  if (!Array.isArray(suggestions)) return [];
  const seen = new Set<string>();
  return suggestions
    .map((suggestion) => String(suggestion || '').replace(/\s+/g, ' ').trim())
    .filter((suggestion) => suggestion.length > 0 && suggestion.split(' ').length <= 10)
    .filter((suggestion) => {
      const key = suggestion.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function fallbackSuggestions(content: string) {
  const text = content.toLowerCase();
  if (/quantos? slides|número de slides|qtd/.test(text)) return ['3 slides', '5 slides', '7 slides', '10 slides'];
  if (/opç|sugest|preparei|aprovar|conteúdo|conteudo|texto|copy|legenda|roteiro|cards?|slides?/.test(text)) return ['Aprovar como está', 'Ver nova opção', 'Mais direto', 'Mais vendedor'];
  if (/ajust|alter|mudar|revis|texto|conteúdo/.test(text)) return ['Aprovar como está', 'Deixar mais direto', 'Mais premium', 'Mais vendedor'];
  if (/tema|assunto|ideia|sobre o que|criar/.test(text)) return ['Lançamento de produto', 'Promoção da semana', 'Conteúdo educativo', 'Autoridade no nicho'];
  if (/público|publico|cliente|persona|audiência|audiencia/.test(text)) return ['Mulheres 25 a 40 anos', 'Donos de negócios', 'Profissionais liberais', 'Público jovem'];
  if (/tom|linguagem|voz|estilo de texto/.test(text)) return ['Profissional e direto', 'Premium e sofisticado', 'Divertido e leve', 'Urgente e vendedor'];
  if (/marca|nome|empresa|negócio|negocio/.test(text)) return ['Usar minha marca atual', 'Sem marca por enquanto', 'Destacar o produto', 'Marca minimalista'];
  if (/nicho|segmento|área|area/.test(text)) return ['Moda e beleza', 'Saúde e bem-estar', 'Imobiliário', 'Infoprodutos'];
  return ['Continuar assim', 'Gerar opção pronta', 'Deixar mais premium', 'Fazer mais direto'];
}

function withGuaranteedSuggestions(payload: ApiResponse): ApiResponse {
  const allowedWidgets = new Set(['content_type_picker', 'format_picker', 'visual_type_picker', 'style_uploader', 'style_picker', 'personalization', 'approve_content', 'confirm_generate', 'image_model_picker', 'image_source_picker', 'face_fusion_picker']);
  const widget = payload.widget && payload.widget !== 'none' && allowedWidgets.has(payload.widget) ? payload.widget : 'none';
  if (widget !== 'none') return { ...payload, suggestions: undefined };
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const lastMessage = messages[messages.length - 1] || '';
  const suggestions = normalizeSuggestions(payload.suggestions);
  return {
    ...payload,
    widget: 'none',
    suggestions: suggestions.length > 0 ? suggestions : fallbackSuggestions(lastMessage),
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

    const alreadyProvided: string[] = [];
    if (safeBrief.faceProvided || safeBrief.hasFace) alreadyProvided.push('ROSTO');
    if (safeBrief.logoProvided || safeBrief.hasLogo) alreadyProvided.push('LOGO');
    if (safeBrief.productProvided || safeBrief.hasProduct) alreadyProvided.push('PRODUTO/EMBALAGEM');
    if (safeBrief.hasBrandColors) alreadyProvided.push('CORES DA MARCA');
    const providedHint = alreadyProvided.length
      ? `IMPORTANTE: O usuário JÁ FORNECEU: ${alreadyProvided.join(', ')}. NÃO pergunte sobre esses itens nem peça upload deles novamente. Não reabra o widget "personalization" pra esses itens. Apenas confirme rápido e siga para o próximo passo.`
      : '';

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: briefSummary },
      ...(providedHint ? [{ role: 'system', content: providedHint }] : []),
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
      
      let errorMessage = 'Tive um probleminha técnico aqui. Tenta de novo?';
      if (response.status === 413 || response.status === 431) {
        errorMessage = 'A conversa ficou grande demais. Vamos começar uma nova?';
      } else if (response.status >= 500) {
        errorMessage = 'O serviço de IA está oscilando um pouco. Tente novamente em instantes.';
      }

      return jsonResponse({
        ok: false,
        error: `AI gateway error ${response.status}`,
        fallback: true,
        messages: [errorMessage],
        widget: 'none',
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

    // Server-side guard: if product photo is provided, never let the model show
    // the image_source_picker and never set imageSource='real' (that means web photo search).
    const productProvided = safeBrief.productProvided || safeBrief.hasProduct;
    if (productProvided) {
      parsed.brief_update = { ...(parsed.brief_update || {}), imageSource: undefined, selectedImages: undefined };
      if (parsed.widget === 'image_source_picker') {
        parsed.widget = 'none';
      }
    }

    return jsonResponse(withGuaranteedSuggestions({ ok: true, ...parsed }));
  } catch (e) {
    console.error('chat-creator error:', e);
    return jsonResponse(withGuaranteedSuggestions({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      fallback: true,
      messages: ['Tive um imprevisto aqui do meu lado.'],
      widget: 'none',
    }));
  }
});