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
  'tenor.com', 'giphy.com', 'img.youtube.com', 'youtube.com',
  'venngage.com', 'slidechef.net', 'dexerto.com', 'termometrooscar.com', 'techtudo.com'
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
    'maxresdefault', 'winners-list', 'imgflip', '.svg'
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
          // Append strict anti-text / anti-social-post filter keywords and request photo type
          const cleanQuery = `${term} real event photography -text -infographic -quote -meme -template -typography -tweet -twitter -x -screenshot -poster -thumbnail -reaction -instagram -tiktok`;
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
              const metadata = [
                item.title,
                item.description,
                item.source,
                item.page_fetched?.title,
                item.page_fetched?.description,
              ].filter(Boolean).join(' ');
              if (imgUrl && isCleanImageCandidate(imgUrl, metadata)) {
                const w = item.properties?.width || item.width || 0;
                const h = item.properties?.height || item.height || 0;
                if ((w === 0 && h === 0) || (w >= 400 && h >= 300)) {
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
