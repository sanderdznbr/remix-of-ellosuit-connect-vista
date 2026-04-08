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

    const body = await req.json();
    const { mode } = body;
    const variationIndex = body.variationIndex || 0;

    // ─── INPAINT MODE ──────────────────────────────
    if (mode === 'inpaint') {
      const { originalImageUrl, compositeImageDataUrl, editPrompt } = body;

      if (!originalImageUrl || !compositeImageDataUrl || !editPrompt) {
        return new Response(JSON.stringify({ error: "Missing inpaint parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🎨 Inpainting for user ${user.email}: "${editPrompt.slice(0, 80)}"`);

      const inpaintMessages = [
        {
          role: "system",
          content: `You are a professional photo editor AI. The user has marked a region in red on the image. You must edit ONLY that marked region according to their instructions. Everything outside the red-marked area must remain EXACTLY the same — same lighting, same background, same composition, same person. Output a single clean edited photo.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Here is the ORIGINAL image (keep everything from this image EXCEPT the marked area):` },
            { type: "image_url", image_url: { url: originalImageUrl } },
            { type: "text", text: `Here is the image WITH THE RED MARKS showing exactly which area to edit:` },
            { type: "image_url", image_url: { url: compositeImageDataUrl } },
            { type: "text", text: `EDIT INSTRUCTION (apply ONLY to the red-marked area): ${editPrompt}` },
          ],
        },
      ];

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: inpaintMessages,
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI inpaint error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageData) {
        return new Response(JSON.stringify({ error: "No image returned from AI" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Upload edited image
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const fileName = `portraits/${cu.company_id}/edited_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage.from("brand-assets").upload(fileName, bytes, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("brand-assets").getPublicUrl(fileName);

      // Save as new portrait record
      await supabase.from("generated_portraits").insert({
        user_id: user.id,
        company_id: cu.company_id,
        title: `Edição: ${editPrompt.slice(0, 70)}`,
        prompt: editPrompt,
        status: "completed",
        result_image_url: publicUrl.publicUrl,
      });

      console.log(`✅ Inpaint complete for ${user.email}`);
      return new Response(JSON.stringify({ success: true, imageUrl: publicUrl.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── STANDARD GENERATION MODE ──────────────────────────────
    const { portraitId, prompt, faceRefUrls, styleRefUrls, marketplaceStyleId } = body;

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

CRITICAL IDENTITY PRESERVATION RULES (MANDATORY):
1. FACIAL IDENTITY: The generated face MUST be an EXACT match to the reference photos. Every facial feature — bone structure, eye shape, eye color, nose shape, lip shape, skin tone, facial proportions, jawline, chin, forehead, cheekbones, wrinkles, freckles, moles — MUST be preserved with 100% accuracy.
2. BODY TYPE: Analyze ALL reference photos to determine gender, body type, skin tone, and physical build. The generated body MUST match these characteristics exactly. NEVER generate a female body for a male face or vice versa.
3. HAIR: Match the exact hair color, texture, length and style from the references unless the user explicitly requests a change.
4. SKIN: Preserve exact skin tone, texture, and any distinctive marks (moles, scars, freckles).
5. AGE: The apparent age in the output MUST match the references exactly.
6. MULTIPLE REFERENCES: When multiple reference photos are provided, use ALL of them to build a comprehensive understanding of the person's facial geometry from different angles. More photos = higher accuracy requirement.
7. OUTPUT QUALITY: Studio-quality lighting, sharp focus, professional composition. Must look like a real photograph, NOT AI-generated.
8. RESTRICTIONS: No text, no watermarks, no collages, no split images. Single clean portrait only.
${styleInstructions}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Build user content with images
    const userContent: any[] = [];

    // Add face references first (highest priority) - send ALL photos for maximum fidelity
    if (faceRefUrls && faceRefUrls.length > 0) {
      userContent.push({
        type: "text",
        text: `FACE REFERENCE PHOTOS (${faceRefUrls.length} photos provided). CRITICAL: This is the REAL person. You MUST reproduce this EXACT face — same bone structure, same eyes, same nose, same mouth, same skin tone, same jawline, same eyebrows. Study EVERY photo from EVERY angle. The output face must be INDISTINGUISHABLE from the reference photos. If someone who knows this person saw the output, they must immediately recognize them. Do NOT create a "similar looking" person — create THIS EXACT person:`,
      });
      for (const url of faceRefUrls) {
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
      text: `Generate this portrait: ${prompt}\n\nFINAL REMINDER: The face in the output MUST be the EXACT same person from the reference photos. Do NOT generate a generic or different face. This is the #1 priority above all else.`,
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
        temperature: variationIndex > 0 ? 0.3 : 0.1, // slightly higher temp for variations
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
