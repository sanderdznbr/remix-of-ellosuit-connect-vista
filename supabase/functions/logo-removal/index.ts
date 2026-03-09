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

  const url = msg?.images?.[0]?.image_url?.url;
  if (typeof url === "string") {
    const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64: match[2] };
  }

  const b64 = msg?.images?.[0]?.b64_json;
  if (typeof b64 === "string" && b64.length > 0) {
    return { mimeType: "image/png", base64: b64 };
  }

  const content = msg?.content;
  if (typeof content === "string") {
    const m = content.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
    if (m) return { mimeType: m[1], base64: m[2] };
  }

  return null;
}

function buildMessages(imageBase64: string, annotatedBase64?: string) {
  // Two-image approach: original + annotated with red marks
  if (annotatedBase64) {
    return [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert image inpainting tool. You will receive TWO images:

IMAGE 1: The ORIGINAL clean image (no marks).
IMAGE 2: The SAME image but with semi-transparent RED rectangles painted over areas that must be REMOVED.

YOUR TASK:
1. Look at IMAGE 2 to identify the RED-marked regions.
2. In those regions ONLY, erase the content (logos, text, watermarks, objects) and reconstruct a seamless, natural background that perfectly blends with the surrounding pixels (colors, gradients, textures, lighting).
3. Everything OUTSIDE the red regions must remain PIXEL-PERFECT identical to IMAGE 1.
4. The red overlay itself must NOT appear in your output.
5. Do NOT add any new text, logos, watermarks, or objects.
6. Return ONLY the final edited image.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${imageBase64}` },
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${annotatedBase64}` },
          },
        ],
      },
    ];
  }

  // Single-image fallback (annotated only)
  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `You are an expert image inpainting tool. The image has semi-transparent RED rectangles painted over areas that must be REMOVED. Erase the content under the red marks and reconstruct a seamless natural background matching surrounding colors, gradients, textures and lighting. The red overlay itself must NOT appear in the output. Do NOT change anything outside the red regions. Do NOT add new text, logos, or objects. Return ONLY the final edited image.`,
        },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${imageBase64}` },
        },
      ],
    },
  ];
}

async function callEdit(
  LOVABLE_API_KEY: string,
  model: string,
  messages: any[],
): Promise<Response> {
  return callWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        modalities: ["image", "text"],
        temperature: 0.2,
        stream: false,
      }),
    },
    3,
  );
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
    const { action, imageBase64, annotatedBase64, maskBase64 } = await req.json();

    if (action !== "remove") {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "remove".' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = buildMessages(imageBase64, annotatedBase64 || undefined);

    console.log("Calling AI for logo removal...", {
      hasAnnotated: !!annotatedBase64,
      hasMask: !!maskBase64,
    });

    const handleBad = async (res: Response) => {
      const errText = await res.text();
      console.error("AI error:", res.status, errText);
      if (res.status === 429)
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      if (res.status === 402)
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${res.status} — ${errText.slice(0, 300)}`);
    };

    // Try pro model first (more reliable for inpainting)
    let response = await callEdit(LOVABLE_API_KEY, "google/gemini-2.5-flash-image", messages);
    if (!response.ok) return await handleBad(response);

    let data = await response.json();
    let extracted = extractBase64Image(data);

    // Fallback to higher-quality model
    if (!extracted) {
      console.log("No image from flash; retrying with pro model...");
      response = await callEdit(LOVABLE_API_KEY, "google/gemini-3-pro-image-preview", messages);
      if (!response.ok) return await handleBad(response);
      data = await response.json();
      extracted = extractBase64Image(data);
    }

    if (!extracted) {
      console.error(
        "No image returned. Keys:",
        JSON.stringify(Object.keys(data || {})),
        "msg keys:",
        JSON.stringify(Object.keys(data?.choices?.[0]?.message || {})),
      );
      throw new Error("No image returned from AI");
    }

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
