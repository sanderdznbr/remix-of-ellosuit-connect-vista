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
    const { prompt, topic, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, imageModel, negativePrompt, fidelity, stylePrompt, brandColors, editSourceImage, faceGender } = body;

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
      
      // 4. Final instruction
      editContent.push({ type: 'text', text: prompt + '\n\nCRITICAL RULES:\n- Generate a NEW image that is the SOURCE IMAGE but with the face replaced by the face from the REFERENCE PHOTOS.\n- The output must have the SAME dimensions, framing, and zoom level as the source image — do NOT crop or zoom in.\n- Keep ALL text overlays, logos, backgrounds, clothing, body pose, and composition IDENTICAL to the source.\n- ONLY the face changes. Everything else stays pixel-perfect.' });
      
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

    const validFaceRefs = hasFaceRefs 
      ? faceReferenceUrls.slice(0, 3).filter((u: string) => u && (u.startsWith('http') || u.startsWith('data:')))
      : [];
    const validStyleRefs = hasStyleRefs 
      ? styleReferenceUrls.slice(0, 4).filter((u: string) => u && (u.startsWith('http') || u.startsWith('data:')))
      : [];
    const validGeneralRefs = hasGeneralRefs
      ? referenceImageUrls.slice(0, 2).filter((u: string) => u && (u.startsWith('http') || u.startsWith('data:')))
      : [];

    console.log('Image refs:', { faces: validFaceRefs.length, styles: validStyleRefs.length, general: validGeneralRefs.length, hasStylePrompt: !!stylePrompt });

    // Build message content
    const messageContent: any[] = [];

    // If a marketplace style prompt is provided, use it as the main instruction
    let textPrompt: string;
    if (stylePrompt) {
      textPrompt = `${stylePrompt}

${imagePrompt}

INSTRUÇÕES CRÍTICAS:
- Gere a imagem COMPLETA de um post de Instagram (1080x1350, retrato 4:5) com TODOS os elementos visuais integrados: tipografia, elementos decorativos, tratamento fotográfico e composição conforme as regras de estilo acima.
- A imagem deve ser um POST PRONTO PARA PUBLICAR, não apenas uma fotografia.
- TODO o conteúdo textual fornecido acima DEVE ser renderizado diretamente na imagem com tipografia apropriada.
- TODO texto na imagem DEVE estar em PORTUGUÊS BRASILEIRO correto, fluente e sem erros ortográficos. NÃO use inglês, NÃO use espanhol. APENAS português do Brasil. Verifique a ortografia de cada palavra.
- Se um TEXTO EXATO foi fornecido, use SOMENTE esse texto na imagem. NÃO adicione textos extras, subtítulos, listas ou tópicos adicionais.
- Siga as referências de estilo EXATAMENTE — replique a mesma estética de colagem editorial de revista, a mesma hierarquia tipográfica, a mesma paleta de cores, os mesmos elementos decorativos.
- Se o card indica que NÃO é capa/hero, use uma composição DIFERENTE — use layouts editoriais de conteúdo com blocos de texto mistos, fotos menores e arranjos variados.
- COMPOSIÇÃO FULL BLEED OBRIGATÓRIA: A imagem DEVE preencher 100% do espaço. ZERO bordas brancas, coloridas ou transparentes no topo, base, esquerda ou direita. Nenhuma margem ou barra em nenhum lado.
- IGNORE completamente quaisquer nomes de usuário (@), marcas, logotipos, nomes de empresas ou informações pessoais que apareçam nas imagens de referência. Use as referências APENAS para extrair o ESTILO VISUAL (paleta de cores, tipografia, composição, elementos decorativos). NUNCA copie textos, @handles, nomes de pessoas ou empresas das referências.`;
    } else {
      textPrompt = `Generate a professional editorial magazine-quality image for an Instagram carousel post (4:5 portrait aspect ratio, 1080x1350px).

DESCRIPTION: ${imagePrompt}

STYLE REQUIREMENTS:
- High-end editorial/magazine aesthetic
- Rich colors and professional color grading
- Clean composition suitable for overlay text
- Ultra high resolution, photorealistic quality`;
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

    // Brand colors from logo
    if (brandColors && Array.isArray(brandColors) && brandColors.length > 0) {
      textPrompt += `\n\nPALETA DE CORES DA MARCA: use predominantemente estas cores da marca: ${brandColors.join(', ')}. Integre essas cores na composição, tipografia e elementos decorativos.`;
    }

    // Determine explicit gender instruction from user selection
    const genderDirective = faceGender === 'male' 
      ? 'The user has CONFIRMED this person is MALE. Generate a MALE body with masculine build, masculine hands, masculine features. DO NOT generate feminine hands, nails, or body features.' 
      : faceGender === 'female' 
      ? 'The user has CONFIRMED this person is FEMALE. Generate a FEMALE body with feminine build and features.' 
      : '';

    if (validFaceRefs.length > 0 && validGeneralRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE + PRODUCT COMBINED: I am attaching BOTH a person reference AND a product reference. You MUST:
${genderDirective ? `0. MANDATORY GENDER: ${genderDirective} This overrides ANY visual analysis. DO NOT guess gender from the photo — the user has explicitly set it.\n` : ''}1. The person from the face reference MUST appear in the image — reproduce their EXACT facial features, face shape, skin tone, hair style and color with maximum fidelity
2. The BODY, HANDS, and all physical features must match the specified gender — masculine hands for males (short nails, broader fingers), feminine hands for females
3. The product from the product reference MUST also appear — the person should be WEARING the product (if clothing/accessory) or HOLDING/USING the product (if object)
4. The person must be clearly recognizable as the same individual from the face reference — this is the #1 priority
5. The product must be clearly visible and recognizable — this is the #2 priority
6. Create a natural, editorial scene where the person and product interact organically
7. NEVER ignore the face reference. NEVER generate a generic person. The face MUST match the reference exactly.
8. GENDER MATCHING IS MANDATORY — mismatching the gender (e.g. putting a man's face on a woman's body, or giving a man feminine painted nails) is a CRITICAL ERROR.`;
    } else if (validFaceRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE/PERSON REFERENCE: I am attaching reference photo(s) of the person who MUST appear in this image. You MUST:
${genderDirective ? `0. MANDATORY GENDER: ${genderDirective} This overrides ANY visual analysis. DO NOT guess gender from the photo — the user has explicitly set it.\n` : ''}1. Reproduce their EXACT facial features, face shape, skin tone, hair style and color
2. The BODY, HANDS, and all physical features must match the specified gender — masculine hands for males (short nails, broader fingers), feminine hands for females
3. The person must be clearly recognizable as the same individual in the reference photos
4. Maintain their likeness with high fidelity - this is the #1 priority
5. Place this person naturally in the scene described above
6. NEVER ignore this reference. NEVER generate a generic person.
7. GENDER MATCHING IS MANDATORY — mismatching the gender is a CRITICAL ERROR.`;
    } else {
      // NO FACE REFERENCE — generate thematic visuals instead of people
      textPrompt += `\n\nSEM REFERÊNCIA DE ROSTO — MODO VISUAL TEMÁTICO:
Como NENHUMA foto de rosto foi fornecida, NÃO gere pessoas como foco principal. Em vez disso, crie uma composição visual TEMÁTICA e IMPACTANTE relacionada ao assunto do post:
- Use OBJETOS 3D realistas, renderizados com iluminação cinematográfica, relacionados ao tema (ex: livros 3D, troféus, engrenagens, gráficos flutuantes, dispositivos tech, moedas, chaves, etc.)
- Ou use CENÁRIOS abstratos editoriais: paisagens conceituais, texturas ricas, composições geométricas dramáticas
- Ou use ELEMENTOS SIMBÓLICOS que representem o conceito do post (ex: para "produtividade" use relógios 3D e engrenagens; para "vendas" use gráficos ascendentes e moedas douradas; para "mindset" use cérebro estilizado ou labirinto)
- Os objetos devem ter qualidade de RENDER 3D PREMIUM: reflexos, sombras suaves, materiais realistas (vidro, metal, couro)
- Mantenha a mesma identidade visual do estilo (cores, tipografia, composição) mas substitua o elemento humano por objetos/conceitos visuais
- É PERMITIDO incluir silhuetas humanas, mãos ou partes do corpo como elementos compositivos secundários, mas NÃO como retrato/foco principal
- O resultado deve parecer um POST de Instagram profissional e editorial, mesmo sem pessoa como protagonista`;
    }

    if (validGeneralRefs.length > 0 && validFaceRefs.length === 0) {
      textPrompt += `\n\nPRODUCT REFERENCE: I am attaching ${validGeneralRefs.length} product reference image(s). Reproduce the product faithfully in the scene. The product is the MAIN VISUAL ELEMENT since no face was provided.`;
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

    // CRITICAL: Face references MUST come FIRST in the message content
    // so the model treats them as highest priority identity references
    for (const ref of validFaceRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
    if (validFaceRefs.length > 0) {
      messageContent.push({ type: 'text', text: `The ${validFaceRefs.length} image(s) above are FACE REFERENCE PHOTOS. The person in the generated image MUST have the EXACT same face as shown above. This is the #1 priority.` });
    }
    messageContent.push({ type: 'text', text: textPrompt });
    for (const ref of validStyleRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
    for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });

    // Model selection — gemini-3-pro fails consistently with style refs, so use flash directly
    const resolvedModel = imageModel === 'auto' 
      ? (hasFaceRefs && !hasStyleRefs ? 'nano-banana' : 'gemini') 
      : imageModel;
    const primaryModel = resolvedModel === 'nano-banana' ? 'google/gemini-3-pro-image-preview' : 'google/gemini-2.5-flash-image';
    const fallbackModel = resolvedModel === 'nano-banana' ? 'google/gemini-2.5-flash-image' : 'google/gemini-2.5-flash-image';
    console.log('Image gen model:', primaryModel, 'parts:', messageContent.length);

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
    }

    // Attempt 2: if primary and fallback are the same model, skip to text-only
    if (!generatedImage && primaryModel !== fallbackModel) {
      const retryContent: any[] = [];
      if (stylePrompt) {
        retryContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\nGere a imagem completa do post com tipografia integrada. Todo texto DEVE ser em PORTUGUÊS BRASILEIRO. NÃO use espanhol ou inglês. Siga o estilo editorial descrito acima fielmente. NÃO copie nomes, @handles ou informações pessoais das referências. SEM bordas no topo ou base da imagem.` });
      } else {
        retryContent.push({ type: 'text', text: `Create a stunning professional editorial photograph. Scene: ${imagePrompt}. Style: cinematic lighting, magazine quality, 4:5 portrait ratio.${validFaceRefs.length > 0 ? ' The person in the attached reference MUST appear with exact facial likeness.' : ''}${validGeneralRefs.length > 0 ? ' The product in the attached reference MUST appear.' : ''}${validStyleRefs.length > 0 ? ' Match the visual style and brand aesthetic of the brand reference images.' : ''}` });
      }
      for (const ref of validFaceRefs.slice(0, 1)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      for (const ref of validGeneralRefs.slice(0, 1)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      for (const ref of validStyleRefs.slice(0, 2)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      try { generatedImage = await tryGenerate(fallbackModel, retryContent, 2); } catch (e2: any) { if (e2?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança. Envie fotos apropriadas e tente novamente.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); } }
    }

    // Attempt 3: text-only fallback — still keep style if marketplace
    if (!generatedImage) {
      const fallbackPrompt = stylePrompt
        ? `${stylePrompt}\n\n${imagePrompt}\n\nGere a composição editorial completa com tipografia em PORTUGUÊS BRASILEIRO. NÃO use espanhol. NÃO copie informações pessoais das referências. SEM bordas.`
        : `Beautiful professional stock photo: ${imagePrompt.split(/[.,;:!?]/)[0]?.trim() || 'professional scene'}. Clean, well-lit, magazine quality, 4:5 portrait format.`;
      try {
        generatedImage = await tryGenerate('google/gemini-2.5-flash-image', [{ type: 'text', text: fallbackPrompt }], 3);
      } catch (e3: any) { if (e3?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança. Envie fotos apropriadas e tente novamente.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); } }
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
