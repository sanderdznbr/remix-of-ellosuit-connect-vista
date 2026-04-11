// Separate edge function for AI image generation - extracted from generate-carousel
// to reduce CPU usage per invocation and avoid WORKER_LIMIT errors

const INTERNAL_BRAND_PATTERN = /\b(?:ello\s*content|ellocontent|ello\s*suit|ellosuit|@ellocontent|@ellosuit)\b/gi;
const stripInternalBrands = (value: string = '') =>
  value
    .replace(INTERNAL_BRAND_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

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
    const { prompt, topic, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, imageModel, negativePrompt, fidelity, stylePrompt, brandColors, customColors, editSourceImage, faceGender, facePersonsMetadata, imageSize, panoramic, panoramicCardCount, fontReferenceImage, fontReferenceName, logoImageUrl, logoPosition, isCarousel, logoMode } = body;
    console.log('LOGO DEBUG:', { logoImageUrl: logoImageUrl ? logoImageUrl.slice(0, 80) : null, logoPosition, hasLogo: !!logoImageUrl, isCarousel: !!isCarousel, logoMode });

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

    const imagePrompt = stripInternalBrands(prompt || topic || 'abstract background');
    const hasFaceRefs = faceReferenceUrls && faceReferenceUrls.length > 0;
    const hasStyleRefs = styleReferenceUrls && styleReferenceUrls.length > 0;
    const hasGeneralRefs = referenceImageUrls && referenceImageUrls.length > 0;
    const outputAspectRatio = typeof imageSize === 'string' && imageSize.trim() ? imageSize.trim() : '3:4';
    const isPanoramicMode = Boolean(panoramic);
    const isExtremePrompt = /MODO EXTREME|EXTREME_VISION|VISÃO DO USUÁRIO/i.test(imagePrompt);
    const exactTextMatch = imagePrompt.match(/TEXTO EXATO (?:PARA A IMAGEM|OBRIGATÓRIO)[^"\n]*"([^"]+)"/i)
      || imagePrompt.match(/TÍTULO PARA RENDERIZAR NA IMAGEM:\s*"([^"]+)"/i);
    const extractedExactText = (exactTextMatch?.[1] || '').trim();
    const panoramicSections = Number.isFinite(Number(panoramicCardCount))
      ? Math.max(2, Number(panoramicCardCount))
      : 2;

    const formatInstruction = (() => {
      if (isPanoramicMode) {
        const totalWidth = panoramicSections * 1080;
        return `CRITICAL PANORAMIC IMAGE: Generate ONE SINGLE ultra-wide panoramic image. Exact dimensions: ${totalWidth}x1350 pixels (aspect ratio ${outputAspectRatio}). The image MUST be MUCH WIDER than it is tall — approximately ${panoramicSections}x wider. This is a HORIZONTAL LANDSCAPE panorama, NOT a portrait. The entire scene must flow continuously from left edge to right edge as ONE unified composition — no divisions, no panels, no separators. Visual elements (backgrounds, scenery, objects, people, gradients) must span seamlessly across the full width. This panorama will be sliced into ${panoramicSections} equal vertical strips, so ensure visual continuity at every potential cut point.`;
      }
      if (outputAspectRatio === '9:16') {
        return 'FORMATO OBRIGATÓRIO 9:16 STORIES (1080x1920): Você DEVE gerar uma imagem VERTICAL ALTA no formato 9:16 — a altura (1920px) DEVE ser aproximadamente 1.78x a largura (1080px). A imagem DEVE parecer uma tela de celular em pé (RETRATO VERTICAL EXTREMO). NÃO gere imagem quadrada, NÃO gere 4:5, NÃO gere paisagem. A imagem deve ser SIGNIFICATIVAMENTE mais alta do que larga. Preencha TODO o canvas vertical — ZERO barras pretas, ZERO letterboxing, ZERO espaço vazio no topo ou na base. Expanda a cena para CIMA e para BAIXO para preencher naturalmente todo o frame vertical 9:16.';
      }
      if (outputAspectRatio === '21:9' || outputAspectRatio === '16:9') {
        return `Formato horizontal ${outputAspectRatio}, ocupando todo o quadro.`;
      }
      if (outputAspectRatio === '4:5') {
        return 'FORMATO OBRIGATÓRIO 4:5 RETRATO (1080x1350): gere exatamente em proporção vertical 4:5 para Instagram feed, preenchendo todo o canvas sem cortes.';
      }
      if (outputAspectRatio === '3:4') {
        return 'Formato retrato 3:4 (1080x1440).';
      }
      return `Formato ${outputAspectRatio}, preenchendo 100% da imagem.`;
    })();

    const safeAreaInstruction = `ÁREA SEGURA OBRIGATÓRIA (PRIORIDADE MÁXIMA):
- TODOS os elementos importantes (título, subtítulo, CTA, mockup, tela, produto, pessoa e logo) DEVEM ficar 100% dentro do canvas.
- Reserve margens internas mínimas de 8% da largura nas laterais e 8% da altura no topo e na base. Nenhuma letra, palavra, logo, aparelho, tela ou detalhe importante pode tocar, encostar ou ultrapassar as bordas.
- NUNCA posicione texto nos cantos extremos. Os quatro cantos devem ter respiro visual real.
- Se houver muito conteúdo, REDUZA a quantidade de texto, diminua a escala tipográfica ou reorganize o layout. NUNCA permita texto cortado, truncado, vazando ou saindo da arte.
- Todo texto visível deve caber integralmente dentro da imagem com padding consistente.
- Mockups e dispositivos também devem ficar completamente contidos dentro do canvas; não corte topo, base ou laterais do aparelho se isso comprometer legibilidade ou proporção.
- Para screenshots em mockups, a tela deve ficar centralizada e corretamente encaixada no dispositivo, sem escapar da moldura.`;
    const compactSafeAreaReminder = 'SAFE AREA OBRIGATÓRIA: mantenha texto, mockup, tela e logo 100% dentro do canvas, com margens internas mínimas de 8% em todos os lados; nada pode tocar ou ultrapassar as bordas. PRIORIZE RESPIRO EXTRA NO TOPO E NOS CANTOS SUPERIORES.';

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

    // === SMART REF BUDGET (BACKEND SAFETY NET) ===
    // Frontend already caps refs, but this is the HARD LIMIT safety net.
    // These limits are absolute — they prevent WORKER_LIMIT (546) errors no matter what.
    const isSinglePost = !isCarousel;
    const BUDGET = isSinglePost
      ? { maxTotal: 8, maxFace: 5, maxStyle: 6, maxGeneral: 2 }
      : { maxTotal: 5, maxFace: 3, maxStyle: 3, maxGeneral: 1 };

    let validFaceRefs = hasFaceRefs ? faceReferenceUrls.slice(0, BUDGET.maxFace).filter(isUrlAccessible) : [];
    let validStyleRefs = hasStyleRefs ? styleReferenceUrls.slice(0, BUDGET.maxStyle).filter(isUrlAccessible) : [];
    let validGeneralRefs = hasGeneralRefs ? referenceImageUrls.slice(0, BUDGET.maxGeneral).filter(isUrlAccessible) : [];

    // Hard rebalance: face > general > style priority
    const willAddFont = !!fontReferenceImage;
    const willAddLogo = false; // Logo is now handled via Canvas overlay, never sent to AI
    const fixedSlots = (willAddFont ? 1 : 0);
    const availableForRefs = BUDGET.maxTotal - fixedSlots;

    // Step 1: cap face refs
    validFaceRefs = validFaceRefs.slice(0, Math.min(validFaceRefs.length, availableForRefs));
    // Step 2: cap general refs with remaining budget
    const afterFace = availableForRefs - validFaceRefs.length;
    validGeneralRefs = validGeneralRefs.slice(0, Math.min(validGeneralRefs.length, Math.max(0, afterFace)));
    // Step 3: cap style refs with remaining budget
    const afterGeneral = afterFace - validGeneralRefs.length;
    validStyleRefs = validStyleRefs.slice(0, Math.min(validStyleRefs.length, Math.max(0, afterGeneral)));

    const totalRefs = validFaceRefs.length + validStyleRefs.length + validGeneralRefs.length + fixedSlots;
    console.log(`REF BUDGET [${isSinglePost ? 'SINGLE' : 'CAROUSEL'}]: face=${validFaceRefs.length}/${BUDGET.maxFace}, style=${validStyleRefs.length}/${BUDGET.maxStyle}, general=${validGeneralRefs.length}/${BUDGET.maxGeneral}, font=${willAddFont?1:0}, logo=${willAddLogo?1:0}, total=${totalRefs}/${BUDGET.maxTotal}`);

    // === DIAGNOSTIC LOGGING ===
    console.log('=== IMAGE GEN REQUEST ===');
    console.log('Refs:', { faces: validFaceRefs.length, styles: validStyleRefs.length, general: validGeneralRefs.length });
    console.log('Has stylePrompt:', !!stylePrompt, 'length:', (stylePrompt || '').length);
    console.log('Prompt length:', imagePrompt.length);
    console.log('Fidelity:', fidelity, 'Model:', imageModel);

    // Determine if this is a marketplace/fullbleed style (stylePrompt + style refs = visual clone mode)
    const isVisualCloneMode = !!stylePrompt && validStyleRefs.length > 0;

    // === SANITIZE stylePrompt: remove any style/template names that could leak into the image ===
    let cleanStylePrompt = stylePrompt || '';
    if (cleanStylePrompt) {
      // Remove lines that look like style names (short ALL-CAPS lines, or lines starting with "NOME DO ESTILO")
      cleanStylePrompt = cleanStylePrompt
        .replace(/^(?:NOME|NAME|ESTILO|STYLE|TEMPLATE|TÍTULO).*$/gmi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // Build message content
    const messageContent: any[] = [];
    let textPrompt: string;

    if (isPanoramicMode) {
      textPrompt = `${formatInstruction}\n\n${imagePrompt}`;
      if (cleanStylePrompt) {
        const sanitizedStyle = cleanStylePrompt
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
      textPrompt = `Você é um designer gráfico SÊNIOR de uma agência premium criando um post para Instagram. O resultado DEVE ser INDISTINGUÍVEL de um post feito por um humano em Photoshop/Illustrator.\n\nCONTEÚDO DO POST:\n${imagePrompt}\n\n${formatInstruction}\n\nREGRAS OBRIGATÓRIAS DE FIDELIDADE VISUAL:\n- Replique EXATAMENTE o estilo visual das referências: mesmas cores, mesma tipografia, mesmos elementos decorativos, mesmo layout.\n- TIPOGRAFIA OBRIGATÓRIA: Analise as FONTES usadas nas referências de estilo (serif, sans-serif, display, script, bold, light, etc.) e REPLIQUE EXATAMENTE a mesma família tipográfica, peso e estilo. NÃO use fontes genéricas ou padrão. A tipografia é parte ESSENCIAL do DNA visual do estilo — copie-a fielmente.\n- Todo texto DEVE estar em PORTUGUÊS BRASILEIRO correto e fluente.\n- FULL BLEED OBRIGATÓRIO: A imagem DEVE preencher 100% do canvas, de ponta a ponta. ZERO bordas.\n- PROIBIDO COPIAR TEXTOS DAS REFERÊNCIAS: NÃO copie títulos, subtítulos, nomes, @handles, marcas d'água ou QUALQUER texto visível nas referências. Use EXCLUSIVAMENTE os textos fornecidos no campo CONTEÚDO DO POST acima.\n- Se as referências contêm textos como nomes de estilos, categorias, ou rótulos (ex: "Estratégia Profunda", "Business Pro", etc.), IGNORE-OS COMPLETAMENTE — eles são metadados do template, NÃO conteúdo do post.\n\n🚫 PROIBIÇÃO ABSOLUTA — NÃO COPIAR FOTOS/CENAS DAS REFERÊNCIAS:\n- As imagens de referência são APENAS inspiração de ESTILO (cores, fontes, layout, composição gráfica).\n- NÃO reproduza, copie ou recrie as FOTOGRAFIAS, CENAS, PESSOAS ou OBJETOS visíveis nas referências.\n- Se a referência mostra soldados, mãos, paisagens, rostos ou qualquer cena fotográfica — IGNORE completamente o conteúdo fotográfico.\n- Gere fotografias e elementos visuais NOVOS, ORIGINAIS e 100% RELEVANTES ao assunto do post ("${imagePrompt.slice(0, 100)}").\n- A ÚNICA coisa que você deve extrair das referências é: paleta de cores, tipografia, elementos gráficos decorativos e estrutura de layout.\n\n- GERE EXATAMENTE UMA ÚNICA IMAGEM — NÃO gere múltiplas imagens, NÃO crie colagem, grid, mosaico ou divisão em painéis dentro do card.\n\nQUALIDADE DE POST REAL:\n- O resultado deve parecer que foi feito por uma agência de design, NÃO por uma IA.\n- Use ESPAÇAMENTO GENEROSO entre elementos (nunca amontoado).\n- ALINHAMENTO PERFEITO em grid invisível como design editorial.\n- HIERARQUIA VISUAL clara: título dominante + elementos de suporte + espaço negativo intencional.\n- Cores COESAS e INTENCIONAIS — paleta restrita com propósito, sem saturação exagerada.\n- Iluminação e tratamento de imagem com PROFUNDIDADE, não uniforme/plástico.`;
      if (cleanStylePrompt) {
        const sanitizedCloneStyle = cleanStylePrompt
          .replace(/\d{3,4}\s*x\s*\d{3,4}(?:\s*pixels?)?/gi, '')
          .replace(/(?:9:16|16:9|4:5|3:4|1:1)\s*(?:stories?|portrait|retrato|vertical|horizontal|square|quadrado)?/gi, '')
          .replace(/(?:stories?|portrait|retrato)\s+(?:format[oa]?|orientation|vertical)/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        textPrompt += `\n\nDNA VISUAL DO ESTILO (copie cores, TIPOGRAFIA/FONTES e layout — NÃO copie textos, NÃO copie formato/proporção):\n${sanitizedCloneStyle}`;
      }
    } else if (cleanStylePrompt) {
      textPrompt = `${cleanStylePrompt}\n\n${imagePrompt}\n\nIMPORTANTE: NÃO copie textos das referências. Use APENAS os textos fornecidos acima.`;
    } else if (isExtremePrompt) {
      textPrompt = `Crie um post EXTREME com qualidade de agência premium para Instagram.\n\nCONTEÚDO DO POST:\n${imagePrompt}\n\nREGRAS CRÍTICAS DE TEXTO E IDIOMA:\n- TODO texto visível na arte DEVE estar em PORTUGUÊS BRASILEIRO correto e natural.\n- Proibido espanhol/inglês, erros gramaticais, erros ortográficos e palavras truncadas.\n- Tipografia profissional com hierarquia clara: título principal forte + subtítulo curto opcional + CTA opcional.\n- Máximo 3 blocos de texto curtos; nunca parágrafos longos.`;
      if (extractedExactText) {
        textPrompt += `\n- TEXTO EXATO OBRIGATÓRIO: renderize esta frase exatamente como está, sem alterar nenhuma palavra, acento, pontuação ou ordem: \"${extractedExactText}\".`;
      }
    } else {
      textPrompt = `Generate a professional editorial magazine-quality image for an Instagram carousel post.\n\nDESCRIPTION: ${imagePrompt}\n\nSTYLE REQUIREMENTS:\n- High-end editorial/magazine aesthetic\n- Rich colors and professional color grading\n- Clean composition suitable for overlay text\n- Ultra high resolution, photorealistic quality`;
    }

    if (!isPanoramicMode && !isVisualCloneMode) {
      textPrompt += `\n\nFORMATO: ${formatInstruction}`;
    }
    // For 9:16 Stories, ALWAYS reinforce the format even in visual clone mode
    if (outputAspectRatio === '9:16' && isVisualCloneMode) {
      textPrompt += `\n\nFORMATO OBRIGATÓRIO 9:16 STORIES: ${formatInstruction}`;
    }

    // Anti-border + anti-text-copy + anti-grid + anti-AI-aesthetic instruction for ALL modes
    // Logo handling depends on logoMode: 'ai' = AI renders it, 'manual'/default = Canvas overlay
    const isAiLogoMode = logoMode === 'ai' && logoImageUrl;
    const logoInstruction = isAiLogoMode
      ? `LOGOMARCA OBRIGATÓRIA: A imagem de referência da logomarca foi fornecida. Você DEVE posicionar esta logomarca de forma elegante e profissional no design, escolhendo o melhor canto ou posição que harmonize com a composição. A logo deve ser PEQUENA e DISCRETA (não dominante), mas claramente visível e legível. Mantenha as proporções originais da logo. NÃO distorça, recrie ou redesenhe a logo — use EXATAMENTE como fornecida. REGRA CRÍTICA: Use a logomarca COMPLETA e INTEIRA como fornecida — se a logo contém símbolo + texto (wordmark), INCLUA AMBOS. NUNCA recorte, fragmente ou use apenas parte da logo (como só o ícone/isotipo sem o nome). A logo deve aparecer EXATAMENTE como o arquivo original, na íntegra. A logomarca DEVE ficar totalmente contida dentro da SAFE AREA, com folga visível ao redor. Nunca cole a logo na borda e nunca deixe a logo parcialmente para fora do canvas.`
      : `PROIBIÇÃO DE LOGOMARCA/MARCA: NÃO renderize NENHUM nome de marca, logotipo, logo ou texto de branding na imagem. A logomarca será sobreposta automaticamente pelo sistema via Canvas. Deixe a área do logo COMPLETAMENTE LIMPA e SEM TEXTO. Reserve o canto ${logoPosition || 'top-left'} com folga generosa dentro da SAFE AREA, sem títulos, mockups, telas, texturas pesadas ou elementos importantes competindo com a futura logo. Se o prompt mencionar uma marca, use-a apenas como CONTEXTO TEMÁTICO para o conteúdo, NUNCA como texto visual renderizado na arte. NUNCA desenhe, renderize ou posicione qualquer logo — isso é responsabilidade exclusiva do frontend.`;
    const antiAiAesthetic = `
ESTÉTICA ANTI-IA (PRIORIDADE CRÍTICA — LEIA COM ATENÇÃO):
O resultado DEVE parecer um post criado por um designer humano profissional em Photoshop/Illustrator, NÃO uma imagem gerada por IA.
PROIBIDO — sinais típicos de IA que DESTROEM a qualidade:
- Cores SUPER-SATURADAS ou neon exageradas sem propósito — use paletas REALISTAS e COESAS como um diretor de arte faria.
- Iluminação ARTIFICIAL e UNIFORME demais — use iluminação DIRECIONAL com sombras reais, como uma foto de estúdio ou editorial.
- Texturas LISAS e PLÁSTICAS (pele de boneco, superfícies sem grão) — adicione TEXTURA NATURAL: grão fotográfico sutil, imperfeições reais, profundidade de campo.
- Composições SIMÉTRICAS PERFEITAS e GENÉRICAS — use composição ASSIMÉTRICA intencional como design editorial profissional.
- Tipografia com KERNING IRREGULAR ou letras levemente deformadas — cada letra DEVE ser PERFEITA e LEGÍVEL como se fosse uma fonte vetorial real.
- Texto com ERROS ORTOGRÁFICOS, palavras inventadas ou letras faltando — VERIFIQUE cada palavra antes de renderizar.
- Gradientes GENÉRICOS roxo-azul-rosa que parecem "filtro de IA" — use gradientes INTENCIONAIS e SOFISTICADOS.
- Mãos com dedos a mais/menos ou proporções estranhas.
- Elementos flutuando sem contexto ou gravidade.

OBRIGATÓRIO — características de um post PROFISSIONAL REAL:
- Hierarquia visual CLARA: um elemento dominante, elementos de suporte, espaço negativo intencional.
- Paleta de cores RESTRITA (3-4 cores máx) com PROPÓSITO — cada cor tem uma função (fundo, texto, destaque, acento).
- Tipografia com PESO e CONTRASTE: título BOLD grande + corpo leve pequeno. Nunca tudo do mesmo tamanho.
- ESPAÇAMENTO GENEROSO entre elementos (breathing room) — nunca amontoado.
- ALINHAMENTO PRECISO: elementos alinhados em um grid invisível, como design editorial de revista.
- Imagens/fotos com TRATAMENTO profissional: color grading coeso, contraste calibrado, profundidade de campo.
- O post deve parecer que faz parte de um FEED COESO de Instagram de uma marca premium.`;

    textPrompt += `\n\n${antiAiAesthetic}\n\n${safeAreaInstruction}\n\nFULL BLEED OBRIGATÓRIO: A imagem DEVE preencher 100% do canvas sem bordas, molduras ou espaço vazio.\nPROIBIÇÃO DE MOLDURA/FRAME: NUNCA adicione molduras, bordas decorativas, frames de celular/dispositivo, sombras de cartão, cantos arredondados decorativos ou qualquer elemento que emoldure a imagem. A arte DEVE ir de ponta a ponta, sem nenhum tipo de frame. NÃO simule um post dentro de outro post. NÃO crie efeito de "cartão flutuando" com sombra. NÃO adicione borda branca, preta ou colorida.\nPROIBIÇÃO DE CÓPIA DE TEXTO: NUNCA copie textos visíveis nas imagens de referência. Títulos, nomes de estilos, categorias, marcas d'água e rótulos das referências são METADADOS — renderize APENAS os textos fornecidos pelo usuário no prompt.\n${logoInstruction}\nPROIBIÇÃO ABSOLUTA DE GRID/COLAGEM/MOSAICO: Cada card DEVE ser UMA ÚNICA composição visual contínua e UNIFICADA. NUNCA divida um card em múltiplas fotos, grids, mosaicos, colagens, sub-quadros ou painéis lado a lado. PROIBIDO criar layouts com 2, 3 ou 4 fotos dentro de um único card. PROIBIDO dividir a imagem em seções ou quadrantes. A imagem INTEIRA deve ser UMA CENA ÚNICA, CONTÍNUA e COESA que preenche todo o canvas de ponta a ponta. Se precisar mostrar múltiplos elementos, componha-os organicamente em UMA ÚNICA CENA — NUNCA em grades separadas.`;

    // Negative prompt — keep it SHORT and only as a separate text, not embedded in main prompt
    // For visual clone mode, negative prompts can actively hurt fidelity
    
    // Face/person instructions (these are important and specific)
    const isMultiPerson = facePersonsMetadata && Array.isArray(facePersonsMetadata) && facePersonsMetadata.length > 1;
    const buildGenderDirective = (gender: string) => 
      gender === 'male' ? 'MALE with masculine build, masculine hands (short nails, broader fingers).'
      : gender === 'female' ? 'FEMALE with feminine build and features.'
      : '';
    const singleGender = faceGender === 'male' 
      ? 'The user has CONFIRMED this person is MALE. Generate a MALE body with matching masculine proportions, skin tone, and build.' 
      : faceGender === 'female' 
      ? 'The user has CONFIRMED this person is FEMALE. Generate a FEMALE body with matching feminine proportions, skin tone, and build.' 
      : '';

    // Anatomical integration instructions — critical to avoid "floating head" effect
    const anatomicalRules = `
INTEGRAÇÃO ANATÔMICA OBRIGATÓRIA (PRIORIDADE CRÍTICA):
- O rosto e o corpo DEVEM pertencer NATURALMENTE à mesma pessoa — como uma FOTOGRAFIA REAL.
- O tom de pele do rosto DEVE ser IDÊNTICO ao tom de pele do pescoço, mãos e corpo. Sem diferenças de cor.
- A iluminação no rosto DEVE ser consistente com a iluminação no corpo e ambiente. Mesma direção de luz, mesma intensidade.
- O tamanho do rosto DEVE ser proporcional ao corpo. NÃO gere rostos grandes demais ou pequenos demais.
- O pescoço DEVE conectar naturalmente a cabeça ao tronco — sem cortes, sem transições visíveis, sem "colagem".
- A perspectiva/ângulo do rosto DEVE ser coerente com a pose corporal.
- Gere a pessoa INTEIRA como uma unidade orgânica — NÃO gere o rosto separadamente do corpo.
- O cabelo deve ter transição natural com o pescoço/ombros, sem bordas artificiais.`;

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
      textPrompt += `\n\nMÚLTIPLAS PESSOAS (${personCount}): Cada pessoa DEVE ter o rosto EXATO da referência correspondente.${personDescriptions}${anatomicalRules}`;
    } else if (validFaceRefs.length > 0 && validGeneralRefs.length > 0) {
      textPrompt += `\n\nPESSOA + PRODUTO: Gere esta EXATA pessoa (das fotos de referência) usando/segurando o produto. ${singleGender} COPIE FIELMENTE: estrutura óssea, olhos, nariz, lábios, sobrancelhas, linha do maxilar, tom de pele, cor/textura do cabelo. Rosto visível de frente ou 3/4, bem iluminado. A pessoa DEVE interagir naturalmente com o produto.${anatomicalRules}`;
    } else if (validFaceRefs.length > 0) {
      textPrompt += `\n\nIDENTIDADE FACIAL OBRIGATÓRIA: A pessoa na imagem DEVE ser EXATAMENTE a pessoa das fotos de referência. ${singleGender} Copie com precisão cirúrgica: estrutura óssea, formato dos olhos, nariz, lábios, sobrancelhas, linha do maxilar, tom de pele, cor e textura do cabelo, formato do rosto. Rosto visível de frente ou 3/4, bem iluminado, sem obstruções.${anatomicalRules}`;
    }

    // Detect special modes from prompt content
    const isRealEstatePrompt = /FOTO DO IMÓVEL|FOTO REAL|imóvel|imovel|propriedade|property photo/i.test(imagePrompt);
    const isExtremeMode = isExtremePrompt;
    const isAppMockup = /app|aplicativo|celular|smartphone|tela|mockup|print.*app|screenshot|sistema|dashboard|plataforma|software|crm|erp/i.test(imagePrompt);

    // === EXTREME MODE: Inject professional design DNA ===
    if (isExtremeMode) {
      textPrompt += `\n\n🎯 PADRÃO DE QUALIDADE PROFISSIONAL (OBRIGATÓRIO):
Você é um designer gráfico SÊNIOR de uma agência premium. O resultado DEVE parecer um post criado por uma agência de design de alto nível, NÃO algo amador ou genérico.

REGRAS DE DESIGN EDITORIAL:
1. TIPOGRAFIA: Use fontes ELEGANTES e MODERNAS. Título em fonte BOLD grande e impactante (tipo Montserrat Bold, Playfair Display ou similar). Subtítulos em fonte fina e leve. NUNCA use fontes genéricas, Comic Sans, ou fontes que pareçam "default". A tipografia deve ter HIERARQUIA CLARA: título grande > subtítulo médio > detalhes pequenos.
2. COMPOSIÇÃO: Use a REGRA DOS TERÇOS. Elementos alinhados com precisão milimétrica. Espaçamento generoso entre elementos. Nada amontoado, nada desalinhado. Layout LIMPO e RESPIRADO.
3. CORES: Paleta COESA de no máximo 3-4 cores. Contraste alto entre texto e fundo. Se o fundo é escuro, use textos claros com detalhes de cor de destaque (laranja, dourado, azul elétrico). Se o fundo é claro, use textos escuros elegantes.
4. ELEMENTOS GRÁFICOS: Use elementos sutis como gradientes, linhas finas decorativas, formas geométricas suaves, ícones minimalistas. NUNCA sobrecarregue — menos é mais.
5. MOCKUPS: Se há screenshot de app, use mockup de iPhone 15 Pro REALISTA com reflexos e sombras sutis, ângulo levemente inclinado (3/4), como em anúncio da Apple.
6. TEXTOS: Máximo 3 blocos de texto. Título CURTO e PODEROSO (máx 6 palavras). Subtítulo explicativo (máx 15 palavras). CTA opcional. ZERO parágrafos longos.
7. FULL BLEED: Preencha 100% do canvas. Zero bordas. Zero espaço desperdiçado.

REFERÊNCIA DE QUALIDADE: Pense em posts do Instagram de marcas como Apple, Nike, Nubank, Avenue, XP — design minimalista, tipografia impecável, composição premium.`;
    }

    if (validGeneralRefs.length > 0 && isRealEstatePrompt) {
      textPrompt += `\n\n📸 FOTO REAL DO IMÓVEL (PRIORIDADE MÁXIMA): A imagem de referência fornecida é uma FOTOGRAFIA REAL do imóvel. Você DEVE usar esta foto como a imagem principal/de fundo do card. NÃO gere uma casa ou imóvel artificial — INCORPORE a foto real no design. A foto real deve ocupar pelo menos 60-80% da área visual do card. Aplique o estilo editorial (textos, badges, overlays, elementos gráficos) POR CIMA da foto real. Trate a foto como se fosse uma imagem de fundo editorializada.`;
    } else if (validGeneralRefs.length > 0 && isAppMockup) {
      textPrompt += `\n\n📱 MOCKUP DE APP (PRIORIDADE MÁXIMA): As imagens de referência de produto contêm SCREENSHOTS REAIS do aplicativo do usuário.
INSTRUÇÕES PRECISAS PARA O MOCKUP:
- Crie um iPhone 15 Pro FOTORREALISTA (bordas em titânio, Dynamic Island no topo).
- Posicione o celular em ângulo 3/4 levemente inclinado para a direita, como um anúncio premium da Apple.
- Use o screenshot APENAS como base estrutural da interface (layout, blocos, proporções e hierarquia visual), NÃO como texto a ser re-renderizado.
- NUNCA reproduza nomes de marca, nomes de app, logos, @handles ou qualquer texto institucional presente na screenshot.
- Se a screenshot contiver “Ellocontent”, “Ellosuit” ou variações, REMOVA/IGNORE completamente esse texto ao compor a tela.
- Adicione reflexos sutis no vidro da tela e sombra realista embaixo do celular.
        - O fundo deve complementar a composição: gradiente escuro premium, elementos gráficos sutis, ou ambiente clean.
        - O aparelho e a tela DEVEM ficar totalmente dentro da SAFE AREA, com respiro nas quatro bordas.
        - O título deve estar ACIMA ou AO LADO do mockup, nunca sobrepondo a tela do app.
- NÃO gere uma interface genérica ou inventada, mas também NÃO copie literalmente textos de branding da screenshot.`;
    } else if (validGeneralRefs.length > 0 && isExtremeMode) {
      textPrompt += `\n\n🎨 REFERÊNCIAS VISUAIS OBRIGATÓRIAS (MODO EXTREME): As imagens de referência fornecidas são ELEMENTOS OBRIGATÓRIOS que o usuário quer ver no resultado final. INCORPORE cada referência fielmente na composição — se é um logo, inclua-o no design; se é um screenshot, mostre-o em um mockup de celular profissional; se é um produto, destaque-o. Estas NÃO são referências de estilo — são CONTEÚDO que deve aparecer na imagem final.`;
    } else if (validGeneralRefs.length > 0 && validFaceRefs.length === 0) {
      textPrompt += `\n\nPRODUTO/SCREENSHOT OBRIGATÓRIO: As imagens de referência fornecidas são CONTEÚDO REAL do usuário (screenshot de app, produto, etc.). Você DEVE incorporar estas imagens FIELMENTE no design. Se for um screenshot de aplicativo/sistema: coloque-o dentro de um mockup de smartphone ou laptop premium. Se for um produto: mostre-o em destaque. NÃO gere uma versão genérica ou inventada — use a imagem EXATA fornecida.`;
    }

    // Brand colors — always apply when provided (user's brand identity overrides style palette)
    if (brandColors && Array.isArray(brandColors) && brandColors.length > 0) {
      textPrompt += `\n\nCORES DA MARCA (PRIORIDADE MÁXIMA): A paleta da marca do usuário é: ${brandColors.join(', ')}. Você DEVE adaptar a composição para usar estas cores predominantemente. Substitua as cores do estilo original pelas cores da marca. O fundo, elementos decorativos, acentos e tipografia devem refletir esta paleta. Mantenha o layout e a estrutura editorial do estilo, apenas TROQUE as cores.`;
    }

    // Custom colors — user-selected palette overrides everything
    if (customColors && Array.isArray(customColors) && customColors.length > 0) {
      textPrompt += `\n\nCORES PERSONALIZADAS (PRIORIDADE ABSOLUTA - ACIMA DE TUDO): O usuário selecionou estas cores específicas: ${customColors.join(', ')}. Você DEVE usar EXCLUSIVAMENTE estas cores como a paleta principal. IGNORE COMPLETAMENTE as cores do estilo/template original. Todos os fundos, gradientes, elementos decorativos, tipografia e acentos visuais DEVEM ser baseados nestas cores. Mantenha o layout e a estrutura, mas SUBSTITUA 100% da paleta por estas cores.`;
    }

    // === 2-STAGE APPROACH: Stage 1 generates WITH face refs (best effort),
    // Stage 2 REFINES facial fidelity using the generated image + face refs again.
    // This is better than generating a generic face and trying to swap.
    const isTwoStageMode = validFaceRefs.length > 0 && !isMultiPerson;

    if (isTwoStageMode) {
      console.log('🎭 2-STAGE MODE: Stage 1 generates WITH face refs, Stage 2 refines fidelity');
    }

    if (isVisualCloneMode) {
      // VISUAL CLONE MODE — always send face refs in Stage 1

      if (validFaceRefs.length > 0) {
        // Limit style refs when face refs present to avoid visual competition
        const maxStyleRefs = validFaceRefs.length > 0 ? Math.min(validStyleRefs.length, 3) : validStyleRefs.length;
        
        // Face refs FIRST — highest priority
        messageContent.push({ type: 'text', text: `🚨 IDENTIDADE FACIAL OBRIGATÓRIA — Esta é a pessoa que DEVE aparecer na imagem. Copie EXATAMENTE este rosto:` });
        for (const ref of validFaceRefs) {
          messageContent.push({ type: 'image_url', image_url: { url: ref } });
        }

        // Style refs AFTER face refs — with pre-warning
        messageContent.push({ type: 'text', text: `⚠️ As próximas imagens são REFERÊNCIAS DE ESTILO — IGNORE todo texto visível nelas:` });
        for (const ref of validStyleRefs.slice(0, maxStyleRefs)) {
          messageContent.push({ type: 'image_url', image_url: { url: ref } });
        }
        messageContent.push({ type: 'text', text: `✅ FIM DAS REFERÊNCIAS. Copie APENAS estilo visual (cores, TIPOGRAFIA/FONTES, layout). DESCARTE todo texto/título/nome visível nas referências. O rosto DEVE ser EXCLUSIVAMENTE o da pessoa nas fotos de identidade facial. Os textos DEVEM vir APENAS do CONTEÚDO DO POST abaixo. NUNCA use referências como conteúdo dentro de mockups ou dispositivos.` });
      } else {
        // No face refs — send pre-warning BEFORE images to prime AI against text copying
        messageContent.push({ type: 'text', text: `⚠️ AVISO CRÍTICO ANTES DAS REFERÊNCIAS: As próximas ${validStyleRefs.length} imagens são APENAS referências de ESTILO VISUAL. Os textos, títulos, nomes, placares, resultados, marcas e QUALQUER conteúdo textual visível nessas imagens são de OUTROS POSTS e DEVEM SER 100% IGNORADOS. Você NÃO deve ler, memorizar ou reproduzir NENHUMA palavra dessas imagens. Extraia APENAS: paleta de cores, tipografia/fonte (família, peso, estilo), layout, elementos decorativos e composição visual.` });
        // Send all style refs
        for (const ref of validStyleRefs) {
          messageContent.push({ type: 'image_url', image_url: { url: ref } });
        }
        messageContent.push({ type: 'text', text: `✅ FIM DAS REFERÊNCIAS DE ESTILO. RESUMO OBRIGATÓRIO:\n1. Copie APENAS: cores, TIPOGRAFIA/FONTES (mesma família, peso, estilo), layout, elementos gráficos decorativos.\n2. DESCARTE COMPLETAMENTE todo texto visível nas referências — títulos, nomes, placares, resultados esportivos, marcas, @handles, frases.\n3. Os ÚNICOS textos que devem aparecer na imagem final são os fornecidos no CONTEÚDO DO POST abaixo.\n4. NUNCA use uma referência como conteúdo dentro de mockups, telas ou dispositivos — são APENAS inspiração estética.` });
      }

      messageContent.push({ type: 'text', text: textPrompt });
      if (validGeneralRefs.length > 0 && isRealEstatePrompt) {
        messageContent.push({ type: 'text', text: `📸 FOTO REAL DO IMÓVEL ABAIXO — Use esta foto como imagem principal do card. NÃO gere uma casa diferente:` });
      } else if (validGeneralRefs.length > 0 && isAppMockup) {
        messageContent.push({ type: 'text', text: `📱 SCREENSHOT REAL DO APP ABAIXO — Coloque esta imagem EXATAMENTE na tela de um mockup de smartphone premium. Reproduza PIXEL A PIXEL o conteúdo da tela. NÃO invente uma interface diferente:` });
      } else if (validGeneralRefs.length > 0) {
        messageContent.push({ type: 'text', text: `🎨 CONTEÚDO VISUAL OBRIGATÓRIO ABAIXO — Esta imagem deve aparecer FIELMENTE no resultado (em mockup se for screenshot, em destaque se for produto):` });
      }
      for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      if (validGeneralRefs.length > 0 && isRealEstatePrompt) {
        messageContent.push({ type: 'text', text: `A foto acima é a FOTOGRAFIA REAL do imóvel. Ela DEVE ser a imagem principal/de fundo do post. Integre textos e elementos gráficos do estilo POR CIMA desta foto real.` });
      } else if (validGeneralRefs.length > 0) {
        messageContent.push({ type: 'text', text: `A imagem acima é CONTEÚDO REAL do usuário. Ela DEVE aparecer fielmente no resultado final — NÃO gere uma versão inventada ou genérica.` });
      }
    } else {
      // STANDARD MODE

      if (validFaceRefs.length > 0 && isMultiPerson) {
        // Multi-person: send face refs inline (single-stage)
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
        // Single person: send face refs with strong identity instructions
        messageContent.push({ type: 'text', text: `🚨 IDENTIDADE FACIAL OBRIGATÓRIA — Esta é a pessoa que DEVE aparecer na imagem. Copie EXATAMENTE este rosto:` });
        for (const ref of validFaceRefs) {
          messageContent.push({ type: 'image_url', image_url: { url: ref } });
        }
      }

      if (validStyleRefs.length > 0) {
        messageContent.push({ type: 'text', text: `⚠️ REFERÊNCIAS DE ESTILO (${validStyleRefs.length} imagens) — IGNORE TODO TEXTO visível nelas. Copie APENAS: cores, TIPOGRAFIA/FONTES, layout, elementos decorativos. NUNCA reproduza títulos, nomes, placares, frases ou qualquer conteúdo textual das referências:` });
        for (const ref of validStyleRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      }

      messageContent.push({ type: 'text', text: textPrompt });
      if (validGeneralRefs.length > 0 && isRealEstatePrompt) {
        messageContent.push({ type: 'text', text: `📸 FOTO REAL DO IMÓVEL ABAIXO — Use esta foto como imagem principal do card. NÃO gere uma casa diferente:` });
      } else if (validGeneralRefs.length > 0 && isAppMockup) {
        messageContent.push({ type: 'text', text: `📱 SCREENSHOT REAL DO APP ABAIXO — Coloque esta imagem EXATAMENTE na tela de um mockup de smartphone premium (iPhone 15 Pro). Reproduza PIXEL A PIXEL o conteúdo da tela. NÃO invente uma interface diferente. NÃO altere o conteúdo:` });
      } else if (validGeneralRefs.length > 0) {
        messageContent.push({ type: 'text', text: `🎨 CONTEÚDO VISUAL OBRIGATÓRIO ABAIXO — Esta imagem deve aparecer FIELMENTE no resultado (em mockup premium se for screenshot, em destaque se for produto):` });
      }
      for (const ref of validGeneralRefs) messageContent.push({ type: 'image_url', image_url: { url: ref } });
      if (validGeneralRefs.length > 0 && isRealEstatePrompt) {
        messageContent.push({ type: 'text', text: `A foto acima é a FOTOGRAFIA REAL do imóvel. INCORPORE-A como imagem de fundo/principal do post.` });
      } else if (validGeneralRefs.length > 0) {
        messageContent.push({ type: 'text', text: `A imagem acima é CONTEÚDO REAL do usuário — DEVE aparecer fielmente. Para screenshots: mockup de celular/laptop. Para produtos: destaque na composição. NÃO gere versão genérica.` });
      }

      if (validStyleRefs.length > 0) {
        messageContent.push({ type: 'text', text: `LEMBRETE: Copie o ESTILO VISUAL das referências (cores, TIPOGRAFIA/FONTES exatas, decoração, layout) mas NUNCA copie textos/títulos/nomes visíveis nelas. A FONTE usada nos textos DEVE ser a MESMA família tipográfica das referências. Renderize APENAS os textos fornecidos no prompt. NUNCA coloque uma imagem de referência de estilo como conteúdo dentro de telas de celular, computador ou qualquer mockup de dispositivo.` });
      }
      if (validFaceRefs.length > 0) {
        messageContent.push({ type: 'text', text: `LEMBRETE FINAL: A prioridade #1 é a FIDELIDADE FACIAL. O rosto DEVE ser idêntico às fotos de referência.` });
      }
    }

    // === FONT REFERENCE: Dedicated font image for AI to replicate ===
    if (fontReferenceImage) {
      const fontLabel = fontReferenceName || 'selecionada';
      messageContent.push({ type: 'text', text: `🔤 FONTE TIPOGRÁFICA OBRIGATÓRIA — A imagem abaixo mostra a fonte "${fontLabel}" que você DEVE usar em TODOS os textos do design. Replique 100% fielmente: estilo, peso, serifas, proporções, espaçamento e personalidade visual desta fonte. NÃO use outra fonte. Esta é a referência ABSOLUTA de tipografia:` });
      messageContent.push({ type: 'image_url', image_url: { url: fontReferenceImage } });
      messageContent.push({ type: 'text', text: `REGRA DE TIPOGRAFIA INVIOLÁVEL: A fonte renderizada no post DEVE ser VISUALMENTE IDÊNTICA à imagem de referência acima ("${fontLabel}"). Copie cada detalhe: serifas ou sem serifas, peso (bold/light/regular), largura, espaçamento entre letras, estilo decorativo. A tipografia é tão importante quanto o conteúdo visual. Se a fonte é bold e impactante, use bold e impactante. Se é elegante e fina, use elegante e fina. FIDELIDADE TOTAL.` });
      console.log('Font reference injected:', fontLabel, 'base64 length:', fontReferenceImage.length);
    }

    // === LOGO IMAGE: Send to AI when logoMode is 'ai', otherwise handled via Canvas overlay ===
    if (logoImageUrl && logoMode === 'ai') {
      messageContent.push({ type: 'text', text: `🏷️ LOGOMARCA DA MARCA — A imagem abaixo é a logomarca oficial que DEVE ser posicionada no design. Coloque-a de forma DISCRETA e PROFISSIONAL em um canto que harmonize com a composição. Mantenha-a PEQUENA mas LEGÍVEL. NÃO altere, redesenhe, recorte ou distorça a logo — use EXATAMENTE como fornecida, COMPLETA E INTEIRA (símbolo + texto/wordmark se houver). NUNCA use apenas parte da logo (ex: só o ícone sem o nome):` });
      messageContent.push({ type: 'image_url', image_url: { url: logoImageUrl } });
      console.log('Logo sent to AI for positioning (logoMode=ai), length:', logoImageUrl.length);
    } else if (logoImageUrl) {
      console.log('Logo provided but NOT sent to AI — will be overlaid via Canvas. Position:', logoPosition);
    }

    // === DIAGNOSTIC: Log total message size ===
    const totalTextChars = messageContent.filter(p => p.type === 'text').reduce((sum, p) => sum + p.text.length, 0);
    const totalImages = messageContent.filter(p => p.type === 'image_url').length;
    console.log(`Message assembly: ${totalImages} images, ${totalTextChars} text chars, ${messageContent.length} parts, mode=${isVisualCloneMode ? 'VISUAL_CLONE' : 'STANDARD'}${fontReferenceImage ? ', HAS_FONT_REF' : ''}`);

    // Model selection
    const requestedModel = (imageModel || 'auto').toString().toLowerCase();
    const prefersPremiumModel = requestedModel === 'elloia' || requestedModel === 'nano-banana';
    const resolvedModel = requestedModel === 'auto'
      ? ((hasFaceRefs || hasStyleRefs || isPanoramicMode) ? 'elloia' : 'gemini')
      : requestedModel;
    const forcePremiumForPanorama = isPanoramicMode;
    const usePremium = forcePremiumForPanorama || resolvedModel === 'elloia' || resolvedModel === 'nano-banana' || prefersPremiumModel;
    const primaryModel = usePremium ? 'google/gemini-3-pro-image-preview' : 'google/gemini-3.1-flash-image-preview';
    const fallbackModel = 'google/gemini-3.1-flash-image-preview';
    console.log('Model:', primaryModel, 'panoramic:', isPanoramicMode, 'aspect:', outputAspectRatio);

    async function tryGenerate(model: string, content: any[], attempt: number, maxRetries = 3): Promise<string | null> {
      for (let retry = 0; retry <= maxRetries; retry++) {
        const label = retry === 0 ? `Attempt ${attempt}` : `Attempt ${attempt} retry ${retry}`;
        console.log(`${label} model=${model} parts=${content.length}`);
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
            ...(validFaceRefs.length > 0 ? { temperature: 0.1 } : validStyleRefs.length > 0 ? { temperature: 0.15 } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`${label} error:`, res.status, errText.slice(0, 500));
          
          // Rate limit: wait and retry with exponential backoff
          if (res.status === 429 && retry < maxRetries) {
            const waitSec = 5 + retry * 5; // 5s, 10s, 15s
            console.log(`${label}: Rate limited, waiting ${waitSec}s before retry ${retry + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, waitSec * 1000));
            continue;
          }
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
          console.log(`${label}: content blocked by safety filters`);
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
          console.log(`${label}: image extracted (${url.length} chars)`);
          return url;
        }
        console.log(`${label}: no image in response (${raw.length} chars)`);
        return null;
      }
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

    // Attempt 2: retry with pro model, simplified content
    if (!generatedImage && usePremium) {
      const retryContent: any[] = [];
      // Always send face refs in retries for best fidelity
      const activeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r));
      if (activeFaceRefs.length > 0) {
        retryContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL OBRIGATÓRIA — reproduza este EXATO rosto:` });
        for (const ref of activeFaceRefs.slice(0, 4)) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      const activeStyleRefs = validStyleRefs.filter(r => !blockedUrls.has(r)).slice(0, 4);
      for (const ref of activeStyleRefs) retryContent.push({ type: 'image_url', image_url: { url: ref } });
      if (isVisualCloneMode) {
        retryContent.push({ type: 'text', text: `Crie um post Instagram IDÊNTICO ao estilo das ${activeStyleRefs.length} referências de estilo. Conteúdo: ${imagePrompt.slice(0, 500)}. Texto em PORTUGUÊS BRASILEIRO. Full bleed. ${formatInstruction} ${compactSafeAreaReminder}` });
      } else if (stylePrompt) {
        retryContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO. ${compactSafeAreaReminder}` });
      } else {
        retryContent.push({ type: 'text', text: `Professional editorial photograph: ${imagePrompt}. ${formatInstruction}. ${compactSafeAreaReminder}` });
      }
      for (const ref of validGeneralRefs) { if (!blockedUrls.has(ref)) retryContent.push({ type: 'image_url', image_url: { url: ref } }); }
      try { generatedImage = await tryGenerate(primaryModel, retryContent, 2); } catch (e2: any) {
        if (e2?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
        if (e2?.reason === 'blocked_url' && e2?.blockedUrl) { blockedUrls.add(e2.blockedUrl); }
      }
    }

    // Attempt 3: pro model, minimal refs
    if (!generatedImage && usePremium) {
      const textOnlyContent: any[] = [];
      const safeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r)).slice(0, 3);
      if (safeFaceRefs.length > 0) {
        textOnlyContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL:` });
        for (const ref of safeFaceRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      const safeStyleRefs = validStyleRefs.filter(r => !blockedUrls.has(r)).slice(0, 2);
      for (const ref of safeStyleRefs) textOnlyContent.push({ type: 'image_url', image_url: { url: ref } });
      if (stylePrompt) {
        textOnlyContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO. ${compactSafeAreaReminder}` });
      } else {
        textOnlyContent.push({ type: 'text', text: `Professional editorial photograph: ${imagePrompt}. ${formatInstruction}. ${compactSafeAreaReminder}` });
      }
      try { generatedImage = await tryGenerate(primaryModel, textOnlyContent, 3); } catch (e3: any) {
        if (e3?.reason === 'nsfw') { return new Response(JSON.stringify({ error: 'Conteúdo bloqueado pelos filtros de segurança.', code: 'CONTENT_BLOCKED' }), { status: 451, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
      }
    }

    // Attempt 4: flash fallback
    if (!generatedImage) {
      const fallbackContent: any[] = [];
      const safeFaceRefs = validFaceRefs.filter(r => !blockedUrls.has(r)).slice(0, 4);
      if (safeFaceRefs.length > 0) {
        fallbackContent.push({ type: 'text', text: `⚠️ IDENTIDADE FACIAL:` });
        for (const ref of safeFaceRefs) fallbackContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      if (stylePrompt) {
        fallbackContent.push({ type: 'text', text: `${stylePrompt}\n\n${imagePrompt}\n\n${formatInstruction}. Texto em PORTUGUÊS BRASILEIRO. ${compactSafeAreaReminder}` });
      } else {
        fallbackContent.push({ type: 'text', text: `Beautiful professional editorial image: ${imagePrompt.split(/[.,;:!?]/)[0]?.trim() || 'professional scene'}. ${formatInstruction}. ${compactSafeAreaReminder}` });
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

    // === STAGE 2: FACE SWAP ===
    // If 2-stage mode, take the generated image and swap the placeholder face with the real face
    if (isTwoStageMode && generatedImage) {
      console.log('🎭 Stage 2: Face refinement starting...');
      
      const refineContent: any[] = [];
      
      // Send max 3 face refs for Stage 2 to stay within compute limits
      const stage2FaceRefs = validFaceRefs.slice(0, 3);
      refineContent.push({ type: 'text', text: `🚨 REFERÊNCIAS FACIAIS — Estas ${stage2FaceRefs.length} fotos mostram a pessoa EXATA cujo rosto deve aparecer na imagem final:` });
      for (const ref of stage2FaceRefs) {
        refineContent.push({ type: 'image_url', image_url: { url: ref } });
      }
      
      // Then send the generated image
      refineContent.push({ type: 'text', text: `A imagem abaixo é o RESULTADO ATUAL. Refine o rosto para ficar MAIS PARECIDO com as referências:` });
      refineContent.push({ type: 'image_url', image_url: { url: generatedImage } });
      
      const aspectInstr = outputAspectRatio === '9:16' 
        ? 'Output MUST be PORTRAIT 9:16 (1080x1920). Fill the entire vertical canvas.'
        : `Output aspect ratio: ${outputAspectRatio}. Fill the entire canvas.`;
      
      refineContent.push({ type: 'text', text: `REGRAS DE REFINAMENTO FACIAL:
1. MANTENHA TUDO IDÊNTICO: fundo, roupas, pose, textos, logos, cores, layout — mude APENAS o rosto.
2. O rosto DEVE reproduzir: estrutura óssea, olhos, nariz, lábios, sobrancelhas, tom de pele, cabelo.
3. ${aspectInstr}. SEM bordas, SEM barras pretas.
4. ${singleGender}
5. Ajustes SUTIS — não recrie do zero. Integração anatômica natural.` });

      // Use flash model for Stage 2 to avoid WORKER_LIMIT
      let refinedImage: string | null = null;
      const stage2Model = 'google/gemini-3.1-flash-image-preview';
      
      try {
        console.log(`🎭 Face refinement with ${stage2Model}...`);
        const refineRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: stage2Model,
            messages: [{ role: 'user', content: refineContent }],
            modalities: ['image', 'text'],
            temperature: 0.05,
          }),
        });
        
        if (refineRes.ok) {
          const raw = await refineRes.text();
          const extractPatterns = ['"url":"data:image/', '"url": "data:image/'];
          for (const pattern of extractPatterns) {
            const idx = raw.indexOf(pattern);
            if (idx === -1) continue;
            const urlStart = raw.indexOf('"', idx + 5) + 1;
            const urlEnd = raw.indexOf('"', urlStart);
            if (urlEnd === -1) continue;
            refinedImage = raw.slice(urlStart, urlEnd);
            break;
          }
          if (refinedImage) {
            console.log(`🎭 Face refinement SUCCESS (${refinedImage.length} chars)`);
            generatedImage = refinedImage;
          } else {
            console.log('Face refinement: no image in response');
          }
        } else {
          const errText = await refineRes.text();
          console.error('Face refinement error:', refineRes.status, errText.slice(0, 300));
        }
      } catch (refineErr: any) {
        console.error('Face refinement error:', refineErr);
      }
      
      if (!refinedImage) {
        console.log('⚠️ Face refinement failed, returning Stage 1 image');
      }
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
