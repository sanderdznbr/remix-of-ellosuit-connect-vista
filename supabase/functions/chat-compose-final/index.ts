// Composes the final social media post by editing the chosen background
// with text + logo + face + brand identity. Uses Nano Banana 2
// (gemini-3.1-flash-image-preview) which excels at edit + text rendering.
// Persists the result to generated_carousels and returns the carousel id + url.

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

// Convert a remote image URL to base64 data URL so we can pass it inline to the edit model.
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

function buildReferenceContent(backgroundUrl: string, style: any, brief: Brief, faceData: string | null, logoData: string | null) {
  const content: any[] = [
    {
      type: 'text',
      text: [
        'REFERENCE MAP:',
        'Image 1 = chosen background base. Keep its composition as the structural starting point.',
        Array.isArray(style?.preview_images) && style.preview_images.length
          ? 'Next images = marketplace style references. Match their visual DNA very closely: photo treatment, crop language, typography attitude, color contrast, pacing, and editorial finish.'
          : null,
        faceData ? 'Face reference image = the exact real person to use. Preserve identity faithfully; never replace with a generic model.' : null,
        logoData ? 'Logo reference image = the exact logo asset to place subtly and cleanly.' : null,
      ].filter(Boolean).join('\n'),
    },
    { type: 'image_url', image_url: { url: backgroundUrl } },
  ];

  if (Array.isArray(style?.preview_images)) {
    for (const refUrl of style.preview_images.slice(0, 4)) {
      content.push({ type: 'image_url', image_url: { url: refUrl } });
    }
  }

  if (faceData) content.push({ type: 'image_url', image_url: { url: faceData } });
  if (logoData) content.push({ type: 'image_url', image_url: { url: logoData } });

  return content;
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

    const { brief, backgroundUrl } = (await req.json()) as { brief: Brief; backgroundUrl: string };
    if (!brief?.topic || !backgroundUrl) {
      return new Response(JSON.stringify({ error: 'topic e backgroundUrl são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief.format || 'portrait'] || '4:5';
    const style = await getStyleContext(sb, brief.styleId);

    // === Build the multimodal edit prompt ===
    const colors = brief.brandColors?.length
      ? `Brand palette: ${brief.brandColors.join(', ')}.`
      : '';
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : '';
    const faceLine = brief.hasFace && brief.faceUrl
      ? `Include the exact person from the attached face reference photo, preserving facial identity, hair, skin tone, age impression, body language energy, and overall likeness with high fidelity. This is mandatory. Never replace with a generic person, never invent another face, and never omit the person.`
      : '';
    const logoLine = brief.hasLogo && brief.logoUrl
      ? `Place the attached logo subtly in a corner (small, balanced, not intrusive).`
      : '';
    const styleRules = [
      style?.name ? `Marketplace style to match: ${style.name}.` : '',
      style?.description ? `Style description: ${style.description}` : '',
      style?.strict_instructions ? `Mandatory style rules: ${style.strict_instructions}` : '',
      style?.style_config?.imageGeneration?.prompt_style ? `Aesthetic DNA: ${style.style_config.imageGeneration.prompt_style}` : '',
      brief.audience ? `Target audience: ${brief.audience}.` : '',
      brief.tone ? `Tone: ${brief.tone}.` : '',
    ].filter(Boolean).join('\n');

    const faceData = brief.hasFace && brief.faceUrl
      ? (brief.faceUrl.startsWith('data:') ? brief.faceUrl : await urlToDataUrl(brief.faceUrl))
      : null;
    const logoData = brief.hasLogo && brief.logoUrl
      ? (brief.logoUrl.startsWith('data:') ? brief.logoUrl : await urlToDataUrl(brief.logoUrl))
      : null;

    const editPrompt = `Take this background image and turn it into a finished, premium Instagram post about: "${brief.topic}".

CREATIVE GOAL:
- The final image must feel like one original campaign idea tailored specifically to this topic.
- Avoid generic social media compositions, generic office props, or stock-like solutions.
- Make the concept immediately communicate the topic and value proposition.
- The final piece must clearly reflect the selected marketplace style, not just any premium aesthetic.
- If a face reference is attached, the real person must be visibly present in the final composition.

OVERLAY TEXT REQUIREMENTS (render the text directly in the image, perfectly legible):
- Headline / hook: a short, powerful Brazilian Portuguese sentence (max 7 words) about the topic
- Optional supporting text (max 12 words) below or beside the headline
- Typography: editorial, modern, bold weights for the headline; respect existing composition negative space
- Strong contrast between text and background (use overlay/shadow if needed for legibility)
- Place text in the cleanest area of the background

${brand}
${colors}
${faceLine}
${logoLine}
${styleRules}

Aspect ratio: ${ratio}.
Style: high-end editorial Instagram post — magazine quality.
Do NOT add watermarks. Keep the original background composition as the base, but evolve it into a specific branded concept; do not simply slap text on top.
Respect the marketplace style language faithfully.

NON-NEGOTIABLE CHECKLIST:
- Do not output a generic stock-looking scene.
- Do not ignore the attached style references.
- Do not ignore the attached face reference when present.
- Do not invent a different person.
- Build a unique concept tied directly to the topic instead of a vague AI or workspace visual.`;

    const content = [
      { type: 'text', text: editPrompt },
      ...buildReferenceContent(backgroundUrl, style, brief, faceData, logoData),
    ];

    console.log('chat-compose-final: composing', {
      topic: brief.topic,
      ratio,
      refs: content.length - 1,
      hasFace: !!faceData,
      hasStyleRefs: Array.isArray(style?.preview_images) && style.preview_images.length > 0,
    });

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-image-2',
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
      return new Response(JSON.stringify({ error: 'Falha ao compor o post' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const finalImage: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!finalImage) {
      console.error('compose: no image in response', JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: 'A IA não retornou imagem.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === Persist to generated_carousels so user can open / edit later ===
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

    // Upload cover (base64 → covers bucket) and update cover_url
    const coverUrl = await uploadCover(sb, companyId, inserted.id, finalImage);
    if (coverUrl) {
      await sb.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', inserted.id);
      // Replace inline base64 with the public URL inside carousel_data so the editor loads quickly
      const updatedCards = [{ ...card, imageUrl: coverUrl }];
      await sb.from('generated_carousels').update({
        carousel_data: { title: brief.topic, cards: updatedCards },
      }).eq('id', inserted.id);
    }

    return new Response(
      JSON.stringify({
        carouselId: inserted.id,
        imageUrl: coverUrl || finalImage,
      }),
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
