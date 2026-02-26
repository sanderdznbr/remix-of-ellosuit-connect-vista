import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { carousel_id, backfill } = await req.json();

    if (backfill) {
      // Process carousels one at a time to avoid memory limits
      const { data: carouselIds } = await supabase
        .from("generated_carousels")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!carouselIds || carouselIds.length === 0) {
        return new Response(JSON.stringify({ message: "No carousels to process" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const { id } of carouselIds) {
        try {
          // Load one carousel at a time to avoid memory issues
          const { data: c } = await supabase
            .from("generated_carousels")
            .select("id, title, topic, card_count, style_config, company_id, carousel_data")
            .eq("id", id)
            .single();
          
          if (!c) { results.push({ id, success: false, error: "not found" }); continue; }
          
          const result = await processCarouselWithAI(supabase, supabaseUrl, c, lovableApiKey);
          results.push({ id: c.id, title: c.title, ...result });
          
          // Clear reference to help GC
          c.carousel_data = null;
        } catch (err) {
          results.push({ id, success: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single carousel
    if (!carousel_id) {
      return new Response(JSON.stringify({ error: "carousel_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: carousel } = await supabase
      .from("generated_carousels")
      .select("id, title, topic, card_count, style_config, company_id, carousel_data")
      .eq("id", carousel_id)
      .single();

    if (!carousel) {
      return new Response(JSON.stringify({ error: "Carousel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processCarouselWithAI(supabase, supabaseUrl, carousel, lovableApiKey);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processCarouselWithAI(
  supabase: any,
  supabaseUrl: string,
  carousel: any,
  lovableApiKey: string | undefined
) {
  const cards = carousel.carousel_data?.cards;
  const firstCard = cards?.[0];
  if (!firstCard) return { success: false, error: "No cards found" };

  // Check if card has an existing AI-generated image we can use directly
  const hasImage = firstCard.imageUrl && (firstCard.imageUrl.startsWith("data:") || firstCard.imageUrl.startsWith("http"));

  // Priority 1: Use the actual AI-generated image from the first card (no modifications)
  if (hasImage && firstCard.imageUrl.startsWith("data:")) {
    return await uploadBase64AndSave(supabase, supabaseUrl, carousel, firstCard.imageUrl);
  }

  if (hasImage && firstCard.imageUrl.startsWith("http")) {
    try {
      const resp = await fetch(firstCard.imageUrl);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const ct = resp.headers.get("content-type") || "image/jpeg";
        return await uploadBase64AndSave(supabase, supabaseUrl, carousel, `data:${ct};base64,${base64}`);
      }
    } catch (err) {
      console.error("Failed to fetch first card image:", err.message);
    }
  }

  // Priority 2: Check other cards for any AI image
  for (let i = 1; i < (cards?.length || 0); i++) {
    const card = cards[i];
    if (card?.imageUrl && card.imageUrl.startsWith("http")) {
      try {
        const resp = await fetch(card.imageUrl);
        if (resp.ok) {
          const buf = await resp.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const ct = resp.headers.get("content-type") || "image/jpeg";
          return await uploadBase64AndSave(supabase, supabaseUrl, carousel, `data:${ct};base64,${base64}`);
        }
      } catch {}
    }
  }

  return { success: false, error: "No image source available in carousel cards" };
}

async function uploadBase64AndSave(supabase: any, supabaseUrl: string, carousel: any, dataUri: string) {
  const match = dataUri.match(/^data:image\/([\w+]+);base64,(.+)$/);
  if (!match) return { success: false, error: "Invalid base64" };

  const mimeType = match[1] === "jpg" ? "jpeg" : match[1];
  const ext = mimeType === "jpeg" ? "jpg" : mimeType.replace("+xml", "");
  const binaryString = atob(match[2]);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await uploadAndSave(supabase, supabaseUrl, carousel, bytes, `image/${mimeType}`, ext);
}

async function uploadAndSave(
  supabase: any,
  supabaseUrl: string,
  carousel: any,
  data: Uint8Array | string,
  contentType?: string,
  ext?: string
) {
  // If data is a base64 string (from AI), parse it
  if (typeof data === "string" && data.startsWith("data:")) {
    return await uploadBase64AndSave(supabase, supabaseUrl, carousel, data);
  }

  const finalExt = ext || "png";
  const finalContentType = contentType || "image/png";
  const fileName = `${carousel.company_id}/${carousel.id}.${finalExt}`;

  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(fileName, (data as Uint8Array).buffer, {
      contentType: finalContentType,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage.from("covers").getPublicUrl(fileName);
  const coverUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("generated_carousels")
    .update({ cover_url: coverUrl })
    .eq("id", carousel.id);

  if (updateError) {
    return { success: false, error: `Update failed: ${updateError.message}` };
  }

  return { success: true, cover_url: coverUrl };
}
