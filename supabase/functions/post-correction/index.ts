import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

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
    const { imageBase64, maskBase64, editPrompt, attachmentBase64, cropImageBase64, crop } = await req.json();

    if (!editPrompt || (!imageBase64 && !cropImageBase64)) {
      return new Response(JSON.stringify({ error: "editPrompt and imageBase64/cropImageBase64 are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasValidCrop =
      !!crop &&
      typeof crop.x === "number" &&
      typeof crop.y === "number" &&
      typeof crop.width === "number" &&
      typeof crop.height === "number";

    const isCropEdit = Boolean(cropImageBase64 && attachmentBase64 && hasValidCrop);

    if (!isCropEdit && !maskBase64) {
      return new Response(JSON.stringify({ error: "maskBase64 is required when crop mode is not used" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Post correction request:", {
      promptLength: editPrompt.length,
      hasMask: !!maskBase64,
      hasAttachment: !!attachmentBase64,
      isCropEdit,
      model: IMAGE_MODEL,
    });

    const contentParts: any[] = [
      {
        type: "text",
        text: isCropEdit
          ? `You are an expert image retoucher. You will receive TWO images:

IMAGE 1: A CROPPED region from the original image.
IMAGE 2: A REFERENCE image to use in the replacement.

TASK:
${editPrompt}

CRITICAL RULES:
1. Keep the output with the EXACT SAME dimensions as IMAGE 1.
2. Keep all non-target pixels from IMAGE 1 unchanged (hands, frame, reflections and background).
3. Replace ONLY the intended display/content area in IMAGE 1 using IMAGE 2 as visual source.
4. Place IMAGE 2 content edge-to-edge in the display area with correct perspective.
5. Keep the result sharp and clean (no blur, no floating cards, no extra overlays, no new UI chrome).
6. Do not add logos/text/elements not present in the provided images.
7. Return ONLY one edited image.`
          : attachmentBase64
            ? `You are an expert image editor. You will receive THREE images:

IMAGE 1: The ORIGINAL image.
IMAGE 2: A MASK image where WHITE areas indicate the regions to EDIT and BLACK areas must remain UNCHANGED.
IMAGE 3: A REFERENCE image that should be used as part of the edit.

CRITICAL RULES:
1. The output image MUST have the EXACT SAME dimensions and aspect ratio as IMAGE 1.
2. Edit ONLY the WHITE mask areas from IMAGE 2.
3. Apply this edit: "${editPrompt}".
4. Use IMAGE 3 as reference without recreating unrelated parts.
5. BLACK regions must remain untouched.
6. Return ONLY the final edited image.`
            : `You are an expert image editor. You will receive TWO images:

IMAGE 1: The ORIGINAL image.
IMAGE 2: A MASK image where WHITE areas indicate the regions to EDIT and BLACK areas must remain UNCHANGED.

CRITICAL RULES:
1. The output image MUST have the EXACT SAME dimensions and aspect ratio as IMAGE 1.
2. Edit ONLY the WHITE mask areas from IMAGE 2.
3. Apply this edit: "${editPrompt}".
4. BLACK regions must remain untouched.
5. Return ONLY the final edited image.`,
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${isCropEdit ? cropImageBase64 : imageBase64}`,
        },
      },
    ];

    if (isCropEdit) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${attachmentBase64}` },
      });
    } else {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${maskBase64}` },
      });

      if (attachmentBase64) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:image/png;base64,${attachmentBase64}` },
        });
      }
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
        temperature: 0.05,
        stream: false,
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

      return new Response(JSON.stringify({ error: "Falha na geração de imagem", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("JSON parse failed:", rawText);
      throw new Error("Resposta inválida da IA");
    }

    const extracted = extractBase64Image(data);
    if (!extracted) {
      console.error("No image returned from AI:", rawText);
      throw new Error("No image returned from AI");
    }

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
