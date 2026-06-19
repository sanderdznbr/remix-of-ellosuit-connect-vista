// Generates the FINAL Instagram post in a single Gemini 3 Pro Image call.
// Mirrors the advanced wizard flow: capture all references (face, logo, style,
// brand colors, instructions, topic) and send them together so the model
// produces a finished, coherent, on-brand post in one pass.
// Persists the result to generated_carousels and returns carousel id + url.

import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Brief {
  topic?: string;
  format?: "portrait" | "square" | "story";
  contentType?: "single" | "carousel";
  cardCount?: number;
  styleId?: string | null;
  styleName?: string | null;
  brandName?: string;
  brandColors?: string[];
  visualType?: 'marketplace' | 'custom';
  customStyleUrls?: string[];
  hasFace?: boolean;
  hasLogo?: boolean;
  hasProduct?: boolean;
  hasPrints?: boolean;
  faceUrl?: string | string[];
  logoUrl?: string | string[];
  productUrl?: string | string[];
  printUrl?: string | string[];
  audience?: string;
  tone?: string;
  imageModel?: "ello-pro" | "ello-fast";
  suggested_content?: Array<
    { title?: string; subtitle?: string; body?: string }
  >;
  userIdea?: string;
  selectedImages?: string[];
  faceFusionMode?: 'merge' | 'side_by_side';
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: "4:5",
  square: "1:1",
  story: "9:16",
};

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function getCompanyId(sb: any, userId: string): Promise<string | null> {
  const { data } = await sb
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.company_id || null;
}

async function getStyleContext(sb: any, styleId?: string | null) {
  if (!isUuid(styleId)) return null;
  const { data, error } = await sb
    .from("marketplace_styles")
    .select(
      "id, name, description, preview_images, preview_classifications, strict_instructions, style_config",
    )
    .eq("id", styleId)
    .maybeSingle();
  if (error) {
    console.error("style context error:", error);
    return null;
  }
  return data || null;
}

async function getStyleContextByName(sb: any, styleName?: string | null) {
  const name = (styleName || "").trim();
  if (!name) return null;
  const { data, error } = await sb
    .from("marketplace_styles")
    .select(
      "id, name, description, preview_images, preview_classifications, strict_instructions, style_config",
    )
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("style context by name error:", error);
    return null;
  }
  return data || null;
}

function inferCardKind(
  card: { title?: string; subtitle?: string; body?: string } | undefined,
  idx: number,
): "cover" | "text" {
  if (idx === 0) return "cover";
  const bodyWords =
    (card?.body || "").trim().split(/\s+/).filter(Boolean).length;
  const subtitleWords =
    (card?.subtitle || "").trim().split(/\s+/).filter(Boolean).length;
  return bodyWords + subtitleWords >= 10 ? "text" : "cover";
}

function selectStylePreviewUrls(
  style: any,
  cardKind: "cover" | "text",
): string[] {
  const previews = Array.isArray(style?.preview_images)
    ? style.preview_images.filter(Boolean)
    : [];
  if (!previews.length) return [];
  const classifications = style?.preview_classifications &&
      typeof style.preview_classifications === "object"
    ? style.preview_classifications
    : {};
  const matching = previews.filter((url: string) =>
    classifications[url] === cardKind
  );
  const fallback = previews.filter((url: string) => !matching.includes(url));
  return [...matching, ...fallback].slice(0, 2);
}

function inferMimeFromUrl(url: string): string {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  if (clean.endsWith(".heic")) return "image/heic";
  if (clean.endsWith(".heif")) return "image/heif";
  return "image/png";
}

function sniffMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "image/jpeg";
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

function isSupportedDataImage(url: string): boolean {
  return /^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,/i.test(url);
}

