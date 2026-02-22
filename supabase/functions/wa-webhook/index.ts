import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Anti-scam patterns
const BLOCKED_PATTERNS = [
  /\+62\d{8,}/,
  /08\d{8,}/,
  /\d{6,}/,
  /wa\.me\//i,
  /t\.me\//i,
  /bit\.ly\//i,
  /tinyurl\.com/i,
  /https?:\/\/[^\s]+/i,
  /telegram/i,
  /whatsapp\.com/i,
  /signal\.me/i,
  /line\.me/i,
];

async function sendFonnte(token: string, target: string, message: string) {
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target, message }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse Fonnte webhook payload
    let sender: string;
    let messageBody: string;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await req.json();
      sender = json.sender || json.pengirim || "";
      messageBody = json.message || json.pesan || "";
    } else {
      // form-encoded
      const formData = await req.formData();
      sender = (formData.get("sender") || formData.get("pengirim") || "") as string;
      messageBody = (formData.get("message") || formData.get("pesan") || "") as string;
    }

    if (!sender || !messageBody) {
      return new Response(JSON.stringify({ error: "Missing sender or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize sender phone
    sender = sender.replace(/[^0-9]/g, "");

    // Check if sender is banned
    const { data: bannedCheck } = await supabase
      .from("banned_devices")
      .select("id")
      .eq("phone_number", sender)
      .limit(1);

    if (bannedCheck && bannedCheck.length > 0) {
      await sendFonnte(FONNTE_TOKEN, sender, "Your account has been restricted. Contact support if you believe this is an error.");
      return new Response(JSON.stringify({ status: "banned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse token: RB|L=<listingId>|B=<buyerId>|
    const tokenMatch = messageBody.match(/(?:ref:)?RB\|L=([a-f0-9-]+)\|B=([a-f0-9-]+)\|/i);

    let listingId: string | null = null;
    let buyerId: string | null = null;
    let cleanMessage = messageBody;

    if (tokenMatch) {
      listingId = tokenMatch[1];
      buyerId = tokenMatch[2];
      // Remove token from message
      cleanMessage = messageBody.replace(tokenMatch[0], "").trim();
    }

    // If no token, try to find existing conversation by sender phone
    if (!listingId || !buyerId) {
      // Look for conversation where buyer_phone matches sender
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, relay_status")
        .eq("buyer_phone", sender)
        .eq("relay_status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingConv) {
        // Also check if sender is a seller in any active relay conversation
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("id, phone, whatsapp")
          .or(`phone.eq.${sender},whatsapp.eq.${sender}`)
          .limit(1)
          .maybeSingle();

        if (sellerProfile) {
          const { data: sellerConv } = await supabase
            .from("conversations")
            .select("id, listing_id, buyer_id, seller_id, relay_status, buyer_phone")
            .eq("seller_id", sellerProfile.id)
            .eq("relay_status", "active")
            .gt("total_msg_count", 0)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sellerConv) {
            // Seller is replying to most recent active conversation
            return await handleRelay(supabase, FONNTE_TOKEN, sellerConv, sender, cleanMessage, "seller");
          }
        }

        // Silent ignore — don't reply to random messages without a token
        console.log("Ignoring message from", sender, "— no token, no active conversation");
        return new Response(JSON.stringify({ status: "no_token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Existing conversation found, route message
      // Determine role: is sender the buyer or seller?
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("phone, whatsapp")
        .eq("id", existingConv.seller_id)
        .single();

      const sellerPhones = [sellerProfile?.phone, sellerProfile?.whatsapp]
        .filter(Boolean)
        .map((p: string) => p.replace(/[^0-9]/g, ""));

      const role = sellerPhones.includes(sender) ? "seller" : "buyer";
      return await handleRelay(supabase, FONNTE_TOKEN, existingConv, sender, cleanMessage, role);
    }

    // Verify listing exists and is active
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title_original, seller_id, status")
      .eq("id", listingId)
      .single();

    if (!listing) {
      await sendFonnte(FONNTE_TOKEN, sender, "This listing was not found on Re-Bali.");
      return new Response(JSON.stringify({ status: "listing_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.status !== "active") {
      await sendFonnte(FONNTE_TOKEN, sender, "This listing is no longer available on Re-Bali.");
      return new Response(JSON.stringify({ status: "listing_inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();

    let conversation = existingConv;
    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: listing.seller_id,
          buyer_phone: sender,
          relay_status: "active",
        })
        .select("*")
        .single();
      conversation = newConv;
    } else if (!conversation.buyer_phone) {
      // Store buyer phone on first message
      await supabase
        .from("conversations")
        .update({ buyer_phone: sender })
        .eq("id", conversation.id);
      conversation.buyer_phone = sender;
    }

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conversation.relay_status === "blocked") {
      await sendFonnte(FONNTE_TOKEN, sender, "This conversation has been blocked by Re-Bali moderation.");
      return new Response(JSON.stringify({ status: "blocked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save relay token
    const tokenStr = `RB|L=${listingId}|B=${buyerId}|`;
    await supabase
      .from("wa_relay_tokens")
      .upsert(
        { token: tokenStr, listing_id: listingId, buyer_id: buyerId, conversation_id: conversation.id },
        { onConflict: "token" }
      );

    // Check if buyer's WhatsApp matches their profile
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("phone, whatsapp, display_name")
      .eq("id", buyerId)
      .single();

    if (buyerProfile) {
      const profilePhones = [buyerProfile.phone, buyerProfile.whatsapp]
        .filter(Boolean)
        .map((p: string) => p.replace(/[^0-9]/g, ""));

      if (profilePhones.length > 0 && !profilePhones.includes(sender)) {
        // Phone mismatch — confirm message sent but warn about reply destination
        await sendFonnte(
          FONNTE_TOKEN,
          sender,
          "✅ Message envoyé. ⚠️ Attention : le numéro d'expédition n'est pas celui renseigné dans votre profil. Vous recevrez la réponse sur le numéro enregistré dans votre profil Re-Bali."
        );

        // Log risk event
        await supabase.from("risk_events").insert({
          user_id: buyerId,
          phone: sender,
          event_type: "phone_mismatch",
          details: { profile_phones: profilePhones, actual_sender: sender, conversation_id: conversation.id },
        });
      }
    }

    return await handleRelay(supabase, FONNTE_TOKEN, conversation, sender, cleanMessage, "buyer", listing.title_original);
  } catch (err) {
    console.error("wa-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleRelay(
  supabase: any,
  FONNTE_TOKEN: string,
  conversation: any,
  senderPhone: string,
  message: string,
  role: "buyer" | "seller",
  listingTitle?: string
) {
  // Anti-scam filter
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      // Log risk event
      await supabase.from("risk_events").insert({
        user_id: role === "buyer" ? conversation.buyer_id : conversation.seller_id,
        phone: senderPhone,
        event_type: "blocked_message",
        details: { pattern: pattern.source, message_preview: message.substring(0, 100), conversation_id: conversation.id },
      });

      await sendFonnte(
        FONNTE_TOKEN,
        senderPhone,
        "⚠️ Re-Bali Safety: Your message was blocked because it contains phone numbers, links, or messaging app references. For your safety, these are not allowed until the conversation is unlocked."
      );

      return new Response(JSON.stringify({ status: "blocked_content" }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }
  }

  // Get listing title if not provided
  if (!listingTitle) {
    const { data: listing } = await supabase
      .from("listings")
      .select("title_original")
      .eq("id", conversation.listing_id)
      .single();
    listingTitle = listing?.title_original || "Unknown";
  }

  // Save message in DB
  const senderId = role === "buyer" ? conversation.buyer_id : conversation.seller_id;
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: senderId,
    content: message,
    from_role: role,
  });

  // Update conversation counts
  const updates: any = {
    total_msg_count: (conversation.total_msg_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  if (role === "buyer") {
    updates.buyer_msg_count = (conversation.buyer_msg_count || 0) + 1;
  } else {
    updates.seller_msg_count = (conversation.seller_msg_count || 0) + 1;
  }

  await supabase.from("conversations").update(updates).eq("id", conversation.id);

  // Get the other party's phone to relay
  let targetPhone: string;
  if (role === "buyer") {
    // Relay to seller
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("phone, whatsapp, display_name")
      .eq("id", conversation.seller_id)
      .single();

    targetPhone = (sellerProfile?.whatsapp || sellerProfile?.phone || "").replace(/[^0-9]/g, "");
    if (!targetPhone) {
      return new Response(JSON.stringify({ status: "no_seller_phone" }), {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }
  } else {
    // Relay to buyer
    targetPhone = conversation.buyer_phone || "";
    if (!targetPhone) {
      return new Response(JSON.stringify({ status: "no_buyer_phone" }), {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }
  }

  // Relay the message
  const prefix = `📦 Re-Bali (${listingTitle}):\n`;
  await sendFonnte(FONNTE_TOKEN, targetPhone, prefix + message);

  // Check unlock conditions
  const newTotalCount = updates.total_msg_count;
  const newBuyerCount = role === "buyer" ? updates.buyer_msg_count : (conversation.buyer_msg_count || 0);
  const newSellerCount = role === "seller" ? updates.seller_msg_count : (conversation.seller_msg_count || 0);

  if (
    !conversation.unlocked &&
    newTotalCount >= 3 &&
    newBuyerCount >= 1 &&
    newSellerCount >= 1
  ) {
    // Check seller is verified and neither party banned
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("phone_verified, is_banned, phone, whatsapp")
      .eq("id", conversation.seller_id)
      .single();

    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", conversation.buyer_id)
      .single();

    if (
      sellerProfile?.phone_verified &&
      !sellerProfile?.is_banned &&
      !buyerProfile?.is_banned
    ) {
      // Unlock!
      await supabase
        .from("conversations")
        .update({ unlocked: true, unlocked_at: new Date().toISOString() })
        .eq("id", conversation.id);

      const sellerRealPhone = sellerProfile.whatsapp || sellerProfile.phone || "";

      // Send system message to both parties
      const unlockMsgBuyer = `🔓 Re-Bali: Conversation unlocked! You can now contact the seller directly: ${sellerRealPhone}`;
      const unlockMsgSeller = `🔓 Re-Bali: Conversation unlocked! The buyer can now see your phone number. You can continue chatting directly.`;

      await Promise.all([
        sendFonnte(FONNTE_TOKEN, conversation.buyer_phone, unlockMsgBuyer),
        sendFonnte(FONNTE_TOKEN, targetPhone === conversation.buyer_phone ? (sellerProfile.whatsapp || sellerProfile.phone || "").replace(/[^0-9]/g, "") : targetPhone, unlockMsgSeller),
      ]);

      // Save system messages
      await supabase.from("messages").insert([
        {
          conversation_id: conversation.id,
          sender_id: conversation.seller_id,
          content: unlockMsgBuyer,
          from_role: "system",
        },
      ]);
    }
  }

  return new Response(JSON.stringify({ status: "relayed" }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
