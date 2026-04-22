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

async function getCompanyId(sb: any, userId: string): Promise<string | null> {
  const { data } = await sb
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.company_id || null;
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

    // === Build the multimodal edit prompt ===
    const colors = brief.brandColors?.length
      ? `Brand palette: ${brief.brandColors.join(', ')}.`
      : '';
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : '';
    const faceLine = brief.hasFace && brief.faceUrl
      ? `Include the person from the attached face reference photo, integrated naturally into the scene with high facial fidelity.`
      : '';
    const logoLine = brief.hasLogo && brief.logoUrl
      ? `Place the attached logo subtly in a corner (small, balanced, not intrusive).`
      : '';

    const editPrompt = `Take this background image and turn it into a finished, premium Instagram post about: "${brief.topic}".

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

Aspect ratio: ${ratio}.
Style: high-end editorial Instagram post — magazine quality.
Do NOT add watermarks. Keep the original background composition; only add the text and (optionally) the logo/face.`;

    // Build content array with all reference images
    const content: any[] = [{ type: 'text', text: editPrompt }];
    content.push({ type: 'image_url', image_url: { url: backgroundUrl } });

    if (brief.hasFace && brief.faceUrl) {
      const faceData = brief.faceUrl.startsWith('data:') ? brief.faceUrl : await urlToDataUrl(brief.faceUrl);
      if (faceData) content.push({ type: 'image_url', image_url: { url: faceData } });
    }
    if (brief.hasLogo && brief.logoUrl) {
      const logoData = brief.logoUrl.startsWith('data:') ? brief.logoUrl : await urlToDataUrl(brief.logoUrl);
      if (logoData) content.push({ type: 'image_url', image_url: { url: logoData } });
    }

    console.log('chat-compose-final: composing', {
      topic: brief.topic,
      ratio,
      refs: content.length - 1,
    });

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview', // Nano Banana 2 — strong on text + edits
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
        marketplace_style_id: brief.styleId || null,
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