function estimatedDataUrlBytes(url: string): number {
  const base64 = url.split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

// Chunked base64 to avoid stack overflows on large images (>~1MB).
function safeEncodeBase64(bytes: Uint8Array): string {
  const CHUNK = 32 * 1024;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

// Gemini accepts inline images up to ~20MB; we keep a safe 10MB ceiling.
const MAX_REF_BYTES = 10 * 1024 * 1024;

async function urlToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    if (estimatedDataUrlBytes(url) > MAX_REF_BYTES) {
      console.warn("Data image too large for AI reference, skipped:", (estimatedDataUrlBytes(url) / 1024 / 1024).toFixed(2), "MB");
      return null;
    }
    if (isSupportedDataImage(url)) return url;
    console.warn("Unsupported data image skipped as AI reference:", url.slice(0, 48));
    return null;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const rawCt = (resp.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    const arrayBuffer = await resp.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_REF_BYTES) {
      console.warn("Image exceeds 10MB hard cap, skipped:", url, (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), "MB");
      return null;
    }

    const bytes = new Uint8Array(arrayBuffer);
    let mime = rawCt;
    const isValidImageMime = mime.startsWith("image/") &&
      ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"].includes(mime);
    if (!isValidImageMime) {
      mime = sniffMimeFromBytes(bytes) || inferMimeFromUrl(url);
    }

    return `data:${mime};base64,${safeEncodeBase64(bytes)}`;
  } catch (e) {
    console.error("urlToDataUrl error:", e);
    return null;
  }
}

async function uploadCard(
  sb: any,
  companyId: string,
  carouselId: string,
  cardIndex: number,
  dataUrl: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const mimeMatch = dataUrl.match(/^data:(image\/[a-z]+);base64,/i);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const extension = mime.split("/")[1] || "jpg";
    const path = `${companyId}/${carouselId}/card-${cardIndex}.${extension}`;
    
    const { error } = await sb.storage.from("generated_posts").upload(
      path,
      bytes,
      {
        contentType: mime,
        upsert: true,
      },
    );
    if (error) {
      console.error("card upload error:", error);
      return dataUrl; // Fallback to returning dataUrl if upload fails
    }
    const { data } = sb.storage.from("generated_posts").getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : dataUrl;
  } catch (e) {
    console.error("uploadCard exception:", e);
    return dataUrl;
  }
}

async function uploadCover(
  sb: any,
  companyId: string,
  carouselId: string,
  url: string,
): Promise<string | null> {
  if (!url) return null;
  try {
    const path = `${companyId}/${carouselId}/cover.jpg`;
    let body: any;
    let contentType = "image/jpeg";

    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/^data:(image\/[a-z]+);base64,/i);
      contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64 = url.split(",")[1];
      body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    } else {
      const resp = await fetch(url);
      body = await resp.blob();
    }

    const { error } = await sb.storage.from("covers").upload(
      path,
      body,
      {
        contentType,
        upsert: true,
      },
    );
    if (error) {
      console.error("cover upload error:", error);
      return null;
    }
    const { data } = sb.storage.from("covers").getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  } catch (e) {
    console.error("uploadCover exception:", e);
    return null;
  }
}

function findImageInJson(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageInJson(item);
      if (found) return found;
    }
    return null;
  }

  const obj = value as Record<string, unknown>;
  const directUrl = obj.url;
  if (typeof directUrl === "string" && (directUrl.startsWith("data:image/") || directUrl.startsWith("http"))) return directUrl;

  const b64 = obj.b64_json || obj.base64 || obj.data;
  const mime = String(obj.mime_type || obj.mimeType || "image/png");
  if (typeof b64 === "string" && b64.length > 100 && /^[A-Za-z0-9+/=]+$/.test(b64.slice(0, 120))) {
    return `data:${mime.startsWith("image/") ? mime : "image/png"};base64,${b64}`;
  }

  for (const item of Object.values(obj)) {
    const found = findImageInJson(item);
    if (found) return found;
  }
  return null;
}

async function extractImageUrl(resp: Response): Promise<string | null> {
  const raw = await resp.text();
  try {
    const parsed = JSON.parse(raw);
    const fromJson = findImageInJson(parsed);
    if (fromJson) return fromJson;
  } catch (_) {
    // Fall back to raw scanning below.
  }

  const patterns = [
    '"url":"data:image/',
    '"url": "data:image/',
    '"url":"http',
    '"url": "http',
  ];
  for (const pattern of patterns) {
    const idx = raw.indexOf(pattern);
    if (idx === -1) continue;
    const isHttp = pattern.includes("http");
    const urlStart = isHttp
      ? raw.indexOf("http", idx)
      : raw.indexOf("data:image/", idx);
    const urlEnd = raw.indexOf('"', urlStart);
    if (urlStart !== -1 && urlEnd !== -1) return raw.slice(urlStart, urlEnd);
  }
  console.warn("No image URL found in AI response:", raw.slice(0, 500));
  return null;
}

