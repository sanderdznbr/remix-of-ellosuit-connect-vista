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

// Extract base64 image from raw response text using regex (avoids large JSON parse issues)
function extractBase64FromText(text: string): { base64: string; mimeType: string } | null {
  // Try to find data URI pattern
  const dataUriMatch = text.match(/data:(image\/\w+);base64,([A-Za-z0-9+/=]+)/);
  if (dataUriMatch) {
    return { mimeType: dataUriMatch[1], base64: dataUriMatch[2] };
  }
  // Try to find raw base64 in image_url url field
  const urlMatch = text.match(/"url"\s*:\s*"data:(image\/\w+);base64,([A-Za-z0-9+/=]+)"/);
  if (urlMatch) {
    return { mimeType: urlMatch[1], base64: urlMatch[2] };
  }
  // Try inline_data (native Gemini format)
  const inlineMatch = text.match(/"data"\s*:\s*"([A-Za-z0-9+/=]{100,})"/);
  const mimeMatch = text.match(/"mime_type"\s*:\s*"(image\/\w+)"/);
  if (inlineMatch && mimeMatch) {
    return { mimeType: mimeMatch[1], base64: inlineMatch[1] };
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { action, imageBase64, mimeType, regions } = await req.json();

    // ── DETECT ──────────────────────────────────────────────
    if (action === 'detect') {
      const response = await callWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image carefully and identify ALL logos, brand marks, watermarks, company identifiers, and any overlaid text branding. For each one, provide its bounding box as a percentage of the image dimensions (0 to 100). Be precise and include every logo, even small corner logos or watermarks. If no logos are found, return an empty logos array.'
              },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }],
          tools: [{
            type: 'function',
            function: {
              name: 'report_logos',
              description: 'Report all detected logos and brand marks with their bounding boxes as image percentages',
              parameters: {
                type: 'object',
                properties: {
                  logos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        x: { type: 'number', description: 'Left edge of logo as % of image width (0-100)' },
                        y: { type: 'number', description: 'Top edge of logo as % of image height (0-100)' },
                        width: { type: 'number', description: 'Logo width as % of image width (0-100)' },
                        height: { type: 'number', description: 'Logo height as % of image height (0-100)' },
                        label: { type: 'string', description: 'Brief description of the logo/mark' }
                      },
                      required: ['x', 'y', 'width', 'height', 'label']
                    }
                  }
                },
                required: ['logos']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'report_logos' } }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Detect error:', response.status, errText);
        if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) return new Response(JSON.stringify({ logos: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      let logos = [];
      try { logos = JSON.parse(toolCall.function.arguments).logos || []; } catch { logos = []; }

      return new Response(JSON.stringify({ logos }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── REMOVE ──────────────────────────────────────────────
    if (action === 'remove') {
      const regionsDesc = (regions as any[]).map((r, i) =>
        `Region ${i + 1}: from ${r.x.toFixed(1)}% left, ${r.y.toFixed(1)}% top, spanning ${r.width.toFixed(1)}% wide × ${r.height.toFixed(1)}% tall`
      ).join('; ');

      const response = await callWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Remove ONLY the logos/watermarks/brand marks in the following regions of this image. Fill each region with the natural background that would be there (matching surrounding colors, textures, patterns). Do NOT add any new text, logos, or elements. Keep everything else in the image completely identical. Regions to clean: ${regionsDesc}. Return the full image with only those areas removed and filled naturally.`
              },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }],
          modalities: ['image', 'text']
        })
      }, 3);

      if (!response.ok) {
        const errText = await response.text();
        console.error('Remove error:', response.status, errText);
        if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (response.status === 402) return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      // Read raw text first to handle large base64 payloads efficiently
      const rawText = await response.text();
      console.log('Remove response length:', rawText.length);

      // Strategy 1: extract base64 from raw text (fast, avoids large JSON parse)
      const extracted = extractBase64FromText(rawText);
      if (extracted) {
        console.log('Image extracted via text search, mime:', extracted.mimeType);
        return new Response(JSON.stringify({ processedImageBase64: extracted.base64, mimeType: extracted.mimeType }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Strategy 2: parse JSON and check images array
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        throw new Error('No image returned from AI');
      }

      const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageResult) {
        const base64 = imageResult.replace(/^data:image\/\w+;base64,/, '');
        const resultMimeType = imageResult.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';
        return new Response(JSON.stringify({ processedImageBase64: base64, mimeType: resultMimeType }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Strategy 3: check content array for inline_data (native Gemini format)
      const contentParts = data.choices?.[0]?.message?.content;
      if (Array.isArray(contentParts)) {
        for (const part of contentParts) {
          if (part.inline_data?.data && part.inline_data?.mime_type) {
            return new Response(JSON.stringify({ processedImageBase64: part.inline_data.data, mimeType: part.inline_data.mime_type }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }

      console.error('No image found in response. Keys:', JSON.stringify(Object.keys(data.choices?.[0]?.message || {})));
      throw new Error('No image returned from AI');
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "detect" or "remove".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('logo-removal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
