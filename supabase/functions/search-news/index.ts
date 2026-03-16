const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Domains known to have text overlays, infographics, or watermarks
const BLOCKED_DOMAINS = [
  'shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'canva.com',
  'freepik.com', 'vecteezy.com', 'depositphotos.com', '123rf.com',
  'dreamstime.com', 'alamy.com', 'pinterest.com',
  'youtube.com', 'youtu.be', 'ytimg.com', 'i.ytimg.com', 'yt3.ggpht.com',
  'i9.ytimg.com', 'i1.ytimg.com', 'img.youtube.com',
  'dailymotion.com', 'vimeo.com', 'tiktok.com',
  'twitter.com', 'x.com', 'pbs.twimg.com', 'abs.twimg.com',
  'facebook.com', 'fbcdn.net', 'instagram.com', 'cdninstagram.com',
  'reddit.com', 'redd.it', 'preview.redd.it',
  'slideshare.net', 'slideplayer.com', 'slideserve.com', 'slideteam.net',
  'templatemonster.com', 'envato.com', 'elements.envato.com',
];

// Filter out images that likely contain text overlays
function isCleanImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  // Block known stock/design sites that watermark or overlay text
  for (const domain of BLOCKED_DOMAINS) {
    if (lower.includes(domain)) return false;
  }
  // Block URLs that hint at infographics, quotes, memes
  const badPatterns = ['infographic', 'quote', 'meme', 'text-overlay', 'typography', 'template', 'mockup', 'banner', 'flyer', 'poster', 'thumbnail', 'maxresdefault', 'hqdefault', 'mqdefault', 'sddefault', 'vi_webp', 'vi/', 'embed', 'watch', 'shorts', 'video-thumbnail', 'video_thumbnail', 'cover_image', 'og-image', 'opengraph'];
  for (const pat of badPatterns) {
    if (lower.includes(pat)) return false;
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
            title: q.title || q.query,
            body: q.body || '',
          }));

          const aiPrompt = `You are an image search expert. Given a post topic and card contents, generate the BEST image search queries to find REAL PHOTOGRAPHS (not memes, not graphics, not quotes, not templates, not screenshots).

TOPIC: "${mainTopic}"

CARDS:
${cardsForAI.map((c: any) => `Card ${c.index}: Title="${c.title}" Body="${c.body}"`).join('\n')}

RULES:
1. Each query must find a REAL PHOTOGRAPH of the actual subject mentioned in the card
2. If the card mentions a PERSON (actor, athlete, politician), the query MUST include the person's FULL NAME
3. If the card mentions an EVENT (Oscar ceremony, award show), search for real photos FROM that event
4. NEVER use the editorial/catchy title directly - extract the REAL SUBJECT
5. Add "photo" or "real photo" to each query
6. Each card should have 2 alternative queries (primary and fallback)
7. Queries must be in the language that will return the best photo results (usually English for international topics)
8. NEVER include years like 2026 in queries unless the event already happened - for future events, search for the most recent edition

Return a JSON object: { "queries": { "0": ["query1", "query2"], "1": ["query1", "query2"], ... } }
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

      const searchBraveImages = async (query: string, braveKey: string): Promise<string[]> => {
        const images: string[] = [];
        try {
          const cleanQuery = `${query} -text -infographic -quote -meme -template -typography -youtube -thumbnail -video -screenshot -presentation`;
          const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(cleanQuery)}&count=20&safesearch=strict&type=photo`;
          const res = await fetch(url, {
            headers: { 'X-Subscription-Token': braveKey },
          });
          if (res.ok) {
            const data = await res.json();
            for (const item of (data.results || [])) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              if (imgUrl && imgUrl.startsWith('http') && isCleanImageUrl(imgUrl)) {
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if (w >= 400 && h >= 400) {
                  images.push(imgUrl);
                }
              }
            }
          }
        } catch (e) {
          console.error('[PER_CARD] Brave search error:', e);
        }
        return images;
      };

      const searchCard = async (cardIndex: number, originalQuery: string) => {
        // Use AI-generated queries if available, otherwise fall back to original
        const queries = aiQueries[String(cardIndex)] || aiQueries[cardIndex] || [originalQuery];
        let images: string[] = [];

        for (const query of queries) {
          if (images.length >= 5) break;
          const results = await searchBraveImages(query, braveApiKey);
          images = [...images, ...results];
          console.log(`[PER_CARD] Card ${cardIndex} "${query.slice(0, 50)}": ${results.length} images`);
        }

        // Final fallback: if still too few, try just the topic + card index context
        if (images.length < 3) {
          const topicOnly = mainTopic.replace(/\b(20\d{2})\b/g, '').trim();
          if (topicOnly) {
            console.log(`[PER_CARD] Card ${cardIndex} topic-only fallback: "${topicOnly}"`);
            const fallbackImages = await searchBraveImages(`${topicOnly} photo`, braveApiKey);
            images = [...images, ...fallbackImages];
          }
        }

        // Deduplicate
        cardImages[cardIndex] = [...new Set(images)];
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
      "source": "Name of the source"
    }
  ],
  "cta_title": "Call to action title (max 60 chars)",
  "cta_body": "Call to action message (max 120 chars)",
  "image_search_terms": ["term1", "term2", "term3"],
  "clean_topic": "The extracted main subject/topic name only (e.g. 'CS2', 'Tesla', 'Bitcoin')",
  "summary": "A brief 2-sentence summary of the key findings"
}
Provide 4-6 facts. All content must be in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language}. Base everything on REAL, current, verified information.

CRITICAL for clean_topic: Extract ONLY the core subject name from the user request. If user says "Crie um post sobre CS2" the clean_topic is "CS2". If user says "Novidades do Bitcoin" the clean_topic is "Bitcoin". Just the subject, no verbs or filler words.

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
    const cleanTopic = parsedContent.clean_topic || topic;
    const searchTerms: string[] = parsedContent.image_search_terms || [`${cleanTopic} photo`, `${cleanTopic} fotografia`];
    console.log('[IMAGES] Clean topic:', cleanTopic);
    console.log('[IMAGES] Search terms:', searchTerms);

    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    if (braveApiKey) {
      for (const term of searchTerms.slice(0, 3)) {
        if (images.length >= 20) break;
        try {
          // Append anti-text keywords and request photo type
          const cleanQuery = `${term} -text -infographic -quote -meme -template -typography`;
          const query = encodeURIComponent(cleanQuery);
          const url = `https://api.search.brave.com/res/v1/images/search?q=${query}&count=50&safesearch=strict&type=photo`;
          const imgResponse = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const results = (imgData.results || []);
            for (const item of results) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              if (imgUrl && isCleanImageUrl(imgUrl)) {
                // Only accept reasonably sized images (photos tend to be larger)
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if (w >= 400 && h >= 400) {
                  images.push(imgUrl);
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

    // Strategy 2: Generate images with AI if search found too few
    if (images.length < 2) {
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