// Last-resort fallback using OpenAI gpt-image-2 via /v1/images/generations.
// Different endpoint and provider — survives Gemini upstream outages.
async function generateWithGptImage2(prompt: string, ratio: string): Promise<string | null> {
  try {
    // gpt-image-2 supports only 1024x1024, 1024x1536 (2:3), 1536x1024 (3:2).
    // Map 4:5 -> 1024x1536 as the closest portrait (will need cropping client-side if exact 4:5 required).
    const size = ratio === "1:1" ? "1024x1024" : ratio === "16:9" || ratio === "3:2" ? "1536x1024" : "1024x1536";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: prompt.slice(0, 3500),
        quality: "low",
        size,
        n: 1,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`gpt-image-2 error (${resp.status}):`, errText.slice(0, 300));
      return null;
    }
    const json = await resp.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 === "string" && b64.length > 100) {
      return `data:image/png;base64,${b64}`;
    }
    return null;
  } catch (e) {
    console.error("gpt-image-2 exception:", e);
    return null;
  }
}

// Multimodal generation via Gemini image models (respects attached refs: face, logo, style, cover).
async function generateWithGemini(
  model: string,
  content: Array<Record<string, unknown>>,
): Promise<string | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Gemini ${model} error (${resp.status}):`, errText.slice(0, 300));
      return null;
    }
    return await extractImageUrl(resp);
  } catch (e) {
    console.error(`Gemini ${model} exception:`, e);
    return null;
  }
}

function escapeSvgText(value?: string) {
  return (value || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
}

function emergencyCardDataUrl(brief: Brief, cardIndex = 0, ratio = "4:5") {
  const [w, h] = ratio === "1:1" ? [1080, 1080] : ratio === "9:16" ? [1080, 1920] : [1080, 1350];
  const text = brief.suggested_content?.[cardIndex] || {};
  const title = escapeSvgText(text.title || brief.topic || "Post").slice(0, 72);
  const subtitle = escapeSvgText(text.subtitle || text.body || "Conteúdo gerado automaticamente").slice(0, 130);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A0A0A"/><stop offset="0.55" stop-color="#14111F"/><stop offset="1" stop-color="#3B1B73"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect x="56" y="56" width="${w - 112}" height="${h - 112}" fill="none" stroke="#8B5CF6" stroke-opacity="0.34" stroke-width="3"/>
    <text x="76" y="${Math.round(h * 0.22)}" fill="#8B5CF6" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${String(cardIndex + 1).padStart(2, "0")}</text>
    <foreignObject x="76" y="${Math.round(h * 0.34)}" width="${w - 152}" height="${Math.round(h * 0.34)}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;color:white;font-size:${ratio === "9:16" ? 78 : 70}px;font-weight:800;line-height:1.02;letter-spacing:0;text-transform:uppercase;">${title}</div></foreignObject>
    <foreignObject x="76" y="${Math.round(h * 0.72)}" width="${w - 152}" height="${Math.round(h * 0.16)}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;color:rgba(255,255,255,.78);font-size:34px;font-weight:500;line-height:1.25;letter-spacing:0;">${subtitle}</div></foreignObject>
  </svg>`;
  return `data:image/svg+xml;base64,${encodeBase64(new TextEncoder().encode(svg))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sbAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const companyId = await getCompanyId(sb, user.id);
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { action, brief, cardIndex, images, coverImageUrl, carouselId: existingCarouselId } = payload;
    
    console.log(`chat-compose-final: action=${action}, cardIndex=${cardIndex}, imagesCount=${images?.length}, existingCarouselId=${existingCarouselId}`);

    // Action: Initialize background generation
    if (action === "initialize-background") {
      const cards = (brief.suggested_content || []).map((c: any, i: number) => ({
        type: i === 0 ? "cover" : "body",
        title: c.title,
        subtitle: c.subtitle,
        body: c.body,
        isAiImage: true,
        layout: "dark",
      }));

      const { data: inserted, error: insertErr } = await sb.from("generated_carousels").insert({
        company_id: companyId,
        user_id: user.id,
        title: brief.topic,
        topic: brief.topic,
        status: 'processing',
        carousel_data: { title: brief.topic, cards },
        style_config: {
          source: "chat-creator",
          format: brief.format,
          styleName: brief.styleName,
          brandColors: brief.brandColors,
          isFullBleed: true,
        },
        card_count: cards.length,
      }).select("id").single();

      if (insertErr) throw insertErr;

      const tasks = cards.map((_: any, i: number) => ({
        carousel_id: inserted.id,
        card_index: i,
        status: 'pending'
      }));
      await sb.from("carousel_tasks").insert(tasks);

      return new Response(JSON.stringify({ carouselId: inserted.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!brief?.topic) {
      return new Response(JSON.stringify({ error: "topic é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief.format || "portrait"] || "4:5";
    const style = (await getStyleContext(sb, brief.styleId)) ||
      (await getStyleContextByName(sb, brief.styleName));
    const currentCardKind = typeof cardIndex === "number"
      ? inferCardKind(brief.suggested_content?.[cardIndex], cardIndex)
      : "cover";

    // Context strings
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : "";
    const colors = brief.brandColors?.length
      ? `Brand palette: ${brief.brandColors.join(", ")}.`
      : "";
    const audienceLine = brief.audience
      ? `Target audience: ${brief.audience}.`
      : "";
    const toneLine = brief.tone ? `Tone of voice: ${brief.tone}.` : "";
    const userIdeaLine = brief.userIdea
      ? `⚠️ USER SPECIFIC IDEA/INSTRUCTION: "${brief.userIdea}". FOLLOW THIS IDEA CLOSELY FOR THE VISUAL COMPOSITION.`
      : "";
    const selectedImageForCard =
      (typeof cardIndex === "number" && brief.selectedImages?.[cardIndex])
        ? brief.selectedImages[cardIndex]
        : null;

    // Face / Logo / Prints references
    const faceUrlArray = Array.isArray(brief.faceUrl)
      ? brief.faceUrl
      : (brief.faceUrl ? [brief.faceUrl] : []);
    const logoUrlArray = Array.isArray(brief.logoUrl)
      ? brief.logoUrl
      : (brief.logoUrl ? [brief.logoUrl] : []);
    const productUrlArray = Array.isArray(brief.productUrl)
      ? brief.productUrl
      : (brief.productUrl ? [brief.productUrl] : []);
    const printUrlArray = Array.isArray(brief.printUrl)
      ? brief.printUrl
      : (brief.printUrl ? [brief.printUrl] : []);

    // Load matching style references first; real photos are content references, never style references.
    const isCustomStyle = brief.visualType === 'custom' && Array.isArray(brief.customStyleUrls) && brief.customStyleUrls.length > 0;
    const stylePreviewSlice = isCustomStyle ? brief.customStyleUrls!.slice(0, 4) : selectStylePreviewUrls(style, currentCardKind);

    // Memory safety: sequential loading instead of Promise.all to avoid peak memory usage
    const facesResolved = brief.hasFace && faceUrlArray.length > 0
      ? await Promise.all(faceUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];
    
    const logosResolved = brief.hasLogo && logoUrlArray.length > 0
      ? await Promise.all(logoUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];

    const productsResolved = brief.hasProduct && productUrlArray.length > 0
      ? await Promise.all(productUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];
      
    const printsResolved = brief.hasPrints && printUrlArray.length > 0
      ? await Promise.all(printUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];

    const styleRefs: string[] = [];
    for (const url of stylePreviewSlice.slice(0, 2)) { // Reduced to 2 style refs for better memory safety
      const data = await urlToDataUrl(url);
      if (data) styleRefs.push(data);
    }

    const coverRef = coverImageUrl ? await urlToDataUrl(coverImageUrl) : null;
    const selectedCardRef = selectedImageForCard 
      ? (selectedImageForCard.startsWith("data:") ? selectedImageForCard : await urlToDataUrl(selectedImageForCard))
      : null;

    const faceData = facesResolved?.[0] || null;
    const logoData = logosResolved?.[0] || null;
    const productData = productsResolved?.[0] || null;
    const additionalPrints = printsResolved.filter(Boolean);

    // Dynamic instructions for combining face + web photos
    let faceLine = "";
    let selectedCardLine = "";

    if (faceData && selectedCardRef) {
      if (brief.faceFusionMode === 'side_by_side') {
        faceLine = `⚠️ SIDE-BY-SIDE MODE: ATTACHED FACE + ATTACHED REAL PHOTO.
        STRICT REQUIREMENT: DO NOT merge the face identity with the subject of the real photo.
        The final scene must contain TWO distinct people: (1) The person from the attached FACE REFERENCE, and (2) The person/character from the REAL PHOTO (e.g. Michael Jackson).
        They should be interacting or positioned together in the same scene, both clearly recognizable.`;
      } else {
        faceLine = `⚠️ FACE FUSION MODE: ATTACHED FACE + ATTACHED REAL PHOTO.
        STRICT REQUIREMENT: INTEGRATE the identity of the FACE REFERENCE into the subject/character of the REAL PHOTO.
        The final person must have the specific facial features/identity of the attached Face Reference, but be wearing the clothes, in the pose, and in the environment of the Real Photo subject (e.g. Michael Jackson).
        It should look like the person from the Face Reference has "become" the character from the Real Photo.`;
      }
      
      selectedCardLine = `⚠️ REAL PHOTO (CONTENT REF): Use this as the BASE for the scene, pose, and clothing. Rebuild this scene entirely using the selected style's design system (composition, layout, typography).`;
    } else {
      faceLine = faceData
        ? `⚠️ FACE REFERENCE ATTACHED. REINVENT THE ENTIRE SCENE. The main subject must be the person from the face reference.`
        : "";
        
      selectedCardLine = selectedCardRef
        ? `⚠️ REAL PHOTO ATTACHED — CONTENT REFERENCE ONLY, NOT THE STYLE.
STRICT PRIORITY ORDER: (1) STYLE REFERENCES control layout/typography/colors/composition, (2) text hierarchy, (3) real photo subject.
Use the real photo only as raw material for the subject/scene. Rebuild it inside the selected style's composition: crop, mask, cut out, duotone, blend, collage, frame with graphic shapes, overlays, gradients, depth, texture, and editorial typography exactly as the style references suggest.
FORBIDDEN FAILURE MODE: do not place the real photo full-bleed as a plain background with simple white text on top. If the result looks like a default photo + title overlay, it is wrong.
The final card must look like a designed template from the selected marketplace style, with intentional text distribution, hierarchy, spacing, and graphic system.`
        : "";
    }

    const logoLine = logoData
      ? "Logo is attached. Place subtly in a corner."
      : "";
    const productLine = productData
      ? "⚠️ PRODUCT/PACKAGING REFERENCE ATTACHED. This is real user content, not style. Show the exact product/package faithfully in the composition with realistic physical scale and proportions. Do not invent a generic product; preserve label, shape, colors, and packaging identity as much as possible."
      : "";
    const printsLine = additionalPrints.length > 0
      ? "Reference screenshots attached. Use for UI context."
      : "";

    const styleRules = isCustomStyle 
    ? `${styleRefs.length} CUSTOM DNA reference image(s) attached. THESE ARE THE HARD VISUAL TARGET — extract the design system from them: colors, typography, layout grid, spacing, photo treatment, graphic elements, rhythm, hierarchy. Clone the AESTHETIC DNA of these images.`
    : [
      style?.name ? `Style: "${style.name}".` : "",
      style?.description ? `Style description: ${style.description}` : "",
      style?.strict_instructions
        ? `MANDATORY rules: ${style.strict_instructions}`
        : "",
      style?.style_config?.imageGeneration?.prompt_style
        ? `AESTHETIC DNA FROM STYLE CONFIG: ${style.style_config.imageGeneration.prompt_style}`
        : "",
      styleRefs.length
        ? `${styleRefs.length} style reference image(s) attached for this ${currentCardKind.toUpperCase()} card. THESE ARE THE HARD VISUAL TARGET — copy the design system: colors, typography, layout grid, spacing, photo treatment, graphic elements, rhythm, hierarchy.`
        : "",
    ].filter(Boolean).join("\n");

    const coverRefLine = coverRef
      ? `⚠️ PREVIOUS COVER IMAGE ATTACHED — IT IS THE VISUAL ANCHOR OF THIS CAROUSEL. This new card MUST look like part of the SAME visual series: SAME color palette, SAME typography family/weights/sizes hierarchy, SAME layout system, SAME mood/treatment/lighting, SAME graphic elements. Continue the editorial DNA. Different content/composition but identical brand language.`
      : "";

    const unifiedPromptTemplate = (idx: number) => {
      const isCover = idx === 0;
      const cardText = brief.suggested_content?.[idx];
      const totalCards = brief.cardCount || brief.suggested_content?.length ||
        1;
      const cardKind = inferCardKind(cardText, idx);
      return `Create a premium Instagram ${
        isCover ? "cover (card 1)" : `content card #${idx + 1} of ${totalCards}`
      } about "${brief.topic}".
