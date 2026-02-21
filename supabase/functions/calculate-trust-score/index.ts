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

    // Fetch profile
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

    // Account age: +1/day, max 30
    const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    factors.account_age = Math.min(ageDays, 30);

    // Active listings: +5 per listing, max 20
    const { count: activeCount } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user_id)
      .eq("status", "active");
    factors.active_listings = Math.min((activeCount || 0) * 5, 20);

    // WhatsApp verified: +15
    factors.whatsapp_verified = profile.phone_verified ? 15 : 0;

    // ID verified: +20
    factors.id_verified = profile.is_verified_seller ? 20 : 0;

    // Unresolved reports: -10 each
    const { count: reportCount } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("listing_id", (await supabase.from("listings").select("id").eq("seller_id", user_id)).data?.map((l: any) => l.id) || [])
      .eq("resolved", false);
    factors.unresolved_reports = -(reportCount || 0) * 10;

    // VPN detected: -15
    const { data: devices } = await supabase
      .from("user_devices")
      .select("is_vpn")
      .eq("user_id", user_id)
      .eq("is_vpn", true)
      .limit(1);
    factors.vpn_detected = devices && devices.length > 0 ? -15 : 0;

    // Multi-device accounts: -10
    const { data: allDevices } = await supabase
      .from("user_devices")
      .select("device_hash")
      .eq("user_id", user_id);
    const uniqueHashes = new Set(allDevices?.map((d: any) => d.device_hash));
    // Check if any device_hash is used by another user
    let multiAccountPenalty = 0;
    for (const hash of uniqueHashes) {
      const { data: sharedDevices } = await supabase
        .from("user_devices")
        .select("user_id")
        .eq("device_hash", hash)
        .neq("user_id", user_id)
        .limit(1);
      if (sharedDevices && sharedDevices.length > 0) {
        multiAccountPenalty = -10;
        break;
      }
    }
    factors.multi_account = multiAccountPenalty;

    // Calculate total score (clamped 0-100)
    const rawScore = Object.values(factors).reduce((sum, v) => sum + v, 0);
    const score = Math.max(0, Math.min(100, rawScore));

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "low";
    if (score < 10) riskLevel = "high";
    else if (score < 30) riskLevel = "medium";

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
