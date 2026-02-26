// Edge function for carousel generation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, topic, keywords, cardCount, prompt, imageSize, query, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, username, imageModel, negativePrompt, fidelity, marketplaceStyleConfig } = body;

    // ===== INSTAGRAM PROFILE FETCH =====
    if (action === 'instagram-profile') {
      const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
      if (!SERPAPI_API_KEY) {
        return new Response(JSON.stringify({ error: 'SERPAPI_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const igUsername = (username || '').replace(/^@/, '').trim();
      if (!igUsername) {
        return new Response(JSON.stringify({ error: 'Username is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Fetching Instagram profile for:', igUsername);

      const igUrl = `https://www.searchapi.io/api/v1/search?engine=instagram_profile&username=${encodeURIComponent(igUsername)}&api_key=${SERPAPI_API_KEY}`;
      const igRes = await fetch(igUrl);

      if (!igRes.ok) {
        const errText = await igRes.text();
        console.error('Instagram API error:', igRes.status, errText);
        const isRateLimit = igRes.status === 429;
        const errorMsg = isRateLimit 
          ? 'Limite mensal do SearchAPI.io atingido. Faça upgrade do plano ou aguarde a renovação.' 
          : `Erro ao buscar perfil do Instagram (${igRes.status})`;
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: igRes.status === 429 ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const igData = await igRes.json();
      const profile = igData.profile || {};
      const posts = (igData.posts || []).slice(0, 12);

      // Return image URLs directly - no base64 proxy to avoid CPU spikes
      function passThrough(imageUrl: string): string {
        return imageUrl;
      }

      // Collect raw image URLs first
      const rawImages: { id: string; url: string; thumb: string; label: string; type: string }[] = [];

      if (profile.avatar_hd || profile.avatar) {
        rawImages.push({
          id: 'avatar',
          url: profile.avatar_hd || profile.avatar,
          thumb: profile.avatar || profile.avatar_hd,
          label: `${profile.name || igUsername} - Foto de perfil`,
          type: 'avatar',
        });
      }

      for (const post of posts) {
        if (post.link) {
          rawImages.push({
            id: post.id || `post-${rawImages.length}`,
            url: post.link,
            thumb: post.thumbnail || post.link,
            label: (post.caption || '').slice(0, 60) || `Post de @${igUsername}`,
            type: 'post',
          });
        }
        if (post.carousel_items) {
          for (const item of post.carousel_items.slice(0, 3)) {
            if (item.link && item.type === 'image') {
              rawImages.push({
                id: item.id || `carousel-${rawImages.length}`,
                url: item.link,
                thumb: item.link,
                label: `Carrossel de @${igUsername}`,
                type: 'post',
              });
            }
          }
        }
      }

      // Return URLs directly - no CPU-heavy base64 conversion
      const images = rawImages.slice(0, 8).map(img => ({
        ...img,
        url: passThrough(img.url),
        thumb: passThrough(img.thumb),
      }));

      return new Response(JSON.stringify({
        success: true,
        profile: {
          username: profile.username || igUsername,
          name: profile.name || igUsername,
          bio: profile.bio || '',
          avatar: images.find(i => i.type === 'avatar')?.thumb || profile.avatar_hd || profile.avatar || '',
          followers: profile.followers || 0,
          is_verified: profile.is_verified || false,
        },
        images,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== WEB SEARCH for reference images (Brave Search only) =====
    if (action === 'web-search') {
      const searchQuery = query || topic || '';
      if (!searchQuery) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let images: any[] = [];

      // Helper: filter out small/bad images
      const MIN_WIDTH = 600;
      const MIN_HEIGHT = 400;
      const BAD_URL_PATTERNS = [/logo/i, /icon/i, /favicon/i, /badge/i, /banner.*ad/i, /\.gif$/i, /\.svg$/i, /thumbnail/i, /infographic/i, /chart/i, /diagram/i];
      const isGoodImage = (img: any) => {
        if (!img.url) return false;
        if (BAD_URL_PATTERNS.some(p => p.test(img.url))) return false;
        if (img.width && img.width < MIN_WIDTH) return false;
        if (img.height && img.height < MIN_HEIGHT) return false;
        return true;
      };

      // Strategy 1: Brave Search FIRST (real Google-like images, most relevant)
      const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
      if (BRAVE_API_KEY) {
        console.log('[web-search] Trying Brave Search first for:', searchQuery);
        try {
          const photoQuery = searchQuery;
          const braveUrl = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(photoQuery)}&count=50&safesearch=strict&size=Large`;
          const braveRes = await fetch(braveUrl, { headers: { 'X-Subscription-Token': BRAVE_API_KEY } });
          if (braveRes.ok) {
            const braveData = await braveRes.json();
            const braveImages = (braveData.results || []).slice(0, 50).map((item: any, idx: number) => ({
              id: `brave-${idx}`,
              url: item.properties?.url || item.thumbnail?.src,
              thumb: item.thumbnail?.src || item.properties?.url,
              alt: item.title || searchQuery,
              photographer: item.source || 'Google',
              source: 'brave',
              width: item.properties?.width,
              height: item.properties?.height,
            })).filter(isGoodImage);
            images = [...images, ...braveImages];
            console.log('[web-search] Brave returned', braveImages.length, 'quality images');
          }
        } catch (e) { console.error('[web-search] Brave exception:', e); }
      }


      // If no images found at all, return error
      if (images.length === 0) {
        return new Response(JSON.stringify({ error: 'Nenhuma imagem encontrada. Verifique sua conexão ou entre em contato com o suporte.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, images, query: searchQuery }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== ANALYZE PRODUCT =====
    if (action === 'analyze-product') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { imageUrl } = body;
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const analyzeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `You are a product image analyzer. Analyze the image and identify the product type and describe it.

Return a JSON object with:
- "type": one of "clothing", "object", "food", or "unknown"
- "description": a concise description in Portuguese of what the product is (e.g. "Camiseta polo azul marinho com logo bordado", "Smartphone preto com tela grande", "Hambúrguer artesanal com queijo cheddar")
- "suggestions": array of 2-4 suggestions in Portuguese for how to showcase this product in carousel images

Examples of suggestions per type:
- clothing: ["Recriar em modelos diferentes", "Mostrar em cenários urbanos", "Close-up dos detalhes", "Flat lay com acessórios"]
- object: ["Mockup em ambiente de escritório", "Pessoa segurando o produto", "Close-up detalhado", "Composição lifestyle"]
- food: ["Food styling profissional", "Close-up apetitoso", "Composição com ingredientes", "Mesa posta elegante"]

Respond ONLY with the JSON object, no markdown or explanation.` },
            { role: 'user', content: [
              { type: 'text', text: 'Analyze this product image:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ] },
          ],
        }),
      });

      if (!analyzeResponse.ok) {
        console.error('Product analysis error:', analyzeResponse.status);
        return new Response(JSON.stringify({ success: false, error: 'Erro ao analisar produto' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const analyzeData = await analyzeResponse.json();
      const content = analyzeData.choices?.[0]?.message?.content || '';
      
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(cleaned);
        return new Response(JSON.stringify({ success: true, analysis }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('Failed to parse product analysis:', content);
        return new Response(JSON.stringify({ 
          success: true, 
          analysis: { type: 'unknown', description: 'Produto identificado', suggestions: ['Usar como referência visual'] }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== ENHANCE PROMPT =====
    if (action === 'enhance-prompt') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const enhanceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `Você é um especialista em criação de conteúdo editorial para Instagram. Receba um tópico simples e transforme em um prompt OTIMIZADO e DETALHADO para gerar um carrossel profissional.

REGRAS:
- Expanda o tópico com detalhes específicos, ângulos editoriais interessantes e gancho de engajamento
- Se mencionar marcas/pessoas reais, adicione contexto relevante sobre eles
- NÃO mencione nenhuma plataforma, produto ou marca que o usuário não tenha mencionado explicitamente
- Mantenha o tom profissional e editorial
- O resultado deve ser 2-4 frases, máximo 200 palavras
- Responda APENAS com o prompt melhorado, sem explicações adicionais
- Em português brasileiro` },
            { role: 'user', content: `Tópico original: ${prompt || topic}` },
          ],
        }),
      });

      if (!enhanceResponse.ok) {
        const errText = await enhanceResponse.text();
        console.error('Enhance prompt error:', enhanceResponse.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao melhorar prompt' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const enhanceData = await enhanceResponse.json();
      const enhanced = enhanceData.choices?.[0]?.message?.content || prompt || topic;

      return new Response(JSON.stringify({ success: true, enhancedPrompt: enhanced.trim() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GENERATE CONTENT =====
    if (action === 'generate-content') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const numCards = cardCount || 7;
      const imageCardIndices = body.imageCardIndices || []; // which cards should have images
      const styleConfig = body.marketplaceStyleConfig;
      const hasMarketplaceStyle = styleConfig?.imageGeneration?.prompt_style;

      // Build style-specific instructions for imagePrompt generation
      const styleImagePromptInstructions = hasMarketplaceStyle
        ? `\n\nESTILO VISUAL OBRIGATÓRIO PARA TODOS OS imagePrompts:
Cada imagePrompt DEVE seguir rigorosamente este estilo visual:
${styleConfig.imageGeneration.prompt_style}

${styleConfig.cardVariations ? `VARIAÇÕES DE CARD (alterne entre elas):
${styleConfig.cardVariations.map((v: any, i: number) => `${i + 1}. Tipo "${v.type}": ${v.description}`).join('\n')}` : ''}

IMPORTANTE: Os imagePrompts devem descrever A IMAGEM COMPLETA com texto, tipografia, elementos decorativos e composição editorial integrados. NÃO gere apenas uma foto - gere a COMPOSIÇÃO FINAL do post como ele apareceria no Instagram.`
        : '';

      const systemPrompt = `Você é um especialista em criação de carrosséis editoriais profissionais para Instagram no formato 1080x1350.

Gere conteúdo para um carrossel de ${numCards} cards sobre o tópico fornecido.

IMPORTANTE: Gere o conteúdo EXCLUSIVAMENTE sobre o tópico fornecido pelo usuário. NÃO mencione a Ellosuit, nem qualquer outra plataforma ou ferramenta, a menos que o próprio tópico do usuário mencione explicitamente. O conteúdo deve ser 100% focado no tema solicitado.

REGRAS DE LAYOUT (siga EXATAMENTE):
- Card 1 (cover): Título impactante em CAIXA ALTA (máx 10 palavras) + subtítulo curto descritivo
- Cards 2 a ${numCards - 1} (content): Cada card tem DOIS blocos de texto:
  - "bodyTop": Parágrafo principal (30-60 palavras), informativo e denso. Deve conter trechos-chave que serão destacados em cor accent (coloque entre **asteriscos duplos** os trechos mais importantes, máx 15 palavras destacadas)
  - "bodyBottom": Segundo parágrafo (20-40 palavras), complementar, dados adicionais ou contexto
  - "imagePrompt": Descrição detalhada para gerar uma imagem de alta qualidade. ${hasMarketplaceStyle ? 'DEVE seguir o estilo visual definido abaixo.' : 'Se o tópico mencionar marcas, produtos ou PESSOAS REAIS, descreva visualmente o que deveria aparecer com detalhes'}
  - "searchTerms": Array de termos para buscar fotos de referência na web (ex: ["Toguro fitness", "Cimed logo", "suplemento proteico"]). Inclua nomes reais de pessoas e marcas mencionadas.
  - "needsImage": boolean - true se este card precisa de imagem baseado no conteúdo
- Card ${numCards} (cta): CTA + mensagem motivacional

${imageCardIndices.length > 0 ? `IMPORTANTE: Os cards nas posições ${imageCardIndices.join(', ')} DEVEM ter imagens (needsImage=true). Os demais podem ser somente texto.` : ''}

IMPORTANTE sobre imagePrompt e searchTerms:
- Se o tópico menciona PESSOAS REAIS (celebridades, influenciadores), inclua o nome deles em searchTerms para buscar fotos de referência
- Se menciona MARCAS, inclua o nome + "logo" ou "produto" em searchTerms
- imagePrompt deve descrever a cena visual detalhadamente (iluminação, composição, estilo)
- searchTerms são para buscar referências reais na web
${styleImagePromptInstructions}

Responda APENAS em JSON válido:
{
  "title": "título do carrossel",
  "cards": [
    {
      "type": "cover",
      "title": "TÍTULO IMPACTANTE EM CAIXA ALTA",
      "subtitle": "Subtítulo descritivo curto",
      "imagePrompt": "descrição visual para imagem de capa",
      "searchTerms": ["termo1", "termo2"],
      "needsImage": true
    },
    {
      "type": "content",
      "bodyTop": "Parágrafo principal com **trechos destacados** em negrito...",
      "bodyBottom": "Segundo parágrafo complementar...",
      "imagePrompt": "descrição visual para imagem do card",
      "searchTerms": ["termo de busca"],
      "needsImage": true
    },
    {
      "type": "cta",
      "title": "Gostou do conteúdo?",
      "body": "Salve, compartilhe e siga para mais!",
      "imagePrompt": "descrição visual para CTA",
      "searchTerms": [],
      "needsImage": false
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Tópico: ${topic}\nPalavras-chave: ${(keywords || []).join(', ')}${
              body.webSearchContent ? `\n\nDADOS REAIS DA WEB (USE OBRIGATORIAMENTE estes dados verificados para criar o conteúdo):\nTítulo: ${body.webSearchContent.title}\nResumo: ${body.webSearchContent.summary}\nFatos:\n${(body.webSearchContent.facts || []).map((f: any, i: number) => `${i + 1}. ${f.heading}: ${f.body} (Fonte: ${f.source})`).join('\n')}\n\nFontes: ${(body.webSearchCitations || []).slice(0, 5).join(', ')}\n\nIMPORTANTE: Baseie TODO o conteúdo nesses dados reais e verificados. Cite estatísticas e fatos reais.` : ''
            }${
              body.productContext ? `\n\nPRODUTO IDENTIFICADO:\n- Tipo: ${body.productContext.productType}\n- Descrição: ${body.productContext.productDescription}\n\nIMPORTANTE: O carrossel deve destacar este produto. Cada card de conteúdo deve mencionar ou contextualizar o produto. Os imagePrompts devem descrever cenas com o produto em destaque. Para roupas, descreva modelos vestindo a peça. Para objetos, descreva mockups e contextos de uso. Para alimentos, descreva composições food-styling.` : ''
            }` },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('AI Gateway error:', response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em alguns segundos.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Erro ao gerar conteúdo' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: 'Não foi possível processar o conteúdo gerado', raw: content }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GENERATE AI IMAGE — MOVED to generate-carousel-image function =====
    if (action === 'generate-ai-image') {
      return new Response(JSON.stringify({ error: 'Use generate-carousel-image function instead' }), {
        status: 301, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SEARCH IMAGES (Brave) =====
    if (action === 'search-images') {
      const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
      if (!BRAVE_API_KEY) {
        return new Response(JSON.stringify({ error: 'Serviço de busca de imagens indisponível. Entre em contato com o suporte.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || keywords?.join(' ') || topic;
      const perPage = body.perPage || 12;
      const braveUrl = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(searchQuery)}&count=${perPage}&safesearch=strict&size=Large`;
      const response = await fetch(braveUrl, { headers: { 'X-Subscription-Token': BRAVE_API_KEY } });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Brave search error:', response.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao buscar imagens. Entre em contato com o suporte.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const images = (data.results || []).map((item: any, idx: number) => ({
        id: `brave-${idx}`,
        url: item.properties?.url || item.thumbnail?.src,
        thumb: item.thumbnail?.src || item.properties?.url,
        alt: item.title || '',
        photographer: item.source || 'Google',
      }));

      return new Response(JSON.stringify({ success: true, images, page: 1, totalResults: images.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GENERATE CAPTION =====
    if (action === 'generate-caption') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const captionPrompt = `Gere uma legenda profissional para um post de carrossel no Instagram sobre o tema: "${topic || 'conteúdo profissional'}".
${keywords?.length ? `Palavras-chave: ${keywords.join(', ')}` : ''}
O carrossel tem ${cardCount || 7} cards.

Regras:
- Escreva em português brasileiro
- Use emojis estrategicamente (não exagere)
- Inclua uma chamada para ação (salve, compartilhe, comente)
- Adicione 15-20 hashtags relevantes no final
- Máximo 2200 caracteres
- Tom profissional mas acessível
- Não use markdown, apenas texto simples`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um especialista em social media e copywriting para Instagram.' },
            { role: 'user', content: captionPrompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error('AI caption error:', aiRes.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao gerar legenda' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiRes.json();
      const caption = aiData.choices?.[0]?.message?.content?.trim() || '';

      return new Response(JSON.stringify({ success: true, caption }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-carousel error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
