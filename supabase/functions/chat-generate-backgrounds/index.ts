// Generates 2 background image options for the chat creator pipeline.
// Uses Gemini 3 Pro Image (premium quality) to produce two distinct moods.
// Returns base64 data URLs that the chat displays for the user to pick.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface Brief {
  topic?: string;
  format?: 'portrait' | 'square' | 'story';
  styleId?: string | null;
  styleName?: string | null;
  hasFace?: boolean;
  hasLogo?: boolean;
  brandColors?: string[];
  audience?: string;
  tone?: string;
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
  } catch (err) {
    console.error('style image fetch error:', err);
    return null;
  }
}

const isUuid = (value?: string | null) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function getStyleContext(styleId?: string | null) {
  if (!isUuid(styleId)) return null;

  try {
    const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/marketplace_styles?id=eq.${styleId}&select=name,description,preview_images,strict_instructions,style_config`, {
      headers: {
        apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
      },
    });

    if (!resp.ok) {
      console.error('style context fetch failed:', resp.status, await resp.text());
      return null;
    }

    const rows = await resp.json();
    return rows?.[0] || null;
  } catch (err) {
    console.error('style context fetch error:', err);
    return null;
  }
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: '4:5',
  square: '1:1',
  story: '9:16',
};

async function generateBackground(prompt: string, ratio: string, styleRefs: string[] = []): Promise<string | null> {
  try {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{
      type: 'text',
      text: `${prompt}

IMPORTANT: aspect ratio ${ratio}. NO text, NO words, NO logos, NO captions in the image. Pure visual scene/background only — text will be added later.`,
    }];

    for (const ref of styleRefs) {
      content.push({ type: 'image_url', image_url: { url: ref } });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!resp.ok) {
      console.error('Background gen failed:', resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url || null;
  } catch (err) {
    console.error('Background gen error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { brief } = (await req.json()) as { brief: Brief };
    const topic = (brief?.topic || '').trim();
    if (!topic) {
      return new Response(JSON.stringify({ error: 'topic é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief?.format || 'portrait'] || '4:5';
    const style = await getStyleContext(brief?.styleId);
    const styleReferenceUrls = Array.isArray(style?.preview_images) ? style.preview_images.slice(0, 3) : [];
    const styleReferenceDataUrls = (await Promise.all(styleReferenceUrls.map(urlToDataUrl))).filter(Boolean) as string[];
    const palette = brief?.brandColors?.length
      ? `Use a color palette inspired by: ${brief.brandColors.join(', ')}.`
      : 'Use a modern, editorial color palette.';
    const styleHint = [
      brief?.styleName ? `Visual reference style: "${brief.styleName}".` : '',
      style?.description ? `Style description: ${style.description}` : '',
      style?.strict_instructions ? `Mandatory style rules: ${style.strict_instructions}` : '',
      style?.style_config?.imageGeneration?.prompt_style ? `Aesthetic DNA: ${style.style_config.imageGeneration.prompt_style}` : '',
      Array.isArray(style?.preview_images) && style.preview_images.length
        ? 'Use the attached style reference images as a hard visual target for color, photography treatment, crop language, contrast, and composition rhythm.'
        : '',
    ].filter(Boolean).join('\n');
    const audienceHint = brief?.audience ? `Target audience: ${brief.audience}.` : '';
    const toneHint = brief?.tone ? `Tone: ${brief.tone}.` : '';
    const identityHint = [
      brief?.hasFace ? 'Reserve composition space for integrating the person later; do not place a generic anonymous model.' : '',
      brief?.hasLogo ? 'Leave a subtle brand-safe corner or anchor point for a logo later.' : '',
    ].filter(Boolean).join(' ');

    // Two distinct visual directions so the user has a real choice
    const promptA = `Editorial high-end social media background image for an Instagram post about: "${topic}".
Direction A — CINEMATIC & MOODY: dramatic lighting, rich shadows, depth, atmospheric, premium magazine feel.
${styleHint} ${palette}
${audienceHint} ${toneHint} ${identityHint}
Scene direction: the image must visually communicate the topic, not a generic workspace or stock setup. Build one singular concept that someone would immediately associate with this theme, product, promise, or transformation.
If the topic is about AI creation, content production, brand growth, automation, or marketing, create a distinctive branded campaign scene rather than a random laptop-on-desk shot.
Composition: leave clean negative space where text will be placed later, but keep the focal concept dominant and specific.
No text, no logos, no captions, no watermark, no mockup device unless directly relevant to the topic.`;

    const promptB = `Editorial high-end social media background image for an Instagram post about: "${topic}".
Direction B — BRIGHT & MINIMAL: clean, airy, soft natural light, modern minimal composition, refined and elegant.
${styleHint} ${palette}
${audienceHint} ${toneHint} ${identityHint}
Scene direction: the image must visually communicate the topic, not a generic desk or random objects. Build one unique concept tied directly to the subject, service, benefit, or emotional outcome.
If the topic is about AI creation, content production, brand growth, automation, or marketing, create a polished editorial campaign scene with symbolic elements specific to the promise.
Composition: large negative space for text overlay later, but do not let the image become empty or generic.
No text, no logos, no captions, no watermark, no mockup device unless directly relevant to the topic.`;

    console.log('chat-generate-backgrounds: generating 2 options', { topic, ratio });

    const [optionA, optionB] = await Promise.all([
      generateBackground(promptA, ratio, styleReferenceDataUrls),
      generateBackground(promptB, ratio, styleReferenceDataUrls),
    ]);

    if (!optionA && !optionB) {
      return new Response(JSON.stringify({ error: 'Falha ao gerar fundos. Tente novamente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        backgrounds: [
          optionA ? { id: 'a', label: 'Cinematográfico', url: optionA } : null,
          optionB ? { id: 'b', label: 'Minimalista', url: optionB } : null,
        ].filter(Boolean),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('chat-generate-backgrounds error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
