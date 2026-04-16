// Edge function: Upscale/enhance image quality using AI
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== UPSCALE IMAGE === Starting...');

    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `UPSCALE this image to maximum resolution and quality. 

CRITICAL RULES:
1. Output the EXACT same image but at HIGHER resolution and SHARPER quality
2. DO NOT change ANY content — no modifications to text, colors, layout, people, objects, or composition
3. DO NOT crop, zoom, rotate, or alter framing in any way
4. DO NOT add watermarks, borders, filters, or effects
5. Enhance sharpness, reduce compression artifacts, improve detail clarity
6. Maintain the exact same aspect ratio
7. The output should look like a professional print-ready version of the input

This is purely a quality enhancement — the image content must remain pixel-perfect identical, just sharper and higher resolution.`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }],
        modalities: ['image', 'text'],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Upscale AI error [${res.status}]:`, errText.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Falha no upscale' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw = await res.text();
    const patterns = ['"url":"data:image/', '"url": "data:image/'];
    let resultUrl: string | null = null;
    for (const pattern of patterns) {
      const idx = raw.indexOf(pattern);
      if (idx === -1) continue;
      const urlStart = raw.indexOf('"', idx + 5) + 1;
      const urlEnd = raw.indexOf('"', urlStart);
      if (urlEnd === -1) continue;
      resultUrl = raw.slice(urlStart, urlEnd);
      break;
    }

    if (!resultUrl) {
      return new Response(JSON.stringify({ error: 'Falha ao processar upscale' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== UPSCALE IMAGE === Complete!');

    return new Response(JSON.stringify({ success: true, imageUrl: resultUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('upscale-image error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
