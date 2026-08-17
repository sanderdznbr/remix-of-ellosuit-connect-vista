import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthenticatedUser } from "../_shared/requireAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExtractedImage = { base64: string; mimeType: string };

type PromptVariant = "dual_strict" | "dual_concise" | "annotated_only";

async function callWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status !== 503 && res.status !== 429) return res;

      const delay = (attempt + 1) * 2000;
      console.log(`Attempt ${attempt + 1} failed with ${res.status}, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      lastError = err;
      const delay = (attempt + 1) * 2000;
      console.log(`Attempt ${attempt + 1} fetch error, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (lastError) throw lastError;
  return fetch(url, options);
}

function parseDataUrl(url: string): ExtractedImage | null {
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function parseLooseBase64(value: string, fallbackMime = "image/png"): ExtractedImage | null {
  const parsedDataUrl = parseDataUrl(value);
  if (parsedDataUrl) return parsedDataUrl;

  // Accept raw base64 payloads too
  if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.trim().length > 128) {
    return { mimeType: fallbackMime, base64: value.replace(/\s+/g, "") };
  }

  return null;
}

function extractFromContentNode(node: any): ExtractedImage | null {
  if (!node) return null;

  if (typeof node === "string") {
    const match = node.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/);
    return match ? { mimeType: match[1], base64: match[2] } : null;
  }

  if (typeof node !== "object") return null;

  const candidateStrings = [
    node?.image_url?.url,
    node?.url,
    node?.b64_json,
    node?.base64,
    node?.source?.data,
  ].filter((v) => typeof v === "string") as string[];

  for (const value of candidateStrings) {
    const extracted = parseLooseBase64(value);
    if (extracted) return extracted;
  }

  if (Array.isArray(node?.content)) {
    for (const child of node.content) {
      const extracted = extractFromContentNode(child);
      if (extracted) return extracted;
    }
  }

  return null;
}

function extractBase64Image(data: any): ExtractedImage | null {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;

  const directCandidates = [
    message?.images,
    message?.content,
    data?.images,
    data?.output,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const extracted = extractFromContentNode(item);
        if (extracted) return extracted;
      }
    } else {
      const extracted = extractFromContentNode(candidate);
      if (extracted) return extracted;
    }
  }

  return null;
}

function buildMessages(imageBase64: string, annotatedBase64?: string, variant: PromptVariant = "dual_strict") {
  if (annotatedBase64 && variant !== "annotated_only") {
    const strictText = `You are an expert image inpainting tool. You will receive TWO images:\n\nIMAGE 1: The ORIGINAL clean image (no marks).\nIMAGE 2: The SAME image but with semi-transparent RED rectangles painted over areas that must be REMOVED.\n\nYOUR TASK:\n1. Look at IMAGE 2 to identify the RED-marked regions.\n2. In those regions ONLY, erase the content (logos, text, watermarks, objects) and reconstruct a seamless, natural background that perfectly blends with surrounding pixels (colors, gradients, textures, lighting).\n3. Everything OUTSIDE the red regions must remain pixel-identical to IMAGE 1.\n4. The red overlay itself must NOT appear in your output.\n5. Do NOT add any new text, logos, watermarks, or objects.\n6. Return ONLY the final edited image.`;

    const conciseText = `Edit IMAGE 1 using IMAGE 2 as mask reference. Remove anything under red overlays and reconstruct background naturally. Keep all non-red areas unchanged. Output only the edited image with no red marks.`;

    return [
      {
        role: "user",
        content: [
          { type: "text", text: variant === "dual_concise" ? conciseText : strictText },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: "image_url", image_url: { url: `data:image/png;base64,${annotatedBase64}` } },
        ],
      },
    ];
  }

  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "The image has semi-transparent RED rectangles over content to remove. Erase only the red-marked regions, rebuild seamless background, remove the red overlay, and keep all other areas unchanged. Return only the edited image.",
        },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${imageBase64}` },
        },
      ],
    },
  ];
}

async function callEdit(LOVABLE_API_KEY: string, model: string, messages: any[]): Promise<Response> {
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
        temperature: 0.1,
        stream: false,
      }),
    },
    3,
  );
}

function buildAttemptPlan(imageBase64: string, annotatedBase64?: string) {
  const variants: PromptVariant[] = annotatedBase64
    ? ["dual_strict", "dual_concise", "annotated_only"]
    : ["annotated_only"];

  const models = ["google/gemini-3-pro-image-preview", "google/gemini-2.5-flash-image"];

  const plan: Array<{ model: string; variant: PromptVariant; messages: any[] }> = [];
  for (const variant of variants) {
    for (const model of models) {
      const baseImageForVariant = variant === "annotated_only" && annotatedBase64
        ? annotatedBase64
        : imageBase64;

      plan.push({
        model,
        variant,
        messages: buildMessages(baseImageForVariant, annotatedBase64, variant),
      });
    }
  }

  return plan;
}

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
    const { action, imageBase64, annotatedBase64 } = await req.json();

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

    console.log("Calling AI for logo removal...", {
      hasAnnotated: !!annotatedBase64,
    });

    const attempts = buildAttemptPlan(imageBase64, annotatedBase64 || undefined);
    let lastErrorSummary = "";

    for (const attempt of attempts) {
      const label = `${attempt.model} (${attempt.variant})`;

      const response = await callEdit(LOVABLE_API_KEY, attempt.model, attempt.messages);
      if (!response.ok) {
        const errText = await response.text();
        console.error("AI error:", response.status, label, errText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        lastErrorSummary = `gateway ${response.status}: ${errText.slice(0, 180)}`;
        continue;
      }

      let data: any;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch (_parseErr) {
        console.error(`JSON parse failed on ${label}, body length: ${rawText.length}, start: ${rawText.slice(0, 200)}`);
        lastErrorSummary = `invalid JSON from ${label} (length ${rawText.length})`;
        continue;
      }
      const extracted = extractBase64Image(data);

      if (extracted) {
        return new Response(
          JSON.stringify({ processedImageBase64: extracted.base64, mimeType: extracted.mimeType }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.error(
        `No image returned on ${label}. Keys:`,
        JSON.stringify(Object.keys(data || {})),
        "msg keys:",
        JSON.stringify(Object.keys(data?.choices?.[0]?.message || {})),
      );

      lastErrorSummary = `no image payload on ${label}`;
    }

    throw new Error(`No image returned from AI (${lastErrorSummary || "all attempts exhausted"})`);
  } catch (error) {
    console.error("logo-removal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
