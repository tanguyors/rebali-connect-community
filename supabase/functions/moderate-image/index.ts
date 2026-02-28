import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { image_hash, title, description } = await req.json();

    const warnings: string[] = [];
    let is_duplicate = false;
    let duplicate_listings: any[] = [];

    // 1. Check duplicate image hash
    if (image_hash) {
      const { data: dupes } = await supabase.rpc("check_duplicate_image", {
        _hash: image_hash,
        _seller_id: userId,
      });
      if (dupes && dupes.length > 0) {
        is_duplicate = true;
        duplicate_listings = dupes;
        warnings.push("duplicate_image");
      }
    }

    // 2. Check title similarity with existing active listings from OTHER sellers
    if (title && title.length >= 5) {
      const normalizedTitle = title.toLowerCase().trim();
      const { data: similar } = await supabase
        .from("listings")
        .select("id, title_original, seller_id")
        .neq("seller_id", userId)
        .eq("status", "active")
        .ilike("title_original", `%${normalizedTitle}%`)
        .limit(3);

      if (similar && similar.length > 0) {
        warnings.push("similar_title");
      }
    }

    // 3. Check description for suspicious patterns (phone numbers, URLs, etc.)
    if (description) {
      const SUSPICIOUS_PATTERNS = [
        /wa\.me\//i,
        /t\.me\//i,
        /bit\.ly\//i,
        /tinyurl\.com/i,
        /telegram/i,
        /whatsapp\.com/i,
        /signal\.me/i,
        /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/,
        /\b\d{10,15}\b/,
      ];
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(description)) {
          warnings.push("suspicious_content");
          break;
        }
      }
    }

    // 4. Basic image metadata checks (file size anomalies already handled client-side)
    // Flag if same user uploads same hash (re-use across listings = potential spam)
    if (image_hash) {
      const { count } = await supabase
        .from("listing_images")
        .select("id", { count: "exact", head: true })
        .eq("image_hash", image_hash);
      if (count && count >= 3) {
        warnings.push("image_reused");
      }
    }

    const safe = warnings.length === 0;

    return new Response(JSON.stringify({
      safe,
      warnings,
      is_duplicate,
      duplicate_listings: duplicate_listings.map((d: any) => ({
        listing_id: d.listing_id,
        title: d.title_original,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
