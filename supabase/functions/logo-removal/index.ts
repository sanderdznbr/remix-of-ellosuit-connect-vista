import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 503 && res.status !== 429) return res;
    const delay = (attempt + 1) * 2000;
    console.log(`Attempt ${attempt + 1} failed with ${res.status}, retrying in ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));
  }
  return fetch(url, options);
}

function extractBase64Image(data: any): { base64: string; mimeType: string } | null {
  const msg = data?.choices?.[0]?.message;

  // Common gateway shape: message.images[0].image_url.url = data:<mime>;base64,<...>
  const url = msg?.images?.[0]?.image_url?.url;
  if (typeof url === "string") {
    const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64: match[2] };
  }

  // Fallback: some providers may return base64 directly
  const b64 = msg?.images?.[0]?.b64_json;
  if (typeof b64 === "string" && b64.length > 0) {
    return { mimeType: "image/png", base64: b64 };
  }

  // Last resort: try to find any data URL in text content
  const content = msg?.content;
  if (typeof content === "string") {
    const m = content.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
    if (m) return { mimeType: m[1], base64: m[2] };
  }

  return null;
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
    const { action, imageBase64, maskBase64 } = await req.json();

    if (action !== "remove") {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "remove".' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageBase64 || !maskBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 and maskBase64 are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IMPORTANT: Lovable AI Gateway expects chat-completions style input (messages)
    // and does NOT support OpenAI-style multipart uploads on /v1/images/edits.
    const prompt =
      "You will receive two images: (1) the ORIGINAL image, and (2) a MASK image. " +
      "In the MASK image, TRANSPARENT pixels mark the area to EDIT/REMOVE; opaque pixels must be preserved. " +
      "Task: remove the content ONLY in the transparent masked region and inpaint it with a seamless, natural background " +
      "matching surrounding colors, texture, gradients and lighting. Do NOT change anything outside the masked area. " +
      "No text, no logos, no new objects. Return the edited image.";

    console.log("Calling Lovable AI chat completions for inpainting...");

    const response = await callWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${imageBase64}` },
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${maskBase64}` },
                },
              ],
            },
          ],
          // Some providers/gateways use modalities to enable image output
          modalities: ["text", "image"],
          stream: false,
        }),
      },
      3,
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${response.status} — ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const extracted = extractBase64Image(data);
    if (!extracted) {
      console.error(
        "No image returned. Top-level keys:",
        JSON.stringify(Object.keys(data || {})),
        "message keys:",
        JSON.stringify(Object.keys(data?.choices?.[0]?.message || {})),
      );
      throw new Error("No image returned from AI");
    }

    console.log("Inpainting successful, result length:", extracted.base64.length);
    return new Response(
      JSON.stringify({ processedImageBase64: extracted.base64, mimeType: extracted.mimeType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("logo-removal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
