// Analyzes selected user posts and creates a private marketplace style
// with auto-generated positive/negative prompts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization' }, 401);
    }
    if (!LOVABLE_API_KEY) {
      return json({ error: 'LOVABLE_API_KEY not configured' }, 500);
    }

    // Auth: derive user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const carouselIds: string[] = Array.isArray(body?.carouselIds) ? body.carouselIds.slice(0, 20) : [];
    const name: string = String(body?.name || '').trim().slice(0, 80);
    const description: string = String(body?.description || '').trim().slice(0, 500);
    const coverUrl: string | null = body?.coverUrl ? String(body.coverUrl) : null;

    if (!name || carouselIds.length === 0) {
      return json({ error: 'name and carouselIds required' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch selected carousels (only user's own)
    const { data: carousels, error: cErr } = await admin
      .from('generated_carousels')
      .select('id, title, topic, cover_url, carousel_data, style_config, user_id')
      .in('id', carouselIds);
    if (cErr) throw cErr;

    const owned = (carousels || []).filter((c: any) => c.user_id === userId);
    if (owned.length === 0) return json({ error: 'No owned carousels selected' }, 403);

    // Collect preview images: cover_url first, else first card
    const previewImages: string[] = [];
    for (const c of owned) {
      const cover = c.cover_url && !String(c.cover_url).startsWith('data:') ? c.cover_url : null;
      const first = (c.carousel_data as any)?.cards?.[0]?.imageUrl;
      const img = cover || (first && !String(first).startsWith('data:') ? first : null);
      if (img) previewImages.push(img);
    }
    const uniquePreviews = Array.from(new Set(previewImages)).slice(0, 8);

    // Compose vision analysis prompt
    const imageContent = uniquePreviews.slice(0, 6).map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));

    const systemMsg =
      'Você é um diretor de arte especialista em identidade visual. Analise as imagens de referência e gere um resumo de estilo que possa ser reutilizado para criar novos posts com a mesma linguagem visual. Responda APENAS em JSON válido.';

    const userMsg = [
      {
        type: 'text',
        text:
          `Nome do estilo: ${name}\n` +
          (description ? `Descrição: ${description}\n` : '') +
          `Contexto dos posts:\n` +
          owned.map((c: any, i: number) => `${i + 1}. ${c.title || c.topic || 'sem título'}`).join('\n') +
          `\n\nGere um JSON com este formato exato:\n` +
          `{\n` +
          `  "positive_prompt": "descrição detalhada em inglês do estilo visual (paleta, tipografia, composição, textura, mood, iluminação, tratamento de imagem). 60-120 palavras.",\n` +
          `  "negative_prompt": "elementos visuais que devem ser EVITADOS neste estilo, em inglês, separados por vírgula. Ex: cluttered, low contrast, cartoon, watermark, ...",\n` +
          `  "category": "uma categoria curta em minúsculo (ex: editorial, minimal, retro, luxury, brutalist, tech, organic)",\n` +
          `  "tags": ["3 a 6 tags curtas em minúsculo"],\n` +
          `  "summary_pt": "resumo curto em português (1 frase) do que caracteriza o estilo"\n` +
          `}`,
      },
      ...imageContent,
    ];

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ error: 'Rate limit — tente novamente em instantes.' }, 429);
      if (aiRes.status === 402) return json({ error: 'Créditos de IA esgotados.' }, 402);
      return json({ error: `AI error: ${txt.slice(0, 200)}` }, 500);
    }

    const aiJson = await aiRes.json();
    let analysis: any = {};
    try {
      analysis = JSON.parse(aiJson?.choices?.[0]?.message?.content || '{}');
    } catch {
      analysis = {};
    }

    const positive_prompt = String(analysis.positive_prompt || '').slice(0, 2000);
    const negative_prompt = String(analysis.negative_prompt || '').slice(0, 1000);
    const category = String(analysis.category || 'custom').toLowerCase().slice(0, 40);
    const tags: string[] = Array.isArray(analysis.tags)
      ? analysis.tags.map((t: any) => String(t).toLowerCase()).slice(0, 8)
      : [];
    const summary_pt = String(analysis.summary_pt || description || '').slice(0, 500);

    // Build the style config used elsewhere in the app
    const style_config = {
      positive_prompt,
      negative_prompt,
      summary: summary_pt,
      source: 'user_generated_from_projects',
      source_carousel_ids: owned.map((c: any) => c.id),
    };

    const finalCover = coverUrl || uniquePreviews[0] || null;
    const previewList = finalCover
      ? [finalCover, ...uniquePreviews.filter((u) => u !== finalCover)].slice(0, 6)
      : uniquePreviews.slice(0, 6);

    const { data: inserted, error: insErr } = await admin
      .from('marketplace_styles')
      .insert({
        name,
        description: description || summary_pt || null,
        preview_images: previewList,
        price_credits: 0,
        price_brl: 0,
        category,
        style_config,
        strict_instructions: positive_prompt,
        tags,
        is_active: true,
        is_free: true,
        is_private: true,
        owner_id: userId,
      } as any)
      .select('id, name, description, preview_images, category, is_private, owner_id')
      .single();

    if (insErr) throw insErr;

    return json({ ok: true, style: inserted, analysis: { positive_prompt, negative_prompt, category, tags, summary_pt } });
  } catch (err: any) {
    console.error('create-style-from-posts error', err);
    return json({ error: err?.message || 'unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
