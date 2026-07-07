// Edge function: chat-creator
// Adaptive conversational AI that guides the user from idea to a generated post.
// Uses Lovable AI Gateway (Gemini) with tool-calling for structured output.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Default fallback limits (mirrors generate-carousel defaults).
const DEFAULT_TEXT_LIMITS = {
  cover_title_max_chars: 40,
  cover_subtitle_max_chars: 60,
  content_body_top_max_chars: 150,
  content_body_bottom_max_chars: 100,
  cta_title_max_chars: 30,
  cta_body_max_chars: 50,
};

type TextLimits = typeof DEFAULT_TEXT_LIMITS;

const isUuid = (v?: string | null) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function fetchStyleTextLimits(styleId?: string | null, styleName?: string | null): Promise<TextLimits | null> {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) return null;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = sb.from('marketplace_styles').select('style_config').limit(1);
    if (isUuid(styleId)) {
      query = query.eq('id', styleId);
    } else if (styleName && styleName.trim()) {
      query = query.ilike('name', styleName.trim());
    } else {
      return null;
    }
    const { data } = await query.maybeSingle();
    const cfg: any = data?.style_config || {};
    const tl = cfg.text_limits || cfg.textLimits || cfg?.imageGeneration?.text_limits || null;
    if (!tl) return null;
    return {
      cover_title_max_chars: Number(tl.cover_title_max_chars ?? tl.title_max_chars ?? DEFAULT_TEXT_LIMITS.cover_title_max_chars),
      cover_subtitle_max_chars: Number(tl.cover_subtitle_max_chars ?? tl.subtitle_max_chars ?? DEFAULT_TEXT_LIMITS.cover_subtitle_max_chars),
      content_body_top_max_chars: Number(tl.content_body_top_max_chars ?? tl.body_max_chars ?? DEFAULT_TEXT_LIMITS.content_body_top_max_chars),
      content_body_bottom_max_chars: Number(tl.content_body_bottom_max_chars ?? DEFAULT_TEXT_LIMITS.content_body_bottom_max_chars),
      cta_title_max_chars: Number(tl.cta_title_max_chars ?? DEFAULT_TEXT_LIMITS.cta_title_max_chars),
      cta_body_max_chars: Number(tl.cta_body_max_chars ?? DEFAULT_TEXT_LIMITS.cta_body_max_chars),
    };
  } catch (e) {
    console.error('fetchStyleTextLimits error:', e);
    return null;
  }
}

// Hard truncation on a word boundary when possible.
function hardTrim(value: string | undefined, max: number): string | undefined {
  if (!value) return value;
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

function enforceLimitsOnSlides(slides: any[], limits: TextLimits) {
  if (!Array.isArray(slides) || slides.length === 0) return slides;
  return slides.map((s, i) => {
    const isCover = i === 0;
    const isCta = i === slides.length - 1 && slides.length > 1;
    const titleMax = isCover ? limits.cover_title_max_chars : (isCta ? limits.cta_title_max_chars : limits.cover_title_max_chars);
    const subMax = limits.cover_subtitle_max_chars;
    const bodyMax = isCta ? limits.cta_body_max_chars : limits.content_body_top_max_chars;
    return {
      ...s,
      title: hardTrim(s?.title, titleMax),
      subtitle: hardTrim(s?.subtitle, subMax),
      body: hardTrim(s?.body, bodyMax),
    };
  });
}


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
  personalizationDone?: boolean;
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
  const rawBrief = brief as Record<string, unknown> | undefined;
  return {
    topic: trimText(brief?.topic, 320),
    format: brief?.format,
    contentType: brief?.contentType,
    cardCount: typeof brief?.cardCount === 'number' ? brief.cardCount : undefined,
    visualType: brief?.visualType,
    customStyleUrls: brief?.customStyleUrls?.slice(0, 4),
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
    faceProvided: !!(rawBrief?.faceProvided || rawBrief?.faceUrl),
    logoProvided: !!(rawBrief?.logoProvided || rawBrief?.logoUrl),
    productProvided: !!(rawBrief?.productProvided || rawBrief?.productUrl),
    suggested_content: brief?.suggested_content,
    userIdea: trimText(brief?.userIdea, 500),
    imageSource: brief?.imageSource,
    personalizationDone: !!brief?.personalizationDone,
  };
}

