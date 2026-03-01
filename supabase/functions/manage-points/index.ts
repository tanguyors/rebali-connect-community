import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BADGE_POINTS: Record<string, number> = {
  newMember: 10,
  activeMember: 10,
  veteran: 20,
  elder: 30,
  whatsappVerified: 20,
  identityVerified: 40,
  firstDeal: 20,
  fiveDeals: 30,
  twentyDeals: 50,
  fiftyDeals: 60,
  safeSeller: 25,
  trustedPro: 60,
};

const ADDON_COSTS: Record<string, number> = {
  boost: 40,
  boost_premium: 80,
  vip: 120,
  extra_listings: 90,
  protection: 150,
};

const ADDON_DURATIONS: Record<string, number> = {
  boost: 48 * 60 * 60 * 1000,
  boost_premium: 48 * 60 * 60 * 1000,
  vip: 30 * 24 * 60 * 60 * 1000,
  extra_listings: 30 * 24 * 60 * 60 * 1000,
  protection: 30 * 24 * 60 * 60 * 1000,
};

const DYNAMIC_MONTHLY_CAP = 150;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, addon_type, listing_id, target_user_id, new_balance, event_type } = body;

    const isAdmin = async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin");
      return (data?.length || 0) > 0;
    };

    // --- Admin actions ---
    if (action === "admin_get_all_points") {
      if (!(await isAdmin())) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data } = await supabase.from("user_points").select("*");
      return new Response(JSON.stringify({ points: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "admin_set_balance") {
      if (!(await isAdmin())) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!target_user_id || new_balance === undefined) return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const bal = Math.max(0, parseInt(new_balance) || 0);
      await supabase.from("user_points").upsert({ user_id: target_user_id, balance: bal, total_earned: 0, total_spent: 0 }, { onConflict: "user_id" });
      await supabase.from("user_points").update({ balance: bal, updated_at: new Date().toISOString() }).eq("user_id", target_user_id);
      await supabase.from("point_transactions").insert({ user_id: target_user_id, amount: bal, type: "admin", reason: `admin:set_balance_by_${user!.id}` });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure user_points row exists
    await supabase.from("user_points").upsert(
      { user_id: user.id, balance: 0, total_earned: 0, total_spent: 0, monthly_dynamic_earned: 0, month_reset: currentMonth() },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    // --- Sync badges ---
    if (action === "sync_badges") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile) throw new Error("Profile not found");

      const [listingsRes, reviewsRes, dealsRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
        supabase.from("reviews").select("rating").eq("seller_id", user.id),
        supabase.from("conversations").select("id", { count: "exact", head: true })
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq("deal_closed", true).eq("buyer_confirmed", true),
      ]);

      const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const completedDeals = dealsRes.count || 0;
      const trustScore = profile.trust_score || 0;

      const earnedBadges: string[] = [];
      // Age badges
      if (ageDays < 7) earnedBadges.push("newMember");
      if (ageDays >= 30 && ageDays < 180) earnedBadges.push("activeMember");
      if (ageDays >= 180 && ageDays < 365) earnedBadges.push("veteran");
      if (ageDays >= 365) earnedBadges.push("elder");
      // Verification badges
      if (profile.phone_verified) earnedBadges.push("whatsappVerified");
      if (profile.is_verified_seller) earnedBadges.push("identityVerified");
      // Deal badges
      if (completedDeals >= 1) earnedBadges.push("firstDeal");
      if (completedDeals >= 5) earnedBadges.push("fiveDeals");
      if (completedDeals >= 20) earnedBadges.push("twentyDeals");
      if (completedDeals >= 50) earnedBadges.push("fiftyDeals");
      // Trust badges
      if (trustScore >= 70) earnedBadges.push("safeSeller");
      if (trustScore >= 85 && completedDeals >= 10) earnedBadges.push("trustedPro");

      const { data: existingTx } = await supabase
        .from("point_transactions")
        .select("reason")
        .eq("user_id", user.id)
        .eq("type", "earned")
        .like("reason", "badge:%");
      const awardedBadges = new Set(existingTx?.map((t: any) => t.reason.replace("badge:", "")) || []);

      let totalNewPoints = 0;
      for (const badge of earnedBadges) {
        if (!awardedBadges.has(badge) && BADGE_POINTS[badge]) {
          await supabase.from("point_transactions").insert({ user_id: user.id, amount: BADGE_POINTS[badge], type: "earned", reason: `badge:${badge}` });
          totalNewPoints += BADGE_POINTS[badge];
        }
      }

      if (totalNewPoints > 0) {
        const { data: current } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
        await supabase.from("user_points").update({
          balance: (current?.balance || 0) + totalNewPoints,
          total_earned: (current?.total_earned || 0) + totalNewPoints,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }

      const { data: updatedPoints } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      return new Response(JSON.stringify({ points: updatedPoints, new_points: totalNewPoints, earned_badges: earnedBadges }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Award dynamic points ---
    if (action === "award_dynamic") {
      const DYNAMIC_REWARDS: Record<string, number> = {
        completed_deal: 5,
        five_star_review: 3,
        validated_report: 10,
      };
      const reward = DYNAMIC_REWARDS[event_type];
      if (!reward) return new Response(JSON.stringify({ error: "invalid_event_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: pts } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      if (!pts) throw new Error("user_points not found");

      // Reset monthly counter if new month
      const cm = currentMonth();
      let monthlyEarned = pts.monthly_dynamic_earned || 0;
      if (pts.month_reset !== cm) {
        monthlyEarned = 0;
        await supabase.from("user_points").update({ monthly_dynamic_earned: 0, month_reset: cm }).eq("user_id", user.id);
      }

      if (monthlyEarned >= DYNAMIC_MONTHLY_CAP) {
        return new Response(JSON.stringify({ error: "monthly_cap_reached", cap: DYNAMIC_MONTHLY_CAP }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const actualReward = Math.min(reward, DYNAMIC_MONTHLY_CAP - monthlyEarned);
      await supabase.from("point_transactions").insert({ user_id: user.id, amount: actualReward, type: "earned", reason: `dynamic:${event_type}` });
      await supabase.from("user_points").update({
        balance: pts.balance + actualReward,
        total_earned: pts.total_earned + actualReward,
        monthly_dynamic_earned: monthlyEarned + actualReward,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      const { data: updatedPoints } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      return new Response(JSON.stringify({ points: updatedPoints, awarded: actualReward }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Purchase addon ---
    if (action === "purchase") {
      if (!addon_type || !ADDON_COSTS[addon_type]) {
        return new Response(JSON.stringify({ error: "invalid_addon" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const cost = ADDON_COSTS[addon_type];
      const { data: points } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      if (!points || points.balance < cost) {
        return new Response(JSON.stringify({ error: "insufficient_points", required: cost, balance: points?.balance || 0 }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check max 2 extra_listings packs
      if (addon_type === "extra_listings") {
        const { count: activeExtra } = await supabase.from("user_addons").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("addon_type", "extra_listings").eq("active", true);
        if ((activeExtra || 0) >= 2) {
          return new Response(JSON.stringify({ error: "max_extra_listings_reached" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Check for existing active boost on this listing
      if ((addon_type === "boost" || addon_type === "boost_premium") && listing_id) {
        const { data: existingBoost } = await supabase.from("user_addons")
          .select("id")
          .eq("listing_id", listing_id)
          .eq("active", true)
          .in("addon_type", ["boost", "boost_premium"])
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        if (existingBoost && existingBoost.length > 0) {
          return new Response(JSON.stringify({ error: "already_boosted" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await supabase.from("user_points").update({
        balance: points.balance - cost,
        total_spent: points.total_spent + cost,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      await supabase.from("point_transactions").insert({
        user_id: user.id, amount: cost, type: "spent", reason: `addon:${addon_type}`,
        metadata: { listing_id: listing_id || null },
      });

      const expiresAt = new Date(Date.now() + ADDON_DURATIONS[addon_type]).toISOString();
      const extraSlots = addon_type === "extra_listings" ? 5 : 0;
      const { error: insertError } = await supabase.from("user_addons").insert({
        user_id: user.id, addon_type,
        listing_id: (addon_type === "boost" || addon_type === "boost_premium") ? listing_id : null,
        expires_at: expiresAt, extra_slots: extraSlots, active: true,
      });

      if (insertError) {
        console.error("Failed to insert addon:", insertError);
        // Refund the points
        await supabase.from("user_points").update({
          balance: points.balance,
          total_spent: points.total_spent,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        return new Response(JSON.stringify({ error: "addon_creation_failed", details: insertError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updatedPoints } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      return new Response(JSON.stringify({ success: true, points: updatedPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Get balance ---
    if (action === "get_balance") {
      // Reset monthly counter if new month
      const { data: pts } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      const cm = currentMonth();
      if (pts && pts.month_reset !== cm) {
        await supabase.from("user_points").update({ monthly_dynamic_earned: 0, month_reset: cm }).eq("user_id", user.id);
      }

      const { data: points } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      const { data: addons } = await supabase.from("user_addons").select("*").eq("user_id", user.id).eq("active", true);
      const { data: transactions } = await supabase.from("point_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);

      return new Response(JSON.stringify({
        points: points || { balance: 0, total_earned: 0, total_spent: 0, monthly_dynamic_earned: 0 },
        addons: addons || [],
        transactions: transactions || [],
        addon_costs: ADDON_COSTS,
        monthly_cap: DYNAMIC_MONTHLY_CAP,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("manage-points error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
