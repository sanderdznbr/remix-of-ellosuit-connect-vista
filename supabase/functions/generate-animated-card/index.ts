import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateImage(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`Image generation failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (err) {
    console.error("Image generation error:", err);
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasMeaningfulHtml(html: string) {
  const trimmed = html.trim();
  if (!trimmed || trimmed.length < 280) return false;

  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch?.[1] || trimmed;
  const bodyText = bodyContent
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasVisualElements = /<img|<svg|radial-gradient|linear-gradient|background-image|class=|animation:/i.test(trimmed);
  return bodyText.length > 20 || (hasVisualElements && trimmed.length > 700);
}

function buildFallbackAnimatedHtml(params: {
  dimensions: { w: number; h: number };
  bgColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  topic: string;
  cardTitle?: string;
  cardBody?: string;
  brandName?: string;
  logoUrl?: string;
  logoCss: string;
  finalBgImageUrl?: string;
  mockupImageUrl?: string;
  cardIndex: number;
  totalCards: number;
}) {
  const {
    dimensions,
    bgColor,
    accentColor,
    textColor,
    fontFamily,
    topic,
    cardTitle,
    cardBody,
    brandName,
    logoUrl,
    logoCss,
    finalBgImageUrl,
    mockupImageUrl,
    cardIndex,
    totalCards,
  } = params;

  const safeTitle = escapeHtml((cardTitle || topic || "Novo card").slice(0, 80));
  const safeBody = escapeHtml((cardBody || `Ideias visuais e estratégia para ${topic}.`).slice(0, 180));
  const safeTopic = escapeHtml(topic.slice(0, 40).toUpperCase());
  const safeBrand = escapeHtml((brandName || "Marca").slice(0, 24));

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${dimensions.w}, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@400;500;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${dimensions.w}px;
      height: ${dimensions.h}px;
      overflow: hidden;
      background: ${bgColor};
      color: ${textColor};
      font-family: '${fontFamily}', system-ui, sans-serif;
    }
    body {
      position: relative;
      isolation: isolate;
      background-image:
        linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.45)),
        radial-gradient(circle at 20% 20%, ${accentColor}33 0%, transparent 35%),
        radial-gradient(circle at 85% 20%, ${accentColor}22 0%, transparent 28%),
        radial-gradient(circle at 50% 80%, ${accentColor}18 0%, transparent 38%)
        ${finalBgImageUrl ? `, url('${finalBgImageUrl}')` : ''};
      background-color: ${bgColor};
      background-size: cover, cover, cover, cover${finalBgImageUrl ? ', cover' : ''};
      background-position: center, center, center, center${finalBgImageUrl ? ', center' : ''};
      animation: bgShift 12s ease-in-out infinite alternate;
    }
    .overlay {
      position: absolute; inset: 0;
      background:
        linear-gradient(135deg, rgba(0,0,0,0.12), rgba(0,0,0,0.38)),
        linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.22) 100%);
      z-index: 1;
    }
    .grid {
      position: absolute; inset: 0; z-index: 2; opacity: 0.18;
      background-image:
        linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: radial-gradient(circle at center, black 0%, transparent 85%);
    }
    .line {
      position: absolute;
      width: 2px;
      height: 56%;
      right: 7.5%;
      top: 22%;
      background: linear-gradient(180deg, transparent, ${accentColor}, transparent);
      z-index: 3;
      box-shadow: 0 0 30px ${accentColor}66;
      animation: pulseLine 3s ease-in-out infinite;
    }
    .content {
      position: relative;
      z-index: 5;
      width: 100%;
      height: 100%;
      padding: 8.5% 8%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .eyebrow {
      font-size: 22px;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: ${accentColor};
      opacity: 0.9;
      animation: slideInTop 900ms ease-out both;
    }
    .main {
      display: grid;
      grid-template-columns: 1fr ${mockupImageUrl ? '0.82fr' : '0fr'};
      gap: 34px;
      align-items: center;
      flex: 1;
      min-height: 0;
    }
    .copy {
      align-self: center;
      max-width: ${mockupImageUrl ? '520px' : '760px'};
    }
    h1 {
      font-size: ${mockupImageUrl ? '108px' : '126px'};
      line-height: 0.92;
      font-weight: 800;
      letter-spacing: -0.06em;
      text-transform: uppercase;
      color: ${textColor};
      text-wrap: balance;
      animation: revealUp 1s cubic-bezier(.22,1,.36,1) both;
      text-shadow: 0 12px 40px rgba(0,0,0,0.28);
    }
    .body {
      margin-top: 28px;
      max-width: 540px;
      font-size: 38px;
      line-height: 1.35;
      color: ${textColor};
      opacity: 0.92;
      animation: revealUp 1s .18s cubic-bezier(.22,1,.36,1) both;
    }
    .accentWord {
      color: ${accentColor};
      text-shadow: 0 0 24px ${accentColor}44;
    }
    .mockupWrap {
      position: relative;
      display: ${mockupImageUrl ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      min-height: 620px;
      animation: revealRight 1.1s .22s cubic-bezier(.22,1,.36,1) both;
    }
    .mockupGlow {
      position: absolute;
      width: 72%;
      aspect-ratio: 1;
      border-radius: 999px;
      background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
      filter: blur(10px);
      animation: drift 6s ease-in-out infinite;
    }
    .mockup {
      position: relative;
      max-width: 100%;
      max-height: 760px;
      object-fit: contain;
      filter: drop-shadow(0 30px 55px rgba(0,0,0,0.45));
      animation: floatMockup 4.5s ease-in-out infinite;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      animation: fadeIn 1s .34s ease-out both;
    }
    .brand {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: ${textColor};
      opacity: 0.9;
    }
    .meta {
      font-size: 22px;
      color: ${accentColor};
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.92;
    }
    .counter {
      font-size: 20px;
      color: ${textColor};
      opacity: 0.62;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .logo {
      position: absolute;
      ${logoCss}
      max-width: 140px;
      max-height: 64px;
      object-fit: contain;
      z-index: 7;
      filter: drop-shadow(0 8px 18px rgba(0,0,0,0.28));
      animation: fadeIn 900ms ease-out both;
    }
    @keyframes revealUp {
      from { opacity: 0; transform: translateY(34px); filter: blur(10px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    @keyframes revealRight {
      from { opacity: 0; transform: translateX(38px) scale(.96); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes slideInTop {
      from { opacity: 0; transform: translateY(-22px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulseLine {
      0%,100% { opacity: .45; transform: scaleY(.96); }
      50% { opacity: 1; transform: scaleY(1.04); }
    }
    @keyframes floatMockup {
      0%,100% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-18px) rotate(-1deg); }
    }
    @keyframes drift {
      0%,100% { transform: scale(1) translate(0, 0); }
      50% { transform: scale(1.08) translate(8px, -12px); }
    }
    @keyframes bgShift {
      from { transform: scale(1) translate3d(0,0,0); }
      to { transform: scale(1.04) translate3d(0,-10px,0); }
    }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="grid"></div>
  <div class="line"></div>
  ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
  <main class="content">
    <div class="eyebrow">${safeTopic}</div>
    <section class="main">
      <div class="copy">
        <h1>${safeTitle.replace(/\s+/g, ' <span class="accentWord">•</span> ')}</h1>
        <p class="body">${safeBody}</p>
      </div>
      <div class="mockupWrap">
        <div class="mockupGlow"></div>
        ${mockupImageUrl ? `<img class="mockup" src="${mockupImageUrl}" alt="Mockup" />` : ''}
      </div>
    </section>
    <footer class="footer">
      <div>
        <div class="brand">${safeBrand}</div>
        <div class="meta">${safeTopic}</div>
      </div>
      <div class="counter">${String(cardIndex + 1).padStart(2, '0')} / ${String(totalCards).padStart(2, '0')}</div>
    </footer>
  </main>
</body>
</html>`;
}

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
      logoPosition = "bottom-right",
      backgroundImageUrl,
      generateAiBg = false,
      generateAiMockup = false,
      format = "4:5",
    } = body;

    if (!topic || cardIndex === undefined || !totalCards) {
      return new Response(JSON.stringify({ error: "topic, cardIndex, totalCards are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dimensions = format === "9:16"
      ? { w: 1080, h: 1920 }
      : format === "1:1"
        ? { w: 1080, h: 1080 }
        : { w: 1080, h: 1350 };

    const logoPositionMap: Record<string, string> = {
      "top-left": "top: 40px; left: 40px;",
      "top-right": "top: 40px; right: 40px;",
      "bottom-left": "bottom: 40px; left: 40px;",
      "bottom-right": "bottom: 40px; right: 40px;",
    };
    const logoCss = logoPositionMap[logoPosition] || logoPositionMap["bottom-right"];

    let finalBgImageUrl = backgroundImageUrl || "";
    if (generateAiBg && !backgroundImageUrl) {
      console.log(`🎨 Generating AI background for card ${cardIndex + 1}...`);
      const bgPrompt = `Create a stunning, cinematic background image for a social media post about "${topic}". Card ${cardIndex + 1} of ${totalCards}. Style: dark, moody, professional. Colors: use ${accentColor} as accent. The image should be abstract/environmental — NO text, NO people, NO logos. Think: textures, gradients, light effects, architectural elements, nature scenes, technology visuals. High quality, editorial look. Aspect ratio: ${format === "9:16" ? "9:16 portrait" : format === "1:1" ? "1:1 square" : "4:5 portrait"}.`;
      const bgImage = await generateImage(LOVABLE_API_KEY, bgPrompt);
      if (bgImage) {
        finalBgImageUrl = bgImage;
        console.log(`✅ AI background generated for card ${cardIndex + 1}`);
      }
    }

    let mockupImageUrl = "";
    if (generateAiMockup) {
      console.log(`📱 Generating AI mockup for card ${cardIndex + 1}...`);
      const mockupPrompt = `Create a clean, professional 3D mockup related to "${topic}" for a social media post. Examples: a floating smartphone showing an app, a laptop with a website, a product packaging, a tablet with a dashboard, a book cover — choose whatever fits the topic best. The mockup should be on a transparent/dark background with subtle shadows and reflections. Dramatic lighting, high quality render. No text on the mockup. The object should be angled elegantly. Aspect ratio: 1:1.`;
      const mockupImage = await generateImage(LOVABLE_API_KEY, mockupPrompt);
      if (mockupImage) {
        mockupImageUrl = mockupImage;
        console.log(`✅ AI mockup generated for card ${cardIndex + 1}`);
      }
    }

    const systemPrompt = `You are an expert motion graphics designer who creates stunning animated social media cards using pure HTML and CSS.

You MUST return ONLY valid HTML code. No markdown, no explanation, no code fences. Just the raw HTML starting with <!DOCTYPE html>.

CRITICAL RULES:
- The output must be a COMPLETE, self-contained HTML file with embedded CSS
- The HTML MUST render immediately with visible content; NEVER return an empty body
- Include clear visible text content for title and body inside the body markup
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
${finalBgImageUrl ? `- Use this background image: url("${finalBgImageUrl}") — set it as background-image on the main container with background-size:cover; background-position:center; Add a dark overlay (rgba(0,0,0,0.4) to rgba(0,0,0,0.65)) on top to ensure text readability. Animate the background subtly (slow zoom or pan).` : ''}
${mockupImageUrl ? `- IMPORTANT: Include this mockup image as a floating element: <img src="${mockupImageUrl}" /> — position it as a prominent visual element in the card. Apply a CSS animation to it (float, subtle rotation, scale pulse, or slide-in). Size it to about 40-60% of the card width. Add a subtle drop-shadow. Position it to complement the text layout (e.g., right side, bottom area, or as a hero element).` : ''}
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
          {
            role: "user",
            content: `Create an animated HTML/CSS card for: "${topic}". Card ${cardIndex + 1}/${totalCards}.${cardTitle ? ` Title: "${cardTitle}".` : ''}${cardBody ? ` Content: "${cardBody}".` : ''} Make it visually spectacular with the "${animationStyle}" animation style. Use "${fontFamily}" as the primary font.${finalBgImageUrl ? ' Use the background image with a dark overlay for readability.' : ''}${mockupImageUrl ? ' Include the mockup image as a floating animated element.' : ''}`,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`AI error ${response.status}:`, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha na geração", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let htmlContent = data?.choices?.[0]?.message?.content || "";

    htmlContent = htmlContent
      .replace(/^```html?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    if (!htmlContent.includes("<html") && !htmlContent.includes("<!DOCTYPE")) {
      htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;width:${dimensions.w}px;height:${dimensions.h}px;overflow:hidden;background:${bgColor};}</style></head><body>${htmlContent}</body></html>`;
    }

    if (!hasMeaningfulHtml(htmlContent)) {
      console.warn(`⚠️ Empty or weak animated HTML for card ${cardIndex + 1}; using fallback template`);
      htmlContent = buildFallbackAnimatedHtml({
        dimensions,
        bgColor,
        accentColor,
        textColor,
        fontFamily,
        topic,
        cardTitle,
        cardBody,
        brandName,
        logoUrl,
        logoCss,
        finalBgImageUrl,
        mockupImageUrl,
        cardIndex,
        totalCards,
      });
    }

    console.log(`✅ Animated card ${cardIndex + 1}/${totalCards} generated (${htmlContent.length} chars)${finalBgImageUrl ? ' [with AI bg]' : ''}${mockupImageUrl ? ' [with mockup]' : ''}`);

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
