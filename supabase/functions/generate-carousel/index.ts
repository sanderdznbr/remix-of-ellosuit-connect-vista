// Edge function for carousel generation

const INTERNAL_BRAND_PATTERN = /\b(?:ello\s*content|ellocontent|ello\s*suit|ellosuit|@ellocontent|@ellosuit)\b/gi;
const INTERNAL_BRAND_DETECTION = /\b(?:ello\s*content|ellocontent|ello\s*suit|ellosuit|@ellocontent|@ellosuit)\b/i;
const normalizeText = (value: string = '') => value.replace(/\s{2,}/g, ' ').trim();
const stripInternalBrands = (value: string = '') => normalizeText(value.replace(INTERNAL_BRAND_PATTERN, ''));
const stripPromptCommandNoise = (value: string = '', fallbackTitle: string = '') => {
  const normalized = normalizeText(
    value
      .replace(/\(\s*@\s*\)/g, fallbackTitle ? ` ${fallbackTitle} ` : ' ')
      .replace(/\(@([^)]*)\)/g, (_match, inner) => {
        const mentionTitle = String(inner || '').trim();
        return mentionTitle ? ` ${mentionTitle} ` : (fallbackTitle ? ` ${fallbackTitle} ` : ' ');
      })
      .replace(/@([\p{L}\p{N}_.-]+)/gu, '$1')
  );

  const stripped = normalizeText(
    normalized
      .replace(/^\s*(crie|criar|gere|gerar|faça|fazer|monte|montar)\s+(um|uma|o|a)?\s*(post|carrossel|arte|vídeo|video|card|cards|animação|animacao)?\s*(sobre|para|de|do|da)?\s*/i, '')
      .replace(/^\s*(post|carrossel|arte|vídeo|video|card|cards|animação|animacao)\s*(sobre|para|de|do|da)\s*/i, '')
      .replace(/^\s*(tema do carrossel|tópico|tema)\s*:?\s*/i, '')
      .replace(/\(\s*\)/g, ' ')
  );

  return stripped || normalizeText(fallbackTitle || normalized);
};

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
    const { action, topic, keywords, cardCount, prompt, imageSize, query, referenceImageUrls, faceReferenceUrls, styleReferenceUrls, username, imageModel, negativePrompt, fidelity, marketplaceStyleConfig, promptContexts } = body;

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

    // ===== CLASSIFY TOPIC (smart web search decision) =====
    if (action === 'classify-topic') {
      const classifyTopic = topic || '';
      if (!classifyTopic.trim()) {
        return new Response(JSON.stringify({ classification: 'personal', shouldSearch: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        // fallback: assume should search
        return new Response(JSON.stringify({ classification: 'unknown', shouldSearch: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const classifyRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a topic classifier. Analyze the user's topic and classify it into one of these categories:
- "news": Current events, trending topics, factual information that benefits from real-time web data (e.g., "chuvas em minas", "eleições 2026", "bitcoin hoje")
- "educational": Educational/informational content that could benefit from web enrichment (e.g., "5 dicas de contabilidade", "como investir na bolsa")
- "personal": Personal, creative, brand-specific, or proprietary content that does NOT need web search (e.g., "lançamento do meu produto", "promoção da minha loja", "minha história", "receita da vovó")
- "opinion": Personal opinions, motivational content, creative writing (e.g., "frases motivacionais", "minha visão sobre liderança")

Respond ONLY with a JSON object: {"classification": "news|educational|personal|opinion", "reason_pt": "brief reason in Portuguese"}
Do not include markdown or extra text.`
              },
              { role: 'user', content: classifyTopic }
            ],
            temperature: 0.1,
          }),
        });

        if (classifyRes.ok) {
          const classifyData = await classifyRes.json();
          const content = classifyData.choices?.[0]?.message?.content || '';
          try {
            const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            const classification = parsed.classification || 'unknown';
            const shouldSearch = classification === 'news' || classification === 'educational';
            return new Response(JSON.stringify({
              classification,
              shouldSearch,
              reason: parsed.reason_pt || '',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch {
            console.error('Failed to parse classification:', content);
          }
        }
      } catch (err) {
        console.error('Classification error:', err);
      }

      // Fallback
      return new Response(JSON.stringify({ classification: 'unknown', shouldSearch: true }), {
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


      // If no images found at all, return generic placeholders instead of error
      if (images.length === 0) {
        console.warn('[web-search] No images found, returning placeholders for query:', searchQuery);
        images = [
          {
            id: 'placeholder-1',
            url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
            thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
            alt: searchQuery,
            photographer: 'Unsplash',
            source: 'placeholder',
          },
          {
            id: 'placeholder-2',
            url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop',
            thumb: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=200&auto=format&fit=crop',
            alt: searchQuery,
            photographer: 'Unsplash',
            source: 'placeholder',
          }
        ];
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

    // ===== GENERATE OUTLINE (for StepCardTexts AI fill) =====
    if (action === 'generate-outline') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const numCards = body.cardCount || 7;
      const mode = body.contentMode || 'carousel';

      // Local fallback: generates a basic outline without AI
      const generateLocalFallback = () => {
        if (mode === 'single-post') {
          return [{ title: topic?.slice(0, 60) || 'Post', body: '' }];
        }
        return Array.from({ length: numCards }, (_, i) => {
          if (i === 0) return { title: topic?.slice(0, 60) || 'Título', body: 'Descubra tudo sobre este assunto' };
          if (i === numCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
          return { title: `Ponto ${i}`, body: '' };
        });
      };

      if (!LOVABLE_API_KEY) {
        console.warn('LOVABLE_API_KEY not configured, using local fallback for outline');
        return new Response(JSON.stringify({ success: true, outline: generateLocalFallback() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract text limits if available from style config
      const outlineTextLimits = body.marketplaceStyleConfig?._textLimits || {};
      const hasOutlineTextLimits = !!outlineTextLimits.cover_title_max_chars;
      const textLimitInstructions = hasOutlineTextLimits
        ? ` LIMITES DE CARACTERES OBRIGATÓRIOS: título da capa máx ${outlineTextLimits.cover_title_max_chars} chars, subtítulo máx ${outlineTextLimits.cover_subtitle_max_chars} chars, corpo dos cards máx ${outlineTextLimits.content_body_top_max_chars} chars, CTA título máx ${outlineTextLimits.cta_title_max_chars} chars. Respeite rigorosamente.`
        : '';

      const outlinePrompt = mode === 'single-post'
        ? `Gere um outline para 1 post único sobre: "${topic}".${hasOutlineTextLimits ? ` Título máx ${outlineTextLimits.cover_title_max_chars} chars, corpo máx ${outlineTextLimits.cover_subtitle_max_chars || 60} chars.` : ''} Retorne JSON: { "outline": [{ "title": "...", "body": "..." }] }`
        : `Gere um outline para um carrossel de ${numCards} cards sobre: "${topic}". Card 1 é capa (título impactante + subtítulo), cards intermediários são conteúdo (título + corpo informativo), último card é CTA. Retorne JSON: { "outline": [{ "title": "...", "body": "..." }, ...] } com exatamente ${numCards} itens. Em português brasileiro.${textLimitInstructions}`;

      // Try multiple models in order
      const MODELS = ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'];
      let outline: { title?: string; body?: string }[] | null = null;

      for (const model of MODELS) {
        try {
          console.log(`[generate-outline] Trying model: ${model}`);
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'Você gera outlines de carrosséis em JSON. Responda APENAS com JSON válido, sem markdown.' },
                { role: 'user', content: outlinePrompt },
              ],
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`[generate-outline] Model ${model} failed (${res.status}): ${errText.slice(0, 200)}`);
            continue;
          }

          const aiData = await res.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed?.outline && Array.isArray(parsed.outline) && parsed.outline.length > 0) {
              outline = parsed.outline;
              console.log(`[generate-outline] Success with model ${model}, ${outline.length} cards`);
              break;
            }
          }
          console.warn(`[generate-outline] Model ${model} returned no valid outline from content: ${content.slice(0, 200)}`);
        } catch (err) {
          console.warn(`[generate-outline] Model ${model} error:`, err);
        }
      }

      // If all models failed, use local fallback
      if (!outline || outline.length === 0) {
        console.warn('[generate-outline] All models failed, using local fallback');
        outline = generateLocalFallback();
      }

      return new Response(JSON.stringify({ success: true, outline }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
- NÃO mencione Ellosuit, ElloContent, @Ellocontent ou qualquer variação. Essas são marcas INTERNAS do sistema e NUNCA devem aparecer no conteúdo gerado.
- Mantenha o tom profissional e editorial
- O resultado deve ser 2-4 frases, máximo 200 palavras
- Responda APENAS com o prompt melhorado, sem explicações adicionais
- Foque 100% no tópico original do usuário
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
      const isTweetMode = !!body.isTweetMode;

      if (isTweetMode) {
        const tweetSystemPrompt = `Você escreve posts curtos no estilo Twitter/X em português brasileiro. Gere EXATAMENTE ${numCards} textos curtos, publicáveis, humanos e variados sobre o tema. Não repita o prompt do usuário literalmente. Não escreva títulos de capa, não use CTA de carrossel, não use marca interna, não use hashtags em excesso. Se houver dados da web, incorpore-os com naturalidade. Cada texto deve ter no máximo 280 caracteres. IMPORTANTE: Use **negrito** (com asteriscos duplos) em 1-3 palavras-chave ou expressões importantes de cada tweet para dar destaque visual. NUNCA escreva nenhum tweet inteiro em CAIXA ALTA/MAIÚSCULAS - use caixa normal (primeira letra maiúscula, resto minúscula). Responda APENAS em JSON válido no formato {"title":"...","cards":[{"type":"tweet","body":"..."}]}.`;

        const tweetUserMessage = `Tópico: ${stripInternalBrands(topic || '')}${body.webSearchContent ? `\n\nContexto real da web:\nTítulo: ${body.webSearchContent.title || ''}\nResumo: ${body.webSearchContent.summary || ''}\nFatos:\n${(body.webSearchContent.facts || []).map((f: any, i: number) => `${i + 1}. ${f.heading}: ${f.body}`).join('\n')}` : ''}`;

        let parsedTweet = null;
        let lastTweetRaw = '';
        for (const model of ['google/gemini-2.5-flash', 'google/gemini-3-flash-preview']) {
          try {
            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: tweetSystemPrompt },
                  { role: 'user', content: tweetUserMessage },
                ],
              }),
            });

            if (!response.ok) continue;
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            lastTweetRaw = content;
            const match = content.match(/\{[\s\S]*\}/);
            parsedTweet = match ? JSON.parse(match[0]) : null;
            if (parsedTweet?.cards?.length) break;
          } catch (_err) {
            parsedTweet = null;
          }
        }

        if (!parsedTweet?.cards?.length) {
          parsedTweet = {
            title: stripInternalBrands(topic || 'Tweet'),
            cards: Array.from({ length: numCards }, () => ({
              type: 'tweet',
              body: `Perspectiva sobre ${stripInternalBrands(topic || 'o tema')}.`,
            })),
            raw: lastTweetRaw,
          };
        }

        parsedTweet.cards = parsedTweet.cards
          .map((card: any) => {
            let body = stripInternalBrands(String(card?.body || '')).trim();
            // Fix all-caps text: convert to sentence case
            if (body.replace(/\*\*/g, '').replace(/[^a-záàâãéêíóôõúç]/gi, '').length > 5 && 
                body.replace(/\*\*/g, '') === body.replace(/\*\*/g, '').toUpperCase()) {
              body = body.charAt(0).toUpperCase() + body.slice(1).toLowerCase();
            }
            return { type: 'tweet', body };
          })
          .filter((card: any) => card.body);

        while (parsedTweet.cards.length < numCards) {
          parsedTweet.cards.push({ type: 'tweet', body: `Novo ângulo sobre ${stripInternalBrands(topic || 'o tema')}.` });
        }
        if (parsedTweet.cards.length > numCards) parsedTweet.cards = parsedTweet.cards.slice(0, numCards);

        return new Response(JSON.stringify({ success: true, data: parsedTweet }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const imageCardIndices = body.imageCardIndices || []; // which cards should have images
      const textSizeHint = body.textSizeHint || 'short';
      const textSizeConfig = {
        short:  { bodyTop: '10-20 palavras', bodyBottom: '8-12 palavras' },
        medium: { bodyTop: '20-35 palavras', bodyBottom: '12-20 palavras' },
        long:   { bodyTop: '30-60 palavras', bodyBottom: '20-40 palavras' },
      }[textSizeHint] || { bodyTop: '10-20 palavras', bodyBottom: '8-12 palavras' };

      // Extract text character limits from style DNA analysis (if available)
      const styleTextLimits = body.marketplaceStyleConfig?._textLimits || {};
      const hasTextLimits = !!styleTextLimits.cover_title_max_chars;
      const styleConfig = body.marketplaceStyleConfig;
      const hasMarketplaceStyle = styleConfig?.imageGeneration?.prompt_style;

      // Build style-specific instructions for imagePrompt generation
      const styleImagePromptInstructions = hasMarketplaceStyle
        ? `\n\nESTILO VISUAL OBRIGATÓRIO PARA TODOS OS imagePrompts:
Cada imagePrompt DEVE seguir rigorosamente este estilo visual:
${styleConfig.imageGeneration.prompt_style}

${styleConfig.cardVariations ? `VARIAÇÕES DE CARD (alterne entre elas):
${styleConfig.cardVariations.map((v: any, i: number) => `${i + 1}. Tipo "${v.type}": ${v.description}`).join('\n')}` : ''}

${styleConfig._strictInstructions ? `\nINSTRUÇÕES RÍGIDAS DO ESTILO (PRIORIDADE MÁXIMA - SIGA À RISCA):\n${styleConfig._strictInstructions}` : ''}

IMPORTANTE: Os imagePrompts devem descrever A IMAGEM COMPLETA com texto, tipografia, elementos decorativos e composição editorial integrados. NÃO gere apenas uma foto - gere a COMPOSIÇÃO FINAL do post como ele apareceria no Instagram.`
        : '';

      // Build prompt context instructions if mentioned prompts exist
      const promptContextInstructions = (promptContexts && Array.isArray(promptContexts) && promptContexts.length > 0)
        ? `\n\nCONTEXTO DE MARCA/PERSONA (PRIORIDADE MÁXIMA):
O usuário anexou os seguintes contextos de referência da galeria de prompts. Você DEVE usar estas informações como a BASE PRINCIPAL para gerar o conteúdo. O tópico do usuário deve ser interpretado À LUZ destes contextos. Se o contexto descreve uma marca, persona, empresa ou produto, TODO o conteúdo gerado DEVE ser sobre essa marca/persona/empresa.

${promptContexts.map((p: any) => `### ${p.title}\n${p.content}`).join('\n\n')}

REGRA ABSOLUTA: O conteúdo dos cards DEVE refletir fielmente as informações dos contextos acima. NÃO invente informações que contradigam esses contextos. NÃO gere conteúdo genérico ignorando os contextos.`
        : '';

      const systemPrompt = `Você é um especialista em criação de carrosséis editoriais profissionais para Instagram no formato 1080x1350.
${promptContextInstructions}

Gere conteúdo para um carrossel de EXATAMENTE ${numCards} cards sobre o tópico fornecido. VOCÊ DEVE retornar EXATAMENTE ${numCards} cards no array "cards" — nem mais, nem menos. Isso é OBRIGATÓRIO.

IMPORTANTE: Gere o conteúdo EXCLUSIVAMENTE sobre o tópico fornecido pelo usuário${promptContexts?.length > 0 ? ', usando os CONTEXTOS DE MARCA/PERSONA como base' : ''}. NÃO mencione a Ellosuit, ElloContent, @Ellocontent ou qualquer variação dessas marcas, nem qualquer outra plataforma ou ferramenta, a menos que o próprio tópico do usuário mencione explicitamente. O conteúdo deve ser 100% focado no tema solicitado.

PROIBIDO nos imagePrompts e no conteúdo dos cards:
- NUNCA inclua textos como "Tema do Carrossel:", "Carousel Theme:", ou qualquer rótulo de tema/título do carrossel
- NUNCA inclua numeração tipo "Card 1 de 20", "1/20", contadores de slides ou indicadores de posição
- NUNCA inclua setas apontando para o lado, ícones de "swipe", textos como "Arraste para o lado", "Deslize", "Swipe →", ou qualquer indicador de navegação lateral nas imagens. Cada card é uma composição visual independente
- Cada card de conteúdo DEVE ter uma composição visual DIFERENTE da capa — NÃO repita o layout da capa nos cards internos
- Os imagePrompts dos cards internos devem descrever cenas, composições e layouts VARIADOS e DISTINTOS entre si
- NUNCA use o símbolo "@" antes de nomes de marcas, plataformas ou pessoas nos textos dos cards (bodyTop, bodyBottom, title, subtitle, body). Escreva o nome diretamente sem "@". Exemplo: escreva "Ellocontent" e NÃO "@Ellocontent"
- NUNCA gere imagePrompts que descrevam grades, mosaicos, grids de posts, capturas de tela de feeds ou interfaces de redes sociais. Cada card deve ser UMA ÚNICA imagem editorial coesa

REGRAS DE LAYOUT (siga EXATAMENTE):
- Card 1 (cover): Título impactante em CAIXA ALTA (máx ${hasTextLimits ? `${styleTextLimits.cover_title_max_chars} caracteres` : '10 palavras'}) + subtítulo curto descritivo${hasTextLimits ? ` (máx ${styleTextLimits.cover_subtitle_max_chars} caracteres)` : ''}
- Cards 2 a ${numCards - 1} (content): Cada card tem DOIS blocos de texto:
  - "bodyTop": Parágrafo principal (${hasTextLimits ? `máx ${styleTextLimits.content_body_top_max_chars} caracteres` : textSizeConfig.bodyTop}), informativo e direto. Deve conter trechos-chave que serão destacados em cor accent (coloque entre **asteriscos duplos** os trechos mais importantes, máx 8 palavras destacadas)
  - "bodyBottom": Segundo parágrafo (${hasTextLimits ? `máx ${styleTextLimits.content_body_bottom_max_chars} caracteres` : textSizeConfig.bodyBottom}), complementar e conciso
  - "imagePrompt": Descrição detalhada para gerar uma imagem de alta qualidade. ${hasMarketplaceStyle ? 'DEVE seguir o estilo visual definido abaixo.' : 'Se o tópico mencionar marcas, produtos ou PESSOAS REAIS, descreva visualmente o que deveria aparecer com detalhes'}
  - "searchTerms": Array de termos para buscar fotos de referência na web (ex: ["Toguro fitness", "Cimed logo", "suplemento proteico"]). Inclua nomes reais de pessoas e marcas mencionadas.
  - "needsImage": boolean - true se este card precisa de imagem baseado no conteúdo
- Card ${numCards} (cta): CTA + mensagem motivacional (${hasTextLimits ? `título máx ${styleTextLimits.cta_title_max_chars} chars, corpo máx ${styleTextLimits.cta_body_max_chars} chars` : 'texto curto'}). ${body.brandName ? `Use "${body.brandName}" como nome da marca/autor.` : body.userName ? `Use "${body.userName}" como nome do autor.` : 'NÃO inclua nome de autor.'} NUNCA use placeholders como "[Nome do Usuário]", "[Seu Nome]", "[Nome da Marca]" etc. Se não souber o nome, simplesmente OMITA a linha de autor.
${hasTextLimits ? `\n⚠️ LIMITES DE CARACTERES OBRIGATÓRIOS (extraídos da análise visual do estilo selecionado):
- Título da capa: máx ${styleTextLimits.cover_title_max_chars} caracteres
- Subtítulo da capa: máx ${styleTextLimits.cover_subtitle_max_chars} caracteres
- bodyTop (conteúdo): máx ${styleTextLimits.content_body_top_max_chars} caracteres
- bodyBottom (conteúdo): máx ${styleTextLimits.content_body_bottom_max_chars} caracteres
- Título CTA: máx ${styleTextLimits.cta_title_max_chars} caracteres
Respeite RIGOROSAMENTE estes limites para que o texto caiba perfeitamente no layout visual do estilo.` : ''}

${imageCardIndices.length > 0 ? `IMPORTANTE: Os cards nas posições ${imageCardIndices.join(', ')} DEVEM ter imagens (needsImage=true). Os demais podem ser somente texto.` : ''}

REGRA DE DIVERSIDADE VISUAL (40% SEM IMAGEM): Para manter dinamismo e variar o ritmo visual do carrossel, pelo menos 40% dos cards de CONTEÚDO (excluindo capa e CTA) devem ter needsImage=false. Esses cards serão renderizados apenas com texto e elementos gráficos (sem foto/mockup/mídia). Distribua os cards sem imagem de forma intercalada — NÃO coloque todos juntos. Exemplo para 7 cards: capa(imagem) + conteúdo1(imagem) + conteúdo2(SEM) + conteúdo3(imagem) + conteúdo4(SEM) + conteúdo5(SEM) + CTA(imagem).

IMPORTANTE sobre imagePrompt e searchTerms:
- Se o tópico menciona PESSOAS REAIS (celebridades, influenciadores), inclua o nome deles em searchTerms para buscar fotos de referência
- Se menciona MARCAS, inclua o nome + "logo" ou "produto" em searchTerms
- imagePrompt deve descrever a cena visual detalhadamente (iluminação, composição, estilo)
- searchTerms são para buscar referências reais na web

CRIATIVIDADE VISUAL OBRIGATÓRIA NOS imagePrompts:
- Cada imagePrompt DEVE ser uma composição CINEMATOGRÁFICA e EDITORIAL rica, com múltiplos elementos visuais.
- NUNCA gere um imagePrompt que descreva APENAS um objeto isolado (ex: apenas um celular, apenas um produto). Sempre adicione contexto visual rico: mãos interagindo, pessoas usando, ambientes detalhados, iluminação dramática, partículas, reflexos, profundidade de campo.
- Para temas de TECNOLOGIA/APP/SOFTWARE: varie entre mockups 3D flutuantes com partículas luminosas, pessoa usando o app em cenário urbano noturno com neon, tela do app em perspectiva isométrica com elementos saindo da tela, mão segurando celular em ambiente elegante com reflexos, dispositivos em composição editorial com gradientes e luzes volumétricas. NUNCA repita a mesma abordagem visual entre cards.
- Para temas de SAÚDE/BELEZA: alterne entre close-ups cinematográficos, profissionais em ação, resultados antes/depois estilizados, equipamentos em composição editorial, ambientes clínicos modernos com iluminação suave.
- Para temas de NEGÓCIOS/MARKETING: use composições com gráficos 3D, pessoas em reuniões dinâmicas, escritórios modernos, flat-lays estilizados, cenários corporativos com iluminação dramática.
- Para temas GERAIS: crie composições visuais INESPERADAS e MEMORÁVEIS que surpreendam — use metáforas visuais, contrastes de escala, iluminação cinematográfica, texturas ricas e ângulos criativos.
- REGRA DE VARIAÇÃO: Nenhum card pode ter a mesma abordagem visual de outro. Se um card mostra um mockup de frente, o próximo DEVE ter ângulo diferente, cenário diferente, composição diferente. Diversidade visual é OBRIGATÓRIA.
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
      "ctaLine": "${body.brandName || body.userName || ''}",
      "imagePrompt": "descrição visual para CTA",
      "searchTerms": [],
      "needsImage": false
    }
  ]
}`;

      const fallbackPromptTitle = Array.isArray(promptContexts) && promptContexts.length > 0
        ? String(promptContexts[0]?.title || '').trim()
        : '';
      const safeTopic = stripPromptCommandNoise(stripInternalBrands(topic || ''), fallbackPromptTitle);
      const userMessage = `Tópico: ${safeTopic}
Palavras-chave: ${(keywords || []).join(', ')}${
              body.coverAlreadyExists ? `\n\nIMPORTANTE — CAPA JÁ EXISTE: O card 1 (cover) já foi gerado previamente com título "${body.existingCoverTitle || ''}" e subtítulo "${body.existingCoverBody || ''}". Você DEVE gerar conteúdo COMPLETAMENTE DIFERENTE para o card 2 em diante. O card 2 NÃO pode repetir nem parafrasear o título ou subtítulo da capa. Cada card de conteúdo deve abordar um SUBTEMA ou ÂNGULO DIFERENTE do tópico principal.` : ''
              }${
              body.webSearchContent ? `\n\nDADOS REAIS DA WEB (USE OBRIGATORIAMENTE estes dados verificados para criar o conteúdo):\nTítulo: ${body.webSearchContent.title}\nResumo: ${body.webSearchContent.summary}\nFatos:\n${(body.webSearchContent.facts || []).map((f: any, i: number) => `${i + 1}. ${f.heading}: ${f.body} (Fonte: ${f.source})`).join('\n')}\n\nFontes: ${(body.webSearchCitations || []).slice(0, 5).join(', ')}\n\nIMPORTANTE: Baseie TODO o conteúdo nesses dados reais e verificados. Cite estatísticas e fatos reais.` : ''
            }${
              (() => {
                if (!body.productContext) return '';
                // Extreme mode: full AI-guided vision
                if (typeof body.productContext === 'string' && body.productContext.startsWith('EXTREME_VISION:')) {
                  try {
                    const extreme = JSON.parse(body.productContext.replace('EXTREME_VISION:', ''));
                    const formDetails = Object.entries(extreme.formValues || {})
                      .filter(([_, v]) => v && (typeof v === 'string' ? v.trim() : (Array.isArray(v) ? v.length > 0 : true)))
                      .filter(([_, v]) => typeof v === 'string') // skip photo arrays
                      .map(([k, v]) => `- ${k}: ${v}`)
                      .join('\n');
                    return `\n\nMODO EXTREME — VISÃO DO USUÁRIO (PRIORIDADE MÁXIMA):\nDescrição visual: "${extreme.vision}"\nResumo IA: ${extreme.analysis?.summary || ''}\n${formDetails ? `Detalhes fornecidos:\n${formDetails}` : ''}\n\nIMPORTANTE: Crie o conteúdo visual e textual EXATAMENTE de acordo com a visão descrita acima. Esta é a intenção criativa do usuário — respeite cada detalhe mencionado. Os imagePrompts devem descrever cenas que realizam FIELMENTE a visão visual do usuário. Se o usuário mencionou prints de app, mockups, cenários específicos, pessoas, objetos — inclua tudo nos prompts de imagem. As referências de imagem enviadas devem ser usadas como base visual obrigatória.\n\nREGRA CRÍTICA DE TIPOS DE CARD (OBRIGATÓRIO):\n- APENAS o Card 1 deve ter type "cover" — ele é a CAPA (Hero) com título impactante em CAIXA ALTA.\n- Cards 2 até ${numCards - 1} DEVEM ter type "content" — são slides de CONTEÚDO com bodyTop e bodyBottom. NUNCA repita o layout, título ou estética de capa nesses cards.\n- O último Card (${numCards}) DEVE ter type "cta" — é o Call-to-Action final.\n- PROIBIDO: gerar mais de um card com type "cover". Cada card de conteúdo deve ter composição visual ÚNICA e DIFERENTE da capa.\n- PROIBIDO: usar títulos em CAIXA ALTA nos cards de conteúdo — isso é reservado APENAS para a capa.`;
                  } catch (e) {
                    return `\n\nCONTEXTO EXTREME: ${body.productContext}`;
                  }
                }
                // Advanced mode: user visual idea
                if (typeof body.productContext === 'string' && body.productContext.startsWith('ADVANCED_VISUAL_IDEA:')) {
                  const ideaText = body.productContext.replace('ADVANCED_VISUAL_IDEA:', '').trim();
                  return `\n\nIDEIA VISUAL DO USUÁRIO (PRIORIDADE ALTA):\n"${ideaText}"\n\nIMPORTANTE: Respeite a ideia visual descrita acima. Os imagePrompts devem refletir fielmente a visão criativa do usuário. Use as cores, atmosfera, estilo e composição mencionados como guia principal para a geração das imagens.`;
                }
                return `\n\nPRODUTO IDENTIFICADO:\n- Tipo: ${body.productContext.productType}\n- Descrição: ${body.productContext.productDescription}\n\nIMPORTANTE: O carrossel deve destacar este produto. Use o produto como referência criativa — NÃO precisa replicá-lo exatamente. Varie ângulos, cenários, composições e contextos de uso em cada card. Para roupas, mostre em modelos diferentes, ângulos variados, combinações criativas. Para objetos, alterne entre mockups, flat-lays, alguém segurando, contexto de uso real. Para alimentos, varie entre close-ups, composições com ingredientes, mesa posta. Cada imagePrompt deve criar uma cena ÚNICA e DIFERENTE com o produto.`;
              })()
            }`;

      // Retry logic: attempt up to 3 times if AI returns empty content
      let parsed = null;
      let lastRawContent = '';
      const MAX_CONTENT_ATTEMPTS = 3;
      const models = ['google/gemini-2.5-flash', 'google/gemini-3-flash-preview', 'google/gemini-2.5-pro'];

      for (let attempt = 0; attempt < MAX_CONTENT_ATTEMPTS; attempt++) {
        const model = models[attempt] || models[0];
        console.log(`[generate-content] Attempt ${attempt + 1}/${MAX_CONTENT_ATTEMPTS} with model ${model}`);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate-content] Attempt ${attempt + 1} API error:`, response.status, errText);
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
          // On other errors, retry
          if (attempt < MAX_CONTENT_ATTEMPTS - 1) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          return new Response(JSON.stringify({ error: 'Erro ao gerar conteúdo' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        lastRawContent = content;
        console.log(`[generate-content] Attempt ${attempt + 1} content length: ${content.length}`);

        if (content.length > 10) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          } catch {
            parsed = null;
          }
        }

        if (parsed) break;
        console.warn(`[generate-content] Attempt ${attempt + 1} returned empty/invalid content, retrying...`);
        if (attempt < MAX_CONTENT_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: 'Não foi possível processar o conteúdo gerado após múltiplas tentativas', raw: lastRawContent.slice(0, 500) }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sanitizeCardText = (value: unknown) => {
        const text = typeof value === 'string' ? value : '';
        return stripPromptCommandNoise(stripInternalBrands(text), fallbackPromptTitle);
      };

      if (parsed.title) parsed.title = sanitizeCardText(parsed.title);
      if (Array.isArray(parsed.cards)) {
        parsed.cards = parsed.cards.map((card: any) => ({
          ...card,
          title: sanitizeCardText(card?.title),
          subtitle: sanitizeCardText(card?.subtitle),
          bodyTop: sanitizeCardText(card?.bodyTop),
          bodyBottom: sanitizeCardText(card?.bodyBottom),
          body: sanitizeCardText(card?.body),
          ctaLine: sanitizeCardText(card?.ctaLine),
        }));
      }

      // Validate card count server-side
      if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.length !== numCards) {
        console.warn(`AI returned ${parsed.cards.length} cards but ${numCards} were requested`);
        // Pad if fewer
        while (parsed.cards.length < numCards) {
          const idx = parsed.cards.length;
          if (idx === numCards - 1) {
            parsed.cards.push({ type: 'cta', title: 'Gostou do conteúdo?', body: 'Salve, compartilhe e siga para mais!', imagePrompt: 'Card final CTA editorial', needsImage: true });
          } else {
            parsed.cards.splice(idx, 0, { type: 'content', bodyTop: `Continuação sobre o tema...`, bodyBottom: '', imagePrompt: `Composição editorial card ${idx + 1}`, needsImage: true });
          }
        }
        // Trim if more
        if (parsed.cards.length > numCards) parsed.cards.splice(numCards);
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

      const searchQuery = String(query || keywords?.join(' ') || topic || '').trim();
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
