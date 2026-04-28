// Generates the FINAL Instagram post in a single Gemini 3 Pro Image call.
// Mirrors the advanced wizard flow: capture all references (face, logo, style,
// brand colors, instructions, topic) and send them together so the model
// produces a finished, coherent, on-brand post in one pass.
// Persists the result to generated_carousels and returns carousel id + url.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Brief {
  topic?: string;
  format?: 'portrait' | 'square' | 'story';
  contentType?: 'single' | 'carousel';
  cardCount?: number;
  styleId?: string | null;
  styleName?: string | null;
  brandName?: string;
  brandColors?: string[];
  hasFace?: boolean;
  hasLogo?: boolean;
  faceUrl?: string | string[];
  logoUrl?: string | string[];
  audience?: string;
  tone?: string;
  suggested_content?: Array<{ title?: string; subtitle?: string; body?: string }>;
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: '4:5',
  square: '1:1',
  story: '9:16',
};

const isUuid = (value?: string | null) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function getCompanyId(sb: any, userId: string): Promise<string | null> {
  const { data } = await sb
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.company_id || null;
}

async function getStyleContext(sb: any, styleId?: string | null) {
  if (!isUuid(styleId)) return null;
  const { data, error } = await sb
    .from('marketplace_styles')
    .select('id, name, description, preview_images, strict_instructions, style_config')
    .eq('id', styleId)
    .maybeSingle();
  if (error) {
    console.error('style context error:', error);
    return null;
  }
  return data || null;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || 'image/png';
    const buf = new Uint8Array(await resp.arrayBuffer());
    // Native base64 — orders of magnitude cheaper than the per-byte
    // String.fromCharCode loop, which was burning CPU budget.
    return `data:${ct};base64,${encodeBase64(buf)}`;
  } catch {
    return null;
  }
}

async function uploadCover(sb: any, companyId: string, carouselId: string, dataUrl: string): Promise<string | null> {
  try {
    const base64 = dataUrl.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `${companyId}/${carouselId}/cover.jpg`;
    const { error } = await sb.storage.from('covers').upload(path, bytes.buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.error('cover upload error:', error);
      return null;
    }
    const { data } = sb.storage.from('covers').getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  } catch (e) {
    console.error('uploadCover exception:', e);
    return null;
  }
}

