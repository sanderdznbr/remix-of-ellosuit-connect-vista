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
    const { prompt, topic, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, imageModel, negativePrompt, fidelity, stylePrompt } = body;

    const imagePrompt = prompt || topic || 'abstract background';
    const hasFaceRefs = faceReferenceUrls && faceReferenceUrls.length > 0;
    const hasStyleRefs = styleReferenceUrls && styleReferenceUrls.length > 0;
    const hasGeneralRefs = referenceImageUrls && referenceImageUrls.length > 0;

    const validFaceRefs = hasFaceRefs 
      ? faceReferenceUrls.slice(0, 1).filter((u: string) => u && (u.startsWith('http') || u.startsWith('data:')))
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
- TODO texto na imagem DEVE estar em PORTUGUÊS BRASILEIRO. NÃO use inglês.
- Siga as referências de estilo EXATAMENTE — replique a mesma estética de colagem editorial de revista, a mesma hierarquia tipográfica, a mesma paleta de cores, os mesmos elementos decorativos.
- Se o card indica que NÃO é capa/hero, use uma composição DIFERENTE — use layouts editoriais de conteúdo com blocos de texto mistos, fotos menores e arranjos variados.`;
    } else {
      textPrompt = `Generate a professional editorial magazine-quality image for an Instagram carousel post (4:5 portrait aspect ratio, 1080x1350px).

DESCRIPTION: ${imagePrompt}

STYLE REQUIREMENTS:
- High-end editorial/magazine aesthetic
- Rich colors and professional color grading
- Clean composition suitable for overlay text
- Ultra high resolution, photorealistic quality`;
    }

    if (negativePrompt) {
      textPrompt += `\n\nDO NOT include any of the following: ${negativePrompt}`;
    }

    if (fidelity === 'high') {
      textPrompt += `\n\nCRITICAL: Follow reference images with MAXIMUM fidelity. Reproduce exact features, colors, textures, and composition.`;
    } else if (fidelity === 'creative') {
      textPrompt += `\n\nTake creative artistic liberties. Use references as loose inspiration, not strict guides.`;
    }

    if (validFaceRefs.length > 0 && validGeneralRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE + PRODUCT COMBINED: I am attaching BOTH a person reference AND a product reference. You MUST:
1. The person from the face reference MUST appear in the image — reproduce their EXACT facial features, face shape, skin tone, hair style and color with maximum fidelity
2. The product from the product reference MUST also appear — the person should be WEARING the product (if clothing/accessory) or HOLDING/USING the product (if object)
3. The person must be clearly recognizable as the same individual from the face reference — this is the #1 priority
4. The product must be clearly visible and recognizable — this is the #2 priority
5. Create a natural, editorial scene where the person and product interact organically
6. NEVER ignore the face reference. NEVER generate a generic person. The face MUST match the reference exactly.`;
    } else if (validFaceRefs.length > 0) {
      textPrompt += `\n\nCRITICAL - FACE/PERSON REFERENCE: I am attaching reference photo(s) of the person who MUST appear in this image. You MUST:
1. Reproduce their EXACT facial features, face shape, skin tone, hair style and color
2. The person must be clearly recognizable as the same individual in the reference photos
3. Maintain their likeness with high fidelity - this is the #1 priority
4. Place this person naturally in the scene described above
5. NEVER ignore this reference. NEVER generate a generic person.`;
    }

    if (validGeneralRefs.length > 0 && validFaceRefs.length === 0) {
      textPrompt += `\n\nPRODUCT REFERENCE: I am attaching ${validGeneralRefs.length} product reference image(s). Reproduce the product faithfully in the scene.`;
    }

    if (validStyleRefs.length > 0) {
      textPrompt += `\n\nBRAND/STYLE REFERENCE: I am attaching ${validStyleRefs.length} brand/style reference image(s). Match the visual style, color palette, and aesthetic of these references.`;
    }

    messageContent.push({ type: 'text', text: textPrompt });
    for (const ref of validFaceRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
    for (const ref of validStyleRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
    for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });

    // Model selection
    const resolvedModel = imageModel === 'auto' 
      ? (hasFaceRefs ? 'nano-banana' : 'gemini') 
      : imageModel;
    const primaryModel = resolvedModel === 'nano-banana' ? 'google/gemini-3-pro-image-preview' : 'google/gemini-2.5-flash-image';
    const fallbackModel = resolvedModel === 'nano-banana' ? 'google/gemini-2.5-flash-image' : 'google/gemini-3-pro-image-preview';
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
        console.error(`Attempt ${attempt} error:`, res.status, errText);
        if (res.status === 429 || res.status === 402) throw { status: res.status };
        return null;
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    }

    // Attempt 1: full prompt
    let generatedImage: string | null = null;
    try {
      generatedImage = await tryGenerate(primaryModel, messageContent, 1);
    } catch (e: any) {
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

    // Attempt 2: simplified with key refs
    if (!generatedImage) {
      const retryContent: any[] = [];
      if (stylePrompt) {
        // For marketplace styles: retry with simplified style prompt but keep the essence
        retryContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\nGere a imagem completa do post com tipografia integrada. Todo texto DEVE ser em PORTUGUÊS BRASILEIRO. Siga o estilo editorial descrito acima fielmente.` });
      } else {
        retryContent.push({ type: 'text', text: `Create a stunning professional editorial photograph. Scene: ${imagePrompt}. Style: cinematic lighting, magazine quality, 4:5 portrait ratio.${validFaceRefs.length > 0 ? ' The person in the attached reference MUST appear with exact facial likeness.' : ''}${validGeneralRefs.length > 0 ? ' The product in the attached reference MUST appear.' : ''}${validStyleRefs.length > 0 ? ' Match the visual style and brand aesthetic of the brand reference images.' : ''}` });
      }
      for (const ref of validFaceRefs.slice(0, 1)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      for (const ref of validGeneralRefs.slice(0, 1)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      for (const ref of validStyleRefs.slice(0, 2)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      try { generatedImage = await tryGenerate(fallbackModel, retryContent, 2); } catch { /* next */ }
    }

    // Attempt 3: text-only fallback — still keep style if marketplace
    if (!generatedImage) {
      const fallbackPrompt = stylePrompt
        ? `${stylePrompt}\n\n${imagePrompt}\n\nGere a composição editorial completa com tipografia em PORTUGUÊS BRASILEIRO.`
        : `Beautiful professional stock photo: ${imagePrompt.split(/[.,;:!?]/)[0]?.trim() || 'professional scene'}. Clean, well-lit, magazine quality, 4:5 portrait format.`;
      try {
        generatedImage = await tryGenerate('google/gemini-2.5-flash-image', [{ type: 'text', text: fallbackPrompt }], 3);
      } catch { /* ignore */ }
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
