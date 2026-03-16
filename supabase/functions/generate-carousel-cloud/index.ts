// Cloud-based carousel generation orchestrator
// Runs the entire carousel generation (text + images) server-side
// Uses parallel image generation in batches for speed

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function updateJob(jobId: string, updates: Record<string, any>) {
  const sb = adminClient();
  await sb.from('carousel_generation_jobs').update(updates).eq('id', jobId);
}

// Call the existing generate-carousel-image edge function internally
async function generateOneImage(params: Record<string, any>): Promise<string | null> {
  const url = `${SUPABASE_URL}/functions/v1/generate-carousel-image`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000); // 45s per image max
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text();
      console.error('Image gen error:', res.status, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.success ? data.imageUrl : null;
  } catch (e) {
    console.error('Image gen exception:', e);
    return null;
  }
}

// Call generate-carousel for text content
async function generateTextContent(params: Record<string, any>): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/generate-carousel`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'generate-content', ...params }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Text generation failed: ${res.status} - ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data?.success) throw new Error(data?.error || 'Text generation failed');
  return data.data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // CRITICAL: startTime per-request, NOT at module load
  const startTime = Date.now();
  const MAX_EXECUTION_MS = 130_000; // 130s budget (Supabase allows ~150s)
  function timeLeft() { return MAX_EXECUTION_MS - (Date.now() - startTime); }

  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = adminClient();
    const { data: job, error: jobErr } = await sb
      .from('carousel_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a single-post job
    const styleConfig = job.style_config || {};
    const isSinglePost = styleConfig.contentMode === 'single-post' || job.card_count === 1;

    // Idempotency: if another invocation already finished this job, return success instead of 409
    if (job.status === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        alreadyCompleted: true,
        carouselId: job.carousel_id || null,
        jobId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atomic claim to prevent two concurrent invocations from processing the same job
    const claimedStatus = isSinglePost ? 'generating_images' : 'generating_text';
    const claimedMessage = isSinglePost ? '🎨 Gerando post único...' : 'Gerando conteúdo do carrossel...';
    const { data: claimedJob, error: claimErr } = await sb
      .from('carousel_generation_jobs')
      .update({ status: claimedStatus, progress_message: claimedMessage })
      .eq('id', jobId)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle();

    if (claimErr) {
      throw claimErr;
    }

    if (!claimedJob) {
      const { data: currentJob } = await sb
        .from('carousel_generation_jobs')
        .select('status, carousel_id, error_message')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'completed') {
        return new Response(JSON.stringify({
          success: true,
          alreadyCompleted: true,
          carouselId: currentJob.carousel_id || null,
          jobId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        alreadyStarted: true,
        status: currentJob?.status || job.status,
        error: 'Job already started',
      }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isSinglePost) {
      // === SINGLE POST MODE: Generate one image directly ===
      await updateJob(jobId, { status: 'generating_images', progress_message: '🎨 Gerando post único...' });

      const faceRefUrls = (job.face_ref_urls || []) as string[];
      const styleRefUrls = ((job.reference_images || []) as any[]).filter((r: any) => r.category === 'style').map((r: any) => r.url);
      const productRefUrls = job.product_context ? (() => { try { const pc = JSON.parse(job.product_context); return pc.productImageUrls || []; } catch { return []; } })() : [];
      const marketplaceStyle = job.marketplace_style_config;
      const imageSettings = job.image_settings || {};
      const brandColors = (imageSettings.brandColors as string[] | undefined) || [];

      const marketplaceRefUrls: string[] = [];
      if (marketplaceStyle?._previewImages?.length) {
        const allPreviews = (marketplaceStyle._previewImages as string[]).filter((p: string) => p.startsWith('http'));
        // Send ALL preview images for maximum style fidelity
        for (const preview of allPreviews) {
          marketplaceRefUrls.push(preview);
        }
      }
      const allStyleRefs = [...new Set([...styleRefUrls, ...marketplaceRefUrls])];

      // === STYLE DNA ANALYSIS for single post ===
      let singlePromptStyle = marketplaceStyle?.imageGeneration?.prompt_style || '';
      const singleDetailedSections = (singlePromptStyle.match(/===\s+\w/g) || []).length;
      const isSingleGeneric = allStyleRefs.length > 0 && (!singlePromptStyle || singlePromptStyle.length < 200 || singleDetailedSections < 4);
      if (isSingleGeneric && allStyleRefs.length > 0 && timeLeft() > 60_000) {
        console.log('Single-post: Detected generic prompt — running AI visual DNA analysis...');
        await updateJob(jobId, { progress_message: '🔍 Analisando DNA visual do estilo...' });
        try {
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          const analysisContent: any[] = [];
          for (const ref of allStyleRefs.slice(0, 4)) {
            analysisContent.push({ type: 'image_url', image_url: { url: ref } });
          }
          analysisContent.push({ type: 'text', text: `Analyze these Instagram post reference images and describe their EXACT visual DNA in detail. Also COUNT the approximate number of characters used in titles and body text across the references.