Editorial magazine grade. PORTUGUÊS BRASILEIRO.
BE CREATIVE AND VARIED: Use diverse visual metaphors, different angles, and distinct compositions for each card to avoid repetition.
CARD KIND: ${cardKind.toUpperCase()} — ${
        cardKind === "text"
          ? "use a typography-led layout. Text, hierarchy, grid, contrast, and decorative elements are the main design; imagery must be secondary/supporting."
          : "use a strong visual/editorial hero composition, but still copy the selected style template system."
      }


🚨 STYLE FIDELITY — NON-NEGOTIABLE:
- The selected marketplace style is the template. Do NOT generate a generic editorial post.
- Copy the style references' composition system: title placement, line breaks, font personality, scale contrast, spacing, grids, decorative shapes, color treatment, texture, photo masking/cropping, and visual rhythm.
- Real/web photos are only subject matter. They must be transformed into the style, not used as the style.
- Avoid centered default title + subtitle over a photo unless that exact pattern exists in the attached style references.


🚫 ABSOLUTE NO BORDERS / NO FRAMES / NO MARGINS / NO CANVAS TEXT:
- The image MUST be 100% FULL BLEED — fill the entire ${ratio} canvas edge to edge.
- ABSOLUTELY FORBIDDEN: white borders, white frames, white margins, polaroid frames, photo frames, paper edges, card mockups, any framing element around the artwork.
- ABSOLUTELY FORBIDDEN: NEVER use white backgrounds with floating text that looks like a "canvas" or a simple text slide. The background MUST be rich, textured, or photographic.
- The artwork itself IS the entire canvas. NO inner padding/border separating the design from the canvas edge. Background bleeds to all 4 edges.
- DO NOT add metadata, captions, or watermarks that look like a UI/canvas.


