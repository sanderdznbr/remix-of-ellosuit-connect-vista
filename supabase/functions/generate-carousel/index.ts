import "https://deno.land/std@0.168.0/http/server.ts";

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
    const { action, topic, keywords, cardCount, prompt, imageSize, query, referenceImageUrls } = body;

    // ===== WEB SEARCH for reference images (Google Custom Search) =====
    if (action === 'web-search') {
      const GOOGLE_CSE_API_KEY = Deno.env.get('GOOGLE_CSE_API_KEY');
      const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');
      
      if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
        // Fallback to Pexels if Google CSE not configured
        const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
        if (!PEXELS_API_KEY) {
          return new Response(JSON.stringify({ error: 'No image search API configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const searchQuery = query || topic || '';
        const pexelsRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=20&orientation=portrait`,
          { headers: { 'Authorization': PEXELS_API_KEY } }
        );
        let pexelsImages: any[] = [];
        if (pexelsRes.ok) {
          const pexelsData = await pexelsRes.json();
          pexelsImages = (pexelsData.photos || []).map((p: any) => ({
            id: p.id, url: p.src.large2x || p.src.large, thumb: p.src.medium,
            small: p.src.small, alt: p.alt || searchQuery, photographer: p.photographer, source: 'pexels',
          }));
        }
        return new Response(JSON.stringify({ success: true, images: pexelsImages, query: searchQuery }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || topic || '';
      if (!searchQuery) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Google CSE search for:', searchQuery, '| Key prefix:', GOOGLE_CSE_API_KEY?.substring(0, 10), '| CSE ID:', GOOGLE_CSE_ID);

      // Search Google Custom Search for real images
      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=10&imgSize=large&safe=active`;
      
      const googleRes = await fetch(googleUrl);
      let googleImages: any[] = [];
      
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        googleImages = (googleData.items || []).map((item: any, idx: number) => ({
          id: `google-${idx}`,
          url: item.link,
          thumb: item.image?.thumbnailLink || item.link,
          small: item.image?.thumbnailLink || item.link,
          alt: item.title || searchQuery,
          photographer: item.displayLink || 'Google',
          source: 'google',
          width: item.image?.width,
          height: item.image?.height,
        }));
      } else {
        const errText = await googleRes.text();
        console.error('Google CSE error:', googleRes.status, errText);
        
        // Fallback to Pexels on Google error
        const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
        if (PEXELS_API_KEY) {
          const pexelsRes = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15`,
            { headers: { 'Authorization': PEXELS_API_KEY } }
          );
          if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();
            googleImages = (pexelsData.photos || []).map((p: any) => ({
              id: p.id, url: p.src.large2x || p.src.large, thumb: p.src.medium,
              alt: p.alt || searchQuery, photographer: p.photographer, source: 'pexels',
            }));
          }
        }
      }

      return new Response(JSON.stringify({ success: true, images: googleImages, query: searchQuery }), {
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

      const systemPrompt = `Você é um especialista em criação de carrosséis editoriais profissionais para Instagram no formato 1080x1350.

Gere conteúdo para um carrossel de ${numCards} cards sobre o tópico fornecido.

REGRAS DE LAYOUT (siga EXATAMENTE):
- Card 1 (cover): Título impactante em CAIXA ALTA (máx 10 palavras) + subtítulo curto descritivo
- Cards 2 a ${numCards - 1} (content): Cada card tem DOIS blocos de texto:
  - "bodyTop": Parágrafo principal (30-60 palavras), informativo e denso. Deve conter trechos-chave que serão destacados em cor accent (coloque entre **asteriscos duplos** os trechos mais importantes, máx 15 palavras destacadas)
  - "bodyBottom": Segundo parágrafo (20-40 palavras), complementar, dados adicionais ou contexto
  - "imagePrompt": Descrição detalhada para gerar uma imagem de alta qualidade. Se o tópico mencionar marcas, produtos ou PESSOAS REAIS, descreva visualmente o que deveria aparecer com detalhes (ex: "homem musculoso fitness com camiseta preta em academia moderna, iluminação dramática", "embalagem de suplemento proteico em fundo escuro")
  - "searchTerms": Array de termos para buscar fotos de referência na web (ex: ["Toguro fitness", "Cimed logo", "suplemento proteico"]). Inclua nomes reais de pessoas e marcas mencionadas.
  - "needsImage": boolean - true se este card precisa de imagem baseado no conteúdo
- Card ${numCards} (cta): CTA + mensagem motivacional

${imageCardIndices.length > 0 ? `IMPORTANTE: Os cards nas posições ${imageCardIndices.join(', ')} DEVEM ter imagens (needsImage=true). Os demais podem ser somente texto.` : ''}

IMPORTANTE sobre imagePrompt e searchTerms:
- Se o tópico menciona PESSOAS REAIS (celebridades, influenciadores), inclua o nome deles em searchTerms para buscar fotos de referência
- Se menciona MARCAS, inclua o nome + "logo" ou "produto" em searchTerms
- imagePrompt deve descrever a cena visual detalhadamente (iluminação, composição, estilo)
- searchTerms são para buscar referências reais na web

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
            { role: 'user', content: `Tópico: ${topic}\nPalavras-chave: ${(keywords || []).join(', ')}` },
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

    // ===== GENERATE AI IMAGE =====
    if (action === 'generate-ai-image') {
      const NANOBANANA_API_KEY = Deno.env.get('NANOBANANA_API_KEY');
      if (!NANOBANANA_API_KEY) {
        return new Response(JSON.stringify({ error: 'NANOBANANA_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const imagePrompt = prompt || topic || 'abstract background';
      
      // If reference image URLs provided, use image-to-image editing
      const hasReferences = referenceImageUrls && referenceImageUrls.length > 0;

      if (hasReferences) {
        // Use Lovable AI gateway for image editing with references
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageContent: any[] = [
          { type: 'text', text: `Create a professional editorial magazine photo based on these reference images. ${imagePrompt}. Style: cinematic lighting, 4:5 portrait aspect ratio, high-end magazine quality.` }
        ];

        for (const refUrl of referenceImageUrls.slice(0, 3)) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: refUrl }
          });
        }

        const editResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [{ role: 'user', content: messageContent }],
            modalities: ['image', 'text'],
          }),
        });

        if (editResponse.ok) {
          const editData = await editResponse.json();
          const generatedImage = editData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (generatedImage) {
            return new Response(JSON.stringify({ success: true, imageUrl: generatedImage }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        // Fall through to NanoBanana if image editing fails
        console.log('Image editing with references failed, falling back to NanoBanana');
      }

      const genResponse = await fetch('https://api.nanobananaapi.ai/api/v1/nanobanana/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          numImages: 1,
          type: 'TEXTTOIAMGE',
          image_size: imageSize || '1:1',
          callBackUrl: 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/generate-carousel',
        }),
      });

      if (!genResponse.ok) {
        const errText = await genResponse.text();
        console.error('NanoBanana generate error:', genResponse.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao gerar imagem com IA' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const genData = await genResponse.json();
      const taskId = genData?.data?.taskId;

      if (!taskId) {
        return new Response(JSON.stringify({ error: 'Task ID não retornado' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let imageUrl: string | null = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise(r => setTimeout(r, 2000));

        const statusResponse = await fetch(
          `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`,
          { headers: { 'Authorization': `Bearer ${NANOBANANA_API_KEY}` } }
        );

        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        const flag = statusData?.data?.successFlag;

        if (flag === 1) {
          imageUrl = statusData.data.response?.resultImageUrl || statusData.data.response?.originImageUrl;
          break;
        } else if (flag === 2 || flag === 3) {
          return new Response(JSON.stringify({ error: statusData.data.errorMessage || 'Falha na geração' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Timeout na geração da imagem' }), {
          status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, imageUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SEARCH IMAGES (Pexels) =====
    if (action === 'search-images') {
      const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
      if (!PEXELS_API_KEY) {
        return new Response(JSON.stringify({ error: 'PEXELS_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || keywords?.join(' ') || topic;
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=15&orientation=square`,
        { headers: { 'Authorization': PEXELS_API_KEY } }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Pexels error:', response.status, errText);
        return new Response(JSON.stringify({ error: 'Erro ao buscar imagens' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const images = (data.photos || []).map((p: any) => ({
        id: p.id,
        url: p.src.large2x || p.src.large,
        thumb: p.src.medium,
        alt: p.alt || '',
        photographer: p.photographer,
      }));

      return new Response(JSON.stringify({ success: true, images }), {
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
