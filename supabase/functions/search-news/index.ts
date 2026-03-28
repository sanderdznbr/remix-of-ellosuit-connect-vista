const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domains known to return memes, screenshots, infographics, social posts, or watermarked assets
const BLOCKED_DOMAINS = [
  'shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'canva.com',
  'freepik.com', 'vecteezy.com', 'depositphotos.com', '123rf.com',
  'dreamstime.com', 'alamy.com', 'pinterest.com', 'pinimg.com',
  'boredpanda.com', 'buzzfeed.com', 'chzbgr.com', 'imgflip.com',
  'knowyourmeme.com', 'kym-cdn.com', 'memedroid.com', '9gag.com',
  'tenor.com', 'giphy.com', 'img.youtube.com', 'youtube.com', 'ytimg.com',
  'venngage.com', 'slidechef.net', 'dexerto.com', 'termometrooscar.com', 'techtudo.com',
  'twitter.com', 'x.com', 'pbs.twimg.com', 'twimg.com', 'nitter.net',
  'facebook.com', 'fbcdn.net', 'instagram.com', 'cdninstagram.com',
  'tiktok.com', 'tiktokcdn.com', 'threads.net',
  'eonline.com', 'usmagazine.com', 'tmz.com', 'dailymail.co.uk',
  'pagesix.com', 'insider.com', 'screenrant.com', 'cbr.com',
  'goldderby.com', 'awardswatch.com',
];

