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
  brandColors?: string[];
  audience?: string;
  tone?: string;
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: '4:5',
  square: '1:1',
  story: '9:16',
};

async function generateBackground(prompt: string, ratio: string): Promise<string | null> {
  try {
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
            content: `${prompt}\n\nIMPORTANT: aspect ratio ${ratio}. NO text, NO words, NO logos, NO captions in the image. Pure visual scene/background only — text will be added later.`,
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
    const palette = brief?.brandColors?.length
      ? `Use a color palette inspired by: ${brief.brandColors.join(', ')}.`
      : 'Use a modern, editorial color palette.';
    const styleHint = brief?.styleName
      ? `Visual reference style: "${brief.styleName}".`
      : '';

    // Two distinct visual directions so the user has a real choice
    const promptA = `Editorial high-end social media background image for an Instagram post about: "${topic}".
Direction A — CINEMATIC & MOODY: dramatic lighting, rich shadows, depth, atmospheric, premium magazine feel.
${styleHint} ${palette}
Composition: leave clean negative space (top-center or bottom) where text will be placed later.
No people faces unless the topic requires it. No text, no logos.`;

    const promptB = `Editorial high-end social media background image for an Instagram post about: "${topic}".
Direction B — BRIGHT & MINIMAL: clean, airy, soft natural light, modern minimal composition, refined and elegant.
${styleHint} ${palette}
Composition: large negative space for text overlay later.
No people faces unless the topic requires it. No text, no logos.`;

    console.log('chat-generate-backgrounds: generating 2 options', { topic, ratio });

    const [optionA, optionB] = await Promise.all([
      generateBackground(promptA, ratio),
      generateBackground(promptB, ratio),
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
