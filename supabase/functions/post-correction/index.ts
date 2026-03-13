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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { imageBase64, maskBase64, editPrompt, attachmentBase64 } = await req.json();

    if (!imageBase64 || !maskBase64 || !editPrompt) {
      return new Response(JSON.stringify({ error: "imageBase64, maskBase64 and editPrompt are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Post correction request:", { promptLength: editPrompt.length, hasMask: !!maskBase64, hasAttachment: !!attachmentBase64 });

    const models = ["google/gemini-3-pro-image-preview", "google/gemini-2.5-flash-image"];

    for (const model of models) {
      const label = model.split("/").pop();
      console.log(`Trying ${label}...`);

      const contentParts: any[] = [
        {
          type: "text",
          text: attachmentBase64
            ? `You are an expert image editor. You will receive THREE images:

IMAGE 1: The ORIGINAL image.
IMAGE 2: A MASK image where WHITE areas indicate the regions to EDIT and BLACK areas must remain UNCHANGED.
IMAGE 3: A REFERENCE image that should be used as part of the edit.

CRITICAL RULES:
1. The output image MUST have the EXACT SAME dimensions and aspect ratio as IMAGE 1. Do NOT change the aspect ratio or resolution.
2. Look at the MASK (IMAGE 2) to identify the WHITE regions — these are the ONLY areas you should modify.
3. Apply the following edit ONLY to the white regions: "${editPrompt}"
4. Use IMAGE 3 (the reference image) as instructed in the edit prompt above.
5. Everything in the BLACK regions of the mask must remain PIXEL-IDENTICAL to the original image.
6. The result should look natural and seamless.
7. Return ONLY the final edited image with the same dimensions as the original.`
            : `You are an expert image editor. You will receive TWO images:

IMAGE 1: The ORIGINAL image.
IMAGE 2: A MASK image where WHITE areas indicate the regions to EDIT and BLACK areas must remain UNCHANGED.

CRITICAL RULES:
1. The output image MUST have the EXACT SAME dimensions and aspect ratio as IMAGE 1. Do NOT change the aspect ratio or resolution.
2. Look at the MASK (IMAGE 2) to identify the WHITE regions — these are the ONLY areas you should modify.
3. Apply the following edit ONLY to the white regions: "${editPrompt}"
4. Everything in the BLACK regions of the mask must remain PIXEL-IDENTICAL to the original image.
5. The result should look natural and seamless.
6. Return ONLY the final edited image with the same dimensions as the original.`,
        },
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        { type: "image_url", image_url: { url: `data:image/png;base64,${maskBase64}` } },
      ];

      if (attachmentBase64) {
        contentParts.push({ type: "image_url", image_url: { url: `data:image/png;base64,${attachmentBase64}` } });
      }

      const messages = [{ role: "user", content: contentParts }];

      let response: Response;
      try {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages, modalities: ["image", "text"], temperature: 0.1, stream: false }),
        });
      } catch (fetchErr) {
        console.error(`Fetch error on ${label}:`, fetchErr);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI error ${response.status} on ${label}:`, errText);
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
        continue;
      }

      let data: any;
      const rawText = await response.text();
      try { data = JSON.parse(rawText); } catch { console.error(`JSON parse failed on ${label}`); continue; }

      // Extract base64 image from response
      const extracted = extractBase64Image(data);
      if (extracted) {
        console.log(`✅ Success on ${label}`);
        return new Response(
          JSON.stringify({ resultBase64: extracted.base64, mimeType: extracted.mimeType }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.error(`No image returned on ${label}`);
    }

    throw new Error("No image returned from AI after all attempts");
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

  // Check images array (Gemini format)
  if (Array.isArray(message.images)) {
    for (const img of message.images) {
      const url = img?.image_url?.url || img?.url;
      if (typeof url === "string") {
        const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) return { mimeType: match[1], base64: match[2] };
      }
    }
  }

  // Check content for inline base64
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
