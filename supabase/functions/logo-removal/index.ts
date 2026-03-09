import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { action, imageBase64, mimeType, regions } = await req.json();

    // ── DETECT ──────────────────────────────────────────────
    if (action === 'detect') {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image carefully and identify ALL logos, brand marks, watermarks, company identifiers, and any overlaid text branding. For each one, provide its bounding box as a percentage of the image dimensions (0 to 100). Be precise and include every logo, even small corner logos or watermarks.'
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

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Remove error:', response.status, errText);
        if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (response.status === 402) return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageResult) throw new Error('No image returned from AI');

      const base64 = imageResult.replace(/^data:image\/\w+;base64,/, '');
      const resultMimeType = imageResult.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/png';

      return new Response(JSON.stringify({ processedImageBase64: base64, mimeType: resultMimeType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
