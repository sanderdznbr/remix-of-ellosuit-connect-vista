import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthenticatedUser } from "../_shared/requireAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuthenticatedUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const {
      imageDataUrl,
      maskDataUrl,
      attachmentDataUrl,
      imageBase64,
      maskBase64,
      attachmentBase64,
      editPrompt,
    } = payload ?? {};

    const originalImageDataUrl = normalizeToDataUrl(imageDataUrl ?? imageBase64, "image/png");
    const maskImageDataUrl = normalizeToDataUrl(maskDataUrl ?? maskBase64, "image/png");
    const attachmentImageDataUrl = normalizeToDataUrl(attachmentDataUrl ?? attachmentBase64, "image/png");

    if (!originalImageDataUrl || !maskImageDataUrl || !editPrompt) {
      return new Response(JSON.stringify({ error: "image/mask and editPrompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Post correction request:", {
      promptLength: editPrompt.length,
      hasAttachment: !!attachmentImageDataUrl,
      model: IMAGE_MODEL,
      imageSource: imageDataUrl ? "data_url" : "base64_legacy",
      maskSource: maskDataUrl ? "data_url" : "base64_legacy",
    });

    // Build prompt — always send FULL image, mask shows WHERE to edit
    const contentParts: any[] = [];

    if (attachmentImageDataUrl) {
      // WITH ATTACHMENT: 3 images
      contentParts.push({
        type: "text",
        text: `INPAINTING EDIT — Return the COMPLETE full-resolution image.

I am sending you THREE images:

1. **ORIGINAL IMAGE** (first image) — The COMPLETE artwork/post. You MUST return an image with the EXACT SAME pixel dimensions.

2. **MASK** (second image) — Same dimensions as the original. WHITE = areas to edit. BLACK = areas that MUST remain IDENTICAL to the original — do NOT change a single pixel in black areas.

3. **REFERENCE IMAGE** (third image) — Visual reference for what to place/change in the white mask area.

USER REQUEST: "${editPrompt}"

CRITICAL OUTPUT RULES:
- Output dimensions MUST EXACTLY MATCH image 1 (same width × same height)
- Do NOT crop, zoom, resize, or change the aspect ratio
- BLACK mask areas: copy pixel-for-pixel from the original — zero changes
- WHITE mask areas: apply the requested edit, blending seamlessly with surroundings
- Match lighting, shadows, color temperature, and textures perfectly
- The result must be photorealistic with no seams or artifacts
- Return ONLY the complete edited image`
      });
      contentParts.push({ type: "image_url", image_url: { url: originalImageDataUrl } });
      contentParts.push({ type: "image_url", image_url: { url: maskImageDataUrl } });
      contentParts.push({ type: "image_url", image_url: { url: attachmentImageDataUrl } });
    } else {
      // WITHOUT ATTACHMENT: 2 images
      contentParts.push({
        type: "text",
        text: `INPAINTING EDIT — Return the COMPLETE full-resolution image.

I am sending you TWO images:

1. **ORIGINAL IMAGE** (first image) — The COMPLETE artwork/post. You MUST return an image with the EXACT SAME pixel dimensions.

2. **MASK** (second image) — Same dimensions as the original. WHITE = areas to edit. BLACK = areas that MUST remain IDENTICAL to the original — do NOT change a single pixel in black areas.

USER REQUEST: "${editPrompt}"

CRITICAL OUTPUT RULES:
- Output dimensions MUST EXACTLY MATCH image 1 (same width × same height)
- Do NOT crop, zoom, resize, or change the aspect ratio
- BLACK mask areas: copy pixel-for-pixel from the original — zero changes
- WHITE mask areas: apply the requested edit, blending seamlessly with surroundings
- Match lighting, shadows, color temperature, and textures perfectly
- The result must be photorealistic with no seams or artifacts
- Return ONLY the complete edited image`
      });
      contentParts.push({ type: "image_url", image_url: { url: originalImageDataUrl } });
      contentParts.push({ type: "image_url", image_url: { url: maskImageDataUrl } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: contentParts }],
        modalities: ["image", "text"],
        temperature: 0.2,
        stream: false,
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

      return new Response(JSON.stringify({ error: "Falha na geração de imagem", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("JSON parse failed:", rawText.slice(0, 500));
      throw new Error("Resposta inválida da IA");
    }

    const extracted = extractBase64Image(data);
    if (!extracted) {
      console.error("No image returned from AI:", rawText.slice(0, 500));
      throw new Error("No image returned from AI");
    }

    console.log("✅ Post correction success");
    return new Response(
      JSON.stringify({ resultBase64: extracted.base64, mimeType: extracted.mimeType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("post-correction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function normalizeToDataUrl(input: unknown, fallbackMime: string): string | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const value = input.trim();
  if (value.startsWith("data:image/")) return value;
  return `data:${fallbackMime};base64,${value.replace(/^data:[^;]+;base64,/, "")}`;
}

function extractBase64Image(data: any): { base64: string; mimeType: string } | null {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;

  if (Array.isArray(message.images)) {
    for (const img of message.images) {
      const url = img?.image_url?.url || img?.url;
      if (typeof url === "string") {
        const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) return { mimeType: match[1], base64: match[2] };
      }
    }
  }

  if (typeof message.content === "string") {
    const match = message.content.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
    if (match) return { mimeType: match[1], base64: match[2] };
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      const url = part?.image_url?.url || part?.url;
      if (typeof url === "string") {
        const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) return { mimeType: match[1], base64: match[2] };
      }
    }
  }

  return null;
}
