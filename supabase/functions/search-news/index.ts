const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domains known to return memes, posters, wallpapers, screenshots, templates, or low-quality image aggregators
const BLOCKED_DOMAINS = [
  'shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'canva.com',
  'freepik.com', 'vecteezy.com', 'depositphotos.com', '123rf.com',
  'dreamstime.com', 'alamy.com', 'pinterest.com', 'pinimg.com',
  'youtube.com', 'youtu.be', 'ytimg.com', 'i.ytimg.com', 'yt3.ggpht.com',
  'i9.ytimg.com', 'i1.ytimg.com', 'img.youtube.com',
  'dailymotion.com', 'vimeo.com', 'tiktok.com', 'tiktokcdn.com',
  'twitter.com', 'x.com', 'pbs.twimg.com', 'abs.twimg.com', 'ton.twimg.com',
  'facebook.com', 'fbcdn.net', 'instagram.com', 'cdninstagram.com',
  'reddit.com', 'redd.it', 'preview.redd.it', 'i.redd.it',
  'slideshare.net', 'slideplayer.com', 'slideserve.com', 'slideteam.net', 'slidechef.net',
  'templatemonster.com', 'envato.com', 'elements.envato.com',
  'imgflip.com', 'memegenerator.net', 'makeameme.org', 'quickmeme.com',
  'knowyourmeme.com', 'kym-cdn.com', 'memedroid.com', 'ifunny.co', '9gag.com',
  'buzzfeed.com', 'boredpanda.com', 'cheezburger.com', 'chzbgr.com', 'quickpun.com',
  'wikimedia.org', 'wikipedia.org', 'wikia.com', 'fandom.com',
  'goodreads.com', 'brainyquote.com', 'azquotes.com',
  'etsy.com', 'redbubble.com', 'teepublic.com', 'zazzle.com',
  'screenrant.com', 'srcdn.com', 'cbr.com', 'gamerant.com',
  'amazon.com', 'media-amazon.com', 'wallpapercave.com', 'wallpapersafari.com',
];

