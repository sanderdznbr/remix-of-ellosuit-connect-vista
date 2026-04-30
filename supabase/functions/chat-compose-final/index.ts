// Generates the FINAL Instagram post in a single Gemini 3 Pro Image call.
// Mirrors the advanced wizard flow: capture all references (face, logo, style,
// brand colors, instructions, topic) and send them together so the model
// produces a finished, coherent, on-brand post in one pass.
// Persists the result to generated_carousels and returns carousel id + url.

import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Brief {
  topic?: string;
  format?: "portrait" | "square" | "story";
  contentType?: "single" | "carousel";
  cardCount?: number;
  styleId?: string | null;
  styleName?: string | null;
  brandName?: string;
  brandColors?: string[];
  visualType?: 'marketplace' | 'custom';
  customStyleUrls?: string[];
  hasFace?: boolean;
  hasLogo?: boolean;
  hasPrints?: boolean;
  faceUrl?: string | string[];
  logoUrl?: string | string[];
  printUrl?: string | string[];
  audience?: string;
  tone?: string;
  imageModel?: "ello-pro" | "ello-fast";
  suggested_content?: Array<
    { title?: string; subtitle?: string; body?: string }
  >;
  userIdea?: string;
  selectedImages?: string[];
  faceFusionMode?: 'merge' | 'side_by_side';
}

const FORMAT_TO_RATIO: Record<string, string> = {
  portrait: "4:5",
  square: "1:1",
  story: "9:16",
};

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function getCompanyId(sb: any, userId: string): Promise<string | null> {
  const { data } = await sb
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.company_id || null;
}

async function getStyleContext(sb: any, styleId?: string | null) {
  if (!isUuid(styleId)) return null;
  const { data, error } = await sb
    .from("marketplace_styles")
    .select(
      "id, name, description, preview_images, preview_classifications, strict_instructions, style_config",
    )
    .eq("id", styleId)
    .maybeSingle();
  if (error) {
    console.error("style context error:", error);
    return null;
  }
  return data || null;
}

async function getStyleContextByName(sb: any, styleName?: string | null) {
  const name = (styleName || "").trim();
  if (!name) return null;
  const { data, error } = await sb
    .from("marketplace_styles")
    .select(
      "id, name, description, preview_images, preview_classifications, strict_instructions, style_config",
    )
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("style context by name error:", error);
    return null;
  }
  return data || null;
}

function inferCardKind(
  card: { title?: string; subtitle?: string; body?: string } | undefined,
  idx: number,
): "cover" | "text" {
  if (idx === 0) return "cover";
  const bodyWords =
    (card?.body || "").trim().split(/\s+/).filter(Boolean).length;
  const subtitleWords =
    (card?.subtitle || "").trim().split(/\s+/).filter(Boolean).length;
  return bodyWords + subtitleWords >= 10 ? "text" : "cover";
}

function selectStylePreviewUrls(
  style: any,
  cardKind: "cover" | "text",
): string[] {
  const previews = Array.isArray(style?.preview_images)
    ? style.preview_images.filter(Boolean)
    : [];
  if (!previews.length) return [];
  const classifications = style?.preview_classifications &&
      typeof style.preview_classifications === "object"
    ? style.preview_classifications
    : {};
  const matching = previews.filter((url: string) =>
    classifications[url] === cardKind
  );
  const fallback = previews.filter((url: string) => !matching.includes(url));
  return [...matching, ...fallback].slice(0, 2);
}

async function urlToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "image/png";
    const arrayBuffer = await resp.arrayBuffer();
    
    // Memory safety: if the image is too large, it might crash the edge function
    // Reduced to 2MB to ensure we don't exceed the edge runtime limits when 
    // multiple images and high-fidelity prompts are used together.
    if (arrayBuffer.byteLength > 2 * 1024 * 1024) { 
      console.warn("Image too large for base64 encoding:", url, (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), "MB");
      return null;
    }

    return `data:${ct};base64,${encodeBase64(new Uint8Array(arrayBuffer))}`;
  } catch (e) {
    console.error("urlToDataUrl error:", e);
    return null;
  }
}

async function uploadCover(
  sb: any,
  companyId: string,
  carouselId: string,
  url: string,
): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const path = `${companyId}/${carouselId}/cover.jpg`;
    const { error } = await sb.storage.from("covers").upload(
      path,
      blob,
      {
        contentType: "image/jpeg",
        upsert: true,
      },
    );
    if (error) {
      console.error("cover upload error:", error);
      return null;
    }
    const { data } = sb.storage.from("covers").getPublicUrl(path);
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null;
  } catch (e) {
    console.error("uploadCover exception:", e);
    return null;
  }
}

