import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Adminmaster check
    const { data: cu } = await supabase
      .from("company_users")
      .select("role, company_id")
      .eq("user_id", user.id)
      .single();

    if (!cu || cu.role !== "adminmaster") {
      return new Response(JSON.stringify({ error: "Forbidden: adminmaster only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { portraitId, prompt, faceRefUrls, styleRefUrls, marketplaceStyleId } = await req.json();

    // Get marketplace style config if provided
    let styleInstructions = "";
    let styleRefImages: string[] = styleRefUrls || [];

    if (marketplaceStyleId) {
      const { data: style } = await supabase
        .from("marketplace_styles")
        .select("name, description, preview_images, strict_instructions, style_config")
        .eq("id", marketplaceStyleId)
        .single();

      if (style) {
        if (style.strict_instructions) {
          styleInstructions = `\n\nSTYLE INSTRUCTIONS (MANDATORY):\n${style.strict_instructions}`;
        }
        if (style.preview_images && Array.isArray(style.preview_images)) {
          styleRefImages = [...styleRefImages, ...style.preview_images.slice(0, 3)];
        }
        if (style.description) {
          styleInstructions += `\n\nStyle description: ${style.description}`;
        }
      }
    }

    // Build the multimodal prompt
    const systemPrompt = `You are a professional portrait photographer AI. Generate a stunning, high-quality professional portrait photo based on the user's request.

CRITICAL RULES:
- The generated image MUST be a professional portrait/headshot
- Maintain the EXACT facial identity from the reference photos provided
- Use studio-quality lighting and composition
- The output should look like a real professional photograph, NOT AI-generated
- Analyze the face reference to determine gender and physical characteristics - NEVER mismatch body type
- Produce a single, clean portrait image with no text, watermarks, or collages
${styleInstructions}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Build user content with images
    const userContent: any[] = [];

    // Add face references first (highest priority)
    if (faceRefUrls && faceRefUrls.length > 0) {
      userContent.push({
        type: "text",
        text: "FACE REFERENCE PHOTOS (reproduce this exact face with maximum fidelity):",
      });
      for (const url of faceRefUrls.slice(0, 5)) {
        userContent.push({
          type: "image_url",
          image_url: { url },
        });
      }
    }

    // Add style references
    if (styleRefImages.length > 0) {
      userContent.push({
        type: "text",
        text: "STYLE REFERENCES (use only for aesthetic inspiration, do NOT copy faces from these):",
      });
      for (const url of styleRefImages.slice(0, 4)) {
        userContent.push({
          type: "image_url",
          image_url: { url },
        });
      }
    }

    // Add the user prompt
    userContent.push({
      type: "text",
      text: `Generate this portrait: ${prompt}`,
    });

    messages.push({ role: "user", content: userContent });

    console.log(`🖼️ Generating portrait for user ${user.email}, prompt: "${prompt.slice(0, 80)}..."`);

    // Use the higher quality model for portrait generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabase.from("generated_portraits").update({ status: "failed", error_message: "Rate limit exceeded" }).eq("id", portraitId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("generated_portraits").update({ status: "failed", error_message: "Payment required" }).eq("id", portraitId);
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("generated_portraits").update({ status: "failed", error_message: errText.slice(0, 500) }).eq("id", portraitId);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      await supabase.from("generated_portraits").update({ status: "failed", error_message: "No image returned from AI" }).eq("id", portraitId);
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `portraits/${cu.company_id}/${portraitId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      await supabase.from("generated_portraits").update({ status: "failed", error_message: "Upload failed" }).eq("id", portraitId);
      throw uploadError;
    }

    const { data: publicUrl } = supabase.storage.from("brand-assets").getPublicUrl(fileName);

    // Update portrait record
    await supabase.from("generated_portraits").update({
      status: "completed",
      result_image_url: publicUrl.publicUrl,
    }).eq("id", portraitId);

    console.log(`✅ Portrait generated successfully: ${portraitId}`);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Portrait generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