Return ONLY a JSON object:
{"background":"exact bg description","typography":"exact font style","layout":"exact layout","colors_hex":["#hex1","#hex2"],"color_roles":"role of each color","decorative":"decorative elements","photo_treatment":"photo style","mood":"2-3 word mood","signature":"most distinctive feature","text_limits":{"title_max_chars":50,"body_max_chars":120,"has_subtitle":true,"subtitle_max_chars":60}}

For text_limits: count the AVERAGE number of visible characters in titles, body text, and subtitles across ALL reference images. This is critical for maintaining visual fidelity — too much text will break the layout.
Be EXTREMELY specific. No markdown, pure JSON only.` });

          const dnaRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: analysisContent }] }),
          });
          if (dnaRes.ok) {
            const dnaData = await dnaRes.json();
            const dnaText = dnaData?.choices?.[0]?.message?.content || '';
            const cleaned = dnaText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const dna = JSON.parse(cleaned);
            // Extract text limits for single post
            const singleTextLimits = dna.text_limits || {};
            const textLimitHint = singleTextLimits.title_max_chars 
              ? `\n\n=== TEXT LENGTH LIMITS (from style analysis) ===\nTitle: max ${singleTextLimits.title_max_chars} characters\nSubtitle: max ${singleTextLimits.subtitle_max_chars || 60} characters\nIMPORTANT: Keep ALL text within these limits to match the style's visual density.`
              : '';
            singlePromptStyle = `Create an Instagram post with MAXIMUM FIDELITY to the reference style.\n\n=== BACKGROUND ===\n${dna.background}\n\n=== TYPOGRAPHY ===\n${dna.typography}\n\n=== LAYOUT ===\n${dna.layout}\n\n=== COLORS (MANDATORY) ===\n${(dna.colors_hex || []).join(', ')} — ${dna.color_roles}\n\n=== DECORATIVE ===\n${dna.decorative}\n\n=== PHOTO ===\n${dna.photo_treatment}\n\n=== MOOD: ${dna.mood} ===\n=== SIGNATURE: ${dna.signature} ===${textLimitHint}\n\nRULES: NÃO copie @handles/marcas. Texto em PORTUGUÊS BRASILEIRO. Full bleed. Deve parecer da MESMA SÉRIE que as referências.`;
          }
        } catch (dnaErr) { console.error('Single-post DNA analysis failed:', dnaErr); }
      }

      const promptParts: string[] = [];
      promptParts.push('IDIOMA OBRIGATÓRIO: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO correto e fluente.');
      const manualText = styleConfig.manualPostText;
      if (manualText) {
        promptParts.push(`TEXTO EXATO PARA A IMAGEM (use APENAS este texto, sem adicionar nada): "${manualText}"`);
        promptParts.push('REGRA ABSOLUTA: Renderize APENAS o texto exato fornecido acima. NÃO adicione subtítulos, tópicos, bullet points extras.');
        promptParts.push(`CONTEXTO VISUAL (NÃO adicione na imagem): ${job.topic}`);
      } else {
        promptParts.push(`TEMA: "${job.topic}"`);
      }
      promptParts.push('POST ÚNICO para Instagram (1080x1350). UMA composição editorial completa. Full bleed total, ZERO bordas.');
      // NOTE: Logo/brand is overlaid programmatically via Canvas — do NOT mention brand name in prompt
      promptParts.push('PROIBIDO RENDERIZAR LOGOMARCA: NÃO renderize NENHUM nome de marca, logotipo, logo ou texto de branding na imagem. A logomarca será sobreposta automaticamente pelo sistema. Deixe a área do logo LIMPA e SEM TEXTO.');
      const isMarketplaceStyle = !!singlePromptStyle;
      if (!isMarketplaceStyle && brandColors.length > 0) promptParts.push(`PALETA DE CORES DA MARCA: ${brandColors.join(', ')}.`);

      const finalPrompt = singlePromptStyle 
        ? `${singlePromptStyle}\n\n${promptParts.join('\n')}`
        : promptParts.join('\n');

      const facePersonsMeta = imageSettings.facePersonsMetadata;

      const imageUrl = await generateOneImage({
        prompt: finalPrompt,
        topic: job.topic,
        faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
        styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
        referenceImageUrls: productRefUrls.length > 0 ? productRefUrls : undefined,
        imageModel: imageSettings.model || 'auto',
        negativePrompt: marketplaceStyle?.imageGeneration?.negative_prompt || 'Do NOT copy exact faces from reference images',
        fidelity: imageSettings.fidelity || 'balanced',
        facePersonsMetadata: facePersonsMeta && facePersonsMeta.length > 1 ? facePersonsMeta : undefined,
        ...(singlePromptStyle ? { stylePrompt: singlePromptStyle } : {}),
        ...(!isMarketplaceStyle && brandColors.length > 0 ? { brandColors } : {}),
      });

      if (!imageUrl) {
        await updateJob(jobId, { status: 'failed', error_message: 'Não foi possível gerar a imagem do post', completed_at: new Date().toISOString() });
        return new Response(JSON.stringify({ error: 'Image generation failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const singleCard = { type: 'cover', title: job.topic, subtitle: manualText || undefined, imageUrl, isAiImage: true, layout: 'dark' };
      const finalData = { title: job.topic, cards: [singleCard] };

      // Save to generated_carousels
      const { data: inserted } = await sb.from('generated_carousels').insert({
        company_id: job.company_id, user_id: job.user_id, title: job.topic, topic: job.topic,
        keywords: [], carousel_data: finalData, style_config: styleConfig, card_count: 1,
        marketplace_style_id: job.marketplace_style_id || null,
      }).select('id').single();

      await updateJob(jobId, { status: 'completed', carousel_data: finalData, carousel_id: inserted?.id || null, completed_at: new Date().toISOString(), progress_message: '✅ Post gerado!' });
      return new Response(JSON.stringify({ success: true, carouselId: inserted?.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === CAROUSEL MODE (multi-card) ===
    // === STEP 1: Generate text content ===
    await updateJob(jobId, { status: 'generating_text', progress_message: 'Gerando conteúdo do carrossel...' });

    const cardCount = job.card_count || 10;
    const faceRefUrls_pre = (job.face_ref_urls || []) as string[];
    const hasFaceRefs = faceRefUrls_pre.length > 0;
    
    // Use imageCardCount from job if available, otherwise default logic
    const jobImageCardCount = job.image_card_count;
    const effectiveImageCardCount = hasFaceRefs ? cardCount : (jobImageCardCount ?? Math.ceil(cardCount * 0.6));
    
    const imageCardIndices: number[] = [0]; // cover always gets image
    const contentIndices = Array.from({ length: cardCount - 2 }, (_, i) => i + 1);
    const shuffled = contentIndices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(effectiveImageCardCount - 1, shuffled.length); i++) {
      imageCardIndices.push(shuffled[i]);
    }
    
    // Face distribution: which cards get the user's face
    const jobFaceCardCount = job.face_card_count;
    const faceCardIndices = new Set<number>();
    if (hasFaceRefs) {
      const defaultFaceCount = jobFaceCardCount != null ? jobFaceCardCount : Math.max(1, Math.round(cardCount * 0.25));
      const effectiveFaceCount = Math.min(defaultFaceCount, cardCount);
      faceCardIndices.add(0); // cover always gets face
      if (effectiveFaceCount >= cardCount) {
        for (let fi = 0; fi < cardCount; fi++) faceCardIndices.add(fi);
      } else {
        const remaining = effectiveFaceCount - 1;
        if (remaining > 0) {
          const middleIndices = Array.from({ length: cardCount - 1 }, (_, fi) => fi + 1);
          const step = middleIndices.length / remaining;
          for (let fi = 0; fi < remaining && fi < middleIndices.length; fi++) {
            faceCardIndices.add(middleIndices[Math.min(Math.floor(fi * step), middleIndices.length - 1)]);
          }
        }
      }
    }

    let textData: any;
    try {
      textData = await generateTextContent({
        topic: job.topic,
        keywords: job.keywords ? job.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
        cardCount,
        imageCardIndices: imageCardIndices.sort((a: number, b: number) => a - b),
        brandName: job.brand_name || '',
        userName: job.user_name || '',
        ...(job.web_search_content ? { webSearchContent: JSON.parse(job.web_search_content) } : {}),
        ...(job.web_search_citations ? { webSearchCitations: job.web_search_citations } : {}),
        ...(job.product_context ? { productContext: job.product_context.startsWith('EXTREME_VISION:') ? job.product_context : JSON.parse(job.product_context) } : {}),
        ...(job.marketplace_style_config ? { marketplaceStyleConfig: job.marketplace_style_config } : {}),
      });
    } catch (e: any) {
      await updateJob(jobId, { status: 'failed', error_message: e.message, completed_at: new Date().toISOString() });
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawCleanTopic = textData?.clean_topic || job.topic.split('\n')[0].trim();
    // Strip brand name from topic used in image prompts to prevent AI from rendering it as text
    const brandNameToStrip = job.brand_name?.trim();
    const cleanTopic = brandNameToStrip 
      ? rawCleanTopic.replace(new RegExp(`\\(?@?${brandNameToStrip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)?`, 'gi'), '').replace(/\s{2,}/g, ' ').trim()
      : rawCleanTopic;
    // Assign layouts
    const cards = textData.cards.map((c: any, i: number) => {
      if (c.type === 'cover') return { ...c, layout: 'dark' };
      if (c.type === 'cta') return { ...c, layout: 'accent' };
      const layouts = ['dark', 'dark', 'light', 'accent', 'dark'];
      return { ...c, layout: layouts[(i - 1) % layouts.length] };
    });

    // === STEP 2: Generate images in PARALLEL batches ===
    await updateJob(jobId, {
      status: 'generating_images',
      progress_current: 0,
      progress_total: cards.length,
      progress_message: 'Gerando imagens...',
      carousel_data: { ...textData, cards },
    });

    const marketplaceStyle = job.marketplace_style_config;
    let promptStyle = marketplaceStyle?.imageGeneration?.prompt_style || '';
    const isFullBleed = !!promptStyle;
    const styleNeg = marketplaceStyle?.imageGeneration?.negative_prompt || '';
    const baseNeg = styleNeg || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
    const styleRecommendsNoFaces = !!marketplaceStyle?.recommended_no_faces;
    const hasFaceRefsForCarousel = faceRefUrls.length > 0;
    const antiFaceNeg = styleRecommendsNoFaces
      ? 'Do NOT include any human faces, people, portraits, selfies, headshots, or human figures. This style is purely typographic/graphic. Focus ONLY on typography, graphic elements, objects, and editorial compositions.'
      : hasFaceRefsForCarousel
      ? 'Do NOT copy faces from the STYLE REFERENCE images. ONLY use the face from the FACE REFERENCE photos provided separately. The face identity comes EXCLUSIVELY from the face reference photos.'
      : 'Do NOT copy the exact faces or identities of people from the reference images. Use different people with varied appearances. Only copy the visual design style, layout, typography and color scheme.';

    const refImages = job.reference_images || [];
    const faceRefUrls = (job.face_ref_urls || []) as string[];
    const styleRefUrls = (refImages as any[]).filter((r: any) => r.category === 'style').map((r: any) => r.url);
    const imageSettings = job.image_settings || {};

    const marketplaceRefUrls: string[] = [];
    if (isFullBleed && marketplaceStyle?._previewImages?.length) {
      const allPreviews = (marketplaceStyle._previewImages as string[]).filter((p: string) => p.startsWith('http'));
      for (const preview of allPreviews) {
        marketplaceRefUrls.push(preview);
      }
    }
    const allStyleRefs = [...new Set([...styleRefUrls, ...marketplaceRefUrls])];

    // === STYLE DNA ANALYSIS: Enhance prompts that lack detailed visual specifications ===
    // Trigger DNA analysis if the prompt has fewer than 3 detailed sections OR is the old generic template
    const detailedSectionCount = (promptStyle.match(/===\s+\w/g) || []).length;
    const isGenericPrompt = allStyleRefs.length > 0 && (
      !promptStyle || 
      promptStyle.length < 200 ||
      (promptStyle.includes('EXACTLY replicates') && detailedSectionCount < 3) ||
      detailedSectionCount < 4
    );
    if (isGenericPrompt && allStyleRefs.length > 0 && timeLeft() > 60_000) {
      console.log('Detected generic prompt_style — running AI visual DNA analysis...');
      await updateJob(jobId, { progress_message: '🔍 Analisando DNA visual do estilo...' });
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const analysisContent: any[] = [];
        // Send up to 6 reference images for thorough analysis
        for (const ref of allStyleRefs.slice(0, 6)) {
          analysisContent.push({ type: 'image_url', image_url: { url: ref } });
        }
        analysisContent.push({ type: 'text', text: `You are a visual design analyst. Analyze these Instagram post reference images and extract their EXACT visual DNA. Be hyper-specific — I need to recreate this EXACT style for new content.

Also COUNT the approximate number of characters used in titles and body text across the references. This is critical for maintaining visual fidelity.

Return ONLY a JSON object:
{
  "background": "EXACT background (e.g. 'dark navy blue #1a1f3a solid with subtle grid pattern overlay at 10% opacity' NOT just 'dark background')",
  "typography_main": "EXACT main title font (e.g. 'bold condensed sans-serif, all-caps, white #ffffff, with subtle drop shadow, ~80pt equivalent, tracking -2%' NOT just 'bold text')",
  "typography_secondary": "EXACT secondary text style (e.g. 'light serif italic, cream #d4b896, ~24pt, normal tracking')",
  "text_boxes": "EXACT text box/label styles if present (e.g. 'solid gold #c4a265 rectangles with 8px padding, dark navy text inside, slight rounded corners 4px')",
  "layout": "EXACT layout structure (e.g. 'title top 30%, photo center 40%, text box bottom 20%, left-aligned with 5% margin')",
  "colors_hex": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "color_roles": "EXACT role (e.g. '#1a1f3a=background, #ffffff=titles, #c4a265=accents/boxes, #8a7a65=secondary text')",
  "decorative": "EXACT decorative elements (e.g. 'thin gold #c4a265 corner brackets/frames, hand-drawn arrow swooshes in gold, circle arrow icon at bottom center')",
  "photo_treatment": "EXACT photo treatment (e.g. 'desaturated 60%, slight blue tint, high contrast, cinematic grain')",
  "mood": "2-3 word mood",
  "signature": "THE most distinctive visual element that makes this style instantly recognizable",
  "text_limits": {
    "cover_title_max_chars": 40,
    "cover_subtitle_max_chars": 60,
    "content_body_top_max_chars": 150,
    "content_body_bottom_max_chars": 100,
    "cta_title_max_chars": 30,
    "cta_body_max_chars": 50
  }
}

For text_limits: count the AVERAGE number of visible characters per text block across ALL reference images. Measure what actually fits in the layout at the font sizes used. If a block type doesn't exist in references, set to 0. This ensures generated text fits the visual layout perfectly.
No markdown, pure JSON only.` });

        const dnaRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: analysisContent }],
          }),
        });

        if (dnaRes.ok) {
          const dnaData = await dnaRes.json();
          const dnaText = dnaData?.choices?.[0]?.message?.content || '';
          const cleaned = dnaText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const dna = JSON.parse(cleaned);
          console.log('Visual DNA analyzed:', JSON.stringify(dna).slice(0, 500));

          // Extract text character limits from DNA analysis
          const dnaTextLimits = dna.text_limits || {};
          if (dnaTextLimits.cover_title_max_chars) {
            console.log('Text limits from DNA:', JSON.stringify(dnaTextLimits));
            // Store in marketplace style config so it gets passed to text generation
            if (marketplaceStyle) {
              marketplaceStyle._textLimits = dnaTextLimits;
            }
          }

          // Build enhanced prompt_style — CONCISE but hyper-specific
          const textLimitSection = dnaTextLimits.cover_title_max_chars
            ? `\nTEXT LENGTH LIMITS (MANDATORY — from style reference analysis):
- Cover title: max ${dnaTextLimits.cover_title_max_chars} chars
- Cover subtitle: max ${dnaTextLimits.cover_subtitle_max_chars || 60} chars  
- Content bodyTop: max ${dnaTextLimits.content_body_top_max_chars || 150} chars
- Content bodyBottom: max ${dnaTextLimits.content_body_bottom_max_chars || 100} chars
- CTA title: max ${dnaTextLimits.cta_title_max_chars || 30} chars
Keep text within these limits to match the style's visual density.`
            : '';

          promptStyle = `REPLICATE THIS EXACT VISUAL STYLE (from the reference images):

BACKGROUND: ${dna.background}
MAIN TYPOGRAPHY: ${dna.typography_main || dna.typography}
SECONDARY TEXT: ${dna.typography_secondary || 'Match from references'}
TEXT BOXES/LABELS: ${dna.text_boxes || 'None — match references'}
LAYOUT: ${dna.layout}
COLORS (USE ONLY THESE): ${(dna.colors_hex || []).join(', ')} — ${dna.color_roles}
DECORATIVE ELEMENTS: ${dna.decorative}
PHOTO TREATMENT: ${dna.photo_treatment}
SIGNATURE: ${dna.signature}${textLimitSection}

RULES: Full bleed, português brasileiro, NÃO copie @handles/nomes. O resultado DEVE ser INDISTINGUÍVEL da mesma coleção.`;

          // Update the marketplace style config in the job for consistency
          if (marketplaceStyle?.imageGeneration) {
            marketplaceStyle.imageGeneration.prompt_style = promptStyle;
          }
        }
      } catch (dnaErr) {
        console.error('DNA analysis failed (continuing with generic prompt):', dnaErr);
      }
    }

    // Extract brandColors once before the loop
    const brandColors = (imageSettings.brandColors as string[] | undefined) || [];

    // Build all image generation tasks
    // Extract facePersonsMeta once before the loop
    const facePersonsMeta = imageSettings.facePersonsMetadata;
    const isMultiPerson = facePersonsMeta && Array.isArray(facePersonsMeta) && facePersonsMeta.length > 1;

    interface ImageTask { index: number; prompt: string; negPrompt: string; cardGetsFace: boolean; }
    const imageTasks: ImageTask[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const shouldGenImage = isFullBleed || card.needsImage || card.type === 'cover' || card.type === 'cta' || imageCardIndices.includes(i);
      if (!shouldGenImage) continue;

      // Determine if this card should have the user's face
      const cardGetsFace = hasFaceRefsForCarousel && faceCardIndices.has(i);

      let imgPrompt: string;
      if (isFullBleed) {
        // === SIMPLIFIED FULLBLEED PROMPT ===
        // Keep it SHORT — the reference images are the primary instruction.
        // Only include: card type, text content, brand, language.
        const isCover = card.type === 'cover' || i === 0;
        const isCta = card.type === 'cta' || i === cards.length - 1;
        const parts: string[] = [];
        parts.push(`Texto em PORTUGUÊS BRASILEIRO. Tema: "${cleanTopic}".`);
        parts.push('REGRA OBRIGATÓRIA: ZERO bordas, ZERO molduras, ZERO frames. A imagem deve ser FULL BLEED total, sangrar de ponta a ponta.');
        parts.push('PROIBIDO COPIAR TEXTOS DAS REFERÊNCIAS: NÃO copie títulos, nomes de estilos, categorias ou qualquer texto visível nas imagens de referência. Use EXCLUSIVAMENTE os textos fornecidos neste prompt.');
        
        // Logo/brand — overlaid programmatically, do NOT mention brand name to avoid AI rendering it
        parts.push('PROIBIDO RENDERIZAR LOGOMARCA: NÃO renderize NENHUM nome de marca, logotipo, logo ou texto de branding na imagem. A logomarca será sobreposta automaticamente pelo sistema.');

        if (isCover) {
          parts.push(`CAPA (card 1/${cards.length}). Título: "${card.title || cleanTopic}".`);
          if (card.subtitle) parts.push(`Subtítulo: "${card.subtitle}".`);
          if (cardGetsFace) parts.push('INCLUA a pessoa das fotos de referência facial neste card.');
        } else if (isCta) {
          parts.push(`CTA FINAL (card ${i + 1}/${cards.length}).`);
          if (card.title) parts.push(`Título: "${card.title}".`);
          if (card.body) parts.push(`Texto: "${card.body}".`);
        } else {
          parts.push(`Conteúdo (card ${i + 1}/${cards.length}).`);
          const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
          if (bodyText) parts.push(`Texto: "${bodyText}".`);
          if (card.bodyBottom) parts.push(`Secundário: "${card.bodyBottom}".`);
          if (cardGetsFace) parts.push('INCLUA a pessoa das fotos de referência facial neste card.');
        }
        // Cards without face: add topic-relevant image instruction
        if (!cardGetsFace && hasFaceRefsForCarousel) {
          parts.push('NÃO inclua pessoas humanas neste card. Use elementos visuais, objetos, ícones ou cenários relacionados ao tema.');
        }
        imgPrompt = parts.join(' ');
      } else {
        imgPrompt = `${cleanTopic}: ${card.imagePrompt || card.title || card.bodyTop || ''}`;
      }

      // Build final prompt — keep it simple for fullbleed
      const promptParts = [];
      if (isFullBleed) {
        promptParts.push(imgPrompt);
      } else if (promptStyle) {
        promptParts.push(promptStyle);
        if (marketplaceStyle?.imageGeneration?.prompt_prefix) promptParts.push(marketplaceStyle.imageGeneration.prompt_prefix);
        promptParts.push(`CONTENT FOR THIS CARD: ${imgPrompt}`);
      } else {
        promptParts.push('Professional photograph');
        promptParts.push(imgPrompt);
      }
      if (!isFullBleed) {
        promptParts.push('4:5 portrait aspect ratio, 1080x1350px, ultra high resolution');
        promptParts.push('Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');
      }
      promptParts.push('CRITICAL: ZERO borders, ZERO frames, ZERO margins. Full bleed edge to edge.');

      // Face attributes
      if (cardGetsFace && isMultiPerson && facePersonsMeta) {
        promptParts.push(`${facePersonsMeta.length} pessoas distintas com rostos diferentes.`);
      } else if (cardGetsFace) {
        const fg = imageSettings.faceGender;
        if (fg === 'male') promptParts.push('Pessoa MASCULINA.');
        else if (fg === 'female') promptParts.push('Pessoa FEMININA.');
        if (imageSettings.wearsGlasses) promptParts.push('Usando óculos.');
      }
      // Cards that should NOT have faces
      if (!cardGetsFace && hasFaceRefsForCarousel && !styleRecommendsNoFaces) {
        promptParts.push('NO HUMANS, NO PEOPLE, NO PORTRAITS, NO FACES in this card. Use objects, icons, abstract elements, or scenery related to the topic instead.');
      }
      // Brand colors only when NOT using marketplace style
      if (brandColors.length > 0 && !isFullBleed && !marketplaceStyle) {
        promptParts.push(`Cores da marca: ${brandColors.join(', ')}.`);
      }

      const finalPrompt = promptParts.filter(Boolean).join(' ');
      // For fullbleed, minimal negative prompt — let the refs guide
      const negPrompt = isFullBleed 
        ? [antiFaceNeg, 'no borders, no frames, no margins, no white border, no picture frame'].filter(Boolean).join(', ')
        : [baseNeg, job.negative_prompt, 'no borders, no frames, no margins'].filter(Boolean).join(', ');

      imageTasks.push({ index: i, prompt: finalPrompt, negPrompt, cardGetsFace });
    }

    // === DIAGNOSTIC LOG ===
    console.log('=== CAROUSEL IMAGE GENERATION ===');
    console.log('Style refs:', allStyleRefs.length, 'Face refs:', faceRefUrls.length);
    console.log('isFullBleed:', isFullBleed, 'promptStyle length:', promptStyle.length);
    console.log('Total image tasks:', imageTasks.length, '/', cards.length, 'cards');
    if (imageTasks.length > 0) {
      console.log('Sample prompt (card 0):', imageTasks[0].prompt.slice(0, 300));
    }

    // === AI QUALITY GATE: Validate generated image for defects ===
    async function validateImage(imageUrl: string, hasFace: boolean): Promise<{ pass: boolean; issues: string }> {
      if (timeLeft() < 25_000) return { pass: true, issues: '' }; // skip if low on time
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const checkContent: any[] = [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: `Analyze this Instagram carousel card image for quality defects. Check for:
1. BORDERS/FRAMES: Does the image have visible borders, white edges, picture frames, or margins around it? (should be full bleed)
2. UNWANTED TEXT: Does it contain "Arraste para o lado", "Swipe", navigation instructions, or metadata text that shouldn't be there?
3. LAYOUT: Is there a "picture within a picture" effect where the actual content is framed inside a larger canvas?

Return ONLY a JSON: {"pass": true} if the image is clean, or {"pass": false, "issues": "brief description"} if defects found.
Be strict about borders — even thin white/gray edges count as a fail. JSON only, no markdown.` }
        ];
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash-lite', messages: [{ role: 'user', content: checkContent }] }),
        });
        if (!res.ok) return { pass: true, issues: '' };
        const data = await res.json();
        const text = (data?.choices?.[0]?.message?.content || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(text);
        return { pass: !!result.pass, issues: result.issues || '' };
      } catch {
        return { pass: true, issues: '' }; // on error, assume pass
      }
    }

    // Process images in parallel batches of 3
    const BATCH_SIZE = 3;
    let timedOut = false;
    let completedCount = 0;

    for (let batchStart = 0; batchStart < imageTasks.length; batchStart += BATCH_SIZE) {
      if (timeLeft() < 20_000) {
        console.warn(`Wall-clock guard at batch ${batchStart}/${imageTasks.length}, ${timeLeft()}ms left`);
        timedOut = true;
        break;
      }

      const batch = imageTasks.slice(batchStart, batchStart + BATCH_SIZE);

      await updateJob(jobId, {
        progress_current: completedCount,
        progress_message: `🎨 Gerando imagens ${completedCount + 1}-${Math.min(completedCount + batch.length, imageTasks.length)} de ${imageTasks.length}...`,
      });

      // Fire all images in this batch in parallel
      const results = await Promise.all(batch.map(async (task) => {
        // Each task gets up to 2 attempts
        for (let attempt = 0; attempt < 2; attempt++) {
          if (timeLeft() < 15_000) return { index: task.index, url: null };
          if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
          const url = await generateOneImage({
            prompt: task.prompt,
            topic: task.prompt.slice(0, 200),
            faceReferenceUrls: task.cardGetsFace && faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            imageModel: imageSettings.model || 'auto',
            negativePrompt: task.negPrompt,
            fidelity: task.cardGetsFace ? 'high' : (isFullBleed ? 'high' : (marketplaceStyle?.imageGeneration?.fidelity || imageSettings.fidelity || 'balanced')),
            facePersonsMetadata: task.cardGetsFace && isMultiPerson ? facePersonsMeta : undefined,
            ...(isFullBleed && promptStyle ? { stylePrompt: promptStyle } : {}),
            ...(!isFullBleed && !marketplaceStyle && brandColors.length > 0 ? { brandColors } : {}),
          });
          if (url) {
            // === QUALITY GATE: Validate before accepting ===
            if (isFullBleed && timeLeft() > 30_000) {
              const validation = await validateImage(url, task.cardGetsFace);
              if (!validation.pass) {
                console.warn(`⚠️ Quality gate FAILED card ${task.index}: ${validation.issues} — regenerating...`);
                // Retry with stronger anti-defect prompt
                const fixedPrompt = task.prompt + '\n\nCRITICAL FIX: The previous generation had defects: ' + validation.issues + '. You MUST fix these. ABSOLUTELY ZERO borders, frames, margins, or picture-in-picture effects. The image must be PURE FULL BLEED filling every pixel edge to edge.';
                const retryUrl = await generateOneImage({
                  prompt: fixedPrompt,
                  topic: task.prompt.slice(0, 200),
                  faceReferenceUrls: task.cardGetsFace && faceRefUrls.length > 0 ? faceRefUrls : undefined,
                  styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
                  imageModel: imageSettings.model || 'auto',
                  negativePrompt: task.negPrompt + ', no borders, no frames, no white edges, no picture frame',
                  fidelity: task.cardGetsFace ? 'high' : 'high',
                  facePersonsMetadata: task.cardGetsFace && isMultiPerson ? facePersonsMeta : undefined,
                  ...(isFullBleed && promptStyle ? { stylePrompt: promptStyle } : {}),
                });
                if (retryUrl) return { index: task.index, url: retryUrl };
                // If retry also fails, use original
              }
            }
            return { index: task.index, url };
          }
        }
        return { index: task.index, url: null };
      }));

      // Apply results to cards
      for (const r of results) {
        if (r.url) {
          cards[r.index] = { ...cards[r.index], imageUrl: r.url, isAiImage: true };
        }
        completedCount++;
      }

      // Update progress with latest card data
      await updateJob(jobId, {
        progress_current: completedCount,
        carousel_data: { ...textData, cards },
      });

      // Small delay between batches (not between individual images)
      if (batchStart + BATCH_SIZE < imageTasks.length && timeLeft() > 20_000) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // If timed out, mark as failed for fallback
    if (timedOut) {
      const imagesGenerated = cards.filter((c: any) => c.imageUrl).length;
      await updateJob(jobId, {
        status: 'failed',
        error_message: `Tempo limite atingido. ${imagesGenerated}/${cards.length} imagens geradas.`,
        carousel_data: { ...textData, cards },
        completed_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: 'timeout', imagesGenerated, total: cards.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === STEP 3: Save to generated_carousels ===
    const finalCarouselData = { ...textData, cards };
    const savedStyleConfig = job.style_config || {};

    const { data: inserted, error: insertErr } = await sb.from('generated_carousels').insert({
      company_id: job.company_id,
      user_id: job.user_id,
      title: finalCarouselData.title || job.topic,
      topic: job.topic,
      keywords: job.keywords ? job.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
      carousel_data: finalCarouselData,
      style_config: savedStyleConfig,
      card_count: cards.length,
      marketplace_style_id: job.marketplace_style_id || null,
    }).select('id').single();

    if (insertErr) {
      console.error('Failed to save carousel:', insertErr);
      await updateJob(jobId, { status: 'failed', error_message: 'Falha ao salvar: ' + insertErr.message, completed_at: new Date().toISOString() });
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save cover image
    const coverImageUrl = cards[0]?.imageUrl;
    if (inserted?.id && coverImageUrl?.startsWith('data:')) {
      try {
        const base64Data = coverImageUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const coverPath = `${job.company_id}/${inserted.id}/cover.jpg`;
        const { error: uploadErr } = await sb.storage.from('covers').upload(coverPath, bytes.buffer, {
          contentType: 'image/jpeg', upsert: true,
        });
        if (!uploadErr) {
          const { data: urlData } = sb.storage.from('covers').getPublicUrl(coverPath);
          if (urlData?.publicUrl) {
            await sb.from('generated_carousels').update({ cover_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', inserted.id);
          }
        }
      } catch (coverErr) {
        console.error('Cover upload error:', coverErr);
      }
    }

    // Consume credits based on generation rules
    // Simples = 1 cr/card, Avançado = 2 cr/card, Avançado+Rosto = 4 cr/card, +1 pesquisa
    try {
      const wizardMode = job.image_settings?.wizardMode || 'simple';
      const hasFace = (job.face_ref_urls && Array.isArray(job.face_ref_urls) && job.face_ref_urls.length > 0);
      const perCard = wizardMode === 'simple' ? 1 : (hasFace ? 4 : 2);
      const creditAmount = (cards.length * perCard) + 1; // +1 for web search
      await sb.rpc('consume_ai_credits', {
        p_company_id: job.company_id,
        p_agent_id: null,
        p_amount: creditAmount,
        p_description: `Carrossel (${wizardMode}): ${finalCarouselData.title || job.topic} (${cards.length} cards) — ${creditAmount} créditos`,
      });
    } catch (creditErr) {
      console.error('Credit consumption failed:', creditErr);
    }

    // Mark completed
    await updateJob(jobId, {
      status: 'completed',
      progress_current: cards.length,
      progress_total: cards.length,
      progress_message: 'Carrossel gerado com sucesso!',
      carousel_id: inserted?.id,
      carousel_data: finalCarouselData,
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, carouselId: inserted?.id, jobId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Cloud generation error:', err);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.jobId) {
        await updateJob(body.jobId, { status: 'failed', error_message: err.message || 'Erro interno', completed_at: new Date().toISOString() });
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
