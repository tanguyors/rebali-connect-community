import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find conversations where deal_closed = true, buyer_confirmed = false, and deal_closed_at > 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredConvs, error } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("deal_closed", true)
      .eq("buyer_confirmed", false)
      .neq("relay_status", "closed")
      .lt("deal_closed_at", sevenDaysAgo);

    if (error) throw error;

    let closedCount = 0;
    for (const conv of expiredConvs || []) {
      // Close the conversation
      await supabase
        .from("conversations")
        .update({ relay_status: "closed" })
        .eq("id", conv.id);

      // Insert system message
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: conv.seller_id,
        content: "⏰ This conversation has been automatically closed after 7 days without buyer confirmation.",
        from_role: "system",
      });

      closedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, closed: closedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