const SYSTEM_PROMPT = `Você é a "Ello", uma designer brasileira super simpática e descontraída da plataforma ellocontent. Você conversa por chat ajudando a pessoa a criar posts e carrosséis incríveis pro Instagram.

🎯 PERSONALIDADE:
- Fale de forma calorosa e empolgada, use gírias leves como "tá", "show!", "bora".
- Emojis com moderação.

🎨 FLUXO (Adapte ao contexto):
0. APROFUNDAMENTO DA IDEIA (CRÍTICO — NUNCA PULE). Entenda claramente: (a) produto/serviço, (b) ângulo central, (c) público, (d) objetivo. Pergunte uma coisa por vez com 3-4 'suggestions'. NUNCA preencha 'suggested_content' enquanto houver dúvida.
1. Defina o TEMA.
2. Post Único ou Carrossel (widget "content_type_picker") — OBRIGATÓRIO antes de qualquer texto.
3. SE CARROSSEL: pergunte "Quantos slides?" (cardCount) — OBRIGATÓRIO antes de qualquer texto.
4. FORMATO (format_picker) — OBRIGATÓRIO antes de qualquer texto.
5. DNA VISUAL (visual_type_picker) — OBRIGATÓRIO antes de qualquer texto.
6. PERSONALIZAÇÃO (widget "personalization") — OBRIGATÓRIO antes de qualquer texto.
7. ETAPA DE TEXTO (CRÍTICA — SÓ AGORA): preencha 'suggested_content' e use widget "approve_content". NUNCA antes de completar 2→6.
8. IMAGENS (image_source_picker) e FINALIZAÇÃO — EXCETO quando já houver produto anexado.

⚠️ REGRAS CRÍTICAS:
- 🚫 ORDEM DO FLUXO É OBRIGATÓRIA E INVIOLÁVEL. Mesmo quando entender perfeitamente a ideia, NÃO pule pra sugerir texto. Siga 2→3→4→5→6→7 nessa ordem exata. Só preencha 'suggested_content' e mostre 'approve_content' DEPOIS que contentType, cardCount (se carrossel), format, visualType/styleId e personalização estiverem TODOS no estado.
- Quando entender a ideia, confirme rápido ("Entendi! Bora estruturar 👇") e mostre o PRÓXIMO widget do fluxo (geralmente content_type_picker), NUNCA texto pronto na mesma resposta.
- Se o usuário disser "pode criar"/"manda ver" antes de definir formato/tipo, NÃO pule etapas — diga "Só falta definir [próximo passo]" e mostre o widget correspondente.
- NUNCA pergunte sobre rosto/logo/produto/cores quando faceProvided/logoProvided/productProvided/hasBrandColors=true. Trate como JÁ FORNECIDO.
- Se productProvided/hasProduct=true: NUNCA mostre "image_source_picker" e NUNCA defina imageSource='real'.
- 🛑 NUNCA preencha 'suggested_content' nem mostre 'approve_content' na MESMA resposta em que o usuário descreveu a ideia. Confirme e avance pro próximo widget do fluxo.
- NUNCA diga "Olha o que eu preparei" ou "Aqui estão as sugestões" sem preencher o campo 'suggested_content' e usar o widget 'approve_content' na mesma resposta.
- Se você sugerir textos, o widget "approve_content" é MANDATÓRIO. Sem ele, o usuário não consegue ver nem aprovar o que você criou.
- O usuário deve ver os textos e clicar em "Aprovar conteúdo" antes de você seguir para a escolha de imagens.
- Se o usuário pedir para mudar algo no texto, atualize 'suggested_content' e mostre o widget "approve_content" novamente.
- 🔢 QUANTIDADE DE SLIDES É INVIOLÁVEL: quando contentType="carousel", o array 'suggested_content' DEVE ter EXATAMENTE 'cardCount' itens — nem mais, nem menos. Se o usuário disse "3 slides", gere 3 objetos completos no array (cover, desenvolvimento, CTA). Para "single", exatamente 1 item.
- Cada slide do carrossel deve ter title curto (até 7 palavras), subtitle (até 12 palavras) e body (até 30 palavras) coerentes entre si — narrativa contínua, sem repetições.
- CAPACIDADE ESPECIAL: Se o usuário enviar um ROSTO e escolher "Fotos Reais", o sistema vai INTEGRAR o rosto dele na foto (face swap).
- NUNCA marque ready=true sem o widget "confirm_generate".
- 'searchTerm' é MANDATÓRIO no suggested_content quando o usuário escolhe Fotos Reais (deve ser em INGLÊS e ultra-específico).

🧠 CONTEXTO INTELIGENTE (PROATIVIDADE OBRIGATÓRIA):
- Você DEVE detectar o tipo de negócio pelo tema/ideia e oferecer PROATIVAMENTE o upload de referências visuais adequadas ANTES de chegar na etapa de personalização.
- 📱 APP / APLICATIVO / SOFTWARE / SAAS / PLATAFORMA / DASHBOARD / SISTEMA / SITE / WEBSITE / LANDING PAGE: pergunte "Quer me enviar prints/screenshots do app pra eu usar como referência visual no post? 📸" — e avise que na próxima etapa (personalização) haverá um campo específico "Prints do app" pra upload. Se o usuário confirmar, garanta que na personalização o toggle 'prints' apareça destacado.
- 🛍️ PRODUTO FÍSICO / EMBALAGEM / COSMÉTICO / ROUPA / COMIDA: ofereça upload de foto real do produto ("Tem uma foto do produto? Faz muita diferença!").
- 🏠 IMÓVEL / IMOBILIÁRIA: ofereça upload de fotos do imóvel.
- 👤 COACH / MENTOR / INFLUENCER / PROFISSIONAL LIBERAL: ofereça upload de foto do rosto ("Quer que eu integre seu rosto no post?").
- 🏢 EMPRESA / MARCA JÁ ESTABELECIDA: ofereça upload de logo pra extrair as cores da marca automaticamente.
- Faça essa pergunta em UMA resposta com widget="none" e suggestions=["Sim, vou enviar", "Não, gera sem"] LOGO APÓS entender o tema — antes de chamar content_type_picker. Se o usuário disser "sim", confirme ("Show! Você anexa na etapa de personalização 👇") e siga o fluxo normal.
- NÃO force upload — se o usuário disser "não" ou "gera sem", siga normalmente sem insistir.


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

function hasGenericPlaceholder(text?: string) {
  if (!text) return false;
  return /\b(meu|minha|meus|minhas)\s+(nicho|segmento|mercado|área|area|negócio|negocio|empresa|marca|produto|serviço|servico|cliente|público|publico)\b/i.test(text);
}

function hasConcreteCreativeContext(brief: SanitizedBriefState, messages: InMessage[]) {
  const concreteBrief = [brief.topic, brief.brandName, brief.audience]
    .some((value) => value && value.length > 3 && !hasGenericPlaceholder(value));

  if (concreteBrief || brief.hasProduct || brief.productProvided) return true;

  return messages.some((message) => {
    if (message.role !== 'user') return false;
    const text = message.content.toLowerCase();
    if (hasGenericPlaceholder(text)) return false;
    return /\b(sou|tenho|vendo|trabalho com|meu nicho é|minha área é|segmento é|atendo|público|publico)\b/i.test(text)
      && text.length >= 18;
  });
}

function shouldAskForNicheFirst(messages: InMessage[], brief: SanitizedBriefState) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  if (!lastUserMessage || !hasGenericPlaceholder(lastUserMessage)) return false;
  return !hasConcreteCreativeContext(brief, messages.slice(0, -1));
}

function nicheClarificationResponse(userMessage: string): ApiResponse {
  return {
    ok: true,
    messages: [
      'Show, eu faço sim — mas antes preciso entender seu nicho pra não criar algo genérico.',
      'Qual é o seu nicho, produto ou serviço principal?',
    ],
    widget: 'none',
    brief_update: { userIdea: trimText(userMessage, 500) },
    suggestions: ['Moda e beleza', 'Saúde e bem-estar', 'Imobiliário', 'Infoprodutos'],
  };
}

function hasPersonalizationAnswer(brief: SanitizedBriefState) {
  return !!brief.personalizationDone || !!brief.hasFace || !!brief.hasLogo || !!brief.hasProduct || !!brief.hasBrandColors || !!brief.faceProvided || !!brief.logoProvided || !!brief.productProvided;
}

function getNextRequiredFlowWidget(brief: SanitizedBriefState): ApiResponse['widget'] {
  if (!brief.contentType) return 'content_type_picker';
  if (brief.contentType === 'carousel' && !brief.cardCount) return 'content_type_picker';
  if (!brief.format) return 'format_picker';
  if (!brief.visualType) return 'visual_type_picker';
  if (brief.visualType === 'marketplace' && !brief.styleId) return 'style_picker';
  if (brief.visualType === 'custom' && (!brief.customStyleUrls || brief.customStyleUrls.length === 0)) return 'style_uploader';
  if (!hasPersonalizationAnswer(brief)) return 'personalization';
  return 'none';
}

function getFlowGuardMessage(widget: ApiResponse['widget']) {
  if (widget === 'content_type_picker') return 'Entendi a ideia. Antes de criar o texto, escolha se vai ser post único ou carrossel.';
  if (widget === 'format_picker') return 'Perfeito. Agora escolha o formato do post antes de eu escrever o conteúdo.';
  if (widget === 'visual_type_picker') return 'Show. Agora defina o DNA visual antes da etapa de texto.';
  if (widget === 'style_picker') return 'Beleza. Escolha um estilo da galeria antes de eu montar o texto final.';
  if (widget === 'style_uploader') return 'Beleza. Envie suas referências visuais antes de eu montar o texto final.';
  if (widget === 'personalization') return 'Quase lá. Antes do texto final, me diga se vamos usar rosto, logo, produto ou cores da marca.';
  return 'Vamos seguir o fluxo certinho antes de criar o conteúdo final.';
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

    if (shouldAskForNicheFirst(safeMessages, safeBrief)) {
      const lastUserMessage = [...safeMessages].reverse().find((message) => message.role === 'user')?.content || '';
      return jsonResponse(withGuaranteedSuggestions(nicheClarificationResponse(lastUserMessage)));
    }

    const briefSummary = `Estado atual coletado: ${JSON.stringify(safeBrief)}`;

    const alreadyProvided: string[] = [];
    if (safeBrief.faceProvided || safeBrief.hasFace) alreadyProvided.push('ROSTO');
    if (safeBrief.logoProvided || safeBrief.hasLogo) alreadyProvided.push('LOGO');
    if (safeBrief.productProvided || safeBrief.hasProduct) alreadyProvided.push('PRODUTO/EMBALAGEM');
    if (safeBrief.hasBrandColors) alreadyProvided.push('CORES DA MARCA');
    const providedHint = alreadyProvided.length
      ? `IMPORTANTE: O usuário JÁ FORNECEU: ${alreadyProvided.join(', ')}. NÃO pergunte sobre esses itens nem peça upload deles novamente. Não reabra o widget "personalization" pra esses itens. Apenas confirme rápido e siga para o próximo passo.`
      : '';

    // Load per-style character limits and inject as hard rules so the AI never
    // writes copy that visually overflows the selected template.
    const styleTextLimits = await fetchStyleTextLimits(safeBrief.styleId, safeBrief.styleName);
    const effectiveLimits = styleTextLimits || DEFAULT_TEXT_LIMITS;
    const limitsHint = `⚠️ LIMITES DE CARACTERES INVIOLÁVEIS DO ESTILO SELECIONADO — cada campo do 'suggested_content' NÃO PODE ULTRAPASSAR estes limites (contando espaços e pontuação). Se ultrapassar, o design QUEBRA:
