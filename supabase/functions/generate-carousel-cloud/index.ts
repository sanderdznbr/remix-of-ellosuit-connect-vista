// Cloud-based carousel generation orchestrator
// Runs the entire carousel generation (text + images) server-side
// so it survives connection drops and browser closures

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
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
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'generate-content', ...params }),
  });
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

  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch job details
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

    // Assign layouts to cards
    const cards = textData.cards.map((c: any, i: number) => {
      if (c.type === 'cover') return { ...c, layout: 'dark' };
      if (c.type === 'cta') return { ...c, layout: 'accent' };
      const layouts = ['dark', 'dark', 'light', 'accent', 'dark'];
      return { ...c, layout: layouts[(i - 1) % layouts.length] };
    });

    // === STEP 2: Generate images ===
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
    const cleanTopic = job.topic.split('\n')[0].trim();

    // Parse reference images
    const refImages = job.reference_images || [];
    const faceRefUrls = (job.face_ref_urls || []) as string[];
    const styleRefUrls = (refImages as any[]).filter((r: any) => r.category === 'style').map((r: any) => r.url);
    const imageSettings = job.image_settings || {};

    // Build marketplace preview refs
    const marketplaceRefUrls: string[] = [];
    if (isFullBleed && marketplaceStyle?._previewImages?.length) {
      const allPreviews = (marketplaceStyle._previewImages as string[]).filter((p: string) => p.startsWith('http'));
      if (allPreviews.length > 0) marketplaceRefUrls.push(allPreviews[0]);
      if (allPreviews.length > 2) marketplaceRefUrls.push(allPreviews[Math.floor(allPreviews.length / 2)]);
      if (allPreviews.length > 4) marketplaceRefUrls.push(allPreviews[Math.min(4, allPreviews.length - 1)]);
    }

    const allStyleRefs = [...styleRefUrls, ...marketplaceRefUrls];

    // Generate images sequentially (cover first, then content, then CTA)
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const shouldGenImage = isFullBleed || card.needsImage || card.type === 'cover' || card.type === 'cta' || imageCardIndices.includes(i);

      if (!shouldGenImage) {
        await updateJob(jobId, { progress_current: i + 1 });
        continue;
      }

      await updateJob(jobId, {
        progress_current: i,
        progress_message: `Gerando imagem ${i + 1} de ${cards.length}...`,
      });

      // Build prompt
      let imgPrompt: string;
      if (isFullBleed) {
        const isCover = card.type === 'cover' || i === 0;
        const isCta = card.type === 'cta' || i === cards.length - 1;
        const parts: string[] = [];
        parts.push(`IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.`);
        parts.push(`TEMA: "${cleanTopic}"`);
        parts.push(`PROIBIDO: NÃO copie @handles, nomes de empresas ou informações pessoais das referências.`);
        parts.push(`SEM BORDAS: Full bleed, sem barras no topo ou base.`);

        if (isCover) {
          parts.push(`CARD DE CAPA (1 de ${cards.length}).`);
          parts.push(`TÍTULO: "${card.title || cleanTopic}"`);
          if (card.subtitle) parts.push(`SUBTÍTULO: "${card.subtitle}"`);
          parts.push(`Estilo capa de revista, tipografia grande e impactante.`);
        } else if (isCta) {
          parts.push(`CARD FINAL DE CTA (${i + 1} de ${cards.length}).`);
          if (card.title) parts.push(`TÍTULO: "${card.title}"`);
          if (card.body) parts.push(`TEXTO: "${card.body}"`);
        } else {
          parts.push(`CARD DE CONTEÚDO ${i + 1} de ${cards.length}.`);
          const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
          if (bodyText) parts.push(`TEXTO PRINCIPAL: "${bodyText}"`);
          if (card.bodyBottom) parts.push(`TEXTO SECUNDÁRIO: "${card.bodyBottom}"`);
          parts.push(`Layout editorial variado — NÃO estilo capa/hero.`);
        }
        imgPrompt = parts.join('\n');
      } else {
        imgPrompt = `${cleanTopic}: ${card.imagePrompt || card.title || card.bodyTop || ''}`;
      }

      // Build full prompt with image settings
      const promptParts = [];
      if (marketplaceStyle?.imageGeneration?.prompt_style) {
        promptParts.push(marketplaceStyle.imageGeneration.prompt_style);
        if (marketplaceStyle.imageGeneration?.prompt_prefix) {
          promptParts.push(marketplaceStyle.imageGeneration.prompt_prefix);
        }
        promptParts.push(`CONTENT FOR THIS CARD: ${imgPrompt}`);
      } else {
        promptParts.push('Professional photograph');
        promptParts.push(imgPrompt);
      }
      promptParts.push('4:5 portrait aspect ratio, 1080x1350px, ultra high resolution');
      if (!isFullBleed) promptParts.push('Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');

      const finalPrompt = promptParts.filter(Boolean).join('. ');
      const negPrompt = isFullBleed ? styleNeg : [baseNeg, job.negative_prompt].filter(Boolean).join(', ');

      // Generate with retry
      let imageUrl: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 3000));
          await updateJob(jobId, { progress_message: `Tentativa ${attempt + 1} para imagem ${i + 1}...` });
        }
        imageUrl = await generateOneImage({
          prompt: finalPrompt,
          topic: imgPrompt,
          faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
          styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
          imageModel: imageSettings.model || 'auto',
          negativePrompt: negPrompt,
          fidelity: marketplaceStyle?.imageGeneration?.fidelity || imageSettings.fidelity || 'balanced',
          ...(isFullBleed && marketplaceStyle?.imageGeneration?.prompt_style ? { stylePrompt: marketplaceStyle.imageGeneration.prompt_style } : {}),
        });
        if (imageUrl) break;
      }

      if (imageUrl) {
        cards[i] = { ...cards[i], imageUrl, isAiImage: true };
      }

      // Update progress with latest card data
      await updateJob(jobId, {
        progress_current: i + 1,
        carousel_data: { ...textData, cards },
      });

      // Small delay between images to avoid rate limits
      if (i < cards.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // === STEP 3: Save to generated_carousels ===
    const finalCarouselData = { ...textData, cards };
    const styleConfig = job.style_config || {};

    const { data: inserted, error: insertErr } = await sb.from('generated_carousels').insert({
      company_id: job.company_id,
      user_id: job.user_id,
      title: finalCarouselData.title || job.topic,
      topic: job.topic,
      keywords: job.keywords ? job.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [],
      carousel_data: finalCarouselData,
      style_config: styleConfig,
      card_count: cards.length,
      marketplace_style_id: job.marketplace_style_id || null,
    }).select('id').single();

    if (insertErr) {
      console.error('Failed to save carousel:', insertErr);
      await updateJob(jobId, { status: 'failed', error_message: 'Falha ao salvar carrossel: ' + insertErr.message, completed_at: new Date().toISOString() });
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save cover image (use first card's image)
    const coverImageUrl = cards[0]?.imageUrl;
    if (inserted?.id && coverImageUrl?.startsWith('data:')) {
      try {
        // Convert base64 to blob and upload
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

    // Mark job as completed
    await updateJob(jobId, {
      status: 'completed',
      progress_current: cards.length,
      progress_total: cards.length,
      progress_message: 'Carrossel gerado com sucesso!',
      carousel_id: inserted?.id,
      carousel_data: finalCarouselData,
      completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      carouselId: inserted?.id,
      jobId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Cloud generation error:', err);
    // Try to update the job status if we have a jobId
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.jobId) {
        await updateJob(body.jobId, {
          status: 'failed',
          error_message: err.message || 'Erro interno',
          completed_at: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
