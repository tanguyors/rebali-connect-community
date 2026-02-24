import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BADGE_POINTS: Record<string, number> = {
  newMember: 5,
  activeMember: 10,
  veteran: 20,
  elder: 30,
  firstSeller: 10,
  activeSeller: 20,
  communicator: 10,
  superCommunicator: 20,
  wellRated: 15,
  topSeller: 30,
  whatsappVerified: 15,
  identityVerified: 25,
};

const ADDON_COSTS: Record<string, number> = {
  boost: 30,
  vip: 80,
  extra_listings: 50,
};

const ADDON_DURATIONS: Record<string, number> = {
  boost: 48 * 60 * 60 * 1000, // 48h
  vip: 30 * 24 * 60 * 60 * 1000, // 30 days
  extra_listings: 30 * 24 * 60 * 60 * 1000, // 30 days
};

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

    const { action, addon_type, listing_id } = await req.json();

    // Ensure user_points row exists
    await supabase.from("user_points").upsert(
      { user_id: user.id, balance: 0, total_earned: 0, total_spent: 0 },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    if (action === "sync_badges") {
      // Calculate which badges user has earned and award points for new ones
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile) throw new Error("Profile not found");

      const [listingsRes, messagesRes, reviewsRes] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
        supabase.from("reviews").select("rating").eq("seller_id", user.id),
      ]);

      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;
      const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));

      const ctx = {
        ageDays,
        totalListings: listingsRes.count || 0,
        totalMessages: messagesRes.count || 0,
        avgRating,
        reviewCount: reviews.length,
        phoneVerified: profile.phone_verified,
        isVerified: profile.is_verified_seller,
      };

      // Determine earned badges
      const earnedBadges: string[] = [];
      if (ctx.ageDays < 7) earnedBadges.push("newMember");
      if (ctx.ageDays >= 30 && ctx.ageDays < 180) earnedBadges.push("activeMember");
      if (ctx.ageDays >= 180 && ctx.ageDays < 365) earnedBadges.push("veteran");
      if (ctx.ageDays >= 365) earnedBadges.push("elder");
      if (ctx.totalListings >= 1 && ctx.totalListings < 5) earnedBadges.push("firstSeller");
      if (ctx.totalListings >= 5) earnedBadges.push("activeSeller");
      if (ctx.totalMessages >= 10 && ctx.totalMessages < 50) earnedBadges.push("communicator");
      if (ctx.totalMessages >= 50) earnedBadges.push("superCommunicator");
      if (ctx.avgRating >= 4 && ctx.reviewCount >= 3 && !(ctx.avgRating >= 4.5 && ctx.reviewCount >= 10)) earnedBadges.push("wellRated");
      if (ctx.avgRating >= 4.5 && ctx.reviewCount >= 10) earnedBadges.push("topSeller");
      if (ctx.phoneVerified) earnedBadges.push("whatsappVerified");
      if (ctx.isVerified) earnedBadges.push("identityVerified");

      // Check which badges already awarded points
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
          const pts = BADGE_POINTS[badge];
          await supabase.from("point_transactions").insert({
            user_id: user.id,
            amount: pts,
            type: "earned",
            reason: `badge:${badge}`,
          });
          totalNewPoints += pts;
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

      return new Response(JSON.stringify({ 
        points: updatedPoints, 
        new_points: totalNewPoints,
        earned_badges: earnedBadges,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "purchase") {
      if (!addon_type || !ADDON_COSTS[addon_type]) {
        return new Response(JSON.stringify({ error: "invalid_addon" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cost = ADDON_COSTS[addon_type];
      const { data: points } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      
      if (!points || points.balance < cost) {
        return new Response(JSON.stringify({ error: "insufficient_points", required: cost, balance: points?.balance || 0 }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct points
      await supabase.from("user_points").update({
        balance: points.balance - cost,
        total_spent: points.total_spent + cost,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      // Record transaction
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: cost,
        type: "spent",
        reason: `addon:${addon_type}`,
        metadata: { listing_id: listing_id || null },
      });

      // Create addon
      const expiresAt = new Date(Date.now() + ADDON_DURATIONS[addon_type]).toISOString();
      await supabase.from("user_addons").insert({
        user_id: user.id,
        addon_type,
        listing_id: addon_type === "boost" ? listing_id : null,
        expires_at: expiresAt,
        extra_slots: addon_type === "extra_listings" ? 3 : 0,
        active: true,
      });

      const { data: updatedPoints } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();

      return new Response(JSON.stringify({ success: true, points: updatedPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_balance") {
      const { data: points } = await supabase.from("user_points").select("*").eq("user_id", user.id).single();
      const { data: addons } = await supabase.from("user_addons").select("*").eq("user_id", user.id).eq("active", true);
      const { data: transactions } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ 
        points: points || { balance: 0, total_earned: 0, total_spent: 0 },
        addons: addons || [],
        transactions: transactions || [],
        addon_costs: ADDON_COSTS,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
