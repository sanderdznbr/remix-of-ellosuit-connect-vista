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

    if (job.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Job already started', status: job.status }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a single-post job
    const styleConfig = job.style_config || {};
    const isSinglePost = styleConfig.contentMode === 'single-post' || job.card_count === 1;

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
      if (job.brand_name) promptParts.push(`MARCA: Inclua "${job.brand_name}" como texto pequeno.`);
      const isMarketplaceStyle = !!marketplaceStyle?.imageGeneration?.prompt_style;
      if (!isMarketplaceStyle && brandColors.length > 0) promptParts.push(`PALETA DE CORES DA MARCA: ${brandColors.join(', ')}.`);

      const finalPrompt = marketplaceStyle?.imageGeneration?.prompt_style 
        ? `${marketplaceStyle.imageGeneration.prompt_style}\n\n${promptParts.join('\n')}`
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
        ...(marketplaceStyle?.imageGeneration?.prompt_style ? { stylePrompt: marketplaceStyle.imageGeneration.prompt_style } : {}),
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
    const imageCardIndices: number[] = [0];
    const contentIndices = Array.from({ length: cardCount - 2 }, (_, i) => i + 1);
    const shuffled = contentIndices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(Math.ceil(cardCount * 0.6), shuffled.length); i++) {
      imageCardIndices.push(shuffled[i]);
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
        ...(job.product_context ? { productContext: JSON.parse(job.product_context) } : {}),
        ...(job.marketplace_style_config ? { marketplaceStyleConfig: job.marketplace_style_config } : {}),
      });
    } catch (e: any) {
      await updateJob(jobId, { status: 'failed', error_message: e.message, completed_at: new Date().toISOString() });
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanTopic = textData?.clean_topic || job.topic.split('\n')[0].trim();
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
    const isFullBleed = !!marketplaceStyle?.imageGeneration?.prompt_style;
    const styleNeg = marketplaceStyle?.imageGeneration?.negative_prompt || '';
    const baseNeg = styleNeg || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
    const antiFaceNeg = 'Do NOT copy the exact faces or identities of people from the reference images. Use different people with varied appearances. Only copy the visual design style, layout, typography and color scheme.';

    const refImages = job.reference_images || [];
    const faceRefUrls = (job.face_ref_urls || []) as string[];
    const styleRefUrls = (refImages as any[]).filter((r: any) => r.category === 'style').map((r: any) => r.url);
    const imageSettings = job.image_settings || {};

    const marketplaceRefUrls: string[] = [];
    if (isFullBleed && marketplaceStyle?._previewImages?.length) {
      const allPreviews = (marketplaceStyle._previewImages as string[]).filter((p: string) => p.startsWith('http'));
      // Send ALL preview images for maximum style fidelity
      for (const preview of allPreviews) {
        marketplaceRefUrls.push(preview);
      }
    }
    const allStyleRefs = [...new Set([...styleRefUrls, ...marketplaceRefUrls])];

    // Extract brandColors once before the loop
    const brandColors = (imageSettings.brandColors as string[] | undefined) || [];

    // Build all image generation tasks
    interface ImageTask { index: number; prompt: string; negPrompt: string; }
    const imageTasks: ImageTask[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const shouldGenImage = isFullBleed || card.needsImage || card.type === 'cover' || card.type === 'cta' || imageCardIndices.includes(i);
      if (!shouldGenImage) continue;

      let imgPrompt: string;
      if (isFullBleed) {
        const isCover = card.type === 'cover' || i === 0;
        const isCta = card.type === 'cta' || i === cards.length - 1;
        const parts: string[] = [];
        parts.push(`IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.`);
        parts.push(`TEMA: "${cleanTopic}"`);
        parts.push(`PROIBIDO: NÃO copie @handles, nomes de empresas ou informações pessoais das referências. NÃO COPIE OS ROSTOS OU IDENTIDADES das pessoas nas referências — use pessoas DIFERENTES com aparências variadas.`);
        parts.push(`SEM BORDAS: Full bleed, sem barras no topo ou base.`);
        parts.push(`FIDELIDADE AO ESTILO: As imagens de referência de estilo definem a IDENTIDADE VISUAL OBRIGATÓRIA. Replique EXATAMENTE: paleta de cores, estilo tipográfico, elementos decorativos (linhas, formas, texturas, overlays, gradientes), composição de layout, tratamento fotográfico (filtros, contraste, grain). O resultado DEVE parecer parte da MESMA SÉRIE/COLEÇÃO das referências.`);
        // Logo/brand overlay
        if (job.logo_url && job.brand_name) {
          const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
          const posLabel = posMap[job.logo_position || 'top-left'] || 'canto superior esquerdo';
          parts.push(`LOGOMARCA: Inclua "${job.brand_name}" no ${posLabel} da imagem, sobrepondo o conteúdo de forma sutil e elegante.`);
        } else if (job.brand_name) {
          const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
          const posLabel = posMap[job.logo_position || 'top-left'] || 'canto superior esquerdo';
          parts.push(`MARCA: Inclua "${job.brand_name}" como texto pequeno no ${posLabel} da imagem.`);
        }
        if (isCover) {
          parts.push(`CARD DE CAPA (1 de ${cards.length}).`);
          parts.push(`TÍTULO: "${card.title || cleanTopic}"`);
          if (card.subtitle) parts.push(`SUBTÍTULO: "${card.subtitle}"`);
          parts.push(`Estilo capa de revista, tipografia grande e impactante. SIGA FIELMENTE o estilo visual das referências.`);
        } else if (isCta) {
          parts.push(`CARD FINAL DE CTA (${i + 1} de ${cards.length}).`);
          if (card.title) parts.push(`TÍTULO: "${card.title}"`);
          if (card.body) parts.push(`TEXTO: "${card.body}"`);
        } else {
          parts.push(`CARD DE CONTEÚDO ${i + 1} de ${cards.length}.`);
          const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
          if (bodyText) parts.push(`TEXTO PRINCIPAL: "${bodyText}"`);
          if (card.bodyBottom) parts.push(`TEXTO SECUNDÁRIO: "${card.bodyBottom}"`);
          parts.push(`Layout editorial variado dentro do MESMO SISTEMA VISUAL das referências — NÃO estilo capa/hero. Cada card deve ter variação de layout mas MESMA identidade visual.`);
        }
        imgPrompt = parts.join('\n');
      } else {
        imgPrompt = `${cleanTopic}: ${card.imagePrompt || card.title || card.bodyTop || ''}`;
      }

      const promptParts = [];
      if (marketplaceStyle?.imageGeneration?.prompt_style) {
        promptParts.push(marketplaceStyle.imageGeneration.prompt_style);
        if (marketplaceStyle.imageGeneration?.prompt_prefix) promptParts.push(marketplaceStyle.imageGeneration.prompt_prefix);
        promptParts.push(`CONTENT FOR THIS CARD: ${imgPrompt}`);
      } else {
        promptParts.push('Professional photograph');
        promptParts.push(imgPrompt);
      }
      promptParts.push('4:5 portrait aspect ratio, 1080x1350px, ultra high resolution');
      if (!isFullBleed) promptParts.push('Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');

      // Face attributes from image settings
      const facePersonsMeta = imageSettings.facePersonsMetadata;
      const isMultiPerson = facePersonsMeta && Array.isArray(facePersonsMeta) && facePersonsMeta.length > 1;
      if (faceRefUrls.length > 0 && isMultiPerson) {
        promptParts.push(`MULTIPLE PEOPLE (CRITICAL): This image MUST contain exactly ${facePersonsMeta.length} DISTINCT people with DIFFERENT faces.`);
        facePersonsMeta.forEach((pm: any, idx: number) => {
          const genderDesc = pm.gender === 'male' ? 'MALE with masculine build.' : pm.gender === 'female' ? 'FEMALE with feminine build.' : '';
          const glassesDesc = pm.wearsGlasses ? ' MUST wear glasses.' : '';
          promptParts.push(`${pm.label || `Person ${idx + 1}`}: ${genderDesc}${glassesDesc}`);
        });
      } else if (faceRefUrls.length > 0) {
        const fg = imageSettings.faceGender;
        if (fg === 'male') promptParts.push('The person MUST be MALE with a masculine body.');
        else if (fg === 'female') promptParts.push('The person MUST be FEMALE with a feminine body.');
        if (imageSettings.wearsGlasses) promptParts.push('The person MUST be wearing glasses/eyeglasses.');
      }
      if (brandColors.length > 0) {
        promptParts.push(`PALETA DE CORES DA MARCA: use predominantemente estas cores da marca do cliente: ${brandColors.join(', ')}. Integre essas cores na composição, tipografia e elementos decorativos.`);
      }

      const finalPrompt = promptParts.filter(Boolean).join('. ');
      const negPrompt = isFullBleed ? [styleNeg, antiFaceNeg].filter(Boolean).join(', ') : [baseNeg, job.negative_prompt].filter(Boolean).join(', ');

      imageTasks.push({ index: i, prompt: finalPrompt, negPrompt });
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
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            imageModel: imageSettings.model || 'auto',
            negativePrompt: task.negPrompt,
            fidelity: marketplaceStyle?.imageGeneration?.fidelity || imageSettings.fidelity || 'balanced',
            facePersonsMetadata: isMultiPerson ? facePersonsMeta : undefined,
            ...(isFullBleed && marketplaceStyle?.imageGeneration?.prompt_style ? { stylePrompt: marketplaceStyle.imageGeneration.prompt_style } : {}),
            ...(brandColors && brandColors.length > 0 ? { brandColors } : {}),
          });
          if (url) return { index: task.index, url };
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

    // Consume credits
    try {
      await sb.rpc('consume_ai_credits', {
        p_company_id: job.company_id,
        p_agent_id: null,
        p_amount: cards.length,
        p_description: `Carrossel: ${finalCarouselData.title || job.topic} (${cards.length} cards)`,
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
