// Generates the FINAL Instagram post in a single Gemini 3 Pro Image call.
// Mirrors the advanced wizard flow: capture all references (face, logo, style,
// brand colors, instructions, topic) and send them together so the model
// produces a finished, coherent, on-brand post in one pass.
// Persists the result to generated_carousels and returns carousel id + url.

import { createClient } from 'npm:@supabase/supabase-js@2';

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
  faceUrl?: string;
  logoUrl?: string;
  audience?: string;
  tone?: string;
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
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
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

    // === Resolve all reference assets in parallel ===
    const [faceData, logoData, ...styleRefDataUrls] = await Promise.all([
      brief.hasFace && brief.faceUrl
        ? (brief.faceUrl.startsWith('data:') ? Promise.resolve(brief.faceUrl) : urlToDataUrl(brief.faceUrl))
        : Promise.resolve(null),
      brief.hasLogo && brief.logoUrl
        ? (brief.logoUrl.startsWith('data:') ? Promise.resolve(brief.logoUrl) : urlToDataUrl(brief.logoUrl))
        : Promise.resolve(null),
      ...(Array.isArray(style?.preview_images) ? style.preview_images.slice(0, 4).map(urlToDataUrl) : []),
    ]);
    const styleRefs = styleRefDataUrls.filter(Boolean) as string[];

    // === Build the unified prompt (single pass) ===
    const colors = brief.brandColors?.length ? `Brand palette: ${brief.brandColors.join(', ')}.` : '';
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : '';
    const audienceLine = brief.audience ? `Target audience: ${brief.audience}.` : '';
    const toneLine = brief.tone ? `Tone of voice: ${brief.tone}.` : '';
    const faceLine = faceData
      ? `A face reference photo is attached — USE IT ONLY FOR FACIAL IDENTITY (face shape, eyes, nose, mouth, skin tone, hair, age, ethnicity, gender). DO NOT copy the pose, framing, expression, lighting, background, clothing, crop, or camera angle from the reference. Reinvent the scene completely:
- New POSE (different body angle, hands, head tilt — never frontal mugshot unless the concept demands it)
- New EXPRESSION fitting the topic emotion (confident, thoughtful, laughing, in-action, looking away, etc.)
- New CAMERA ANGLE (3/4 profile, low angle, over-the-shoulder, wide editorial, candid lifestyle…)
- New ENVIRONMENT / BACKGROUND tied to the topic concept
- New CLOTHING / STYLING fitting the brand and concept
- New LIGHTING (cinematic, natural, studio, neon — whatever the concept asks)
The reference is a face ID card, NOT a composition template. Be bold and creative with the staging while keeping the person 100% recognizable. Always leave clean negative space (top OR bottom third) for the headline text — never cover the face with text.`
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
- BE BOLD with composition: unexpected angles, dynamic poses, editorial staging. Never replicate the reference photo's pose/framing — reinvent the scene every time.
- Reserve a clean text safe-area (top OR bottom third) for the headline — text must never overlap the face.

${brand}
${colors}
${audienceLine}
${toneLine}
${faceLine}
${logoLine}

STYLE GUIDANCE:
${styleRules || 'Modern editorial aesthetic with strong typographic hierarchy.'}

TYPOGRAPHY (text rendered inside the image):
- Language: PORTUGUÊS BRASILEIRO with perfect spelling.
- Headline / hook: short, powerful, max 7 words.
- Optional supporting line: max 12 words.
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
    if (logoData) content.push({ type: 'image_url', image_url: { url: logoData } });
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
    const card = {
      type: 'cover',
      title: brief.topic,
      imageUrl: finalImage,
      isAiImage: true,
      layout: 'dark',
    };
    const carouselData = { title: brief.topic, cards: [card] };

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
        marketplace_style_id: isUuid(brief.styleId) ? brief.styleId : null,
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

    const coverUrl = await uploadCover(sb, companyId, inserted.id, finalImage);
    if (coverUrl) {
      await sb.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', inserted.id);
      const updatedCards = [{ ...card, imageUrl: coverUrl }];
      await sb.from('generated_carousels').update({
        carousel_data: { title: brief.topic, cards: updatedCards },
      }).eq('id', inserted.id);
    }

    return new Response(
      JSON.stringify({ carouselId: inserted.id, imageUrl: coverUrl || finalImage }),
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
