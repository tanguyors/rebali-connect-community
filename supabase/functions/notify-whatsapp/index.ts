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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversation_id, sender_id, message_preview } = await req.json();

    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fonnte = Deno.env.get("FONNTE_TOKEN");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get conversation with listing title
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, listing_id, listings!conversations_listing_id_fkey(title_original)")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine recipient
    const recipientId = conv.buyer_id === sender_id ? conv.seller_id : conv.buyer_id;

    // Get recipient's WhatsApp number
    const { data: recipient } = await supabase
      .from("profiles")
      .select("whatsapp, display_name")
      .eq("id", recipientId)
      .single();

    if (!recipient?.whatsapp || !fonnte) {
      // No WhatsApp number or no Fonnte token — skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender name
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", sender_id)
      .single();

    const listingTitle = (conv as any).listings?.title_original || "an item";
    const preview = message_preview
      ? `"${message_preview.substring(0, 100)}${message_preview.length > 100 ? "..." : ""}"`
      : "";
    const senderName = sender?.display_name || "Someone";
    const convLink = `https://rebali-connect-community.lovable.app/messages?conv=${conversation_id}`;

    const waMessage = `📩 New message on Re-Bali for "${listingTitle}"

${senderName}: ${preview}

Reply here: ${convLink}`;

    // Send via Fonnte
    const cleanTarget = recipient.whatsapp.replace(/[^0-9]/g, "");
    const formData = new FormData();
    formData.append("target", cleanTarget);
    formData.append("message", waMessage);
    formData.append("countryCode", "0");

    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: fonnte },
      body: formData,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-whatsapp error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
