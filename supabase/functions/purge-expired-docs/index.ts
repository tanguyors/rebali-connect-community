import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find verifications approved/rejected > 30 days ago, not yet purged
    const { data: toPurge, error: fetchError } = await supabaseAdmin
      .from("id_verifications")
      .select("id, document_path, selfie_path")
      .in("status", ["approved", "rejected"])
      .is("documents_purged_at", null)
      .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!toPurge || toPurge.length === 0) {
      return new Response(JSON.stringify({ purged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let purgedCount = 0;

    for (const v of toPurge) {
      const filesToDelete = [v.document_path, v.selfie_path].filter(Boolean);

      // Delete files from storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from("id-verifications")
        .remove(filesToDelete);

      if (deleteError) {
        console.error(`Failed to delete files for verification ${v.id}:`, deleteError);
        continue;
      }

      // Mark as purged
      const { error: updateError } = await supabaseAdmin
        .from("id_verifications")
        .update({ documents_purged_at: new Date().toISOString() })
        .eq("id", v.id);

      if (updateError) {
        console.error(`Failed to update verification ${v.id}:`, updateError);
        continue;
      }

      purgedCount++;
    }

    console.log(`Purged ${purgedCount} verification document sets`);

    return new Response(JSON.stringify({ purged: purgedCount, total: toPurge.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("purge-expired-docs error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
