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
    const { action, topic, keywords, cardCount, prompt, imageSize } = body;

    if (action === 'generate-content') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const numCards = cardCount || 7;

      const systemPrompt = `Você é um especialista em criação de carrosséis para Instagram. 
Gere conteúdo otimizado para um carrossel de ${numCards} cards sobre o tópico fornecido.

REGRAS:
- Card 1: Título chamativo (máx 8 palavras) + subtítulo curto
- Cards 2 a ${numCards - 1}: Cada card deve ter um título curto (3-5 palavras) e um texto informativo (máx 40 palavras)
- Card ${numCards}: CTA (chamada para ação) + frase motivacional

Responda APENAS em JSON válido neste formato:
{
  "title": "título do carrossel",
  "cards": [
    {
      "type": "cover",
      "title": "Título Principal",
      "subtitle": "Subtítulo explicativo"
    },
    {
      "type": "content",
      "title": "Título do Card",
      "body": "Texto informativo do card..."
    },
    {
      "type": "cta",
      "title": "Gostou?",
      "body": "Salve, compartilhe e siga para mais conteúdo!"
    }
  ],
  "suggestedImageKeywords": ["keyword1", "keyword2", "keyword3"]
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
      
      // Extract JSON from response
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

    if (action === 'generate-ai-image') {
      const NANOBANANA_API_KEY = Deno.env.get('NANOBANANA_API_KEY');
      if (!NANOBANANA_API_KEY) {
        return new Response(JSON.stringify({ error: 'NANOBANANA_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }


      const imagePrompt = prompt || topic || 'abstract background';

      // Step 1: Create generation task
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

      // Step 2: Poll for result (max 60s)
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
        // flag === 0 means still generating, continue polling
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

    if (action === 'search-images') {
      const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
      if (!PEXELS_API_KEY) {
        return new Response(JSON.stringify({ error: 'PEXELS_API_KEY not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const query = keywords?.join(' ') || topic;
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=square`,
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