🎨 VISUAL DNA CONSISTENCY (CRITICAL):
- This is part of a coherent carousel series. ${
        isCover
          ? "Establish the strong visual identity."
          : "STRICTLY MATCH the visual DNA of the cover and previous cards."
      }
- Same typography family, weights, hierarchy and treatment as the style references${
        isCover ? "" : " and the attached cover"
      }.
- Same color palette (no new colors introduced per card).
- Same composition logic, photo treatment, decorative elements, lighting mood.
- Text safe area: top/bottom thirds, generous spacing, legible at thumbnail size.

${brand} ${colors} ${audienceLine} ${toneLine}
${userIdeaLine}
${faceLine} ${logoLine} ${productLine} ${printsLine}
${selectedCardLine}
${styleRules}
${coverRefLine}

TEXT TO RENDER ON THIS CARD: ${
        cardText
          ? `${cardText.title ? `Title: "${cardText.title}". ` : ""}${
            cardText.subtitle ? `Subtitle: "${cardText.subtitle}". ` : ""
          }${cardText.body ? `Body: "${cardText.body}".` : ""}`
          : "Powerful hook, max 7 words."
      }
ASPECT RATIO: ${ratio} (full bleed, no framing). Single polished image, finished and on-brand.`;
    };

    if (Array.isArray(images) && images.length > 0) {
      console.log(
        `chat-compose-final: finalization mode for ${images.length} images`,
      );
      const cards = images.map((img, i) => ({
        type: i === 0 ? "cover" : "body",
        title: brief.suggested_content?.[i]?.title,
        subtitle: brief.suggested_content?.[i]?.subtitle,
        body: brief.suggested_content?.[i]?.body,
        imageUrl: img,
        isAiImage: true,
        layout: "dark",
      }));

      let validStyleId: string | null = null;
      if (isUuid(brief.styleId)) {
        const { data: styleRow } = await sb.from("marketplace_styles").select(
          "id",
        ).eq("id", brief.styleId).maybeSingle();
        if (styleRow?.id) validStyleId = styleRow.id;
      }

      let carouselId = existingCarouselId;
      
      // If no carouselId provided (single post flow), create the record now
      if (!carouselId) {
        const { data: inserted, error: insertErr } = await sb.from("generated_carousels").insert({
          company_id: companyId,
          user_id: user.id,
          title: brief.topic,
          topic: brief.topic,
          status: 'completed',
          carousel_data: { title: brief.topic, cards },
          style_config: {
            source: "chat-creator",
            format: brief.format,
            styleName: brief.styleName,
            brandColors: brief.brandColors,
            isFullBleed: true,
          },
          card_count: cards.length,
          marketplace_style_id: validStyleId,
        }).select("id").single();
        
        if (insertErr || !inserted) throw new Error("Falha ao salvar post.");
        carouselId = inserted.id;
      } else {
        const { error: updateErr } = await sb.from("generated_carousels").update({
          carousel_data: { title: brief.topic, cards },
          marketplace_style_id: validStyleId,
          status: 'completed',
        }).eq("id", carouselId);

        if (updateErr) throw new Error("Falha ao atualizar post.");
      }


      // Offload storage upload + credits
      const bgWork = (async () => {
        try {
          const cost = brief.hasFace ? 5 : 2;
          await sb.rpc("consume_ai_credits", {
            p_company_id: companyId,
            p_amount: cost,
            p_description: `Post assistente: ${brief.topic}`,
          });
          const coverUrl = await uploadCover(
            sb,
            companyId,
            carouselId,
            images[0],
          );
          if (coverUrl) {
            await sb.from("generated_carousels").update({ cover_url: coverUrl })
              .eq("id", carouselId);
            const finalCards = cards.map((c, idx) =>
              idx === 0 ? { ...c, imageUrl: coverUrl } : c
            );
            await sb.from("generated_carousels").update({
              carousel_data: { title: brief.topic, cards: finalCards },
            }).eq("id", carouselId);
          }
        } catch (e) {
          console.error("BG Error:", e);
        }
      })();

      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(bgWork);
      }

      return new Response(JSON.stringify({ carouselId, imageUrl: images[0] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Single card generation
    if (typeof cardIndex === "number") {
      const cardContent = [
        { type: "text", text: unifiedPromptTemplate(cardIndex) },
        faceData ? { type: "image_url", image_url: { url: faceData } } : null,
        logoData ? { type: "image_url", image_url: { url: logoData } } : null,
        productData ? { type: "image_url", image_url: { url: productData } } : null,
        ...additionalPrints.slice(0, 1).map((p) => ({
          type: "image_url",
          image_url: { url: p },
        })),
        ...styleRefs.slice(0, 2).map((ref) => ({
          type: "image_url",
          image_url: { url: ref },
        })),
        coverRef ? { type: "image_url", image_url: { url: coverRef } } : null,
        selectedCardRef
          ? { type: "image_url", image_url: { url: selectedCardRef } }
          : null,
      ].filter(Boolean);

      let cardImage: string | null = null;

      // PRIMARY: openai/gpt-image-2 via /v1/images/generations (mais estável)
      console.log(`chat-compose-final: card ${cardIndex + 1} primary attempt using openai/gpt-image-2`);
      cardImage = await generateWithGptImage2(unifiedPromptTemplate(cardIndex), ratio);

      // FALLBACK: Gemini image models (caso gpt-image-2 falhe)
      if (!cardImage) {
        console.warn(`Card ${cardIndex + 1}: gpt-image-2 failed, falling back to Gemini chain...`);
        const attemptPlans = [
          { model: "google/gemini-3-pro-image-preview", content: cardContent, waitMs: 0 },
          { model: "google/gemini-3.1-flash-image-preview", content: cardContent, waitMs: 3000 },
          {
            model: "google/gemini-2.5-flash-image",
            content: [{ type: "text", text: `${unifiedPromptTemplate(cardIndex)}\n\nLAST RESORT: no references. Create a clean premium dark editorial Instagram card that renders all requested text clearly. Full bleed, no white border.` }],
            waitMs: 3000,
          },
        ];

        for (let attempts = 0; attempts < attemptPlans.length && !cardImage; attempts++) {
          const plan = attemptPlans[attempts];
          try {
            if (plan.waitMs) await new Promise((r) => setTimeout(r, plan.waitMs));
            console.log(`chat-compose-final: card ${cardIndex + 1} Gemini attempt ${attempts + 1} using ${plan.model} parts=${plan.content.length}`);
            const resp = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: plan.model,
                  messages: [{ role: "user", content: plan.content }],
                  modalities: ["image", "text"],
                }),
              },
            );
            if (resp.status === 429) {
              await resp.text();
              await new Promise((r) => setTimeout(r, 5000 + attempts * 3000));
              continue;
            }
            if (!resp.ok) {
              const errText = await resp.text();
              console.error(`AI Gateway error (${resp.status}):`, errText);
              continue;
            }
            cardImage = await extractImageUrl(resp);
          } catch (e) {
            console.error(`Card ${cardIndex + 1} Gemini attempt ${attempts + 1} failed:`, e);
          }
        }
      }

      const usedEmergencyFallback = !cardImage;
      if (!cardImage) {
        console.error(`Card ${cardIndex + 1}: all AI attempts failed (gpt-image-2 + Gemini); returning emergency fallback.`);
        cardImage = emergencyCardDataUrl(brief, cardIndex, ratio);
      } else {
        const carouselId = "temp-" + Date.now();
        cardImage = await uploadCard(sb, companyId, carouselId, cardIndex, cardImage) || cardImage;
      }

      return new Response(JSON.stringify({ imageUrl: cardImage, fallback: usedEmergencyFallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 3: Fallback - Single post (cardIndex 0)
    console.log("chat-compose-final: fallback mode, using cardIndex 0");
    const cardContent = [
      { type: "text", text: unifiedPromptTemplate(0) },
      faceData ? { type: "image_url", image_url: { url: faceData } } : null,
      logoData ? { type: "image_url", image_url: { url: logoData } } : null,
      productData ? { type: "image_url", image_url: { url: productData } } : null,
      ...additionalPrints.slice(0, 1).map((p) => ({
        type: "image_url",
        image_url: { url: p },
      })),
      ...styleRefs.slice(0, 2).map((ref) => ({
        type: "image_url",
        image_url: { url: ref },
      })),
      coverRef ? { type: "image_url", image_url: { url: coverRef } } : null,
      selectedCardRef
        ? { type: "image_url", image_url: { url: selectedCardRef } }
        : null,
    ].filter(Boolean);

    let cardImage: string | null = null;

    // PRIMARY: openai/gpt-image-2
    console.log("chat-compose-final fallback mode: primary attempt using openai/gpt-image-2");
    cardImage = await generateWithGptImage2(unifiedPromptTemplate(0), ratio);

    // FALLBACK: Gemini image models
    if (!cardImage) {
      console.warn("Fallback mode: gpt-image-2 failed, trying Gemini chain...");
      const fallbackModels = ["google/gemini-3-pro-image-preview", "google/gemini-3.1-flash-image-preview", "google/gemini-2.5-flash-image"];
      for (const [idx, aiModel] of fallbackModels.entries()) {
        try {
          if (idx > 0) await new Promise((r) => setTimeout(r, 3000));
          const resp = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: aiModel,
                messages: [{ role: "user", content: cardContent }],
                modalities: ["image", "text"],
              }),
            },
          );
          if (!resp.ok) {
            const errText = await resp.text();
            console.error(`Fallback AI Gateway error (${resp.status}):`, errText);
          } else {
            cardImage = await extractImageUrl(resp);
            if (cardImage) break;
          }
        } catch (e) {
          console.error("Fallback generation error:", e);
        }
      }
    }
    const usedEmergencyFallback = !cardImage;
    if (!cardImage) {
      console.error("Fallback mode: all AI attempts failed (incl. gpt-image-2); returning emergency fallback.");
      cardImage = emergencyCardDataUrl(brief, 0, ratio);
    } else {
      const carouselId = "temp-" + Date.now();
      cardImage = await uploadCard(sb, companyId, carouselId, 0, cardImage) || cardImage;
    }
    return new Response(JSON.stringify({ imageUrl: cardImage, fallback: usedEmergencyFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Final error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