const TRUSTED_PHOTO_DOMAINS = [
  'people.com', 'ew.com', 'variety.com', 'hollywoodreporter.com', 'deadline.com',
  'bbc.com', 'cnn.com', 'nytimes.com', 'apnews.com', 'reuters.com',
  'exame.com', 'metropoles.com', 'gshow.globo.com', 'globo.com', 'sbt.com.br',
  'sbtnews.sbt.com.br', 'uol.com.br', 'folha.uol.com.br', 'estadao.com.br',
  'opovo.com.br', 'omelete.com.br', 'cinebuzz.com.br', 'rollingstone.com',
];

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchesDomain(url: string, domains: string[]): boolean {
  const hostname = getHostname(url);
  const lower = url.toLowerCase();
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`) || lower.includes(domain));
}

function isTrustedPhotoDomain(url: string): boolean {
  return matchesDomain(url, TRUSTED_PHOTO_DOMAINS);
}

function hasPhotoLikeAspectRatio(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio >= 0.65 && ratio <= 2.2;
}

// Filter out images that likely contain text overlays, posters, memes, or screenshots
function isCleanImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (matchesDomain(url, BLOCKED_DOMAINS)) return false;

  const badPatterns = [
    'infographic', 'quote', 'meme', 'memes', 'text-overlay', 'typography', 'template',
    'mockup', 'banner', 'flyer', 'poster', 'thumbnail', 'wallpaper',
    'maxresdefault', 'hqdefault', 'mqdefault', 'sddefault',
    'vi_webp', 'vi/', 'embed', 'watch', 'shorts',
    'video-thumbnail', 'video_thumbnail', 'cover_image',
    'og-image', 'opengraph', 'og_image', 'social-share',
    'tweet', 'screenshot', 'screen-shot', 'screen_shot', 'screencap',
    'motivational', 'inspirational', 'wallpaper-quote',
    'collection-of', 'best-of', 'top-10', 'compilation',
    'nomination', 'nominee', 'nominees-list', 'award-list',
    'funny', 'hilarious', 'lol', 'reaction', 'gif', 'fan-art', 'fanart',
  ];

  return !badPatterns.some((pat) => lower.includes(pat));
}

function normalizeSearchQuery(query: string): string {
  return query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(foto|fotografia|fotografias)\b/gi, 'photo')
    .replace(/\b(oscars)\b/gi, 'Oscar')
    .replace(/\b(tapete vermelho)\b/gi, 'red carpet')
    .replace(/\b(ator ganhador|ator vencedor|melhor ator)\b/gi, 'Best Actor winner')
    .replace(/\b(atriz vencedora|melhor atriz)\b/gi, 'Best Actress winner')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildQueryVariants(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  const compact = normalized
    .replace(/\b(2026|2025|2024)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return [...new Set([
    query,
    normalized,
    `${normalized} editorial`,
    compact ? `${compact} photo` : '',
  ].filter(Boolean))];
}

async function searchBravePhotos(query: string, braveKey: string, count = 30): Promise<string[]> {
  try {
    // Simple search: just the query + minimal exclusions. Let Brave handle relevance.
    const cleanQuery = `${query} -meme -funny -template -wallpaper -fanart`;
    const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(cleanQuery)}&count=${count}&safesearch=strict`;
    console.log('[BRAVE] Searching:', cleanQuery.slice(0, 80));
    const res = await fetch(url, { headers: { 'X-Subscription-Token': braveKey } });
    if (!res.ok) {
      console.error('[BRAVE] HTTP error:', res.status);
      return [];
    }

    const data = await res.json();
    const candidates: { url: string; score: number }[] = [];

    for (const item of (data.results || [])) {
      const imgUrl = item.properties?.url || item.thumbnail?.src;
      if (!imgUrl || !imgUrl.startsWith('http') || !isCleanImageUrl(imgUrl)) continue;

      const width = item.properties?.width || item.width || 0;
      const height = item.properties?.height || item.height || 0;
      // Minimum 300x200 for any image
      if (width > 0 && height > 0 && (width < 300 || height < 200)) continue;
      if (width > 0 && height > 0 && !hasPhotoLikeAspectRatio(width, height)) continue;

      const hostname = getHostname(imgUrl);
      const looksAggregator = /(pinimg|pinterest|amazon|wallpap|slide|meme|quote|tiktok|reddit|facebook|instagram|twitter|x\.|youtube|fandom|wikia|redbubble)/i.test(hostname);
      if (looksAggregator) continue;

      const trusted = isTrustedPhotoDomain(imgUrl);
      let score = trusted ? 140 : 40;
      score += Math.min(width || 800, 2400) / 100;
      score += Math.min(height || 600, 1800) / 100;
      candidates.push({ url: imgUrl, score });
    }

    console.log('[BRAVE] Found', candidates.length, 'candidates for:', query.slice(0, 50));
    return [...new Set(candidates.sort((a, b) => b.score - a.score).map((c) => c.url))].slice(0, 8);
  } catch (e) {
    console.error('[IMAGES] Brave search error:', e);
    return [];
  }
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

      const mainTopic = per_card_queries[0]?.topic || '';
      console.log('[PER_CARD] Searching images for', per_card_queries.length, 'cards, topic:', mainTopic);
      const cardImages: Record<number, string[]> = {};

      // === STEP 1: Use AI to generate proper image search queries from editorial card titles ===
      let aiQueries: Record<number, string[]> = {};
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        try {
          const cardsForAI = per_card_queries.map((q: any) => ({
            index: q.index,
            title: q.title || '',
            body: q.body || '',
            is_cover: q.is_cover || q.index === 0,
          }));

          // Also pass key_entities from the initial web search if available
          const keyEntities = per_card_queries[0]?.key_entities || [];
          const entityContext = keyEntities.length > 0 
            ? `\nKNOWN ENTITIES FROM RESEARCH: ${keyEntities.join(', ')}` 
            : '';

          const aiPrompt = `You are an image search expert. Given a post topic, card contents, and known entities from research, generate the BEST image search queries to find REAL PHOTOGRAPHS only.

TOPIC: "${mainTopic}"
${entityContext}

CARDS:
${cardsForAI.map((c: any) => `Card ${c.index}${c.is_cover ? ' (COVER)' : ''}: Title="${c.title}" Body="${c.body}"`).join('\n')}

CRITICAL RULES:
1. You MUST cross-reference each card's title and body with the KNOWN ENTITIES list to figure out WHO or WHAT each card is about
2. For the COVER card (Card 0): Find the MAIN person or subject. If topic is "Oscar 2026" and "Michael B. Jordan" is in entities, the cover query MUST be "Michael B. Jordan Oscar red carpet photo"
3. For cards with titles like "O GRANDE VENCEDOR", "MELHOR ATOR", "BEST ACTOR": Look at the body text AND the entities list to find the actual person name. ALWAYS use the person's REAL NAME in the query
4. For cards about films/movies: Use the film's actual name from entities. "Sinners movie premiere photo" not "best picture oscar"
5. For cards with NO specific person (generic titles like "POR QUE ESTE FILME?", "ATUAÇÕES MEMORÁVEIS"): Search for the TOPIC itself. E.g. "Oscar 2026 ceremony photo", "Oscar 2026 stage photo"
6. For CTA/closing cards: Use a general topic photo. "Oscar 2026 red carpet photo"
7. NEVER search for: memes, quotes, fan art, screenshots, infographics, templates, collages
8. ALL queries MUST be in ENGLISH for international topics — English returns better photo results from news agencies
9. Add "photo" to every query
10. Each card: 3 queries (primary: specific person/film + context, secondary: person/film name alone, fallback: topic + context)

Return a JSON object: { "queries": { "0": ["query1", "query2", "query3"], "1": ["query1", "query2", "query3"], ... } }
Only return the JSON, nothing else.`;

          const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [{ role: 'user', content: aiPrompt }],
              temperature: 0.2,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiContent = aiData.choices?.[0]?.message?.content || '';
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiQueries = parsed.queries || {};
              console.log('[PER_CARD] AI generated queries:', JSON.stringify(aiQueries));
            }
          } else {
            console.error('[PER_CARD] AI query generation failed:', aiRes.status);
          }
        } catch (e) {
          console.error('[PER_CARD] AI query generation error:', e);
        }
      }

      const searchCard = async (cardIndex: number, originalQuery: string) => {
        const queries = aiQueries[String(cardIndex)] || aiQueries[cardIndex] || [originalQuery];
        let images: string[] = [];

        for (const query of queries) {
          if (images.length >= 5) break;
          const results = await searchBravePhotos(query, braveApiKey, 30);
          images = [...images, ...results];
          console.log(`[PER_CARD] Card ${cardIndex} "${query.slice(0, 50)}": ${results.length} images`);
        }

        cardImages[cardIndex] = [...new Set(images)].slice(0, 8);
      };

      for (let i = 0; i < per_card_queries.length; i += 3) {
        const batch = per_card_queries.slice(i, i + 3).map((q: { index: number; query: string }) =>
          searchCard(q.index, q.query)
        );
        await Promise.all(batch);
        if (i + 3 < per_card_queries.length) await new Promise(r => setTimeout(r, 200));
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
      "source": "Name of the source",
      "person_name": "Full name of the main person mentioned in this fact (or null if none)"
    }
  ],
  "cta_title": "Call to action title (max 60 chars)",
  "cta_body": "Call to action message (max 120 chars)",
  "image_search_terms": ["term1", "term2", "term3"],
  "clean_topic": "The extracted main subject/topic name only (e.g. 'CS2', 'Tesla', 'Bitcoin')",
  "key_entities": ["Full Name 1", "Full Name 2", "Company Name"],
  "summary": "A brief 2-sentence summary of the key findings"
}
Provide 4-6 facts. All content must be in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language}. Base everything on REAL, current, verified information.

