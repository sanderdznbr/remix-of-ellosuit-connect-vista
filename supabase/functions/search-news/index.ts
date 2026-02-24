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
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a content researcher. Search for the latest real news and information about the given topic. Return a JSON object with the following structure:
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
  "summary": "A brief 2-sentence summary of the key findings"
}
Provide 4-6 facts. All content must be in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language}. Base everything on REAL, current, verified information.`
          },
          {
            role: 'user',
            content: `Search for the latest real news, data, and facts about: "${topic}". Focus on recent developments, statistics, and verified information.`
          }
        ],
        temperature: 0.3,
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

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
    const searchTerms = parsedContent.image_search_terms || [topic];

    // Strategy 1: Brave Search Images
    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
    if (braveApiKey) {
      console.log('[IMAGES] Trying Brave Search with terms:', searchTerms.slice(0, 2));
      try {
        for (const term of searchTerms.slice(0, 2)) {
          const query = encodeURIComponent(term + ' ' + topic);
          const url = `https://api.search.brave.com/res/v1/images/search?q=${query}&count=3&safesearch=strict`;
          console.log('[IMAGES] Brave Search request for:', term);
          const imgResponse = await fetch(url, {
            headers: { 'X-Subscription-Token': braveApiKey },
          });
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const urls = (imgData.results || []).slice(0, 3).map((item: any) => item.properties?.url || item.thumbnail?.src).filter(Boolean);
            console.log('[IMAGES] Brave Search returned', urls.length, 'images for term:', term);
            images.push(...urls);
          } else {
            const errText = await imgResponse.text();
            console.error('[IMAGES] Brave Search error:', imgResponse.status, errText);
          }
        }
      } catch (imgErr) {
        console.error('[IMAGES] Brave Search exception:', imgErr);
      }
    } else {
      console.log('[IMAGES] Brave Search not configured, skipping');
    }

    // Strategy 2: Pexels fallback if no images found
    if (images.length === 0) {
      const pexelsKey = Deno.env.get('PEXELS_API_KEY');
      if (pexelsKey) {
        console.log('[IMAGES] Falling back to Pexels API');
        try {
          for (const term of searchTerms.slice(0, 2)) {
            const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=3&orientation=landscape`;
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