async function extractImageUrl(resp: Response): Promise<string | null> {
  const raw = await resp.text();
  const patterns = ['"url":"data:image/', '"url": "data:image/', '"url":"http', '"url": "http'];
  for (const pattern of patterns) {
    const idx = raw.indexOf(pattern);
    if (idx === -1) continue;
    const isHttp = pattern.includes('http');
    const urlStart = isHttp ? raw.indexOf('http', idx) : raw.indexOf('data:image/', idx);
    const urlEnd = raw.indexOf('"', urlStart);
    if (urlStart !== -1 && urlEnd !== -1) return raw.slice(urlStart, urlEnd);
  }
  console.error('image extraction failed:', raw.slice(0, 500));
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sbAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sbAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const companyId = await getCompanyId(sb, user.id);
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brief } = (await req.json()) as { brief: Brief };
    if (!brief?.topic) {
      return new Response(JSON.stringify({ error: 'topic é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief.format || 'portrait'] || '4:5';
    const style = await getStyleContext(sb, brief.styleId);

    // === STEP 0: Check credits before starting expensive AI work ===
    const { data: balance } = await sb
      .from('ai_credit_balances')
      .select('balance')
      .eq('company_id', companyId)
      .maybeSingle();

    const creditCost = brief.hasFace ? 5 : 2; // Fixed single post cost vs face customization
    if (!balance || (balance.balance < creditCost)) {
      return new Response(JSON.stringify({ 
        error: `Você precisa de pelo menos ${creditCost} créditos para gerar este post. Saldo atual: ${balance?.balance || 0}` 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === STEP 1: Generate professional art direction (creative brief) ===
    // A senior creative director writes a detailed visual concept BEFORE the image is generated.
    // This avoids generic stock scenes and guarantees the photo is purposefully designed for the topic.
    // === STEP 1: Generate art direction AND fetch references in parallel ===
    const directionPrompt = `Você é um diretor de arte sênior de revista editorial (estilo GQ, Vogue Business, Monocle). Um post de Instagram precisa ser criado sobre o tema:

"${brief.topic}"

${brief.brandName ? `Marca: ${brief.brandName}.` : ''}
${brief.audience ? `Público: ${brief.audience}.` : ''}
${brief.tone ? `Tom: ${brief.tone}.` : ''}
${brief.hasFace ? 'IMPORTANTE: o post mostrará uma pessoa real (temos a foto do rosto dela como referência de identidade). Você precisa dirigir a CENA ao redor dessa pessoa.' : ''}
${style?.name ? `Estilo visual selecionado: ${style.name}. ${style.description || ''}` : ''}

Crie uma DIREÇÃO DE ARTE específica e original para uma única foto editorial premium. Responda em JSON com EXATAMENTE estes campos (todos em português brasileiro, frases curtas e visuais):

{
  "concept": "conceito criativo único em 1 frase — não genérico, ligado diretamente ao tema",
  "scene": "descrição do ambiente/cenário específico",
  "pose": "pose corporal específica e dinâmica",
  "expression": "expressão facial específica",
  "wardrobe": "figurino específico que combina com o tema",
  "cameraAngle": "ângulo e enquadramento",
  "lighting": "iluminação cinematográfica",
  "moodKeywords": "3-5 palavras-chave de mood",
  "textZone": "onde fica a área limpa para o texto"
}

Seja ESPECÍFICO e VISUAL. Nunca devolva descrições genéricas tipo "pessoa sorrindo em um escritório".`;

    const artDirectionPromise = (async (): Promise<string> => {
      try {
        const dirResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'user', content: directionPrompt }],
            response_format: { type: 'json_object' },
          }),
        });
        if (!dirResp.ok) {
          console.warn('Art direction call failed:', dirResp.status);
          return '';
        }
        const dj = await dirResp.json();
        const raw = dj?.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(raw);
          console.log('🎬 Art direction generated:', parsed.concept);
          return `🎬 DIREÇÃO DE ARTE (siga rigorosamente — esta é a visão profissional para esta foto específica):
• CONCEITO: ${parsed.concept}
• CENÁRIO: ${parsed.scene}
• POSE DO PERSONAGEM: ${parsed.pose}
• EXPRESSÃO: ${parsed.expression}
• FIGURINO: ${parsed.wardrobe}
• CÂMERA: ${parsed.cameraAngle}
• ILUMINAÇÃO: ${parsed.lighting}
• MOOD: ${parsed.moodKeywords}
• ÁREA DE TEXTO LIVRE: ${parsed.textZone}`;
        } catch (e) {
          console.warn('Art direction JSON parse failed, using raw:', e);
          return raw ? `🎬 DIREÇÃO DE ARTE:\n${raw}` : '';
        }
      } catch (e) {
        console.warn('Art direction step skipped:', e);
        return '';
      }
    })();

    // === Resolve all reference assets in parallel (alongside art direction) ===
    const faceUrlArray = Array.isArray(brief.faceUrl) ? brief.faceUrl : (brief.faceUrl ? [brief.faceUrl] : []);
    const logoUrlArray = Array.isArray(brief.logoUrl) ? brief.logoUrl : (brief.logoUrl ? [brief.logoUrl] : []);

    const refsPromise = Promise.all([
      brief.hasFace && faceUrlArray.length > 0
        ? Promise.all(faceUrlArray.map(url => url.startsWith('data:') ? Promise.resolve(url) : urlToDataUrl(url)))
        : Promise.resolve([]),
      brief.hasLogo && logoUrlArray.length > 0
        ? Promise.all(logoUrlArray.map(url => url.startsWith('data:') ? Promise.resolve(url) : urlToDataUrl(url)))
        : Promise.resolve([]),
      ...(Array.isArray(style?.preview_images) ? style.preview_images.slice(0, 2).map(urlToDataUrl) : []),
    ]);

    const [artDirection, refsResolved] = await Promise.all([artDirectionPromise, refsPromise]);
    const [facesResolved, logosResolved, ...styleRefDataUrls] = refsResolved;
    const faceData = facesResolved?.[0] || null; // Gemini 3 Pro Image handles best with a primary face
    const logoData = logosResolved?.[0] || null;
    const styleRefs = styleRefDataUrls.filter(Boolean) as string[];

    // If there are multiple face refs, we can add them as context too
    const additionalFaces = facesResolved.slice(1).filter(Boolean);
    const additionalLogos = logosResolved.slice(1).filter(Boolean);


    // === Build the unified prompt (single pass) ===
    const colors = brief.brandColors?.length ? `Brand palette: ${brief.brandColors.join(', ')}.` : '';
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : '';
    const audienceLine = brief.audience ? `Target audience: ${brief.audience}.` : '';
    const toneLine = brief.tone ? `Tone of voice: ${brief.tone}.` : '';
    const faceLine = faceData
      ? `⚠️ CRITICAL — FACE REFERENCE HANDLING ⚠️
The attached photo is a FACE IDENTITY REFERENCE ONLY. Treat it like a passport photo / Face ID card.

EXTRACT ONLY: facial features (eyes, nose, mouth, face shape), skin tone, hair color/style, age, ethnicity, gender, beard/mustache if present.

ABSOLUTELY FORBIDDEN — these will RUIN the result:
❌ DO NOT cut-and-paste, crop, or composite the face from the reference into the scene
❌ DO NOT keep the same pose, body angle, head tilt, or framing as the reference
❌ DO NOT keep the same shirt, t-shirt, jacket, logo, print, or any clothing from the reference
❌ DO NOT keep the same background, wall, lighting, or environment from the reference
❌ DO NOT keep the same expression (no copying the same neutral selfie face)
❌ DO NOT mirror, flip, or directly trace the reference photo
❌ NEVER show clothing prints/text from the reference (e.g. brand logos, mirrored letters)

REQUIRED — REINVENT the entire scene from scratch:
✅ REPAINT the person from scratch as a brand-new editorial photograph, only borrowing the FACIAL IDENTITY
✅ Give them a NEW POSE: dynamic, in-action, gesturing, walking, leaning, sitting cinematically, looking off-camera, hands working, etc.
✅ Give them a NEW EXPRESSION matching the topic mood (smiling, focused, intense, joyful, curious — NOT a flat selfie stare)
✅ Give them BRAND-NEW CLOTHING styled for the concept (clean shirt, blazer, designer outfit, lab coat, casual chic — whatever fits the topic; never reuse the reference outfit)
✅ Use a NEW CAMERA ANGLE: 3/4 profile, low hero angle, over-the-shoulder, wide editorial cinematic, candid lifestyle, side profile — anything BUT a centered frontal selfie
✅ Build a NEW ENVIRONMENT that visually tells the story of the topic (studio, location, conceptual set, on-location lifestyle scene)
✅ Apply NEW LIGHTING (cinematic, soft window light, hard editorial, neon, golden hour — chosen by the concept)
✅ Leave clean negative space (top OR bottom third) for typography — face must NEVER be covered by text

Think of it like a film director casting a real actor: you have the actor's face, now stage a brand-new scene around them. The reference is the casting headshot, NOT the final shot.`
      : '';
    const logoLine = logoData
      ? 'A logo asset is attached. Place it subtly and cleanly in a corner — small, balanced, never intrusive.'
      : '';
    const styleRules = [
      style?.name ? `Selected marketplace style: "${style.name}".` : '',
      style?.description ? `Style description: ${style.description}` : '',
      style?.strict_instructions ? `MANDATORY style rules (must obey strictly): ${style.strict_instructions}` : '',
      style?.style_config?.imageGeneration?.prompt_style ? `Aesthetic DNA: ${style.style_config.imageGeneration.prompt_style}` : '',
      styleRefs.length ? 'Style reference images are attached AFTER the face/logo. Match their visual DNA closely: photo treatment, color contrast, crop language, typography attitude, editorial finish, pacing.' : '',
    ].filter(Boolean).join('\n');

    const unifiedPrompt = `Create a finished, premium Instagram ${brief.contentType === 'carousel' ? 'carousel cover' : 'single post'} about: "${brief.topic}".

CREATIVE GOAL:
- ONE original, specific campaign concept tied directly to this topic.
- NOT a generic stock scene, not a generic laptop-on-desk, not random office props.
- The visual must immediately communicate the topic and value proposition.
- Editorial, magazine-grade finish. Premium typography in PORTUGUÊS BRASILEIRO.
- BE BOLD with composition: unexpected angles, dynamic poses, editorial staging.
- 🚫 NEVER replicate the face reference photo's pose, framing, clothing, or background. The face reference is ONLY for identity — the entire scene must be reinvented from scratch like a fresh photoshoot directed for this exact topic.
- Reserve a clean text safe-area (top OR bottom third) for the headline — text must never overlap the face.

${brand}
${colors}
${audienceLine}
${toneLine}
${artDirection}
${faceLine}
${logoLine}

STYLE GUIDANCE:
${styleRules || 'Modern editorial aesthetic with strong typographic hierarchy.'}

TYPOGRAPHY (MANDATORY TEXT CONTENT):
- Language: PORTUGUÊS BRASILEIRO with perfect spelling.
${brief.suggested_content && brief.suggested_content.length > 0 ? `
- USE EXATAMENTE ESTE TEXTO APROVADO PELO USUÁRIO:
  ${brief.suggested_content.map((c, i) => `[Card ${i + 1}]
  Título: ${c.title || ''}
  Subtítulo: ${c.subtitle || ''}
  Corpo: ${c.body || ''}`).join('\n')}
` : `
- Headline / hook: short, powerful, max 7 words.
- Optional supporting line: max 12 words.
`}
- Place text in a clean safe area; never cover the person's face.
- Typography must feel editorial, bold, on-brand for the selected style.

OUTPUT:
- Aspect ratio: ${ratio}.
- No watermarks. No fake handles. No nonsense placeholder text.
- Single, polished, ready-to-publish image.

NON-NEGOTIABLE CHECKLIST:
1. Concept must be unique and clearly tied to the topic.
2. Must obey the marketplace style references (if attached).
3. Must include the real person from the face reference (if attached).
4. Must include the brand logo subtly (if attached).
5. Must use the brand palette (if provided).
6. All text must be legible and in correct Portuguese.`;

    // === Build multimodal payload ===
    const content: any[] = [{ type: 'text', text: unifiedPrompt }];
    if (faceData) content.push({ type: 'image_url', image_url: { url: faceData } });
    for (const f of additionalFaces) content.push({ type: 'image_url', image_url: { url: f } });
    if (logoData) content.push({ type: 'image_url', image_url: { url: logoData } });
    for (const l of additionalLogos) content.push({ type: 'image_url', image_url: { url: l } });
    for (const ref of styleRefs) content.push({ type: 'image_url', image_url: { url: ref } });

    console.log('chat-compose-final: single-pass generation', {
      topic: brief.topic,
      ratio,
      hasFace: !!faceData,
      hasLogo: !!logoData,
      styleRefs: styleRefs.length,
      style: style?.name,
    });

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error('compose AI gateway error:', resp.status, t);
      return new Response(JSON.stringify({ error: 'Falha ao gerar o post' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalImage = await extractImageUrl(resp);
    if (!finalImage) {
      return new Response(JSON.stringify({ error: 'A IA não retornou imagem.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === Persist ===
    // === Persist ===
    const cards = brief.suggested_content && brief.suggested_content.length > 0
      ? brief.suggested_content.map((c, i) => ({
          type: i === 0 ? 'cover' : 'body',
          title: c.title,
          subtitle: c.subtitle,
          body: c.body,
          imageUrl: i === 0 ? finalImage : null,
          isAiImage: i === 0,
          layout: 'dark',
        }))
      : [{
          type: 'cover',
          title: brief.topic,
          imageUrl: finalImage,
          isAiImage: true,
          layout: 'dark',
        }];
    
    const carouselData = { title: brief.topic, cards };

    // Validate that the marketplace style actually exists before referencing it
    let validStyleId: string | null = null;
    if (isUuid(brief.styleId)) {
      const { data: styleRow } = await sb
        .from('marketplace_styles')
        .select('id')
        .eq('id', brief.styleId)
        .maybeSingle();
      if (styleRow?.id) validStyleId = styleRow.id;
    }

    const { data: inserted, error: insertErr } = await sb
      .from('generated_carousels')
      .insert({
        company_id: companyId,
        user_id: user.id,
        title: brief.topic,
        topic: brief.topic,
        keywords: [],
        carousel_data: carouselData,
        style_config: {
          source: 'chat-creator',
          format: brief.format,
          styleName: brief.styleName,
          brandColors: brief.brandColors,
        },
        card_count: 1,
        marketplace_style_id: validStyleId,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('insert carousel error:', insertErr);
      return new Response(JSON.stringify({ error: 'Falha ao salvar o post.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Offload cover upload + DB updates to the background to stay under the
    // edge function CPU budget. The frontend already has `finalImage` to render.
    const carouselId = inserted.id;
    const bgWork = (async () => {
      try {
        // 1. Consume credits
        const creditCost = brief.hasFace ? 5 : 2;
        await sb.rpc('consume_ai_credits', {
          p_company_id: companyId,
          p_agent_id: null,
          p_amount: creditCost,
          p_description: `Post assistente: ${brief.topic} — ${creditCost} créditos`,
        });

        // 2. Upload cover + update DB
        const coverUrl = await uploadCover(sb, companyId, carouselId, finalImage);
        if (coverUrl) {
          await sb.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', carouselId);
          const updatedCards = [...cards];
          updatedCards[0] = { ...updatedCards[0], imageUrl: coverUrl };
          await sb.from('generated_carousels').update({
            carousel_data: { title: brief.topic, cards: updatedCards },
          }).eq('id', carouselId);
        }
      } catch (err) {
        console.error('background background task failed:', err);
      }
    })();

    // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(bgWork);
    }

    return new Response(
      JSON.stringify({ carouselId, imageUrl: finalImage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (e) {
    console.error('chat-compose-final error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
