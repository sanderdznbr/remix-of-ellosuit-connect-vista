import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bucketId = "whatsapp-media";
    let totalDeleted = 0;

    // Recursive function to delete all files in a path
    async function deleteAllInPath(path: string) {
      const { data, error } = await supabaseAdmin.storage
        .from(bucketId)
        .list(path, { limit: 1000, sortBy: { column: "name", order: "asc" } });

      if (error) {
        console.error(`Error listing ${path}:`, error);
        return;
      }
      if (!data || data.length === 0) return;

      const files: string[] = [];
      const folders: string[] = [];

      for (const item of data) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        if (item.id === null) {
          folders.push(fullPath);
        } else {
          files.push(fullPath);
        }
      }

      // Delete files in batches of 100
      for (let i = 0; i < files.length; i += 100) {
        const batch = files.slice(i, i + 100);
        const { error: delError } = await supabaseAdmin.storage
          .from(bucketId)
          .remove(batch);
        if (delError) {
          console.error(`Error deleting batch:`, delError);
        } else {
          totalDeleted += batch.length;
          console.log(`Deleted ${batch.length} files from ${path || "root"}`);
        }
      }

      // Recurse into folders
      for (const folder of folders) {
        await deleteAllInPath(folder);
      }
    }

    await deleteAllInPath("");

    return new Response(
      JSON.stringify({ success: true, totalDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
