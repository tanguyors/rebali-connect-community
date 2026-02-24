import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // 1. Deactivate all expired addons
    const { data, error } = await supabase
      .from("user_addons")
      .update({ active: false })
      .eq("active", true)
      .lt("expires_at", now)
      .select("id, addon_type, user_id");

    if (error) {
      console.error("Expire addons error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = data?.length || 0;
    console.log(`Deactivated ${count} expired addons`);

    // 2. Expire Pro subscriptions and archive excess listings
    const { data: expiredSubs, error: subError } = await supabase
      .from("pro_subscriptions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now)
      .select("user_id");

    if (subError) {
      console.error("Expire pro subs error:", subError);
    }

    let archivedExcess = 0;

    if (expiredSubs && expiredSubs.length > 0) {
      console.log(`Expired ${expiredSubs.length} Pro subscriptions`);

      for (const sub of expiredSubs) {
        // Calculate the user's free limit (5 base + extra_listings addons)
        const { data: extraSlots } = await supabase
          .from("user_addons")
          .select("extra_slots")
          .eq("user_id", sub.user_id)
          .eq("addon_type", "extra_listings")
          .eq("active", true);

        const bonusSlots = (extraSlots || []).reduce(
          (sum: number, a: any) => sum + (a.extra_slots || 0),
          0
        );

        // Check account age for limit
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", sub.user_id)
          .single();

        const accountAge = profile
          ? Date.now() - new Date(profile.created_at).getTime()
          : Infinity;
        const baseLimit = accountAge < 7 * 24 * 60 * 60 * 1000 ? 3 : 5;
        const freeLimit = baseLimit + bonusSlots;

        // Get all active listings for this user, oldest first
        const { data: activeListings } = await supabase
          .from("listings")
          .select("id")
          .eq("seller_id", sub.user_id)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (activeListings && activeListings.length > freeLimit) {
          // Archive excess listings (keep the newest ones up to freeLimit)
          const toArchive = activeListings.slice(0, activeListings.length - freeLimit);
          const archiveIds = toArchive.map((l: any) => l.id);

          const { error: archiveError } = await supabase
            .from("listings")
            .update({ status: "archived" })
            .in("id", archiveIds);

          if (archiveError) {
            console.error(`Archive excess for user ${sub.user_id}:`, archiveError);
          } else {
            archivedExcess += archiveIds.length;
            console.log(`Archived ${archiveIds.length} excess listings for user ${sub.user_id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        expired_addons: count,
        expired_pro_subs: expiredSubs?.length || 0,
        archived_excess_listings: archivedExcess,
        details: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("expire-addons error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
