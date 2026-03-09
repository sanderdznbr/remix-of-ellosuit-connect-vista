import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 503 && res.status !== 429) return res;
    const delay = (attempt + 1) * 2000;
    console.log(`Attempt ${attempt + 1} failed with ${res.status}, retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
  }
  return fetch(url, options);
}

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { action, imageBase64, maskBase64 } = await req.json();

    if (action === 'remove') {
      if (!imageBase64 || !maskBase64) {
        return new Response(JSON.stringify({ error: 'imageBase64 and maskBase64 are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const imageBytes = b64ToBytes(imageBase64);
      const maskBytes = b64ToBytes(maskBase64);

      // Build multipart form for DALL-E 2 inpainting
      // image: RGBA PNG 1024x1024
      // mask: RGBA PNG 1024x1024 (transparent = edit, opaque = preserve)
      const formData = new FormData();
      formData.append('model', 'dall-e-2');
      formData.append('image', new Blob([imageBytes], { type: 'image/png' }), 'image.png');
      formData.append('mask', new Blob([maskBytes], { type: 'image/png' }), 'mask.png');
      formData.append(
        'prompt',
        'Fill the transparent masked areas with a seamless, natural background that perfectly matches the surrounding colors, textures, gradients, and lighting. No logos, text, or new elements. Photorealistic result.'
      );
      formData.append('n', '1');
      formData.append('size', '1024x1024');
      formData.append('response_format', 'b64_json');

      console.log('Calling DALL-E 2 inpainting...');
      const response = await callWithRetry('https://ai.gateway.lovable.dev/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
        body: formData,
      }, 3);

      if (!response.ok) {
        const errText = await response.text();
        console.error('Inpaint error:', response.status, errText);
        if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${response.status} — ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      const b64Result = data?.data?.[0]?.b64_json;
      if (!b64Result) {
        console.error('No b64_json. Response keys:', JSON.stringify(Object.keys(data || {})));
        throw new Error('No image returned from AI');
      }

      console.log('Inpainting successful, result length:', b64Result.length);
      return new Response(JSON.stringify({ processedImageBase64: b64Result, mimeType: 'image/png' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "remove".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('logo-removal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