async function extractImageUrl(resp: Response): Promise<string | null> {
  const raw = await resp.text();
  const patterns = [
    '"url":"data:image/',
    '"url": "data:image/',
    '"url":"http',
    '"url": "http',
  ];
  for (const pattern of patterns) {
    const idx = raw.indexOf(pattern);
    if (idx === -1) continue;
    const isHttp = pattern.includes("http");
    const urlStart = isHttp
      ? raw.indexOf("http", idx)
      : raw.indexOf("data:image/", idx);
    const urlEnd = raw.indexOf('"', urlStart);
    if (urlStart !== -1 && urlEnd !== -1) return raw.slice(urlStart, urlEnd);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sbAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const companyId = await getCompanyId(sb, user.id);
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brief, cardIndex, images, coverImageUrl } = (await req.json()) as {
      brief: Brief;
      cardIndex?: number;
      images?: string[];
      coverImageUrl?: string;
    };
    if (!brief?.topic) {
      return new Response(JSON.stringify({ error: "topic é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ratio = FORMAT_TO_RATIO[brief.format || "portrait"] || "4:5";
    const style = (await getStyleContext(sb, brief.styleId)) ||
      (await getStyleContextByName(sb, brief.styleName));
    const currentCardKind = typeof cardIndex === "number"
      ? inferCardKind(brief.suggested_content?.[cardIndex], cardIndex)
      : "cover";

    // Context strings
    const brand = brief.brandName ? `Brand name: "${brief.brandName}".` : "";
    const colors = brief.brandColors?.length
      ? `Brand palette: ${brief.brandColors.join(", ")}.`
      : "";
    const audienceLine = brief.audience
      ? `Target audience: ${brief.audience}.`
      : "";
    const toneLine = brief.tone ? `Tone of voice: ${brief.tone}.` : "";
    const userIdeaLine = brief.userIdea
      ? `⚠️ USER SPECIFIC IDEA/INSTRUCTION: "${brief.userIdea}". FOLLOW THIS IDEA CLOSELY FOR THE VISUAL COMPOSITION.`
      : "";
    const selectedImageForCard =
      (typeof cardIndex === "number" && brief.selectedImages?.[cardIndex])
        ? brief.selectedImages[cardIndex]
        : null;

    // Face / Logo / Prints references
    const faceUrlArray = Array.isArray(brief.faceUrl)
      ? brief.faceUrl
      : (brief.faceUrl ? [brief.faceUrl] : []);
    const logoUrlArray = Array.isArray(brief.logoUrl)
      ? brief.logoUrl
      : (brief.logoUrl ? [brief.logoUrl] : []);
    const printUrlArray = Array.isArray(brief.printUrl)
      ? brief.printUrl
      : (brief.printUrl ? [brief.printUrl] : []);

    // Load matching style references first; real photos are content references, never style references.
    const isCustomStyle = brief.visualType === 'custom' && Array.isArray(brief.customStyleUrls) && brief.customStyleUrls.length > 0;
    const stylePreviewSlice = isCustomStyle ? brief.customStyleUrls!.slice(0, 4) : selectStylePreviewUrls(style, currentCardKind);

    // Memory safety: sequential loading instead of Promise.all to avoid peak memory usage
    const facesResolved = brief.hasFace && faceUrlArray.length > 0
      ? await Promise.all(faceUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];
    
    const logosResolved = brief.hasLogo && logoUrlArray.length > 0
      ? await Promise.all(logoUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];
      
    const printsResolved = brief.hasPrints && printUrlArray.length > 0
      ? await Promise.all(printUrlArray.slice(0, 1).map(urlToDataUrl))
      : [];

    const styleRefs: string[] = [];
    for (const url of stylePreviewSlice.slice(0, 2)) { // Reduced to 2 style refs for better memory safety
      const data = await urlToDataUrl(url);
      if (data) styleRefs.push(data);
    }

    const coverRef = coverImageUrl ? await urlToDataUrl(coverImageUrl) : null;
    const selectedCardRef = selectedImageForCard 
      ? (selectedImageForCard.startsWith("data:") ? selectedImageForCard : await urlToDataUrl(selectedImageForCard))
      : null;

    const faceData = facesResolved?.[0] || null;
    const logoData = logosResolved?.[0] || null;
    const additionalPrints = printsResolved.filter(Boolean);

    // Dynamic instructions for combining face + web photos
    let faceLine = "";
    let selectedCardLine = "";

    if (faceData && selectedCardRef) {
      if (brief.faceFusionMode === 'side_by_side') {
        faceLine = `⚠️ SIDE-BY-SIDE MODE: ATTACHED FACE + ATTACHED REAL PHOTO.
        STRICT REQUIREMENT: DO NOT merge the face identity with the subject of the real photo.
        The final scene must contain TWO distinct people: (1) The person from the attached FACE REFERENCE, and (2) The person/character from the REAL PHOTO (e.g. Michael Jackson).
        They should be interacting or positioned together in the same scene, both clearly recognizable.`;
      } else {
        faceLine = `⚠️ FACE FUSION MODE: ATTACHED FACE + ATTACHED REAL PHOTO.
        STRICT REQUIREMENT: INTEGRATE the identity of the FACE REFERENCE into the subject/character of the REAL PHOTO.
        The final person must have the specific facial features/identity of the attached Face Reference, but be wearing the clothes, in the pose, and in the environment of the Real Photo subject (e.g. Michael Jackson).
        It should look like the person from the Face Reference has "become" the character from the Real Photo.`;
      }
      
      selectedCardLine = `⚠️ REAL PHOTO (CONTENT REF): Use this as the BASE for the scene, pose, and clothing. Rebuild this scene entirely using the selected style's design system (composition, layout, typography).`;
    } else {
      faceLine = faceData
        ? `⚠️ FACE REFERENCE ATTACHED. REINVENT THE ENTIRE SCENE. The main subject must be the person from the face reference.`
        : "";
        
      selectedCardLine = selectedCardRef
        ? `⚠️ REAL PHOTO ATTACHED — CONTENT REFERENCE ONLY, NOT THE STYLE.
STRICT PRIORITY ORDER: (1) STYLE REFERENCES control layout/typography/colors/composition, (2) text hierarchy, (3) real photo subject.
Use the real photo only as raw material for the subject/scene. Rebuild it inside the selected style's composition: crop, mask, cut out, duotone, blend, collage, frame with graphic shapes, overlays, gradients, depth, texture, and editorial typography exactly as the style references suggest.
FORBIDDEN FAILURE MODE: do not place the real photo full-bleed as a plain background with simple white text on top. If the result looks like a default photo + title overlay, it is wrong.
The final card must look like a designed template from the selected marketplace style, with intentional text distribution, hierarchy, spacing, and graphic system.`
        : "";
    }

    const logoLine = logoData
      ? "Logo is attached. Place subtly in a corner."
      : "";
    const printsLine = additionalPrints.length > 0
      ? "Reference screenshots attached. Use for UI context."
      : "";

    const styleRules = isCustomStyle 
    ? `${styleRefs.length} CUSTOM DNA reference image(s) attached. THESE ARE THE HARD VISUAL TARGET — extract the design system from them: colors, typography, layout grid, spacing, photo treatment, graphic elements, rhythm, hierarchy. Clone the AESTHETIC DNA of these images.`
    : [
      style?.name ? `Style: "${style.name}".` : "",
      style?.description ? `Style description: ${style.description}` : "",
      style?.strict_instructions
        ? `MANDATORY rules: ${style.strict_instructions}`
        : "",
      style?.style_config?.imageGeneration?.prompt_style
        ? `AESTHETIC DNA FROM STYLE CONFIG: ${style.style_config.imageGeneration.prompt_style}`
        : "",
      styleRefs.length
        ? `${styleRefs.length} style reference image(s) attached for this ${currentCardKind.toUpperCase()} card. THESE ARE THE HARD VISUAL TARGET — copy the design system: colors, typography, layout grid, spacing, photo treatment, graphic elements, rhythm, hierarchy.`
        : "",
    ].filter(Boolean).join("\n");

    const coverRefLine = coverRef
      ? `⚠️ PREVIOUS COVER IMAGE ATTACHED — IT IS THE VISUAL ANCHOR OF THIS CAROUSEL. This new card MUST look like part of the SAME visual series: SAME color palette, SAME typography family/weights/sizes hierarchy, SAME layout system, SAME mood/treatment/lighting, SAME graphic elements. Continue the editorial DNA. Different content/composition but identical brand language.`
      : "";

    const unifiedPromptTemplate = (idx: number) => {
      const isCover = idx === 0;
      const cardText = brief.suggested_content?.[idx];
      const totalCards = brief.cardCount || brief.suggested_content?.length ||
        1;
      const cardKind = inferCardKind(cardText, idx);
      return `Create a premium Instagram ${
        isCover ? "cover (card 1)" : `content card #${idx + 1} of ${totalCards}`
      } about "${brief.topic}".
Editorial magazine grade. PORTUGUÊS BRASILEIRO.
BE CREATIVE AND VARIED: Use diverse visual metaphors, different angles, and distinct compositions for each card to avoid repetition.
CARD KIND: ${cardKind.toUpperCase()} — ${
        cardKind === "text"
          ? "use a typography-led layout. Text, hierarchy, grid, contrast, and decorative elements are the main design; imagery must be secondary/supporting."
          : "use a strong visual/editorial hero composition, but still copy the selected style template system."
      }


🚨 STYLE FIDELITY — NON-NEGOTIABLE:
- The selected marketplace style is the template. Do NOT generate a generic editorial post.
- Copy the style references' composition system: title placement, line breaks, font personality, scale contrast, spacing, grids, decorative shapes, color treatment, texture, photo masking/cropping, and visual rhythm.
- Real/web photos are only subject matter. They must be transformed into the style, not used as the style.
- Avoid centered default title + subtitle over a photo unless that exact pattern exists in the attached style references.


🚫 ABSOLUTE NO BORDERS / NO FRAMES / NO MARGINS / NO CANVAS TEXT:
- The image MUST be 100% FULL BLEED — fill the entire ${ratio} canvas edge to edge.
- ABSOLUTELY FORBIDDEN: white borders, white frames, white margins, polaroid frames, photo frames, paper edges, card mockups, any framing element around the artwork.
- ABSOLUTELY FORBIDDEN: NEVER use white backgrounds with floating text that looks like a "canvas" or a simple text slide. The background MUST be rich, textured, or photographic.
- The artwork itself IS the entire canvas. NO inner padding/border separating the design from the canvas edge. Background bleeds to all 4 edges.
- DO NOT add metadata, captions, or watermarks that look like a UI/canvas.


🎨 VISUAL DNA CONSISTENCY (CRITICAL):
- This is part of a coherent carousel series. ${
        isCover
          ? "Establish the strong visual identity."
          : "STRICTLY MATCH the visual DNA of the cover and previous cards."
      }
- Same typography family, weights, hierarchy and treatment as the style references${
        isCover ? "" : " and the attached cover"
      }.
- Same color palette (no new colors introduced per card).
- Same composition logic, photo treatment, decorative elements, lighting mood.
- Text safe area: top/bottom thirds, generous spacing, legible at thumbnail size.

${brand} ${colors} ${audienceLine} ${toneLine}
${userIdeaLine}
${faceLine} ${logoLine} ${printsLine}
${selectedCardLine}
${styleRules}
${coverRefLine}

TEXT TO RENDER ON THIS CARD: ${
        cardText
          ? `${cardText.title ? `Title: "${cardText.title}". ` : ""}${
            cardText.subtitle ? `Subtitle: "${cardText.subtitle}". ` : ""
          }${cardText.body ? `Body: "${cardText.body}".` : ""}`
          : "Powerful hook, max 7 words."
      }
ASPECT RATIO: ${ratio} (full bleed, no framing). Single polished image, finished and on-brand.`;
    };

    // Mode 1: Finalization (saving all cards to DB)
    if (Array.isArray(images) && images.length > 0) {
      console.log(
        `chat-compose-final: finalization mode for ${images.length} images`,
      );
      const cards = images.map((img, i) => ({
        type: i === 0 ? "cover" : "body",
        title: brief.suggested_content?.[i]?.title,
        subtitle: brief.suggested_content?.[i]?.subtitle,
        body: brief.suggested_content?.[i]?.body,
        imageUrl: img,
        isAiImage: true,
        layout: "dark",
      }));

      let validStyleId: string | null = null;
      if (isUuid(brief.styleId)) {
        const { data: styleRow } = await sb.from("marketplace_styles").select(
          "id",
        ).eq("id", brief.styleId).maybeSingle();
        if (styleRow?.id) validStyleId = styleRow.id;
      }

      const { data: inserted, error: insertErr } = await sb.from(
        "generated_carousels",
      ).insert({
        company_id: companyId,
        user_id: user.id,
        title: brief.topic,
        topic: brief.topic,
        keywords: [],
        carousel_data: { title: brief.topic, cards },
        style_config: {
          source: "chat-creator",
          format: brief.format,
          styleName: brief.styleName,
          brandColors: brief.brandColors,
          isFullBleed: true,
        },
        card_count: cards.length,
        marketplace_style_id: validStyleId,
      }).select("id").single();

      if (insertErr || !inserted) throw new Error("Falha ao salvar post.");
      const carouselId = inserted.id;

      // Offload storage upload + credits
      const bgWork = (async () => {
        try {
          const cost = brief.hasFace ? 5 : 2;
          await sb.rpc("consume_ai_credits", {
            p_company_id: companyId,
            p_amount: cost,
            p_description: `Post assistente: ${brief.topic}`,
          });
          const coverUrl = await uploadCover(
            sb,
            companyId,
            carouselId,
            images[0],
          );
          if (coverUrl) {
            await sb.from("generated_carousels").update({ cover_url: coverUrl })
              .eq("id", carouselId);
            const finalCards = cards.map((c, idx) =>
              idx === 0 ? { ...c, imageUrl: coverUrl } : c
            );
            await sb.from("generated_carousels").update({
              carousel_data: { title: brief.topic, cards: finalCards },
            }).eq("id", carouselId);
          }
        } catch (e) {
          console.error("BG Error:", e);
        }
      })();

      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(bgWork);
      }

      return new Response(JSON.stringify({ carouselId, imageUrl: images[0] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Single card generation
    if (typeof cardIndex === "number") {
      const cardContent = [
        { type: "text", text: unifiedPromptTemplate(cardIndex) },
        faceData ? { type: "image_url", image_url: { url: faceData } } : null,
        logoData ? { type: "image_url", image_url: { url: logoData } } : null,
        ...additionalPrints.slice(0, 1).map((p) => ({
          type: "image_url",
          image_url: { url: p },
        })),
        ...styleRefs.slice(0, 2).map((ref) => ({
          type: "image_url",
          image_url: { url: ref },
        })),
        coverRef ? { type: "image_url", image_url: { url: coverRef } } : null,
        selectedCardRef
          ? { type: "image_url", image_url: { url: selectedCardRef } }
          : null,
      ].filter(Boolean);

      let cardImage: string | null = null;
      let attempts = 0;
      while (attempts < 2 && !cardImage) {
        attempts++;
        try {
          // Use Flash for second attempt if Pro fails (or if already fast)
          const isFast = brief.imageModel === "ello-fast" || attempts > 1;
          const aiModel = isFast
            ? "google/gemini-3.1-flash-image-preview"
            : "google/gemini-3-pro-image-preview";

          console.log(`chat-compose-final: attempt ${attempts} using ${aiModel}`);

          const resp = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: aiModel,
                messages: [{ role: "user", content: cardContent }],
                modalities: ["image", "text"],
              }),
            },
          );
          if (resp.status === 429) {
            await new Promise((r) => setTimeout(r, 4000));
            continue;
          }
          if (!resp.ok) {
            const errText = await resp.text();
            console.error(`AI Gateway error (${resp.status}):`, errText);
            continue;
          }
          cardImage = await extractImageUrl(resp);
        } catch (e) {
          console.error(`Attempt ${attempts} failed:`, e);
        }
      }
      if (!cardImage) throw new Error(`Falha no card ${cardIndex + 1}`);
      return new Response(JSON.stringify({ imageUrl: cardImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 3: Fallback - Single post (cardIndex 0)
    console.log("chat-compose-final: fallback mode, using cardIndex 0");
    const cardContent = [
      { type: "text", text: unifiedPromptTemplate(0) },
      faceData ? { type: "image_url", image_url: { url: faceData } } : null,
      logoData ? { type: "image_url", image_url: { url: logoData } } : null,
      ...additionalPrints.slice(0, 1).map((p) => ({
        type: "image_url",
        image_url: { url: p },
      })),
      ...styleRefs.slice(0, 2).map((ref) => ({
        type: "image_url",
        image_url: { url: ref },
      })),
      coverRef ? { type: "image_url", image_url: { url: coverRef } } : null,
      selectedCardRef
        ? { type: "image_url", image_url: { url: selectedCardRef } }
        : null,
    ].filter(Boolean);

    const isFast = brief.imageModel === "ello-fast";
    const aiModel = isFast
      ? "google/gemini-3.1-flash-image-preview"
      : "google/gemini-3-pro-image-preview";

    let cardImage: string | null = null;
    try {
      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [{ role: "user", content: cardContent }],
            modalities: ["image", "text"],
          }),
        },
      );
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`Fallback AI Gateway error (${resp.status}):`, errText);
      } else {
        cardImage = await extractImageUrl(resp);
      }
    } catch (e) {
      console.error("Fallback generation error:", e);
    }

    if (!cardImage) throw new Error("Falha ao gerar post único no fallback");
    return new Response(JSON.stringify({ imageUrl: cardImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Final error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