- Capa (slide 1): title MÁX ${effectiveLimits.cover_title_max_chars} caracteres, subtitle MÁX ${effectiveLimits.cover_subtitle_max_chars} caracteres.
- Slides de conteúdo (2..N-1): body MÁX ${effectiveLimits.content_body_top_max_chars} caracteres, subtitle MÁX ${effectiveLimits.cover_subtitle_max_chars} caracteres.
- CTA (último slide se carrossel): title MÁX ${effectiveLimits.cta_title_max_chars} caracteres, body MÁX ${effectiveLimits.cta_body_max_chars} caracteres.
Prefira frases curtas, verbos fortes e ZERO enrolação. NUNCA gere textos maiores esperando "encurtar depois" — já escreva dentro do limite.`;

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: briefSummary },
      { role: 'system', content: limitsHint },
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

    const mergedBrief = sanitizeBrief({ ...safeBrief, ...(parsed.brief_update || {}) });
    const nextRequiredWidget = getNextRequiredFlowWidget(mergedBrief);
    const parsedMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
    const lastParsedMessage = String(parsedMessages[parsedMessages.length - 1] || '').toLowerCase();
    const mentionsTextOptions = /opç|sugest|preparei|aprovar|conteúdo|conteudo|texto|copy|legenda|roteiro|cards?|slides?/.test(lastParsedMessage);
    const attemptedEarlyContent = parsed.widget === 'approve_content' || Array.isArray(parsed.brief_update?.suggested_content) || !!parsed.ready || mentionsTextOptions;
    if (nextRequiredWidget !== 'none' && attemptedEarlyContent) {
      parsed.messages = [getFlowGuardMessage(nextRequiredWidget)];
      parsed.widget = nextRequiredWidget;
      parsed.ready = false;
      parsed.brief_update = { ...(parsed.brief_update || {}) };
      delete parsed.brief_update.suggested_content;
    }

    // 🔢 Slide-count enforcement: when carousel and AI returned wrong count, retry once.
    const expectedCount = mergedBrief.contentType === 'carousel'
      ? (mergedBrief.cardCount && mergedBrief.cardCount > 0 ? mergedBrief.cardCount : null)
      : (mergedBrief.contentType === 'single' ? 1 : null);
    const incomingSlides = Array.isArray(parsed.brief_update?.suggested_content) ? parsed.brief_update.suggested_content : null;
    if (
      nextRequiredWidget === 'none' &&
      expectedCount &&
      incomingSlides &&
      incomingSlides.length !== expectedCount
    ) {
      const retryMessages = [
        ...aiMessages,
        {
          role: 'system',
          content: `❌ Você gerou ${incomingSlides.length} slide(s) mas o usuário pediu EXATAMENTE ${expectedCount}. Refaça agora preenchendo 'suggested_content' com EXATAMENTE ${expectedCount} objetos (cada um com title, subtitle, body coerentes em narrativa contínua: ${expectedCount === 1 ? 'post único' : 'capa → desenvolvimento → CTA'}). Use widget "approve_content".`,
        },
      ];
      try {
        const retry = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: retryMessages,
            tools: [buildTool()],
            tool_choice: { type: 'function', function: { name: 'respond' } },
          }),
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryCall = retryData.choices?.[0]?.message?.tool_calls?.[0];
          if (retryCall?.function?.arguments) {
            const retryParsed = JSON.parse(retryCall.function.arguments);
            const retrySlides = Array.isArray(retryParsed.brief_update?.suggested_content) ? retryParsed.brief_update.suggested_content : null;
            if (retrySlides && retrySlides.length === expectedCount) {
              parsed = retryParsed;
              if (!Array.isArray(parsed.messages)) parsed.messages = [String(parsed.messages || '...')];
            }
          }
        }
      } catch (retryErr) {
        console.error('Slide-count retry failed:', retryErr);
      }

      // Final safety net: pad or trim to expected count so the user never sees a broken carousel.
      const finalSlides = Array.isArray(parsed.brief_update?.suggested_content) ? [...parsed.brief_update.suggested_content] : [];
      if (finalSlides.length > expectedCount) {
        parsed.brief_update.suggested_content = finalSlides.slice(0, expectedCount);
      } else if (finalSlides.length > 0 && finalSlides.length < expectedCount) {
        while (finalSlides.length < expectedCount) {
          finalSlides.push({ title: `Slide ${finalSlides.length + 1}`, subtitle: '', body: '' });
        }
        parsed.brief_update = { ...(parsed.brief_update || {}), suggested_content: finalSlides };
      }
    }

    // 🔒 Server-side final safety net: enforce per-style character limits on every slide.
    if (Array.isArray(parsed.brief_update?.suggested_content) && parsed.brief_update.suggested_content.length > 0) {
      parsed.brief_update.suggested_content = enforceLimitsOnSlides(parsed.brief_update.suggested_content, effectiveLimits);
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