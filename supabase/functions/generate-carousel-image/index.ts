// Separate edge function for AI image generation - extracted from generate-carousel
// to reduce CPU usage per invocation and avoid WORKER_LIMIT errors

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { prompt, topic, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, imageModel, negativePrompt, fidelity, stylePrompt, brandColors, editSourceImage, faceGender, facePersonsMetadata, imageSize, panoramic, panoramicCardCount } = body;

    // === FACE REGENERATION MODE (Image Editing) ===
    if (editSourceImage) {
      console.log('Face regeneration mode: editing existing image');
      
      const editContent: any[] = [];
      
      const validFaceRefs: string[] = [];
      if (faceReferenceUrls?.length) {
        for (const ref of faceReferenceUrls.slice(0, 5)) {
          if (ref && (ref.startsWith('http') || ref.startsWith('data:'))) {
            validFaceRefs.push(ref);
            editContent.push({ type: 'image_url', image_url: { url: ref } });
          }
        }
      }
      
      if (validFaceRefs.length > 0) {
        editContent.push({ type: 'text', text: `The ${validFaceRefs.length} image(s) above are FACE REFERENCE PHOTOS of the person whose face must appear in the final result. Study these faces carefully — memorize every facial feature.` });
      }
      
      editContent.push({ type: 'text', text: 'The image below is the SOURCE IMAGE that needs face replacement. Keep its EXACT composition, background, clothing, text, colors, and layout:' });
      editContent.push({ type: 'image_url', image_url: { url: editSourceImage } });
      
      const aspectInstruction = imageSize === '9:16' 
        ? '\n\nOUTPUT FORMAT MANDATORY: You MUST generate an image in PORTRAIT 9:16 aspect ratio (width=1080, height=1920). The image must be TALL and VERTICAL like a phone screen. Do NOT generate a square image. The height must be approximately 1.78x the width. Fill the ENTIRE vertical canvas — NO black bars, NO letterboxing, NO empty space at top or bottom. Generatively EXPAND the scene/background upward and downward to naturally fill the tall vertical frame. The subject should be centered vertically with expanded background above and below.'
        : '';
      editContent.push({ type: 'text', text: prompt + aspectInstruction + '\n\nCRITICAL RULES:\n- Generate a NEW image that is the SOURCE IMAGE but adapted as instructed.\n- Keep ALL text overlays, logos, backgrounds, clothing, body pose, and composition as close to the source as possible.\n- The output MUST fill the entire frame with NO black bars or empty areas.\n- If the output format is 9:16, the image MUST be taller than it is wide (portrait orientation).' });
      
      const editRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: editContent }],
          modalities: ['image', 'text'],
        }),
      });
      
      if (!editRes.ok) {
        const errText = await editRes.text();
        console.error('Face edit error:', editRes.status, errText.slice(0, 300));
        if (editRes.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Falha na edição do rosto.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const raw = await editRes.text();
      const patterns = ['"url":"data:image/', '"url": "data:image/'];
      for (const pattern of patterns) {
        const idx = raw.indexOf(pattern);
        if (idx === -1) continue;
        const urlStart = raw.indexOf('"', idx + 5) + 1;
        const urlEnd = raw.indexOf('"', urlStart);
        if (urlEnd === -1) continue;
        const url = raw.slice(urlStart, urlEnd);
        console.log('Face edit success:', url.length, 'chars');
        return new Response(JSON.stringify({ success: true, imageUrl: url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Não foi possível editar o rosto.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const imagePrompt = prompt || topic || 'abstract background';
    const hasFaceRefs = faceReferenceUrls && faceReferenceUrls.length > 0;
    const hasStyleRefs = styleReferenceUrls && styleReferenceUrls.length > 0;
    const hasGeneralRefs = referenceImageUrls && referenceImageUrls.length > 0;
    const outputAspectRatio = typeof imageSize === 'string' && imageSize.trim() ? imageSize.trim() : '3:4';
    const isPanoramicMode = Boolean(panoramic);
    const panoramicSections = Number.isFinite(Number(panoramicCardCount))
      ? Math.max(2, Number(panoramicCardCount))
      : 2;

    const formatInstruction = (() => {
      if (isPanoramicMode) {
        const totalWidth = panoramicSections * 1080;
        return `CRITICAL PANORAMIC IMAGE: Generate ONE SINGLE ultra-wide panoramic image. Exact dimensions: ${totalWidth}x1350 pixels (aspect ratio ${outputAspectRatio}). The image MUST be MUCH WIDER than it is tall — approximately ${panoramicSections}x wider. This is a HORIZONTAL LANDSCAPE panorama, NOT a portrait. The entire scene must flow continuously from left edge to right edge as ONE unified composition — no divisions, no panels, no separators. Visual elements (backgrounds, scenery, objects, people, gradients) must span seamlessly across the full width. This panorama will be sliced into ${panoramicSections} equal vertical strips, so ensure visual continuity at every potential cut point.`;
      }
      if (outputAspectRatio === '9:16') {
        return 'Formato retrato 9:16 (1080x1920), imagem alta vertical, preenchendo todo o quadro.';
      }
      if (outputAspectRatio === '21:9' || outputAspectRatio === '16:9') {
        return `Formato horizontal ${outputAspectRatio}, ocupando todo o quadro.`;
      }
      if (outputAspectRatio === '3:4') {
        return 'Formato retrato 3:4 (1080x1440).';
      }
      return `Formato ${outputAspectRatio}, preenchendo 100% da imagem.`;
    })();

    // Filter out URLs from domains that block hotlinking
    const BLOCKED_DOMAINS = ['shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'alamy.com', 'depositphotos.com', 'dreamstime.com', '123rf.com', 'stock.adobe.com'];
    const isUrlAccessible = (url: string) => {
      if (!url) return false;
      if (url.startsWith('data:')) return true;
      if (!url.startsWith('http')) return false;
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return !BLOCKED_DOMAINS.some(d => hostname.includes(d));
      } catch { return false; }
    };

    const validFaceRefs = hasFaceRefs ? faceReferenceUrls.slice(0, 12).filter(isUrlAccessible) : [];
    const validStyleRefs = hasStyleRefs ? styleReferenceUrls.slice(0, 8).filter(isUrlAccessible) : [];
    const validGeneralRefs = hasGeneralRefs ? referenceImageUrls.slice(0, 2).filter(isUrlAccessible) : [];
    
    const filteredCount = (faceReferenceUrls?.length || 0) + (styleReferenceUrls?.length || 0) + (referenceImageUrls?.length || 0) - validFaceRefs.length - validStyleRefs.length - validGeneralRefs.length;
    if (filteredCount > 0) console.log(`Filtered out ${filteredCount} blocked/inaccessible URLs`);

    // === DIAGNOSTIC LOGGING ===
    console.log('=== IMAGE GEN REQUEST ===');
    console.log('Refs:', { faces: validFaceRefs.length, styles: validStyleRefs.length, general: validGeneralRefs.length });
    console.log('Has stylePrompt:', !!stylePrompt, 'length:', (stylePrompt || '').length);
    console.log('Prompt length:', imagePrompt.length);
    console.log('Fidelity:', fidelity, 'Model:', imageModel);

    // Determine if this is a marketplace/fullbleed style (stylePrompt + style refs = visual clone mode)
    const isVisualCloneMode = !!stylePrompt && validStyleRefs.length > 0;

    // Build message content
    const messageContent: any[] = [];
    let textPrompt: string;

    if (isPanoramicMode) {
      textPrompt = `${formatInstruction}\n\n${imagePrompt}`;
      if (stylePrompt) {
        const sanitizedStyle = stylePrompt
          .replace(/\d{3,4}\s*x\s*\d{3,4}(?:\s*pixels?)?/gi, '')
          .replace(/(?:formato?\s+)?(?:retrat[oa]|portrait)(?:\s+format[oa]?)?/gi, '')
          .replace(/(?:vertical)\s+(?:format[oa]?|orientation)/gi, '')
          .replace(/aspect\s+ratio\s+(?:3:4|4:5)/gi, '')
          .replace(/proporção\s+(?:3:4|4:5)/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (sanitizedStyle) {
          textPrompt += `\n\nESTILO VISUAL:\n${sanitizedStyle}`;
        }
      }
    } else if (isVisualCloneMode) {
      textPrompt = `Crie um post para Instagram que seja VISUALMENTE IDÊNTICO às imagens de referência.\n\nCONTEÚDO DO POST:\n${imagePrompt}\n\nREGRAS OBRIGATÓRIAS:\n- Replique EXATAMENTE o estilo visual das referências: mesmas cores, mesma tipografia, mesmos elementos decorativos, mesmo layout.\n- Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.\n- FULL BLEED OBRIGATÓRIO: A imagem DEVE preencher 100% do canvas. É TERMINANTEMENTE PROIBIDO gerar bordas brancas, molduras, margens, frames ou qualquer espaço vazio nas laterais/topo/base. A arte vai de ponta a ponta.\n- NÃO copie @handles, nomes de marcas ou rostos das referências — copie APENAS o estilo visual.\n- NUNCA renderize o nome do estilo/template como texto na imagem. Se as referências contêm um título/nome do estilo, NÃO o copie — use SOMENTE os textos fornecidos pelo usuário.\n- Gere elementos visuais CRIATIVOS e RELEVANTES ao assunto do post — ilustrações, ícones, cenários contextuais. Cada card deve ter composição ÚNICA.\n- ${formatInstruction}`;
    } else if (stylePrompt) {
      textPrompt = `${stylePrompt}\n\n${imagePrompt}`;
    } else {
      textPrompt = `Generate a professional editorial magazine-quality image for an Instagram carousel post.\n\nDESCRIPTION: ${imagePrompt}\n\nSTYLE REQUIREMENTS:\n- High-end editorial/magazine aesthetic\n- Rich colors and professional color grading\n- Clean composition suitable for overlay text\n- Ultra high resolution, photorealistic quality`;
    }

    if (!isPanoramicMode && !isVisualCloneMode) {
      textPrompt += `\n\nFORMATO: ${formatInstruction}`;
    }

    // Anti-border instruction for ALL modes
    textPrompt += `\n\nFULL BLEED OBRIGATÓRIO: A imagem gerada DEVE preencher 100% do canvas sem NENHUMA borda branca, moldura, margem ou espaço vazio. A arte vai de ponta a ponta, cobrindo cada pixel do quadro.`;

    // Negative prompt — keep it SHORT and only as a separate text, not embedded in main prompt
    // For visual clone mode, negative prompts can actively hurt fidelity
    
    // Face/person instructions (these are important and specific)
    const isMultiPerson = facePersonsMetadata && Array.isArray(facePersonsMetadata) && facePersonsMetadata.length > 1;
    const buildGenderDirective = (gender: string) => 
      gender === 'male' ? 'MALE with masculine build, masculine hands (short nails, broader fingers).'
      : gender === 'female' ? 'FEMALE with feminine build and features.'
      : '';
    const singleGender = faceGender === 'male' 
      ? 'The user has CONFIRMED this person is MALE. Generate a MALE body.' 
      : faceGender === 'female' 
      ? 'The user has CONFIRMED this person is FEMALE. Generate a FEMALE body.' 
      : '';

    if (validFaceRefs.length > 0 && isMultiPerson) {
      const personCount = facePersonsMetadata.length;
      let personDescriptions = '';
      let photoOffset = 0;
      for (let pi = 0; pi < personCount; pi++) {
        const pm = facePersonsMetadata[pi];
        const count = pm.photoCount || 1;
        const startIdx = photoOffset + 1;
        const endIdx = photoOffset + count;
        const genderDesc = buildGenderDirective(pm.gender || 'auto');
        const glassesDesc = pm.wearsGlasses ? ' MUST wear glasses.' : '';
        personDescriptions += `\n- ${pm.label || `Person ${pi + 1}`} (face refs #${startIdx}${count > 1 ? `-#${endIdx}` : ''}): ${genderDesc}${glassesDesc}`;
        photoOffset += count;
      }
      textPrompt += `\n\nMÚLTIPLAS PESSOAS (${personCount}): Cada pessoa DEVE ter o rosto EXATO da referência correspondente.${personDescriptions}`;
    } else if (validFaceRefs.length > 0 && validGeneralRefs.length > 0) {
      textPrompt += `\n\nPESSOA + PRODUTO: A pessoa das fotos de referência DEVE aparecer usando/segurando o produto. Reproduza o rosto EXATO — mesma estrutura óssea, formato dos olhos, nariz, boca, sobrancelhas, tom de pele e textura do cabelo. ${singleGender}`;
    } else if (validFaceRefs.length > 0) {
      textPrompt += `\n\nIDENTIDADE FACIAL OBRIGATÓRIA (PRIORIDADE #1 — ACIMA DE TUDO): Estude CADA foto de referência para construir uma compreensão 3D completa deste rosto. Reproduza com FIDELIDADE ABSOLUTA: mesma estrutura óssea, formato exato dos olhos, nariz, lábios, sobrancelhas, queixo, maçãs do rosto, tom de pele, textura e cor do cabelo. A pessoa na imagem final DEVE ser instantaneamente RECONHECÍVEL como a MESMA pessoa das referências — NÃO gere um rosto diferente, genérico ou inspirado. Se houver conflito entre fidelidade facial e estilo visual, PRIORIZE o rosto. ${singleGender}`;
    }

    if (validGeneralRefs.length > 0 && validFaceRefs.length === 0) {
      textPrompt += `\n\nPRODUTO: Reproduza o produto das referências fielmente.`;
    }

    // Brand colors — ONLY when no style refs (prevents palette contamination)
    if (brandColors && Array.isArray(brandColors) && brandColors.length > 0 && validStyleRefs.length === 0 && !stylePrompt) {
      textPrompt += `\n\nCORES DA MARCA: ${brandColors.join(', ')}`;
    }

    // === MESSAGE ASSEMBLY ===
    // For visual clone mode: Images FIRST, minimal text, no redundant instructions
    // For other modes: Standard assembly

    if (isVisualCloneMode) {
      // VISUAL CLONE: Face refs FIRST → Style refs → Prompt → Product refs
      // Face identity MUST be established before style to prevent random faces

      if (validFaceRefs.length > 0 && isMultiPerson) {
        let photoOffset = 0;
        for (let pi = 0; pi < facePersonsMetadata.length; pi++) {
          const pm = facePersonsMetadata[pi];
          const count = Math.min(pm.photoCount || 1, validFaceRefs.length - photoOffset);
          if (count <= 0) break;
          messageContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL OBRIGATÓRIA: ${(pm.label || `Pessoa ${pi + 1}`).toUpperCase()} (${pm.gender || 'auto'}) — Esta pessoa DEVE aparecer no resultado ⚠️` });
          for (let j = 0; j < count; j++) {
            if (photoOffset + j < validFaceRefs.length) {
              messageContent.push({ type: 'image_url', image_url: { url: validFaceRefs[photoOffset + j] } });
            }
          }
          photoOffset += count;
        }
      } else if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL — PRIORIDADE MÁXIMA ⚠️\nAs ${validFaceRefs.length} fotos abaixo são a ÚNICA referência de identidade. A pessoa no resultado DEVE ser EXATAMENTE esta pessoa — mesma estrutura óssea, mesmos olhos, nariz, boca, tom de pele, cabelo. NÃO gere um rosto diferente ou genérico:` });
        for (const ref of validFaceRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
        messageContent.push({ type: 'text', text: `Acima: fotos de referência facial. Agora aplique o ESTILO VISUAL das referências abaixo, mantendo o rosto IDÊNTICO.` });
      }

      // Style refs AFTER face refs — limit count when faces present to avoid overwhelming
      const styleRefsToSend = validFaceRefs.length > 0 ? validStyleRefs.slice(0, 4) : validStyleRefs;
      for (const ref of styleRefsToSend) {
        messageContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      messageContent.push({ type: 'text', text: `As ${styleRefsToSend.length} imagens acima são REFERÊNCIAS DE ESTILO. Replique este estilo visual EXATAMENTE — mas NÃO copie os rostos das referências de estilo. Use APENAS o rosto das fotos de referência facial acima.` });

      messageContent.push({ type: 'text', text: textPrompt });

      for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });

      if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `🔒 VERIFICAÇÃO FINAL: Compare o rosto gerado com as fotos de referência do INÍCIO. A pessoa DEVE ser RECONHECÍVEL como a MESMA pessoa. Fidelidade facial > tudo.` });
      }
    } else {
      // STANDARD MODE: Face refs FIRST, then style refs

      if (validFaceRefs.length > 0 && isMultiPerson) {
        let photoOffset = 0;
        for (let pi = 0; pi < facePersonsMetadata.length; pi++) {
          const pm = facePersonsMetadata[pi];
          const count = Math.min(pm.photoCount || 1, validFaceRefs.length - photoOffset);
          if (count <= 0) break;
          messageContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL: ${(pm.label || `Pessoa ${pi + 1}`).toUpperCase()} (${pm.gender || 'auto'}) ⚠️` });
          for (let j = 0; j < count; j++) {
            if (photoOffset + j < validFaceRefs.length) {
              messageContent.push({ type: 'image_url', image_url: { url: validFaceRefs[photoOffset + j] } });
            }
          }
          photoOffset += count;
        }
      } else if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL OBRIGATÓRIA (${validFaceRefs.length} fotos) — reproduza este EXATO rosto:` });
        for (const ref of validFaceRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      }

      if (validStyleRefs.length > 0) {
        messageContent.push({ type: 'text', text: `REFERÊNCIAS DE ESTILO (${validStyleRefs.length} imagens) — replique este estilo visual:` });
        for (const ref of validStyleRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      }

      messageContent.push({ type: 'text', text: textPrompt });

      for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });

      if (validStyleRefs.length > 0) {
        messageContent.push({ type: 'text', text: `LEMBRETE: O resultado DEVE ser visualmente idêntico ao estilo das referências.` });
      }
      if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `🔒 VERIFICAÇÃO FINAL: O rosto gerado DEVE ser a MESMA PESSOA das fotos de referência. Mesma estrutura óssea, olhos, nariz, boca, tom de pele, cabelo.` });
      }
    }

    // === DIAGNOSTIC: Log total message size ===
    const totalTextChars = messageContent.filter(p => p.type === 'text').reduce((sum, p) => sum + p.text.length, 0);
    const totalImages = messageContent.filter(p => p.type === 'image_url').length;
    console.log(`Message assembly: ${totalImages} images, ${totalTextChars} text chars, ${messageContent.length} parts, mode=${isVisualCloneMode ? 'VISUAL_CLONE' : 'STANDARD'}`);

    // Model selection
    const requestedModel = (imageModel || 'auto').toString().toLowerCase();
    const prefersPremiumModel = requestedModel === 'elloia' || requestedModel === 'nano-banana';
    const resolvedModel = requestedModel === 'auto'
      ? ((hasFaceRefs || hasStyleRefs || isPanoramicMode) ? 'elloia' : 'gemini')
      : requestedModel;
    const forcePremiumForPanorama = isPanoramicMode;
    const usePremium = forcePremiumForPanorama || resolvedModel === 'elloia' || resolvedModel === 'nano-banana' || prefersPremiumModel;
    const primaryModel = usePremium ? 'google/gemini-3-pro-image-preview' : 'google/gemini-2.5-flash-image';
    const fallbackModel = 'google/gemini-2.5-flash-image';
    console.log('Model:', primaryModel, 'panoramic:', isPanoramicMode, 'aspect:', outputAspectRatio);

    async function tryGenerate(model: string, content: any[], attempt: number): Promise<string | null> {
      console.log(`Attempt ${attempt} model=${model} parts=${content.length}`);
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          modalities: ['image', 'text'],
          // Lower temperature = higher fidelity to references (even lower for faces)
          ...(validFaceRefs.length > 0 ? { temperature: 0.1 } : validStyleRefs.length > 0 ? { temperature: 0.15 } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Attempt ${attempt} error:`, res.status, errText.slice(0, 500));
        if (res.status === 429 || res.status === 402) throw { status: res.status };
        const lowerErr = errText.toLowerCase();
        if (lowerErr.includes('safety') || lowerErr.includes('block') || lowerErr.includes('prohibited') || lowerErr.includes('harmful') || lowerErr.includes('sexual') || lowerErr.includes('nsfw') || lowerErr.includes('policy')) {
          throw { status: 451, reason: 'nsfw' };
        }
        const fetchErrorMatch = errText.match(/Received 403 status code when fetching image from URL:\s*(https?:\/\/[^\s\"]+)/);
        if (fetchErrorMatch) {
          throw { status: 400, reason: 'blocked_url', blockedUrl: fetchErrorMatch[1] };
        }
        return null;
      }

      const raw = await res.text();
      const lowerRaw = raw.toLowerCase();
      if (lowerRaw.includes('"blockreason"') || lowerRaw.includes('"safety"') && (lowerRaw.includes('"blocked"') || lowerRaw.includes('"block_reason"'))) {
        console.log(`Attempt ${attempt}: content blocked by safety filters`);
        throw { status: 451, reason: 'nsfw' };
      }
      
      const extractPatterns = ['"url":"data:image/', '"url": "data:image/'];
      for (const pattern of extractPatterns) {
        const idx = raw.indexOf(pattern);
        if (idx === -1) continue;
        const urlStart = raw.indexOf('"', idx + 5) + 1;
        const urlEnd = raw.indexOf('"', urlStart);
        if (urlEnd === -1) continue;
        const url = raw.slice(urlStart, urlEnd);
        console.log(`Attempt ${attempt}: image extracted (${url.length} chars)`);
        return url;
      }
      console.log(`Attempt ${attempt}: no image in response (${raw.length} chars)`);
      return null;
    }

    const blockedUrls = new Set<string>();

    // Attempt 1: full prompt
    let generatedImage: string | null = null;
    try {
      generatedImage = await tryGenerate(primaryModel, messageContent, 1);
    } catch (e: any) {
      if (e?.reason === 'nsfw') {
        return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança. Envie fotos apropriadas e tente novamente.', code: 'CONTENT_BLOCKED' }), {
          status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (e?.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (e?.reason === 'blocked_url' && e?.blockedUrl) {
        blockedUrls.add(e.blockedUrl);
        console.log('Blocked URL detected and removed:', e.blockedUrl);
      }
    }

    // Attempt 2: retry with pro model, simplified content — FACE REFS FIRST
    if (!generatedImage && usePremium) {
      const retryContent: any[] = [];
      // Face refs FIRST (identity priority)
      const activeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r));
      if (activeFaceRefs.length > 0) {
        retryContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL OBRIGATÓRIA — reproduza este EXATO rosto:` });
        for (const ref of activeFaceRefs) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      // Style refs AFTER face refs (reduced when faces present)
      const maxStyleRefs = activeFaceRefs.length > 0 ? 3 : 4;
      const activeStyleRefs = validStyleRefs.filter(r => !blockedUrls.has(r)).slice(0, maxStyleRefs);
      for (const ref of activeStyleRefs) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      if (isVisualCloneMode) {
        const faceReminder = activeFaceRefs.length > 0 ? ' A pessoa DEVE ter o rosto EXATO das fotos de referência facial.' : '';
        retryContent.push({ type: 'text', text: `Crie um post Instagram IDÊNTICO ao estilo das ${activeStyleRefs.length} referências de estilo. Conteúdo: ${imagePrompt.slice(0, 500)}. Texto em PORTUGUÊS BRASILEIRO. Full bleed. ${formatInstruction}${faceReminder}` });
      } else if (stylePrompt) {
        retryContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO.` });
      } else {
        retryContent.push({ type: 'text', text: `Professional editorial photograph: ${imagePrompt}. ${formatInstruction}.` });
      }
      for (const ref of validGeneralRefs) { if (!blockedUrls.has(ref)) retryContent.push({ type: 'image_url', image_url: { url: ref } }); }
      try { generatedImage = await tryGenerate(primaryModel, retryContent, 2); } catch (e2: any) {
        if (e2?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        if (e2?.reason === 'blocked_url' && e2?.blockedUrl) { blockedUrls.add(e2.blockedUrl); }
      }
    }

    // Attempt 3: pro model, safe URLs (keep ALL face refs — they're critical)
    if (!generatedImage && usePremium) {
      const textOnlyContent: any[] = [];
      const safeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r));
      const safeStyleRefs = validStyleRefs.filter(r => !blockedUrls.has(r)).slice(0, 2);
      if (safeFaceRefs.length > 0) {
        textOnlyContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL:` });
        for (const ref of safeFaceRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      for (const ref of safeStyleRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      if (stylePrompt) {
        textOnlyContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO.` });
      } else {
        textOnlyContent.push({ type: 'text', text: `Professional editorial photograph: ${imagePrompt}. ${formatInstruction}.` });
      }
      try { generatedImage = await tryGenerate(primaryModel, textOnlyContent, 3); } catch (e3: any) {
        if (e3?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      }
    }

    // Attempt 4: flash fallback — keep face refs
    if (!generatedImage) {
      const fallbackContent: any[] = [];
      const safeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r)).slice(0, 4);
      if (safeFaceRefs.length > 0) {
        fallbackContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL:` });
        for (const ref of safeFaceRefs) fallbackContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      if (stylePrompt) {
        fallbackContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO.` });
      } else {
        fallbackContent.push({ type: 'text', text: `Beautiful professional editorial image: ${imagePrompt.split(/[.,;:!?]/)[0]?.trim() || 'professional scene'}. ${formatInstruction}.` });
      }
      try { generatedImage = await tryGenerate('google/gemini-2.5-flash-image', fallbackContent, 4); } catch (e4: any) {
        if (e4?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      }
    }

    if (!generatedImage) {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar a imagem.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, imageUrl: generatedImage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in generate-carousel-image:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
