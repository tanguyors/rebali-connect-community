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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fonnte = Deno.env.get("FONNTE_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { listing_id, title, description, category, price, seller_id } = await req.json();

    if (!listing_id || !title) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active saved searches
    const { data: savedSearches } = await supabase
      .from("saved_searches")
      .select("id, user_id, keyword")
      .eq("is_active", true);

    if (!savedSearches || savedSearches.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchText = `${title} ${description} ${category}`.toLowerCase();
    let matchedCount = 0;

    for (const search of savedSearches) {
      // Don't notify the seller about their own listing
      if (search.user_id === seller_id) continue;

      // Check if keyword matches (case-insensitive, supports multi-word)
      const keywords = search.keyword.toLowerCase().split(/\s+/);
      const matches = keywords.every((kw: string) => searchText.includes(kw));

      if (!matches) continue;

      // Check if notification already exists for this listing+search combo
      const { data: existing } = await supabase
        .from("search_notifications")
        .select("id")
        .eq("saved_search_id", search.id)
        .eq("listing_id", listing_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Check user has active VIP addon
      const { data: vipAddon } = await supabase
        .from("user_addons")
        .select("id")
        .eq("user_id", search.user_id)
        .eq("addon_type", "vip")
        .eq("active", true)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (!vipAddon || vipAddon.length === 0) continue;

      // Create in-app notification
      await supabase.from("search_notifications").insert({
        user_id: search.user_id,
        saved_search_id: search.id,
        listing_id: listing_id,
      });

      matchedCount++;

      // Send WhatsApp notification if user has verified WhatsApp
      if (fonnte) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("whatsapp, display_name, preferred_lang")
          .eq("id", search.user_id)
          .single();

        if (profile?.whatsapp) {
          const cleanTarget = profile.whatsapp.replace(/[^0-9]/g, "");

          // Get listing image
          const { data: listingImage } = await supabase
            .from("listing_images")
            .select("storage_path")
            .eq("listing_id", listing_id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .single();

          const imageUrl = listingImage
            ? `${supabaseUrl}/storage/v1/object/public/listings/${listingImage.storage_path}`
            : "";

          const listingUrl = `https://rebali-connect-community.lovable.app/listing/${listing_id}`;

          const priceFormatted = new Intl.NumberFormat("id-ID").format(price);

          const waMessage = `🔔 *Alerte Re-Bali*

Nouvelle annonce correspondant à votre recherche "${search.keyword}" :

📦 *${title}*
💰 ${priceFormatted} IDR

👉 ${listingUrl}`;

          const formData = new FormData();
          formData.append("target", cleanTarget);
          formData.append("message", waMessage);
          formData.append("countryCode", "0");
          if (imageUrl) {
            formData.append("url", imageUrl);
          }

          try {
            const fonnteRes = await fetch("https://api.fonnte.com/send", {
              method: "POST",
              headers: { Authorization: fonnte },
              body: formData,
            });
            const result = await fonnteRes.json();
            console.log(`WA sent to ${cleanTarget}:`, JSON.stringify(result));

            // Mark as WA notified
            await supabase
              .from("search_notifications")
              .update({ notified_wa: true })
              .eq("saved_search_id", search.id)
              .eq("listing_id", listing_id);
          } catch (waErr) {
            console.error("Fonnte error:", waErr);
          }
        }
      }
    }

    console.log(`Matched ${matchedCount} saved searches for listing ${listing_id}`);

    return new Response(JSON.stringify({ ok: true, matched: matchedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-saved-searches error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