function isCleanImageCandidate(url: string, metadata = ''): boolean {
  const combined = `${url} ${metadata}`.toLowerCase();

  for (const domain of BLOCKED_DOMAINS) {
    if (combined.includes(domain)) return false;
  }

  const badPatterns = [
    'infographic', 'quote', 'meme', 'funny', 'joke', 'viral', 'shitpost', 'reaction',
    'text-overlay', 'typography', 'template', 'mockup', 'banner', 'flyer',
    'captura-de-tela', 'screenshot', 'screen-shot', 'tutorial', 'interface', 'ui', 'editor',
    'maxresdefault', 'winners-list', 'imgflip', '.svg',
    'bingo', 'checklist', 'ballot', 'voting-card', 'scorecard', 'bracket',
    'poster', 'cover-art', 'album-cover', 'movie-poster', 'trophy-icon',
    'must-see', 'moments', 'highlights', 'recap', 'listicle', 'slideshow',
    'gonna be', 'hosted by', 'here are', 'top 10', 'best of', 'worst of',
    'predictions', 'nominees', 'nomination', 'snubs',
    'promo', 'promotional', 'advertisement', 'ad-', 'sponsored',
    'thumbnail', 'thumb_', 'hqdefault', 'sddefault', 'mqdefault',
    'collage', 'grid', 'montage', 'compilation', 'roundup',
    'tweet', 'tweetdeck', 'social-media-post', 'thread', 'retweet',
    'print-screen', 'captura', 'tela'
  ];
  for (const pat of badPatterns) {
    if (combined.includes(pat)) return false;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language = 'pt-BR', per_card_queries } = await req.json();

    // === PER-CARD IMAGE SEARCH MODE ===
    if (per_card_queries && Array.isArray(per_card_queries) && per_card_queries.length > 0) {
      const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
      if (!braveApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Brave API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[PER_CARD] Searching images for', per_card_queries.length, 'cards');
      // Collect images WITH metadata for AI ranking
      const cardCandidates: Record<number, { url: string; title: string; desc: string }[]> = {};

      const searchCard = async (cardIndex: number, query: string) => {
        const candidates: { url: string; title: string; desc: string }[] = [];
        try {
          const shortQuery = query.slice(0, 120).trim();
          const cleanQuery = `${shortQuery} -meme -infographic -template -screenshot -reaction`;
          const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(cleanQuery)}&count=20&safesearch=strict`;
          const res = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (res.ok) {
            const data = await res.json();
            for (const item of (data.results || [])) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              const metadata = [
                item.title,
                item.description,
                item.source,
                item.page_fetched?.title,
                item.page_fetched?.description,
              ].filter(Boolean).join(' ');

              if (imgUrl && imgUrl.startsWith('http') && isCleanImageCandidate(imgUrl, metadata)) {
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if ((w === 0 && h === 0) || (w >= 400 && h >= 300)) {
                  candidates.push({
                    url: imgUrl,
                    title: (item.title || '').slice(0, 100),
                    desc: (item.description || item.page_fetched?.description || '').slice(0, 150),
                  });
                }
              }
            }
          }
          console.log(`[PER_CARD] Card ${cardIndex} "${shortQuery.slice(0, 60)}": ${candidates.length} candidates`);
        } catch (e) {
          console.error(`[PER_CARD] Card ${cardIndex} error:`, e);
        }
        cardCandidates[cardIndex] = candidates;
      };

      for (let i = 0; i < per_card_queries.length; i += 3) {
        const batch = per_card_queries.slice(i, i + 3).map((q: { index: number; query: string }) =>
          searchCard(q.index, q.query)
        );
        await Promise.all(batch);
        if (i + 3 < per_card_queries.length) await new Promise(r => setTimeout(r, 200));
      }

      // === AI RANKING: pick best image per card ===
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      const cardImages: Record<number, string[]> = {};

      if (lovableKey) {
        // Build a single AI call with all cards for efficiency
        const cardsForAI: { index: number; query: string; options: { i: number; title: string; desc: string }[] }[] = [];
        
        for (const q of per_card_queries) {
          const candidates = cardCandidates[q.index] || [];
          if (candidates.length <= 1) {
            // No need for AI if 0-1 candidates
            cardImages[q.index] = candidates.map(c => c.url);
            continue;
          }
          cardsForAI.push({
            index: q.index,
            query: q.query,
            options: candidates.slice(0, 10).map((c, i) => ({ i, title: c.title, desc: c.desc })),
          });
        }

        if (cardsForAI.length > 0) {
          try {
            const prompt = `You are an image selector for social media carousel posts.
For each card below, pick the BEST image option based on relevance to the card's topic.
Prefer: real photographs of people/events/places directly related to the topic.
Avoid: generic stock photos, screenshots, graphics with text, memes.

Cards:
${cardsForAI.map(c => `CARD ${c.index} — Topic: "${c.query}"
Options: ${c.options.map(o => `[${o.i}] "${o.title}" — ${o.desc}`).join('\n')}`).join('\n\n')}

Return ONLY a JSON object mapping card index to the chosen option index. Example: {"0": 2, "1": 0, "3": 1}`;

            const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const aiText = aiData.choices?.[0]?.message?.content || '';
              const jsonMatch = aiText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const picks = JSON.parse(jsonMatch[0]);
                console.log('[PER_CARD] AI picks:', picks);
                
                for (const card of cardsForAI) {
                  const candidates = cardCandidates[card.index] || [];
                  const pickedIdx = Number(picks[String(card.index)]);
                  if (!isNaN(pickedIdx) && pickedIdx >= 0 && pickedIdx < candidates.length) {
                    // Put AI-picked image first, then rest as alternatives
                    const picked = candidates[pickedIdx];
                    const rest = candidates.filter((_, i) => i !== pickedIdx).map(c => c.url);
                    cardImages[card.index] = [picked.url, ...rest];
                  } else {
                    cardImages[card.index] = candidates.map(c => c.url);
                  }
                }
              } else {
                // AI didn't return valid JSON, fall back to original order
                for (const card of cardsForAI) {
                  cardImages[card.index] = (cardCandidates[card.index] || []).map(c => c.url);
                }
              }
            } else {
              console.error('[PER_CARD] AI ranking failed:', aiRes.status);
              for (const card of cardsForAI) {
                cardImages[card.index] = (cardCandidates[card.index] || []).map(c => c.url);
              }
            }
          } catch (aiErr) {
            console.error('[PER_CARD] AI ranking error:', aiErr);
            for (const card of cardsForAI) {
              cardImages[card.index] = (cardCandidates[card.index] || []).map(c => c.url);
            }
          }
        }
      } else {
        // No AI key, just return images in search order
        for (const [idx, candidates] of Object.entries(cardCandidates)) {
          cardImages[Number(idx)] = candidates.map(c => c.url);
        }
      }

      return new Response(
        JSON.stringify({ success: true, card_images: cardImages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!topic) {
      return new Response(
        JSON.stringify({ success: false, error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching news for topic:', topic);

    const systemPrompt = `You are a content researcher. Search for the latest real news and information about the given topic. Return a JSON object with the following structure:
{
  "title": "A compelling carousel title about the topic (max 80 chars)",
  "subtitle": "A subtitle that hooks the reader (max 100 chars)",
  "facts": [
    {
      "heading": "Short heading for this fact/point (max 60 chars)",
      "body": "Detailed explanation of this fact or news point (100-200 chars)",
      "source": "Name of the source"
    }
  ],
  "cta_title": "Call to action title (max 60 chars)",
  "cta_body": "Call to action message (max 120 chars)",
  "image_search_terms": ["term1", "term2", "term3", "term4", "term5"],
  "clean_topic": "The extracted main subject/topic name only (e.g. 'CS2', 'Tesla', 'Bitcoin')",
  "summary": "A brief 2-sentence summary of the key findings",
  "sources": [
    {
      "title": "Article/source title (max 80 chars)",
      "summary": "One-paragraph summary of what this source says about the topic (80-150 chars)",
      "angle": "The unique angle/perspective this source brings (max 60 chars)"
    }
  ]
}
CRITICAL for sources: You MUST return exactly 3 sources, each representing a DIFFERENT angle or article about the topic. Each source must correspond to one of the citations/URLs you used. The sources array MUST have exactly 3 items.
Provide 4-6 facts. All content must be in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language}. Base everything on REAL, current, verified information.

CRITICAL for clean_topic: Preserve the REAL searchable subject exactly when qualifiers are essential. Keep year, edition, award category, event name, franchise name, person name, movie title, or location whenever they are important to identify the correct subject. Example: if user says "Crie um post sobre Oscar 2026", the clean_topic should be "Oscar 2026". If user says "Melhor ator no Oscar 2026", the clean_topic should be "Oscar 2026 melhor ator". Remove only filler verbs/instructions.

CRITICAL for image_search_terms: You MUST generate 5 search terms that are DIRECTLY and SPECIFICALLY related to the topic. The goal is to find HIGH-QUALITY PHOTOGRAPHS that visually represent the topic.

RULES:
1. EVERY search term MUST be directly about the topic — NEVER generic or tangential
2. ALWAYS append "photo" or "photograph" or "fotografia" to every search term
3. For topics about PEOPLE or EVENTS with people (awards, sports, politics): search for real people by FULL NAME
4. For topics about HEALTH, SCIENCE, PRODUCTS, SERVICES, EDUCATION: search for real photographs of the subject matter (e.g. procedures, results, equipment, before/after)
5. NEVER generate search terms about unrelated subjects. If the topic is "implantes dentários", ALL 5 terms must be about dental implants
6. Use the SAME LANGUAGE as the topic for search terms (Portuguese topics → Portuguese search terms)

Examples:
- For "Oscar 2026": "Michael B Jordan Oscar 2026 photo", "Brady Corbet director photo", "Oscar 2026 red carpet celebrities photo"
- For "implantes dentários": "implante dentário antes e depois fotografia", "procedimento implante dentário foto", "sorriso com implante dentário foto", "cirurgia implante dentário profissional", "resultado implante dentário paciente foto"
- For "Tesla": "Elon Musk Tesla photo", "Tesla Model 3 driving photo", "Tesla factory photo"
- For "marketing digital": "equipe marketing digital escritório foto", "estratégia marketing digital profissional fotografia", "resultados marketing digital gráfico foto"
NEVER use vague generic terms. NEVER search for unrelated subjects.`;

    const userPrompt = `Search for the latest real news, data, and facts about: "${topic}". Focus on recent developments, statistics, and verified information.`;

    let content = '';
    let citations: string[] = [];

    let perplexityOk = false;
    try {
      console.log('[AI] Trying Perplexity...');
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          search_recency_filter: 'month',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        content = data.choices?.[0]?.message?.content || '';
        citations = data.citations || [];
        perplexityOk = true;
        console.log('[AI] Perplexity OK, citations:', citations.length);
      } else {
        const errText = await response.text();
        console.error('[AI] Perplexity failed:', response.status, errText.slice(0, 200));
      }
    } catch (perplexityErr) {
      console.error('[AI] Perplexity exception:', perplexityErr);
    }

    if (!perplexityOk) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiKey) {
        console.log('[AI] Falling back to OpenAI...');
        try {
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.3,
            }),
          });

          if (openaiRes.ok) {
            const openaiData = await openaiRes.json();
            content = openaiData.choices?.[0]?.message?.content || '';
            console.log('[AI] OpenAI fallback OK');
          } else {
            const errText = await openaiRes.text();
            console.error('[AI] OpenAI also failed:', openaiRes.status, errText.slice(0, 200));
            return new Response(
              JSON.stringify({ success: false, error: 'All AI providers unavailable. Please try again.' }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (openaiErr) {
          console.error('[AI] OpenAI exception:', openaiErr);
          return new Response(
            JSON.stringify({ success: false, error: 'All AI providers failed. Please try again.' }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.error('[AI] No fallback API key available');
        return new Response(
          JSON.stringify({ success: false, error: 'Perplexity unavailable and no fallback configured.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Perplexity response received, citations:', citations.length);

    let parsedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('Failed to parse JSON, using raw content:', parseErr);
      parsedContent = {
        title: topic,
        subtitle: 'Últimas notícias e informações',
        facts: [{ heading: 'Informação', body: content.slice(0, 200), source: 'Perplexity AI' }],
        cta_title: 'Saiba mais',
        cta_body: 'Acompanhe as novidades',
        image_search_terms: [topic],
        summary: content.slice(0, 300),
      };
    }

    // Search for images - preserve the literal topic when qualifiers like year/event matter
    let images: string[] = [];
    let rawImageCandidates: { url: string; title?: string; desc?: string; source?: string }[] = [];
    const cleanTopic = (parsedContent.clean_topic || String(topic || '')).trim();
    const baseTopicForSearch = cleanTopic;
    const normalizedTopic = String(topic || '').trim();
    const isPortuguese = language === 'pt-BR' || /[ãõáéíóúç]/i.test(`${normalizedTopic} ${baseTopicForSearch}`);
    const exactEntityTerms = [
      baseTopicForSearch,
      `${baseTopicForSearch} ${isPortuguese ? 'foto' : 'photo'}`,
      `${baseTopicForSearch} ${isPortuguese ? 'governador' : 'governor'}`,
      `${baseTopicForSearch} ${isPortuguese ? 'evento oficial' : 'official event'}`,
    ].map((term) => term.trim()).filter(Boolean);
    const rawSearchTerms: string[] = parsedContent.image_search_terms || [`${baseTopicForSearch} photo`, `${baseTopicForSearch} fotografia`];
    const searchTerms = [...exactEntityTerms, ...rawSearchTerms]
      .map((term) => String(term || '').trim())
      .filter(Boolean)
      .map((term) => {
        const normalized = term.toLowerCase();
        const baseNormalized = baseTopicForSearch.toLowerCase();
        // Only prepend clean topic if the search term doesn't already contain it
        return normalized.includes(baseNormalized) ? term : `${baseTopicForSearch} ${term}`;
      })
      .filter((term, index, arr) => arr.findIndex((item) => item.toLowerCase() === term.toLowerCase()) === index)
      .slice(0, 8);
    console.log('[IMAGES] Clean topic (base for search):', baseTopicForSearch);
    console.log('[IMAGES] Search terms:', searchTerms);

    const pushCandidate = (candidate: { url: string; title?: string; desc?: string; source?: string }) => {
      if (!candidate.url || images.includes(candidate.url)) return;
      images.push(candidate.url);
      rawImageCandidates.push(candidate);
    };

    // === Strategy 0: exact entity query via Brave, mirroring manual search behavior ===
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    if (braveApiKey) {
      const exactQueries = [
        baseTopicForSearch,
        isPortuguese ? `${baseTopicForSearch} foto` : `${baseTopicForSearch} photo`,
      ].filter(Boolean);

      for (const exactQuery of exactQueries) {
        if (images.length >= 12) break;
        try {
          console.log('[IMAGES] Exact Brave query:', exactQuery);
          const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(exactQuery)}&count=30&safesearch=strict&size=Large`;
          const imgResponse = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const results = imgData.results || [];
            for (const item of results) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              const metadata = [
                item.title, item.description, item.source,
                item.page_fetched?.title, item.page_fetched?.description,
              ].filter(Boolean).join(' ');
              if (imgUrl && isCleanImageCandidate(imgUrl, metadata)) {
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if ((w === 0 && h === 0) || (w >= 400 && h >= 300)) {
                  pushCandidate({
                    url: imgUrl,
                    title: item.title || item.page_fetched?.title || '',
                    desc: item.description || item.page_fetched?.description || '',
                    source: item.source || '',
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('[IMAGES] Exact Brave error:', e);
        }
      }
    }

    // === Strategy 1: ScrapingDog Google Images API (higher quality, real Google results) ===
    const scrapingDogKey = Deno.env.get('SCRAPINGDOG_API_KEY');
    if (scrapingDogKey) {
      for (const term of searchTerms) {
        if (images.length >= 25) break;
        try {
          const localizedQuery = /\bfoto\b|\bfotografia\b|\bphoto\b|\bphotograph\b/i.test(term)
            ? term
            : `${term} ${isPortuguese ? 'foto' : 'photo'}`;
          const query = encodeURIComponent(localizedQuery);
          const sdUrl = `https://api.scrapingdog.com/google_images/?api_key=${scrapingDogKey}&query=${query}&results=20&country=${isPortuguese ? 'br' : 'us'}&safe=active&image_type=photo&imgsz=l`;
          console.log('[IMAGES] ScrapingDog query:', term);
          const sdResponse = await fetch(sdUrl);
          if (sdResponse.ok) {
            const sdData = await sdResponse.json();
            const results = sdData.images_results || [];
            for (const item of results) {
              const imgUrl = item.original || item.image;
              if (!imgUrl) continue;
              const metadata = [item.title, item.source, item.link].filter(Boolean).join(' ');
              if (isCleanImageCandidate(imgUrl, metadata)) {
                const w = item.original_width || 0;
                const h = item.original_height || 0;
                if ((w === 0 && h === 0) || (w >= 400 && h >= 300)) {
                  pushCandidate({
                    url: imgUrl,
                    title: item.title || '',
                    desc: '',
                    source: item.source || '',
                  });
                }
              }
            }
            console.log('[IMAGES] ScrapingDog images for "' + term + '":', results.length, 'raw, ' + images.length + ' after filter');
          } else {
            const errText = await sdResponse.text();
            console.error('[IMAGES] ScrapingDog error status:', sdResponse.status, errText);
          }
        } catch (e) {
          console.error('[IMAGES] ScrapingDog error:', e);
        }
      }
    }

    // === Strategy 2: Brave Search fallback (if ScrapingDog returned too few) ===
    if (braveApiKey && images.length < 8) {
      console.log('[IMAGES] ScrapingDog returned only', images.length, '— falling back to Brave Search');
      for (const term of searchTerms) {
        if (images.length >= 20) break;
        try {
          const cleanQuery = `${term} ${isPortuguese ? 'foto' : 'photo'} -text -infographic -quote -meme -template -typography -tweet -twitter -screenshot -poster -thumbnail -reaction -instagram -tiktok -promo -banner -collage -montage -listicle -slideshow -"here are" -"must see" -"top 10" -highlights -recap`;
          const query = encodeURIComponent(cleanQuery);
          const url = `https://api.search.brave.com/res/v1/images/search?q=${query}&count=30&safesearch=strict&type=photo`;
          const imgResponse = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const results = (imgData.results || []);
            for (const item of results) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              const metadata = [
                item.title, item.description, item.source,
                item.page_fetched?.title, item.page_fetched?.description,
              ].filter(Boolean).join(' ');
              if (imgUrl && isCleanImageCandidate(imgUrl, metadata)) {
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if ((w === 0 && h === 0) || (w >= 400 && h >= 300)) {
                  pushCandidate({
                    url: imgUrl,
                    title: item.title || item.page_fetched?.title || '',
                    desc: item.description || item.page_fetched?.description || '',
                    source: item.source || '',
                  });
                }
              }
            }
            console.log('[IMAGES] Brave images for "' + term + '":', results.length, 'raw, ' + images.length + ' after filter');
          }
        } catch (e) {
          console.error('[IMAGES] Brave error:', e);
        }
      }
    }

    // Never invent images in automatic web search; if search quality is low, return fewer but relevant real photos.

    // Deduplicate
    images = [...new Set(images)];
    console.log('[IMAGES] Total candidates before AI filter:', images.length);

    console.log('[IMAGES] Total clean images after filter:', images.length);

    const seenCandidateUrls = new Set<string>();
    const imageCandidates = rawImageCandidates.filter((candidate) => {
      if (!images.includes(candidate.url)) return false;
      if (seenCandidateUrls.has(candidate.url)) return false;
      seenCandidateUrls.add(candidate.url);
      return true;
    });

    return new Response(
      JSON.stringify({
        success: true,
        content: parsedContent,
        citations,
        images: images.slice(0, 50),
        image_candidates: imageCandidates.slice(0, 50),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
