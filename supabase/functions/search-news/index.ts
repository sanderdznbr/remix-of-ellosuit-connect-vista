const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language = 'pt-BR' } = await req.json();

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

    // Search for real news using Perplexity
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
  "topic_keywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "A brief 2-sentence summary of the key findings"
}
Provide 4-6 facts. All content must be in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language}. Base everything on REAL, current, verified information.

CRITICAL for image_search_terms: Each term MUST describe a visual scene directly from the topic "${topic}" itself. For games, use in-game screenshots descriptions. For brands, use product photos. For sports, use match photos. Examples for "CS2": "Counter-Strike 2 gameplay Dust2 map", "CS2 weapon skin AK-47 ingame", "CS2 competitive match screenshot". NEVER use generic/unrelated terms.

CRITICAL for topic_keywords: Provide 3-5 English keywords that MUST appear in relevant image URLs or titles. For "CS2" use ["cs2","counter-strike","counterstrike","valve","csgo"]. For "Tesla" use ["tesla","model","electric","elon"]. These are used to filter out irrelevant images.`;

    const userPrompt = `Search for the latest real news, data, and facts about: "${topic}". Focus on recent developments, statistics, and verified information.`;

    let content = '';
    let citations: string[] = [];

    // Try Perplexity first, fallback to OpenAI
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

    // Fallback to OpenAI if Perplexity failed
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

    // Parse the JSON from the response
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

    // Search for images using multiple strategies
    let images: string[] = [];
    // Force topic relevance: prepend the main topic to every search term
    const rawTerms = parsedContent.image_search_terms || [topic];
    const searchTerms = rawTerms.map((t: string) => {
      const topicLower = topic.toLowerCase().split(' ').slice(0, 3).join(' ');
      return t.toLowerCase().includes(topicLower.split(' ')[0]) ? t : `${topic} ${t}`;
    });

    // Build relevance keywords for filtering irrelevant images
    const topicKeywords: string[] = (parsedContent.topic_keywords || []).map((k: string) => k.toLowerCase());
    // Always include the raw topic words as keywords
    const topicWords = topic.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const allKeywords = [...new Set([...topicKeywords, ...topicWords])];
    console.log('[IMAGES] Relevance keywords:', allKeywords);

    // Helper: check if an image URL seems relevant to the topic
    const isRelevantImage = (url: string, title?: string): boolean => {
      const combined = (url + ' ' + (title || '')).toLowerCase();
      // Must match at least one topic keyword in URL or title
      return allKeywords.some(kw => combined.includes(kw));
    };

    // Strategy 1: Brave Search Images
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    if (braveApiKey) {
      console.log('[IMAGES] Trying Brave Search with terms:', searchTerms.slice(0, 3));
      try {
        for (const term of searchTerms.slice(0, 3)) {
          const query = encodeURIComponent(term);
          const url = `https://api.search.brave.com/res/v1/images/search?q=${query}&count=5&safesearch=strict`;
          console.log('[IMAGES] Brave Search request for:', term);
          const imgResponse = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const results = (imgData.results || []);
            for (const item of results) {
              const imgUrl = item.properties?.url || item.thumbnail?.src;
              const imgTitle = item.title || '';
              if (imgUrl && isRelevantImage(imgUrl, imgTitle)) {
                images.push(imgUrl);
              } else if (imgUrl) {
                console.log('[IMAGES] Filtered out irrelevant:', imgUrl.slice(0, 80));
              }
            }
            console.log('[IMAGES] Brave: kept', images.length, 'relevant images so far');
          } else {
            const errText = await imgResponse.text();
            console.error('[IMAGES] Brave Search error:', imgResponse.status, errText);
          }
          if (images.length >= 6) break;
        }
      } catch (imgErr) {
        console.error('[IMAGES] Brave Search exception:', imgErr);
      }
    } else {
      console.log('[IMAGES] Brave Search not configured, skipping');
    }

    // Strategy 2: Pexels fallback if not enough images
    if (images.length < 3) {
      const pexelsKey = Deno.env.get('PEXELS_API_KEY');
      if (pexelsKey) {
        console.log('[IMAGES] Falling back to Pexels API');
        try {
          for (const term of searchTerms.slice(0, 2)) {
            const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=5&orientation=landscape`;
            const pexelsRes = await fetch(pexelsUrl, {
              headers: { 'Authorization': pexelsKey },
            });
            if (pexelsRes.ok) {
              const pexelsData = await pexelsRes.json();
              const urls = (pexelsData.photos || []).map((p: any) => p.src?.large2x || p.src?.large || p.src?.original).filter(Boolean);
              console.log('[IMAGES] Pexels returned', urls.length, 'images for term:', term);
              images.push(...urls);
            } else {
              const errText = await pexelsRes.text();
              console.error('[IMAGES] Pexels error:', pexelsRes.status, errText);
            }
          }
        } catch (pexErr) {
          console.error('[IMAGES] Pexels exception:', pexErr);
        }
      } else {
        console.log('[IMAGES] Pexels API key not configured');
      }
    }

    // Deduplicate
    images = [...new Set(images)];
    console.log('[IMAGES] Total images found:', images.length);

    return new Response(
      JSON.stringify({
        success: true,
        content: parsedContent,
        citations,
        images: images.slice(0, 6),
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
