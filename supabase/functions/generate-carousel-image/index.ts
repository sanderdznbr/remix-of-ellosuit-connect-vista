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
    // facePersonsMetadata: optional array of { label, gender, wearsGlasses, photoCount } to map grouped face refs

    // === FACE REGENERATION MODE (Image Editing) ===
    if (editSourceImage) {
      console.log('Face regeneration mode: editing existing image');
      
      // Build content with face references FIRST, then source image, then instructions
      // This ordering ensures the model treats face refs as the identity to use
      const editContent: any[] = [];
      
      // 1. Add face reference photos FIRST so model sees them as the "target face"
      const validFaceRefs: string[] = [];
      if (faceReferenceUrls?.length) {
        for (const ref of faceReferenceUrls.slice(0, 5)) {
          if (ref && (ref.startsWith('http') || ref.startsWith('data:'))) {
            validFaceRefs.push(ref);
            editContent.push({ type: 'image_url', image_url: { url: ref } });
          }
        }
      }
      
      // 2. Label the face references
      if (validFaceRefs.length > 0) {
        editContent.push({ type: 'text', text: `The ${validFaceRefs.length} image(s) above are FACE REFERENCE PHOTOS of the person whose face must appear in the final result. Study these faces carefully — memorize every facial feature.` });
      }
      
      // 3. Now add the source image to edit
      editContent.push({ type: 'text', text: 'The image below is the SOURCE IMAGE that needs face replacement. Keep its EXACT composition, background, clothing, text, colors, and layout:' });
      editContent.push({ type: 'image_url', image_url: { url: editSourceImage } });
      
      // 4. Final instruction with explicit aspect ratio if requested
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
        return 'Gere em formato retrato 9:16 (1080x1920), imagem alta vertical, sem barras pretas e preenchendo todo o quadro.';
      }

      if (outputAspectRatio === '21:9' || outputAspectRatio === '16:9') {
        return `Gere em formato horizontal ${outputAspectRatio}, ocupando todo o quadro sem letterbox ou barras.`;
      }

      if (outputAspectRatio === '3:4') {
        return 'Gere em formato retrato 3:4 (1080x1440), composição vertical completa.';
      }

      return `Gere no formato ${outputAspectRatio}, preenchendo 100% da imagem sem barras ou margens vazias.`;
    })();

    // Filter out URLs from domains that block hotlinking (Gemini can't fetch them)
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

    const validFaceRefs = hasFaceRefs 
      ? faceReferenceUrls.slice(0, 12).filter(isUrlAccessible)
      : [];
    const validStyleRefs = hasStyleRefs 
      ? styleReferenceUrls.slice(0, 8).filter(isUrlAccessible)
      : [];
    const validGeneralRefs = hasGeneralRefs
      ? referenceImageUrls.slice(0, 2).filter(isUrlAccessible)
      : [];
    
    // Log filtered URLs for debugging
    const filteredCount = (faceReferenceUrls?.length || 0) + (styleReferenceUrls?.length || 0) + (referenceImageUrls?.length || 0) - validFaceRefs.length - validStyleRefs.length - validGeneralRefs.length;
    if (filteredCount > 0) console.log(`Filtered out ${filteredCount} blocked/inaccessible URLs`);

    console.log('Image refs:', { faces: validFaceRefs.length, styles: validStyleRefs.length, general: validGeneralRefs.length, hasStylePrompt: !!stylePrompt });

    // Build message content
    const messageContent: any[] = [];

    // If a marketplace style prompt is provided, use it as the main instruction
    let textPrompt: string;
    if (isPanoramicMode) {
      // === PANORAMIC MODE ===
      // Format instruction MUST come FIRST and dominate over any style prompt
      // This prevents marketplace style prompts (which specify portrait 1080x1350) from overriding panoramic
      textPrompt = `${formatInstruction}\n\n${imagePrompt}`;

      if (stylePrompt) {
        // Sanitize stylePrompt: strip portrait/vertical dimension instructions that conflict with panoramic
        const sanitizedStyle = stylePrompt
          .replace(/\d{3,4}\s*x\s*\d{3,4}(?:\s*pixels?)?/gi, '') // Remove pixel dimensions like 1080x1350
          .replace(/(?:formato?\s+)?(?:retrat[oa]|portrait)(?:\s+format[oa]?)?/gi, '') // Remove portrait/retrato
          .replace(/(?:vertical)\s+(?:format[oa]?|orientation)/gi, '') // Remove vertical format/orientation
          .replace(/aspect\s+ratio\s+(?:3:4|4:5)/gi, '') // Remove portrait aspect ratios
          .replace(/proporção\s+(?:3:4|4:5)/gi, '') // Remove Portuguese portrait proportions
          .replace(/\s{2,}/g, ' ') // Clean extra spaces
          .trim();
        if (sanitizedStyle) {
          textPrompt += `\n\nESTILO VISUAL A INTEGRAR NA COMPOSIÇÃO PANORÂMICA:\n${sanitizedStyle}`;
        }
      }
    } else if (stylePrompt) {
      textPrompt = `${stylePrompt}

${imagePrompt}`;
    } else {
      textPrompt = `Generate a professional editorial magazine-quality image for an Instagram carousel post.

DESCRIPTION: ${imagePrompt}

STYLE REQUIREMENTS:
- High-end editorial/magazine aesthetic
- Rich colors and professional color grading
- Clean composition suitable for overlay text
- Ultra high resolution, photorealistic quality`;
    }

    if (!isPanoramicMode) {
      textPrompt += `\n\nFORMATO DE SAÍDA OBRIGATÓRIO:\n- ${formatInstruction}`;
    }

    // Always add hardcoded negative instructions to prevent common AI mistakes
    textPrompt += `\n\nPROIBIDO (NUNCA inclua na imagem):
- NÃO escreva "Tema do Carrossel", "Tema:", "Carousel Theme" ou qualquer rótulo de tema
- NÃO escreva "Card X de Y", "Card 1 de 20", "1/20", numeração de slides ou contadores
- NÃO replique a composição exata da capa/cover em cards de conteúdo — cada card deve ter layout ÚNICO e DIFERENTE
- NÃO copie textos, @handles, nomes de pessoas ou empresas das imagens de referência
- NÃO copie os ROSTOS ou PESSOAS das imagens de referência de ESTILO. Se imagens de referência de ROSTO forem fornecidas separadamente, use APENAS esses rostos. Se não houver referência de rosto, use pessoas COMPLETAMENTE DIFERENTES das que aparecem nas referências de estilo.
- NÃO adicione textos que não foram explicitamente solicitados. Se um "TEXTO EXATO" foi fornecido, use APENAS esse texto. Nenhum bullet point, lista, subtítulo ou texto adicional.
- NÃO coloque texto fora dos limites da imagem. Todo texto DEVE estar completamente visível dentro dos limites 1080x1350, com margens de segurança.
- NÃO use textos cortados ou parcialmente visíveis nas bordas.
- NÃO escreva "ARRASTE PRO LADO", "ARRASTE PARA O LADO", "ARRASTE", "DESLIZE", "SWIPE", "Arraste para o lado" ou qualquer variação de instrução de swipe/arrastar. Essas instruções de navegação são PROIBIDAS na imagem.
- NÃO adicione setas de navegação, indicadores de swipe, ou qualquer elemento que sugira "passar para o lado".`;

    if (negativePrompt) {
      textPrompt += `\n- ${negativePrompt}`;
    }

    if (fidelity === 'high') {
      textPrompt += `\n\nCRITICAL: Follow reference images with MAXIMUM fidelity. Reproduce exact features, colors, textures, and composition.`;
    } else if (fidelity === 'creative') {
      textPrompt += `\n\nTake creative artistic liberties. Use references as loose inspiration, not strict guides.`;
    }

    // Brand colors from logo (only for non-style generations)
    if (brandColors && Array.isArray(brandColors) && brandColors.length > 0 && validStyleRefs.length === 0) {
      textPrompt += `\n\nPALETA DE CORES DA MARCA: use predominantemente estas cores da marca: ${brandColors.join(', ')}. Integre essas cores na composição, tipografia e elementos decorativos.`;
    }

    // Determine if we have multi-person metadata
    const isMultiPerson = facePersonsMetadata && Array.isArray(facePersonsMetadata) && facePersonsMetadata.length > 1;

    // Build per-person gender directives
    const buildGenderDirective = (gender: string) => 
      gender === 'male' ? 'MALE with masculine build, masculine hands (short nails, broader fingers).'
      : gender === 'female' ? 'FEMALE with feminine build and features.'
      : '';

    // Single-person fallback gender directive
    const singleGender = faceGender === 'male' 
      ? 'The user has CONFIRMED this person is MALE. Generate a MALE body with masculine build, masculine hands, masculine features. DO NOT generate feminine hands, nails, or body features.' 
      : faceGender === 'female' 
      ? 'The user has CONFIRMED this person is FEMALE. Generate a FEMALE body with feminine build and features.' 
      : '';

    if (validFaceRefs.length > 0 && isMultiPerson) {
      // === MULTI-PERSON MODE ===
      const personCount = facePersonsMetadata.length;
      let personDescriptions = '';
      let photoOffset = 0;
      for (let pi = 0; pi < personCount; pi++) {
        const pm = facePersonsMetadata[pi];
        const count = pm.photoCount || 1;
        const startIdx = photoOffset + 1;
        const endIdx = photoOffset + count;
        const genderDesc = buildGenderDirective(pm.gender || 'auto');
        const glassesDesc = pm.wearsGlasses ? ' MUST wear glasses/eyeglasses.' : '';
        personDescriptions += `\n- ${pm.label || `Person ${pi + 1}`} (face reference images #${startIdx}${count > 1 ? `-#${endIdx}` : ''}): ${genderDesc}${glassesDesc} Reproduce this person's EXACT facial features, face shape, skin tone, hair style.`;
        photoOffset += count;
      }

      if (validGeneralRefs.length > 0) {
        textPrompt += `\n\nCRITICAL - MULTIPLE PEOPLE + PRODUCT: This image MUST contain EXACTLY ${personCount} DISTINCT people AND a product. Each person MUST match their respective face reference photos EXACTLY.${personDescriptions}
\nThe face reference images are provided in order — the first ${facePersonsMetadata[0]?.photoCount || 1} image(s) belong to ${facePersonsMetadata[0]?.label || 'Person 1'}, the next belong to ${facePersonsMetadata[1]?.label || 'Person 2'}, etc.
\nEach person MUST be clearly distinguishable with DIFFERENT faces. NEVER give two people the same face. This is the #1 priority.
\nThe product from the product reference MUST also appear in the scene. Create a natural, editorial scene where ALL people and the product interact organically.
\nGENDER MATCHING IS MANDATORY for each person — mismatching gender is a CRITICAL ERROR.`;
      } else {
        textPrompt += `\n\nCRITICAL - MULTIPLE PEOPLE: This image MUST contain EXACTLY ${personCount} DISTINCT people. Each person MUST match their respective face reference photos EXACTLY.${personDescriptions}
\nThe face reference images are provided in order — the first ${facePersonsMetadata[0]?.photoCount || 1} image(s) belong to ${facePersonsMetadata[0]?.label || 'Person 1'}, the next belong to ${facePersonsMetadata[1]?.label || 'Person 2'}, etc.
\nEach person MUST be clearly distinguishable with DIFFERENT faces. NEVER give two people the same face. NEVER merge or average faces together. Each person's identity must be preserved independently. This is the #1 priority.
\nGENDER MATCHING IS MANDATORY for each person — mismatching gender is a CRITICAL ERROR.`;
      }
    } else if (validFaceRefs.length > 0 && validGeneralRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE + PRODUCT COMBINED: I am attaching BOTH a person reference AND a product reference. You MUST:
${singleGender ? `0. MANDATORY GENDER: ${singleGender} This overrides ANY visual analysis. DO NOT guess gender from the photo — the user has explicitly set it.\n` : ''}1. The person from the face reference MUST appear in the image — reproduce their EXACT facial features, face shape, skin tone, hair style and color with maximum fidelity
2. The BODY, HANDS, and all physical features must match the specified gender — masculine hands for males (short nails, broader fingers), feminine hands for females
3. The product from the product reference MUST also appear — the person should be WEARING the product (if clothing/accessory) or HOLDING/USING the product (if object)
4. The person must be clearly recognizable as the same individual from the face reference — this is the #1 priority
5. The product must be clearly visible and recognizable — this is the #2 priority
6. Create a natural, editorial scene where the person and product interact organically
7. NEVER ignore the face reference. NEVER generate a generic person. The face MUST match the reference exactly.
8. GENDER MATCHING IS MANDATORY — mismatching the gender (e.g. putting a man's face on a woman's body, or giving a man feminine painted nails) is a CRITICAL ERROR.`;
    } else if (validFaceRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE/PERSON REFERENCE: I am attaching reference photo(s) of the person who MUST appear in this image. You MUST:
${singleGender ? `0. MANDATORY GENDER: ${singleGender} This overrides ANY visual analysis. DO NOT guess gender from the photo — the user has explicitly set it.\n` : ''}1. Reproduce their EXACT facial features, face shape, skin tone, hair style and color
2. The BODY, HANDS, and all physical features must match the specified gender — masculine hands for males (short nails, broader fingers), feminine hands for females
3. The person must be clearly recognizable as the same individual in the reference photos
4. Maintain their likeness with high fidelity - this is the #1 priority
5. Place this person naturally in the scene described above
6. NEVER ignore this reference. NEVER generate a generic person.
7. GENDER MATCHING IS MANDATORY — mismatching the gender is a CRITICAL ERROR.`;
    }

    if (validGeneralRefs.length > 0 && validFaceRefs.length === 0) {
      textPrompt += `\n\nPRODUCT REFERENCE: I am attaching ${validGeneralRefs.length} product reference image(s). Reproduce the product faithfully in the scene.`;
    }

    if (validStyleRefs.length > 0) {
      textPrompt += `\n\nBRAND/STYLE REFERENCE: I am attaching ${validStyleRefs.length} brand/style reference image(s). You MUST replicate these references with MAXIMUM FIDELITY:
1. Match the EXACT visual style: same color palette, same typography weight/style/hierarchy, same decorative elements (lines, shapes, textures, overlays)
2. Match the EXACT layout composition: same grid structure, same text placement zones, same image-to-text ratio
3. Match the EXACT aesthetic treatment: same photo filters, same contrast levels, same grain/texture effects, same border treatments
4. The result should look like it belongs to the SAME SERIES as the reference images — a viewer should immediately recognize it as the same brand/style
5. CRITICAL: Extract ONLY the visual style. DO NOT copy any text content, usernames, @ handles, brand names, company names, personal names, credits, watermarks, or personal information from the reference images. ALL text in the generated image must come EXCLUSIVELY from the user's input above. If you see text like "marketing for X by Y", "por Fulano", "@ someone", credits, or any attribution text in the references — IGNORE IT COMPLETELY and DO NOT reproduce it.
6. Each card should have a UNIQUE layout variation within the same style system — do NOT make every card identical to the first reference.
7. **ABSOLUTELY DO NOT** copy, replicate, or use the FACES or PEOPLE from these style reference images. The people in the style references are NOT the subject — they are part of the reference aesthetic ONLY. If face reference photos are provided separately, use ONLY those faces. If no face references are provided, generate COMPLETELY DIFFERENT people with different features, ethnicity, and appearance from the style references.
8. **ABSOLUTELY DO NOT** reproduce ANY text, names, brands, credits, attributions, or watermarks visible in the style reference images. The references are for VISUAL STYLE ONLY (colors, typography style, layout, decorative elements). All actual text content must come from the user prompt above.`;
    }

    // CRITICAL: when style refs exist, place them before instructions to improve visual anchoring
    if (validStyleRefs.length > 0) {
      messageContent.push({ type: 'text', text: `=== MANDATORY STYLE REFERENCES (${validStyleRefs.length}) ===` });
      for (const ref of validStyleRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      messageContent.push({ type: 'text', text: 'The images above define the REQUIRED visual DNA. Follow them strictly for colors, typography style, composition, spacing, and decorative motifs.' });
    }

    // CRITICAL: Face references MUST come before the prompt when provided
    // so the model treats them as highest priority identity references
    if (validFaceRefs.length > 0 && isMultiPerson) {
      // Group face refs by person with clear labels
      let photoOffset = 0;
      for (let pi = 0; pi < facePersonsMetadata.length; pi++) {
        const pm = facePersonsMetadata[pi];
        const count = Math.min(pm.photoCount || 1, validFaceRefs.length - photoOffset);
        if (count <= 0) break;
        messageContent.push({ type: 'text', text: `=== FACE REFERENCES FOR ${(pm.label || `Person ${pi + 1}`).toUpperCase()} (${pm.gender || 'auto'}) ===` });
        for (let j = 0; j < count; j++) {
          if (photoOffset + j < validFaceRefs.length) {
            messageContent.push({ type: 'image_url', image_url: { url: validFaceRefs[photoOffset + j] } });
          }
        }
        photoOffset += count;
      }
      messageContent.push({ type: 'text', text: `The images above show ${facePersonsMetadata.length} DIFFERENT people. Each group is labeled. The generated image MUST contain ALL ${facePersonsMetadata.length} people with their EXACT faces from their respective reference groups. Each person MUST look DIFFERENT from the others.` });
    } else {
      for (const ref of validFaceRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `The ${validFaceRefs.length} image(s) above are FACE REFERENCE PHOTOS. The person in the generated image MUST have the EXACT same face as shown above. This is the #1 priority.` });
      }
    }
    messageContent.push({ type: 'text', text: textPrompt });
    for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });

    // Model selection — treat "elloia" as the premium model (backward compatible with "nano-banana")
    const requestedModel = (imageModel || 'auto').toString().toLowerCase();
    const prefersPremiumModel = requestedModel === 'elloia' || requestedModel === 'nano-banana';
    const resolvedModel = requestedModel === 'auto'
      ? ((hasFaceRefs || hasStyleRefs || isPanoramicMode) ? 'elloia' : 'gemini')
      : requestedModel;
    const forcePremiumForPanorama = isPanoramicMode;
    const usePremium = forcePremiumForPanorama || resolvedModel === 'elloia' || resolvedModel === 'nano-banana' || prefersPremiumModel;
    const primaryModel = usePremium ? 'google/gemini-3-pro-image-preview' : 'google/gemini-2.5-flash-image';
    const fallbackModel = 'google/gemini-2.5-flash-image';
    console.log('Image gen model:', primaryModel, 'parts:', messageContent.length, 'panoramic:', isPanoramicMode, 'aspect:', outputAspectRatio);

    async function tryGenerate(model: string, content: any[], attempt: number): Promise<string | null> {
      console.log(`Attempt ${attempt} model=${model}`);
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
          ...(validStyleRefs.length > 0 ? { temperature: 0.2 } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Attempt ${attempt} error:`, res.status, errText.slice(0, 500));
        if (res.status === 429 || res.status === 402) throw { status: res.status };
        // Detect safety/NSFW blocks from the API error response
        const lowerErr = errText.toLowerCase();
        if (lowerErr.includes('safety') || lowerErr.includes('block') || lowerErr.includes('prohibited') || lowerErr.includes('harmful') || lowerErr.includes('sexual') || lowerErr.includes('nsfw') || lowerErr.includes('policy')) {
          throw { status: 451, reason: 'nsfw' };
        }
        // Detect 403 fetching errors — extract the blocked URL so caller can remove it
        const fetchErrorMatch = errText.match(/Received 403 status code when fetching image from URL:\s*(https?:\/\/[^\s"]+)/);
        if (fetchErrorMatch) {
          throw { status: 400, reason: 'blocked_url', blockedUrl: fetchErrorMatch[1] };
        }
        return null;
      }

      // Stream response as text and extract base64 image URL via string search
      const raw = await res.text();
      
      // Check for safety blocks in a successful response (Gemini sometimes returns 200 with block info)
      const lowerRaw = raw.toLowerCase();
      if (lowerRaw.includes('"blockreason"') || lowerRaw.includes('"safety"') && (lowerRaw.includes('"blocked"') || lowerRaw.includes('"block_reason"'))) {
        console.log(`Attempt ${attempt}: content blocked by safety filters`);
        throw { status: 451, reason: 'nsfw' };
      }
      
      const patterns = ['"url":"data:image/', '"url": "data:image/'];
      for (const pattern of patterns) {
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

    // Helper: remove blocked URLs from content array
    const blockedUrls = new Set<string>();
    function filterContent(content: any[]): any[] {
      return content.filter(part => {
        if (part.type === 'image_url' && part.image_url?.url) {
          return !blockedUrls.has(part.image_url.url);
        }
        return true;
      });
    }

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

    // Attempt 2: retry with same pro model, removing any blocked URLs
    if (!generatedImage && usePremium) {
      const retryContent: any[] = [];
      for (const ref of validFaceRefs) { if (!blockedUrls.has(ref)) retryContent.push({ type: 'image_url', image_url: { url: ref } }); }
      const activeFaceCount = validFaceRefs.filter(r => !blockedUrls.has(r)).length;
      if (activeFaceCount > 0) {
        retryContent.push({ type: 'text', text: `The ${activeFaceCount} image(s) above are FACE REFERENCE PHOTOS. The person MUST have the EXACT same face. This is the #1 priority.` });
      }
      const activeStyleRefs = validStyleRefs.filter(r => !blockedUrls.has(r)).slice(0, 4);
      for (const ref of activeStyleRefs) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      if (stylePrompt) {
        retryContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\nFORMATO OBRIGATÓRIO: ${formatInstruction}\n\nGere a imagem completa do post com tipografia integrada. Todo texto DEVE ser em PORTUGUÊS BRASILEIRO. NÃO use espanhol ou inglês. SEM bordas.` });
      } else {
        retryContent.push({ type: 'text', text: `Create a stunning professional editorial photograph. Scene: ${imagePrompt}. Style: cinematic lighting, magazine quality. FORMAT MANDATORY: ${formatInstruction}.${activeFaceCount > 0 ? ' The person in the attached reference MUST appear with exact facial likeness.' : ''}` });
      }
      for (const ref of validGeneralRefs) { if (!blockedUrls.has(ref)) retryContent.push({ type: 'image_url', image_url: { url: ref } }); }
      try { generatedImage = await tryGenerate(primaryModel, retryContent, 2); } catch (e2: any) {
        if (e2?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        if (e2?.reason === 'blocked_url' && e2?.blockedUrl) { blockedUrls.add(e2.blockedUrl); console.log('Blocked URL detected and removed:', e2.blockedUrl); }
      }
    }

    // Attempt 3: pro model text-only (no image refs that could be blocked)
    if (!generatedImage && usePremium) {
      const textOnlyContent: any[] = [];
      // Only include data: URLs (base64) which are always accessible
      const safeStyleRefs = validStyleRefs.filter(r => r.startsWith('data:'));
      const safeFaceRefs = validFaceRefs.filter(r => r.startsWith('data:'));
      for (const ref of safeFaceRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      for (const ref of safeStyleRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      if (stylePrompt) {
        textOnlyContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\nFORMATO OBRIGATÓRIO: ${formatInstruction}\n\nGere a imagem completa do post com tipografia integrada. Todo texto DEVE ser em PORTUGUÊS BRASILEIRO. SEM bordas.` });
      } else {
        textOnlyContent.push({ type: 'text', text: `Create a stunning professional editorial photograph. Scene: ${imagePrompt}. Style: cinematic lighting, magazine quality. FORMAT MANDATORY: ${formatInstruction}.` });
      }
      try { generatedImage = await tryGenerate(primaryModel, textOnlyContent, 3); } catch (e3: any) {
        if (e3?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      }
    }

    // Attempt 4: flash fallback text-only (last resort, still not nano-banana)
    if (!generatedImage) {
      const fallbackContent: any[] = [];
      const safeFaceRefs = validFaceRefs.filter(r => r.startsWith('data:'));
      for (const ref of safeFaceRefs) fallbackContent.push({ type: 'image_url', image_url: { url: ref } });
      if (stylePrompt) {
        fallbackContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\nFORMATO OBRIGATÓRIO: ${formatInstruction}\n\nGere a imagem completa do post com tipografia integrada. Todo texto DEVE ser em PORTUGUÊS BRASILEIRO. SEM bordas.` });
      } else {
        fallbackContent.push({ type: 'text', text: `Beautiful professional editorial image: ${imagePrompt.split(/[.,;:!?]/)[0]?.trim() || 'professional scene'}. FORMAT MANDATORY: ${formatInstruction}.` });
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
