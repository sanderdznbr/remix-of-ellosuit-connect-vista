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
  hasPrints?: boolean;
  faceUrl?: string | string[];
  logoUrl?: string | string[];
  printUrl?: string | string[];
  audience?: string;
  tone?: string;
  imageModel?: 'ello-image-1' | 'chat-gpt-2';
  suggested_content?: Array<{ title?: string; subtitle?: string; body?: string }>;
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: '4:5',
  square: '1:1',
  story: '9:16',
};

const isUuid = (value?: string | null) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

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

    const { brief, cardIndex, images, coverImageUrl } = (await req.json()) as { brief: Brief, cardIndex?: number, images?: string[], coverImageUrl?: string };
    if (!brief?.topic) {
      return new Response(JSON.stringify({ error: 'topic é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief.format || 'portrait'] || '4:5';
    const style = await getStyleContext(sb, brief.styleId);

    // Context strings
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : '';
    const colors = brief.brandColors?.length ? `Brand palette: ${brief.brandColors.join(', ')}.` : '';
    const audienceLine = brief.audience ? `Target audience: ${brief.audience}.` : '';
    const toneLine = brief.tone ? `Tone of voice: ${brief.tone}.` : '';

    // Face / Logo / Prints references
    const faceUrlArray = Array.isArray(brief.faceUrl) ? brief.faceUrl : (brief.faceUrl ? [brief.faceUrl] : []);
    const logoUrlArray = Array.isArray(brief.logoUrl) ? brief.logoUrl : (brief.logoUrl ? [brief.logoUrl] : []);
    const printUrlArray = Array.isArray(brief.printUrl) ? brief.printUrl : (brief.printUrl ? [brief.printUrl] : []);

    // Load up to 2 style preview images for stronger visual DNA reference
    const stylePreviewSlice = Array.isArray(style?.preview_images) ? style.preview_images.slice(0, 2) : [];

    const refsPromise = Promise.all([
      brief.hasFace && faceUrlArray.length > 0 ? Promise.all(faceUrlArray.slice(0, 1).map(urlToDataUrl)) : Promise.resolve([]),
      brief.hasLogo && logoUrlArray.length > 0 ? Promise.all(logoUrlArray.slice(0, 1).map(urlToDataUrl)) : Promise.resolve([]),
      brief.hasPrints && printUrlArray.length > 0 ? Promise.all(printUrlArray.slice(0, 1).map(urlToDataUrl)) : Promise.resolve([]),
      ...stylePreviewSlice.map(urlToDataUrl),
      coverImageUrl ? urlToDataUrl(coverImageUrl) : Promise.resolve(null),
    ]);

    const refsResolved = await refsPromise;
    const facesResolved = refsResolved[0];
    const logosResolved = refsResolved[1];
    const printsResolved = refsResolved[2];
    const styleRefs = refsResolved.slice(3, 3 + stylePreviewSlice.length).filter(Boolean) as string[];
    const coverRef = refsResolved[3 + stylePreviewSlice.length] as string | null;

    const faceData = facesResolved?.[0] || null;
    const logoData = logosResolved?.[0] || null;
    const additionalPrints = printsResolved.filter(Boolean);

    const faceLine = faceData ? `⚠️ FACE REFERENCE ATTACHED. REINVENT THE ENTIRE SCENE. USE FACE IDENTITY ONLY.` : '';
    const logoLine = logoData ? 'Logo is attached. Place subtly in a corner.' : '';
    const printsLine = additionalPrints.length > 0 ? 'Reference screenshots attached. Use for UI context.' : '';

    const styleRules = [
      style?.name ? `Style: "${style.name}".` : '',
      style?.strict_instructions ? `MANDATORY rules: ${style.strict_instructions}` : '',
      styleRefs.length ? `${styleRefs.length} style reference image(s) attached. THESE DEFINE THE VISUAL DNA — match colors, typography, layout, mood, treatment.` : '',
    ].filter(Boolean).join('\n');

    const coverRefLine = coverRef
      ? `⚠️ PREVIOUS COVER IMAGE ATTACHED — IT IS THE VISUAL ANCHOR OF THIS CAROUSEL. This new card MUST look like part of the SAME visual series: SAME color palette, SAME typography family/weights/sizes hierarchy, SAME layout system, SAME mood/treatment/lighting, SAME graphic elements. Continue the editorial DNA. Different content/composition but identical brand language.`
      : '';

    const unifiedPromptTemplate = (idx: number) => {
      const isCover = idx === 0;
      const cardText = brief.suggested_content?.[idx];
      const totalCards = brief.cardCount || brief.suggested_content?.length || 1;
      return `Create a premium Instagram ${isCover ? 'cover (card 1)' : `content card #${idx + 1} of ${totalCards}`} about "${brief.topic}".
Editorial magazine grade. PORTUGUÊS BRASILEIRO.

🚫 ABSOLUTE NO BORDERS / NO FRAMES / NO MARGINS / NO CANVAS TEXT:
- The image MUST be 100% FULL BLEED — fill the entire ${ratio} canvas edge to edge.
- ABSOLUTELY FORBIDDEN: white borders, white frames, white margins, polaroid frames, photo frames, paper edges, card mockups, any framing element around the artwork.
- ABSOLUTELY FORBIDDEN: NEVER use white backgrounds with floating text that looks like a "canvas" or a simple text slide. The background MUST be rich, textured, or photographic.
- The artwork itself IS the entire canvas. NO inner padding/border separating the design from the canvas edge. Background bleeds to all 4 edges.

🎨 VISUAL DNA CONSISTENCY (CRITICAL):
- This is part of a coherent carousel series. ${isCover ? 'Establish the strong visual identity.' : 'STRICTLY MATCH the visual DNA of the cover and previous cards.'}
- Same typography family, weights, hierarchy and treatment as the style references${isCover ? '' : ' and the attached cover'}.
- Same color palette (no new colors introduced per card).
- Same composition logic, photo treatment, decorative elements, lighting mood.
- Text safe area: top/bottom thirds, generous spacing, legible at thumbnail size.

${brand} ${colors} ${audienceLine} ${toneLine}
${faceLine} ${logoLine} ${printsLine}
${styleRules}
${coverRefLine}

TEXT TO RENDER ON THIS CARD: ${cardText
        ? `${cardText.title ? `Title: "${cardText.title}". ` : ''}${cardText.subtitle ? `Subtitle: "${cardText.subtitle}". ` : ''}${cardText.body ? `Body: "${cardText.body}".` : ''}`
        : 'Powerful hook, max 7 words.'}
ASPECT RATIO: ${ratio} (full bleed, no framing). Single polished image, finished and on-brand.`;
    };

    // Mode 1: Finalization (saving all cards to DB)
    if (Array.isArray(images) && images.length > 0) {
      console.log(`chat-compose-final: finalization mode for ${images.length} images`);
      const cards = images.map((img, i) => ({
        type: i === 0 ? 'cover' : 'body',
        title: brief.suggested_content?.[i]?.title,
        subtitle: brief.suggested_content?.[i]?.subtitle,
        body: brief.suggested_content?.[i]?.body,
        imageUrl: img,
        isAiImage: true,
        layout: 'dark',
      }));
      
      let validStyleId: string | null = null;
      if (isUuid(brief.styleId)) {
        const { data: styleRow } = await sb.from('marketplace_styles').select('id').eq('id', brief.styleId).maybeSingle();
        if (styleRow?.id) validStyleId = styleRow.id;
      }

      const { data: inserted, error: insertErr } = await sb.from('generated_carousels').insert({
        company_id: companyId, user_id: user.id, title: brief.topic, topic: brief.topic, keywords: [],
        carousel_data: { title: brief.topic, cards },
        style_config: { source: 'chat-creator', format: brief.format, styleName: brief.styleName, brandColors: brief.brandColors },
        card_count: cards.length, marketplace_style_id: validStyleId,
      }).select('id').single();

      if (insertErr || !inserted) throw new Error('Falha ao salvar post.');
      const carouselId = inserted.id;

      // Offload storage upload + credits
      const bgWork = (async () => {
        try {
          const cost = brief.hasFace ? 5 : 2;
          await sb.rpc('consume_ai_credits', { p_company_id: companyId, p_amount: cost, p_description: `Post assistente: ${brief.topic}` });
          const coverUrl = await uploadCover(sb, companyId, carouselId, images[0]);
          if (coverUrl) {
            await sb.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', carouselId);
            const finalCards = cards.map((c, idx) => idx === 0 ? { ...c, imageUrl: coverUrl } : c);
            await sb.from('generated_carousels').update({ carousel_data: { title: brief.topic, cards: finalCards } }).eq('id', carouselId);
          }
        } catch (e) { console.error('BG Error:', e); }
      })();

      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(bgWork);

      return new Response(JSON.stringify({ carouselId, imageUrl: images[0] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mode 2: Single card generation
    if (typeof cardIndex === 'number') {
      const cardContent = [
        { type: 'text', text: unifiedPromptTemplate(cardIndex) },
        faceData ? { type: 'image_url', image_url: { url: faceData } } : null,
        logoData ? { type: 'image_url', image_url: { url: logoData } } : null,
        ...additionalPrints.slice(0, 1).map(p => ({ type: 'image_url', image_url: { url: p } })),
        ...styleRefs.slice(0, 2).map(ref => ({ type: 'image_url', image_url: { url: ref } })),
        coverRef ? { type: 'image_url', image_url: { url: coverRef } } : null,
      ].filter(Boolean);

      let cardImage: string | null = null;
      let attempts = 0;
      while (attempts < 2 && !cardImage) {
        attempts++;
        try {
          const isGpt2 = brief.imageModel === 'chat-gpt-2';
          const aiModel = isGpt2 ? 'google/gemini-2.5-flash-image' : 'google/gemini-3-pro-image-preview';
          
          const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: aiModel,
              messages: [{ role: 'user', content: cardContent }],
              modalities: ['image', 'text'],
            }),
          });
          if (resp.status === 429) { await new Promise(r => setTimeout(r, 4000)); continue; }
          if (!resp.ok) continue;
          cardImage = await extractImageUrl(resp);
        } catch (e) {}
      }
      if (!cardImage) throw new Error(`Falha no card ${cardIndex+1}`);
      return new Response(JSON.stringify({ imageUrl: cardImage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fallback: Single post or internal sequential
    return new Response(JSON.stringify({ error: 'Nenhum modo de geração definido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('Final error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
