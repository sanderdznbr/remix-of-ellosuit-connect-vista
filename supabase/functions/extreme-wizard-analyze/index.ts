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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { vision } = await req.json();
    if (!vision || typeof vision !== "string") {
      return new Response(JSON.stringify({ error: "vision is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extreme wizard analyze:", { visionLength: vision.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert creative director for social media posts (Instagram). The user will describe their visual idea for a social media post/carousel. Your job is to analyze their vision and generate a dynamic form with the exact fields needed to create this specific post.

RULES:
- Generate ONLY the fields that are relevant to what the user described
- Each field must have a clear purpose related to the user's vision
- Include photo_upload fields when the user mentions people, products, apps, screenshots, logos, or specific visual elements that need real images
- Include select fields for choices like style, mood, perspective, etc.
- Always include a field for the main text/title of the post
- Keep it focused — typically 4-8 fields, max 12
- Field IDs must be snake_case and DESCRIPTIVE (e.g., "print_do_app", "logo_da_marca", "foto_do_rosto")
- All labels and descriptions must be in Brazilian Portuguese

SMART DETECTION:
- If user mentions "app", "aplicativo", "celular", "tela": create a photo_upload for "Print do Aplicativo" and a select for phone model/mockup style
- If user mentions "pessoa", "eu", "rosto", "montado": create a photo_upload for face reference
- If user mentions "marca", "logo", "logotipo": create a photo_upload for logo
- If user mentions "produto", "roupa", "comida": create a photo_upload for product photo
- If user mentions colors or specific palette: create color fields
- If user mentions text/title: create text fields for the exact content
- Always think about what VISUAL ASSETS the AI will need to compose the image faithfully

AVAILABLE FIELD TYPES:
- text: single line text input
- textarea: multi-line text
- select: choose from options (provide options array)
- photo_upload: image upload (for faces, products, screenshots, logos, etc.)
- color: color picker`
          },
          {
            role: "user",
            content: `O usuário descreveu sua visão assim: "${vision}"

Analise e retorne um JSON com a estrutura exata abaixo. Retorne APENAS o JSON, sem markdown, sem explicações.
IMPORTANTE: Para campos photo_upload, use IDs descritivos como "print_app", "logo_marca", "foto_rosto", "foto_produto" — isso ajuda o sistema a saber como usar cada imagem na geração.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_wizard_form",
              description: "Creates a dynamic wizard form based on the user's creative vision",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A brief summary in Portuguese of what the AI understood and will create (1-2 sentences)"
                  },
                  suggestedTopic: {
                    type: "string",
                    description: "The suggested topic/title for the post based on the vision"
                  },
                  suggestedStyle: {
                    type: "string",
                    description: "The suggested visual style category (e.g., 'editorial', 'minimal', 'bold', 'cinematic', 'lifestyle')"
                  },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique snake_case identifier" },
                        type: { type: "string", enum: ["text", "textarea", "select", "photo_upload", "color"] },
                        label: { type: "string", description: "Field label in Portuguese" },
                        placeholder: { type: "string", description: "Placeholder text in Portuguese" },
                        required: { type: "boolean" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Options for select fields"
                        },
                        description: { type: "string", description: "Helper text in Portuguese" }
                      },
                      required: ["id", "type", "label"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["summary", "suggestedTopic", "suggestedStyle", "fields"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_wizard_form" } },
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

      return new Response(JSON.stringify({ error: "Falha ao analisar visão" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("IA não retornou formulário");
    }

    const result = JSON.parse(toolCall.function.arguments);

    console.log("✅ Extreme wizard analysis:", {
      fieldsCount: result.fields?.length,
      suggestedTopic: result.suggestedTopic,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extreme-wizard-analyze error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
