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
    const { imageBase64, maskBase64, editPrompt, attachmentBase64 } = await req.json();

    if (!imageBase64 || !maskBase64 || !editPrompt) {
      return new Response(JSON.stringify({ error: "imageBase64, maskBase64 and editPrompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Post correction request:", {
      promptLength: editPrompt.length,
      hasAttachment: !!attachmentBase64,
      model: IMAGE_MODEL,
    });

    // Build prompt based on whether there's a reference attachment
    const promptText = attachmentBase64
      ? `You are a world-class photo retoucher specializing in seamless compositing. You will receive THREE images:

IMAGE 1 (ORIGINAL): The complete artwork/post — your canvas. Analyze EVERY detail: background environment, lighting direction and intensity, color temperature, shadows, reflections, skin tones, clothing folds, body posture, and overall atmosphere.
IMAGE 2 (MASK): Black-and-white mask. WHITE = editable zone. BLACK = must remain pixel-identical to IMAGE 1.
IMAGE 3 (REFERENCE): Visual reference for the requested change.

USER REQUEST: "${editPrompt}"

COMPOSITING RULES (NON-NEGOTIABLE):
1. Output = COMPLETE image, EXACTLY same dimensions as IMAGE 1. Not a crop, not a fragment.
2. ANATOMICAL CONTINUITY: If the edit involves repositioning a body part (hand, arm, head, leg), you MUST:
   - Connect it naturally to the existing body in IMAGE 1 (wrist connects to arm, arm connects to shoulder, etc.)
   - Match skin tone, clothing texture, and body proportions from IMAGE 1
   - Generate realistic shadows cast by the repositioned element onto the surrounding surfaces
   - Ensure joints, folds, and muscle contours are anatomically correct
3. ENVIRONMENTAL CONTINUITY: The edited area must inherit:
   - The EXACT background that was behind it in IMAGE 1 (walls, objects, textures — NOT white/blank)
   - Same lighting direction, intensity, and color temperature
   - Same depth of field and focus level
   - Natural shadow interaction between the edited element and its surroundings
4. ZERO ARTIFACTS: No white patches, no blank areas, no hard edges, no floating elements, no color mismatches at boundaries.
5. SEAMLESS BLENDING: The transition between edited and non-edited areas must be INVISIBLE. Use soft transitions matching the original image's characteristics.
6. BLACK mask areas: reproduce IMAGE 1 pixel-for-pixel.
7. The final image must look like it was ORIGINALLY photographed this way — a viewer should not be able to tell any edit was made.
8. Return ONLY the final composited image.`
      : `You are a world-class photo retoucher specializing in seamless compositing. You will receive TWO images:

IMAGE 1 (ORIGINAL): The complete artwork/post — your canvas. Analyze EVERY detail: background environment, lighting direction and intensity, color temperature, shadows, reflections, skin tones, clothing folds, body posture, and overall atmosphere.
IMAGE 2 (MASK): Black-and-white mask. WHITE = editable zone. BLACK = must remain pixel-identical to IMAGE 1.

USER REQUEST: "${editPrompt}"

COMPOSITING RULES (NON-NEGOTIABLE):
1. Output = COMPLETE image, EXACTLY same dimensions as IMAGE 1. Not a crop, not a fragment.
2. ANATOMICAL CONTINUITY: If the edit involves repositioning a body part (hand, arm, head, leg), you MUST:
   - Connect it naturally to the existing body in IMAGE 1 (wrist connects to arm, arm connects to shoulder, etc.)
   - Match skin tone, clothing texture, and body proportions from IMAGE 1
   - Generate realistic shadows cast by the repositioned element onto the surrounding surfaces
   - Ensure joints, folds, and muscle contours are anatomically correct
3. ENVIRONMENTAL CONTINUITY: The edited area must inherit:
   - The EXACT background that was behind it in IMAGE 1 (walls, objects, textures — NOT white/blank)
   - Same lighting direction, intensity, and color temperature
   - Same depth of field and focus level
   - Natural shadow interaction between the edited element and its surroundings
4. ZERO ARTIFACTS: No white patches, no blank areas, no hard edges, no floating elements, no color mismatches at boundaries.
5. SEAMLESS BLENDING: The transition between edited and non-edited areas must be INVISIBLE. Use soft transitions matching the original image's characteristics.
6. BLACK mask areas: reproduce IMAGE 1 pixel-for-pixel.
7. The final image must look like it was ORIGINALLY photographed this way — a viewer should not be able to tell any edit was made.
8. Return ONLY the final composited image.`;

    const contentParts: any[] = [
      { type: "text", text: promptText },
      { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
      { type: "image_url", image_url: { url: `data:image/png;base64,${maskBase64}` } },
    ];

    if (attachmentBase64) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${attachmentBase64}` },
      });
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
