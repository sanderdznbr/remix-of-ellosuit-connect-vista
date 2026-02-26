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
    const supabase = createClient(supabaseUrl, serviceKey);

    const { carousel_id, backfill } = await req.json();

    // If backfill mode, process all carousels without cover_url
    if (backfill) {
      const { data: carousels } = await supabase
        .from("generated_carousels")
        .select("id")
        .is("cover_url", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!carousels || carousels.length === 0) {
        return new Response(JSON.stringify({ message: "No carousels to process" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const c of carousels) {
        const result = await processCarousel(supabase, supabaseUrl, c.id);
        results.push({ id: c.id, ...result });
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single carousel mode
    if (!carousel_id) {
      return new Response(JSON.stringify({ error: "carousel_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processCarousel(supabase, supabaseUrl, carousel_id);
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

async function processCarousel(supabase: any, supabaseUrl: string, carouselId: string) {
  try {
    // Get first card imageUrl using RPC-like query
    const { data, error } = await supabase
      .from("generated_carousels")
      .select("carousel_data, company_id")
      .eq("id", carouselId)
      .single();

    if (error || !data) {
      return { success: false, error: "Carousel not found" };
    }

    const cards = data.carousel_data?.cards;
    if (!cards || cards.length === 0 || !cards[0].imageUrl) {
      return { success: false, error: "No card image found" };
    }

    const base64Data = cards[0].imageUrl;

    let bytes: Uint8Array;
    let mimeType: string;
    let ext: string;

    if (base64Data.startsWith("data:image/")) {
      // Parse the base64 data URI
      const match = base64Data.match(/^data:image\/([\w+]+);base64,(.+)$/);
      if (!match) {
        return { success: false, error: "Invalid base64 format" };
      }
      mimeType = match[1] === "jpg" ? "jpeg" : match[1];
      const rawBase64 = match[2];
      const binaryString = atob(rawBase64);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      ext = mimeType === "jpeg" ? "jpg" : mimeType;
    } else if (base64Data.startsWith("http")) {
      // External URL - download it
      try {
        const resp = await fetch(base64Data);
        if (!resp.ok) return { success: false, error: "Failed to download external image" };
        const contentType = resp.headers.get("content-type") || "image/jpeg";
        mimeType = contentType.split("/")[1] || "jpeg";
        ext = mimeType === "jpeg" ? "jpg" : mimeType;
        const arrayBuf = await resp.arrayBuffer();
        bytes = new Uint8Array(arrayBuf);
      } catch {
        return { success: false, error: "Failed to fetch external image" };
      }
    } else {
      return { success: false, error: "Unknown image format" };
    }

    // Upload to covers bucket
    const fileName = `${data.company_id}/${carouselId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(fileName, bytes.buffer, {
        contentType: `image/${mimeType}`,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("covers").getPublicUrl(fileName);
    const coverUrl = urlData.publicUrl;

    // Update the carousel record
    const { error: updateError } = await supabase
      .from("generated_carousels")
      .update({ cover_url: coverUrl })
      .eq("id", carouselId);

    if (updateError) {
      return { success: false, error: `Update failed: ${updateError.message}` };
    }

    return { success: true, cover_url: coverUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
}