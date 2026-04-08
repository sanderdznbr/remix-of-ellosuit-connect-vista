import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      topic,
      cardIndex,
      totalCards,
      cardTitle,
      cardBody,
      animationStyle = "slide-fade",
      brandName,
      bgColor = "#0f0f0f",
      accentColor = "#8B5CF6",
      textColor = "#ffffff",
      fontFamily = "Inter",
      logoUrl,
      logoPosition = "bottom-right", // top-left, top-right, bottom-left, bottom-right
      backgroundImageUrl,
      format = "4:5",
    } = body;

    if (!topic || cardIndex === undefined || !totalCards) {
      return new Response(JSON.stringify({ error: "topic, cardIndex, totalCards are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dimensions = format === "9:16" ? { w: 1080, h: 1920 } : format === "1:1" ? { w: 1080, h: 1080 } : { w: 1080, h: 1350 };

    // Logo position CSS mapping
    const logoPositionMap: Record<string, string> = {
      "top-left": "top: 40px; left: 40px;",
      "top-right": "top: 40px; right: 40px;",
      "bottom-left": "bottom: 40px; left: 40px;",
      "bottom-right": "bottom: 40px; right: 40px;",
    };
    const logoCss = logoPositionMap[logoPosition] || logoPositionMap["bottom-right"];

    const systemPrompt = `You are an expert motion graphics designer who creates stunning animated social media cards using pure HTML and CSS.

You MUST return ONLY valid HTML code. No markdown, no explanation, no code fences. Just the raw HTML starting with <!DOCTYPE html>.

CRITICAL RULES:
- The output must be a COMPLETE, self-contained HTML file with embedded CSS
- Canvas size: exactly ${dimensions.w}px × ${dimensions.h}px (use width/height on body and overflow:hidden)
- Use ONLY CSS @keyframes animations — NO JavaScript
- All animations must loop infinitely OR complete within 4 seconds
- Use Google Fonts via @import for the font: ${fontFamily} (and optionally Montserrat, Playfair Display, Space Grotesk as secondary)
- Background color: ${bgColor}
- Accent/highlight color: ${accentColor}
- Text color: ${textColor}
- Font family: "${fontFamily}" — use this as the PRIMARY font for all text
- Brand name: ${brandName || 'none'}
${logoUrl ? `- Include the logo as an <img> element with src="${logoUrl}" — position it with: position:absolute; ${logoCss} max-width:120px; max-height:60px; object-fit:contain; z-index:100;` : ''}
${backgroundImageUrl ? `- Use this background image: url("${backgroundImageUrl}") — set it as background-image on the main container with background-size:cover; background-position:center; Add a dark overlay (rgba(0,0,0,0.4) to rgba(0,0,0,0.7)) on top to ensure text readability` : ''}
- Make it visually STUNNING — think motion graphics, not PowerPoint
- Use creative layouts: asymmetric grids, overlapping elements, rotated text
- Add subtle background animations: moving gradients, floating shapes, particle-like dots
- Typography should be bold and impactful — vary sizes dramatically
- Include the card number indicator (${cardIndex + 1}/${totalCards}) subtly
- SAFE AREA: Keep all text and important elements at least 8% away from edges

ANIMATION STYLE: "${animationStyle}"
- "slide-fade": Elements slide in from different directions with fade
- "scale-bounce": Elements scale up with slight bounce
- "typewriter": Text appears character by character
- "cinematic": Slow dramatic reveals with parallax-like depth
- "kinetic": Fast, energetic movements with quick cuts
- "elegant": Smooth, refined transitions with subtle motion

The card should tell part of a story about: "${topic}"
This is card ${cardIndex + 1} of ${totalCards}.
${cardTitle ? `Card title: "${cardTitle}"` : ''}
${cardBody ? `Card content: "${cardBody}"` : ''}

Make each card feel unique but part of a cohesive series. Use the animation style consistently.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create an animated HTML/CSS card for: "${topic}". Card ${cardIndex + 1}/${totalCards}.${cardTitle ? ` Title: "${cardTitle}".` : ''}${cardBody ? ` Content: "${cardBody}".` : ''} Make it visually spectacular with the "${animationStyle}" animation style. Use "${fontFamily}" as the primary font.${backgroundImageUrl ? ' Use the background image with a dark overlay for readability.' : ''}` },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI error ${response.status}:`, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha na geração", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let htmlContent = data?.choices?.[0]?.message?.content || "";

    // Clean up: remove markdown code fences if present
    htmlContent = htmlContent
      .replace(/^```html?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    // Validate it starts with HTML
    if (!htmlContent.includes("<html") && !htmlContent.includes("<!DOCTYPE")) {
      htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;width:${dimensions.w}px;height:${dimensions.h}px;overflow:hidden;background:${bgColor};}</style></head><body>${htmlContent}</body></html>`;
    }

    console.log(`✅ Animated card ${cardIndex + 1}/${totalCards} generated (${htmlContent.length} chars)`);

    return new Response(
      JSON.stringify({ 
        html: htmlContent, 
        cardIndex,
        dimensions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-animated-card error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
