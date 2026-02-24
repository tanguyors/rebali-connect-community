import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const factors: Record<string, number> = {};

    // Account age: 0.5 pt/day, max 20
    const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    factors.account_age = Math.min(Math.floor(ageDays * 0.5), 20);

    // Active listings: 3 pts/listing, max 15
    const { count: activeCount } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user_id)
      .eq("status", "active");
    factors.active_listings = Math.min((activeCount || 0) * 3, 15);

    // Completed deals: 5 pts/deal, max 20
    const { count: dealCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .or(`buyer_id.eq.${user_id},seller_id.eq.${user_id}`)
      .eq("deal_closed", true)
      .eq("buyer_confirmed", true);
    factors.completed_deals = Math.min((dealCount || 0) * 5, 20);

    // Positive reviews (>= 4 stars): 3 pts each, max 20
    const { data: goodReviews } = await supabase
      .from("reviews")
      .select("id")
      .eq("seller_id", user_id)
      .gte("rating", 4);
    factors.positive_reviews = Math.min((goodReviews?.length || 0) * 3, 20);

    // WhatsApp verified: +10
    factors.whatsapp_verified = profile.phone_verified ? 10 : 0;

    // ID verified: +15
    factors.id_verified = profile.is_verified_seller ? 15 : 0;

    // --- Penalties ---

    // Unresolved reports: -10 each
    const { count: reportCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("listing_id", (await supabase.from("listings").select("id").eq("seller_id", user_id)).data?.map((l: any) => l.id) || [])
      .eq("resolved", false);
    factors.unresolved_reports = -(reportCount || 0) * 10;

    // Fake listing detected (archived listings with 3+ scam reports): -20 each
    const { data: userListings } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", user_id)
      .eq("status", "archived");
    let fakeCount = 0;
    if (userListings && userListings.length > 0) {
      for (const listing of userListings) {
        const { count: scamReports } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("listing_id", listing.id)
          .eq("reason", "scam");
        if ((scamReports || 0) >= 3) fakeCount++;
      }
    }
    factors.fake_listings = -fakeCount * 20;

    // VPN detected: -10
    const { data: vpnDevices } = await supabase
      .from("user_devices")
      .select("is_vpn")
      .eq("user_id", user_id)
      .eq("is_vpn", true)
      .limit(1);
    factors.vpn_detected = vpnDevices && vpnDevices.length > 0 ? -10 : 0;

    // Multi-device abuse: -15
    const { data: allDevices } = await supabase
      .from("user_devices")
      .select("device_hash")
      .eq("user_id", user_id);
    const uniqueHashes = new Set(allDevices?.map((d: any) => d.device_hash));
    let multiAccountPenalty = 0;
    for (const hash of uniqueHashes) {
      const { data: sharedDevices } = await supabase
        .from("user_devices")
        .select("user_id")
        .eq("device_hash", hash)
        .neq("user_id", user_id)
        .limit(1);
      if (sharedDevices && sharedDevices.length > 0) {
        multiAccountPenalty = -15;
        break;
      }
    }
    factors.multi_account = multiAccountPenalty;

    // Calculate total score (clamped 0-100)
    const rawScore = Object.values(factors).reduce((sum, v) => sum + v, 0);
    const score = Math.max(0, Math.min(100, rawScore));

    // New thresholds: >= 70 Safe, >= 40 Standard, < 40 Risky
    let riskLevel: "low" | "medium" | "high" = "low";
    if (score < 40) riskLevel = "high";
    else if (score < 70) riskLevel = "medium";

    // Upsert trust_scores
    await supabase.from("trust_scores").upsert({
      user_id,
      score,
      risk_level: riskLevel,
      factors,
      last_calculated: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Update profile
    await supabase
      .from("profiles")
      .update({ trust_score: score, risk_level: riskLevel })
      .eq("id", user_id);

    return new Response(JSON.stringify({ score, risk_level: riskLevel, factors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
