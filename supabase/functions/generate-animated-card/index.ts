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

function sanitizePromptText(value: string | undefined | null) {
  return (value || "")
    .replace(/^\s*(crie|criar|gere|gerar|faça|fazer|monte|montar)\s+(um|uma|o|a)?\s*(post|carrossel|arte|vídeo|video|card|cards|animação|animacao)?\s*(sobre|para)?\s*/i, "")
    .replace(/^\s*(post|carrossel|arte|vídeo|video|card|cards|animação|animacao)\s*(sobre|para)\s*/i, "")
    .replace(/\b(ellocontent|ellosuit)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeBrandName(value: string | undefined | null) {
  const cleaned = (value || "")
    .replace(/\b(marca|brand|logo|logomarca|nome da marca)\b/gi, "")
    .replace(/\b(none|sem marca|null|undefined)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function pickScreenshot(urls: string[] | undefined, cardIndex: number) {
  if (!urls || urls.length === 0) return "";
  return urls[cardIndex % urls.length] || urls[0] || "";
}

function buildMockupMarkup(screenshotUrl: string, deviceType: string) {
  if (!screenshotUrl) return "";

  if (deviceType === "web") {
    return `
      <div class="device web">
        <div class="deviceGlow"></div>
        <div class="screenShell">
          <div class="cameraDot"></div>
          <div class="screenFrame webFrame">
            <img class="screenImage" src="${screenshotUrl}" alt="Screenshot do projeto" />
          </div>
        </div>
        <div class="laptopBase"></div>
      </div>`;
  }

  if (deviceType === "tablet") {
    return `
      <div class="device tablet">
        <div class="deviceGlow"></div>
        <div class="tabletShell">
          <div class="cameraDot tabletCam"></div>
          <div class="screenFrame tabletFrame">
            <img class="screenImage" src="${screenshotUrl}" alt="Screenshot do projeto" />
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="device mobile">
      <div class="deviceGlow"></div>
      <div class="phoneShell">
        <div class="phoneNotch"></div>
        <div class="screenFrame phoneFrame">
          <img class="screenImage" src="${screenshotUrl}" alt="Screenshot do projeto" />
        </div>
      </div>
    </div>`;
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
  fontGoogleFamily: string;
  topic: string;
  cardTitle?: string;
  cardBody?: string;
  brandName?: string;
  logoUrl?: string;
  logoCss: string;
  finalBgImageUrl?: string;
  mockupImageUrl?: string;
  mockupDeviceType?: string;
  cardIndex: number;
  totalCards: number;
}) {
  const {
    dimensions,
    bgColor,
    accentColor,
    textColor,
    fontFamily,
    fontGoogleFamily,
    topic,
    cardTitle,
    cardBody,
    brandName,
    logoUrl,
    logoCss,
    finalBgImageUrl,
    mockupImageUrl,
    mockupDeviceType,
    cardIndex,
    totalCards,
  } = params;

  const cleanedTopic = sanitizePromptText(topic) || "Editorial Motion";
  const cleanedTitle = sanitizePromptText(cardTitle) || cleanedTopic || "Destaque Visual";
  const cleanedBody = sanitizePromptText(cardBody) || "Composição editorial com ritmo visual, contraste e leitura premium.";
  const cleanedBrand = sanitizeBrandName(brandName);
  const safeTitle = escapeHtml(cleanedTitle.slice(0, 90));
  const safeBody = escapeHtml(cleanedBody.slice(0, 200));
  const safeTopic = escapeHtml(cleanedTopic.slice(0, 40).toUpperCase());
  const safeBrand = cleanedBrand ? escapeHtml(cleanedBrand.slice(0, 24)) : "";
  const mockupMarkup = buildMockupMarkup(mockupImageUrl || "", mockupDeviceType || "mobile");

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${dimensions.w}, initial-scale=1.0" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontGoogleFamily}&display=swap" />
  <style>
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
        linear-gradient(180deg, rgba(3,3,6,0.28), rgba(3,3,6,0.74)),
        radial-gradient(circle at 18% 18%, ${accentColor}2d 0%, transparent 33%),
        radial-gradient(circle at 82% 18%, rgba(255,255,255,0.06) 0%, transparent 22%),
        radial-gradient(circle at 50% 82%, ${accentColor}12 0%, transparent 34%),
        linear-gradient(145deg, ${bgColor}, rgba(8,8,12,0.96))
        ${finalBgImageUrl ? `, url('${finalBgImageUrl}')` : ''};
      background-color: ${bgColor};
      background-size: cover, cover, cover, cover, cover${finalBgImageUrl ? ', cover' : ''};
      background-position: center, center, center, center, center${finalBgImageUrl ? ', center' : ''};
      animation: bgShift 18s ease-in-out infinite alternate;
    }
    .overlay {
      position: absolute; inset: 0;
      background:
        linear-gradient(135deg, rgba(0,0,0,0.12), rgba(0,0,0,0.46)),
        linear-gradient(180deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.34) 100%);
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
      font-size: ${mockupImageUrl ? '98px' : '118px'};
      line-height: 0.95;
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
      font-size: 34px;
      line-height: 1.28;
      color: ${textColor};
      opacity: 0.92;
      animation: revealUp 1s .18s cubic-bezier(.22,1,.36,1) both;
    }
    .mockupWrap {
      position: relative;
      display: ${mockupImageUrl ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      min-height: 620px;
      animation: revealRight 1.1s .22s cubic-bezier(.22,1,.36,1) both;
    }
    .device {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: center;
      filter: drop-shadow(0 30px 55px rgba(0,0,0,0.45));
      animation: floatMockup 5.6s ease-in-out infinite;
    }
    .deviceGlow {
      position: absolute;
      width: 72%;
      aspect-ratio: 1;
      border-radius: 999px;
      background: radial-gradient(circle, ${accentColor}33 0%, transparent 70%);
      filter: blur(10px);
      animation: drift 6s ease-in-out infinite;
    }
    .screenImage {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: top center;
      background: #050505;
    }
    .phoneShell {
      position: relative;
      width: 350px;
      padding: 14px;
      border-radius: 44px;
      background: linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04));
      border: 1px solid rgba(255,255,255,0.14);
      transform: rotate(-8deg);
      backdrop-filter: blur(10px);
      box-shadow: 0 24px 80px rgba(0,0,0,0.35);
    }
    .phoneNotch {
      position: absolute;
      top: 22px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 24px;
      border-radius: 999px;
      background: rgba(0,0,0,0.82);
      z-index: 3;
    }
    .screenFrame {
      overflow: hidden;
      background: #050505;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .phoneFrame {
      aspect-ratio: 9 / 19.5;
      border-radius: 32px;
    }
    .tabletShell {
      position: relative;
      width: 430px;
      padding: 14px;
      border-radius: 34px;
      background: linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
      border: 1px solid rgba(255,255,255,0.12);
      transform: rotate(-5deg);
      box-shadow: 0 24px 80px rgba(0,0,0,0.35);
    }
    .tabletFrame {
      aspect-ratio: 4 / 3;
      border-radius: 24px;
    }
    .screenShell {
      position: relative;
      width: 520px;
      padding: 18px 18px 14px;
      border-radius: 28px 28px 18px 18px;
      background: linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
      border: 1px solid rgba(255,255,255,0.12);
      transform: rotate(-6deg);
      box-shadow: 0 24px 80px rgba(0,0,0,0.35);
    }
    .webFrame {
      aspect-ratio: 16 / 10;
      border-radius: 18px;
    }
    .laptopBase {
      width: 560px;
      height: 18px;
      margin-top: -2px;
      border-radius: 0 0 999px 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08));
      transform: perspective(900px) rotateX(65deg);
      box-shadow: 0 18px 40px rgba(0,0,0,0.28);
    }
    .cameraDot {
      position: absolute;
      top: 8px;
      left: 50%;
      width: 10px;
      height: 10px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: rgba(12,12,16,0.9);
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.08);
      z-index: 3;
    }
    .tabletCam {
      top: 10px;
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
        <h1>${safeTitle}</h1>
        <p class="body">${safeBody}</p>
      </div>
      <div class="mockupWrap">
        ${mockupMarkup}
      </div>
    </section>
    <footer class="footer">
      <div>
        ${safeBrand ? `<div class="brand">${safeBrand}</div>` : ''}
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
      fontGoogleFamily = "Inter:wght@400;500;600;700;800;900",
      logoUrl,
      logoPosition = "bottom-right",
      backgroundImageUrl,
      generateAiBg = false,
      generateAiMockup = false,
      mockupScreenshots = [],
      mockupDeviceType = "mobile",
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

    const safeTopic = sanitizePromptText(topic) || "Editorial Motion";
    const safeTitle = sanitizePromptText(cardTitle) || safeTopic;
    const safeBody = sanitizePromptText(cardBody);
    const safeBrand = sanitizeBrandName(brandName);

    let finalBgImageUrl = backgroundImageUrl || "";
    if (generateAiBg && !backgroundImageUrl) {
      console.log(`🎨 Generating AI background for card ${cardIndex + 1}...`);
      const bgPrompt = `Create a premium abstract editorial backdrop for a social media motion card about "${safeTopic}". Card ${cardIndex + 1} of ${totalCards}. Use ${bgColor} as the base and ${accentColor} as subtle accent lighting. IMPORTANT: the background must feel solid, minimal, refined and expensive — NOT photorealistic, NOT obvious AI, NOT surreal, NOT a scene, NOT people, NOT devices, NOT objects, NOT text, NOT logos. Prefer deep color fields, subtle gradients, soft light beams, tasteful texture, luxury poster background. Aspect ratio: ${format === "9:16" ? "9:16 portrait" : format === "1:1" ? "1:1 square" : "4:5 portrait"}.`;
      const bgImage = await generateImage(LOVABLE_API_KEY, bgPrompt);
      if (bgImage) {
        finalBgImageUrl = bgImage;
        console.log(`✅ AI background generated for card ${cardIndex + 1}`);
      }
    }

    const mockupImageUrl = generateAiMockup ? pickScreenshot(mockupScreenshots, cardIndex) : "";
    if (generateAiMockup && !mockupImageUrl) {
      console.warn(`⚠️ Animated mockup requested but no screenshot was provided for card ${cardIndex + 1}`);
    }

    const htmlContent = buildFallbackAnimatedHtml({
      dimensions,
      bgColor,
      accentColor,
      textColor,
      fontFamily,
      fontGoogleFamily,
      topic: safeTopic,
      cardTitle: safeTitle,
      cardBody: safeBody,
      brandName: safeBrand,
      logoUrl,
      logoCss,
      finalBgImageUrl,
      mockupImageUrl,
      mockupDeviceType,
      cardIndex,
      totalCards,
    });

    console.log(`✅ Animated card ${cardIndex + 1}/${totalCards} generated (${htmlContent.length} chars)${finalBgImageUrl ? ' [with editorial bg]' : ''}${mockupImageUrl ? ' [with screenshot mockup]' : ''}`);

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