CRITICAL for clean_topic: Extract ONLY the core subject name from the user request. If user says "Crie um post sobre CS2" the clean_topic is "CS2". If user says "Novidades do Bitcoin" the clean_topic is "Bitcoin". Just the subject, no verbs or filler words.

CRITICAL for key_entities: Extract ALL specific named entities (people, companies, films, teams, products) mentioned in the facts. Use their FULL REAL NAMES exactly as known publicly. For example, for "Oscar 2026 winners": ["Michael B. Jordan", "Sinners", "Demi Moore", "The Substance", "Brady Corbet", "The Brutalist"]. This is essential for image search.

CRITICAL for person_name in each fact: If the fact is about or mentions a specific person, include their FULL NAME. Example: if the heading says "Melhor Ator" and the body mentions the winner, person_name should be "Michael B. Jordan" (the actual winner's full name). This field is MANDATORY when a person is involved.

CRITICAL for image_search_terms: Each term MUST be a search query that returns REAL PHOTOGRAPHS (not graphics, not infographics, not images with text). Think about what a photographer would capture. Add the word "photo" or "fotografia" to each term. Examples:
- For "MEI": "microempreendedor trabalhando escritório fotografia", "pessoa empreendedora negócio próprio foto"
- For CS2: "Counter-Strike 2 gameplay screenshot", "CS2 tournament player photo"
- For Tesla: "Tesla Model 3 driving road photo"
NEVER use abstract terms like "technology", "update", "2026". NEVER suggest terms that would return infographics, charts, text-heavy images, or memes. Each term must describe a VISUAL SCENE or REAL OBJECT.`;

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

    // Search for images - use clean topic from AI, not raw user input
    let images: string[] = [];
    let cleanTopic = parsedContent.clean_topic || topic;
    // If AI failed to extract clean_topic and it still looks like a full sentence, extract the key subject
    if (cleanTopic.length > 40 || /\b(crie|sobre|post|explique|faça|fale)\b/i.test(cleanTopic)) {
      // Try to extract a name or subject from the prompt
      const nameMatch = cleanTopic.match(/(?:sobre|de|quem é)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/i);
      if (nameMatch) {
        cleanTopic = nameMatch[1].trim();
      } else {
        // Remove common filler words
        cleanTopic = cleanTopic
          .replace(/\b(crie|criar|um|uma|post|sobre|explique|faça|fale|conte|o que|e|ele|ela|fez|quem é)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      console.log('[IMAGES] Cleaned topic from prompt:', cleanTopic);
    }
    // Store cleaned topic back so per-card search uses it too
    parsedContent.clean_topic = cleanTopic;

    // Build search terms: always include the clean name/topic directly
    const keyEntities: string[] = parsedContent.key_entities || [];
    const searchTerms: string[] = [];
    // Primary: just the name/topic
    searchTerms.push(cleanTopic);
    // Secondary: key entities (people names)
    for (const entity of keyEntities.slice(0, 3)) {
      if (entity !== cleanTopic) searchTerms.push(entity);
    }
    // Tertiary: AI-suggested terms
    const aiTerms: string[] = parsedContent.image_search_terms || [];
    for (const term of aiTerms) {
      if (!searchTerms.includes(term)) searchTerms.push(term);
    }
    console.log('[IMAGES] Clean topic:', cleanTopic);
    console.log('[IMAGES] Search terms:', searchTerms.slice(0, 5));

    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    if (braveApiKey) {
      for (const term of searchTerms.slice(0, 4)) {
        if (images.length >= 20) break;
        const results = await searchBravePhotos(term, braveApiKey, 50);
        images = [...images, ...results];
        console.log('[IMAGES] Brave images for "' + term + '": ' + results.length);
      }
    }

    const shouldAvoidAiFallback = /(oscar|academy awards|ator|atriz|actor|actress|director|premiere|ceremony|winner|vencedor|filme|movie)/i.test(
      `${cleanTopic} ${searchTerms.join(' ')}`
    );

    // Strategy 2: Generate images with AI only for non-editorial topics if search found too few
    if (images.length < 2 && !shouldAvoidAiFallback) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        console.log('[IMAGES] Generating AI images for topic:', cleanTopic);
        try {
          for (const term of searchTerms.slice(0, 3)) {
            if (images.length >= 4) break;
            const aiPrompt = `Create a high-quality, photorealistic image of: ${term}. Make it visually stunning and suitable for a social media carousel post. No text, no watermarks, no overlays, no typography — pure photography only.`;
            const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-image',
                messages: [{ role: 'user', content: aiPrompt }],
                modalities: ['image', 'text'],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const aiImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (aiImage) {
                images.push(aiImage);
                console.log('[IMAGES] AI generated image successfully');
              }
            }
          }
        } catch (e) {
          console.error('[IMAGES] AI generation error:', e);
        }
      }
    }

    // Deduplicate
    images = [...new Set(images)];
    console.log('[IMAGES] Total clean images found:', images.length);

    return new Response(
      JSON.stringify({
        success: true,
        content: parsedContent,
        citations,
        images: images.slice(0, 50),
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
