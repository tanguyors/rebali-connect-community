import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Pre-translated safety suffixes per language
const SAFETY_SUFFIXES: Record<string, string> = {
  en: "\n---\n⚠️ Re-Bali is a listing platform only — no transactions are managed. Buyer & seller are solely responsible. Re-Bali does not guarantee the authenticity or quality of any item. Never pay before seeing the item. Meet in a public place.",
  id: "\n---\n⚠️ Re-Bali hanya platform iklan — tidak ada transaksi yang dikelola. Pembeli & penjual bertanggung jawab sepenuhnya. Re-Bali tidak menjamin keaslian atau kualitas barang. Jangan bayar sebelum melihat barang. Temui di tempat umum.",
  fr: "\n---\n⚠️ Re-Bali est uniquement une plateforme d'annonces — aucune transaction n'est gérée. L'acheteur et le vendeur sont seuls responsables. Re-Bali ne garantit ni l'authenticité ni la qualité des articles. Ne payez jamais avant d'avoir vu l'article. Rencontrez-vous dans un lieu public.",
  es: "\n---\n⚠️ Re-Bali es solo una plataforma de anuncios — no se gestionan transacciones. Comprador y vendedor son los únicos responsables. Re-Bali no garantiza la autenticidad ni la calidad de ningún artículo. Nunca pague antes de ver el artículo. Reúnase en un lugar público.",
  zh: "\n---\n⚠️ Re-Bali 仅是一个列表平台——不管理任何交易。买卖双方自行承担全部责任。Re-Bali 不保证任何物品的真实性或质量。付款前请务必亲眼查看物品。请在公共场所见面。",
  de: "\n---\n⚠️ Re-Bali ist nur eine Anzeigenplattform — es werden keine Transaktionen verwaltet. Käufer und Verkäufer sind allein verantwortlich. Re-Bali garantiert weder die Echtheit noch die Qualität der Artikel. Zahlen Sie nie, bevor Sie den Artikel gesehen haben. Treffen Sie sich an einem öffentlichen Ort.",
  nl: "\n---\n⚠️ Re-Bali is alleen een advertentieplatform — er worden geen transacties beheerd. Koper en verkoper zijn volledig zelf verantwoordelijk. Re-Bali garandeert de authenticiteit of kwaliteit van artikelen niet. Betaal nooit voordat u het artikel heeft gezien. Ontmoet elkaar op een openbare plek.",
  ru: "\n---\n⚠️ Re-Bali — это только платформа объявлений, транзакции не управляются. Покупатель и продавец несут полную ответственность. Re-Bali не гарантирует подлинность или качество товаров. Никогда не платите до осмотра товара. Встречайтесь в общественном месте.",
  tr: "\n---\n⚠️ Re-Bali yalnızca bir ilan platformudur — hiçbir işlem yönetilmez. Alıcı ve satıcı tamamen sorumludur. Re-Bali hiçbir ürünün orijinalliğini veya kalitesini garanti etmez. Ürünü görmeden asla ödeme yapmayın. Halka açık bir yerde buluşun.",
  ar: "\n---\n⚠️ Re-Bali هي منصة إعلانات فقط — لا تتم إدارة أي معاملات. المشتري والبائع مسؤولان بالكامل. لا تضمن Re-Bali أصالة أو جودة أي سلعة. لا تدفع أبدًا قبل رؤية السلعة. قابل في مكان عام.",
  hi: "\n---\n⚠️ Re-Bali केवल एक लिस्टिंग प्लेटफ़ॉर्म है — कोई लेन-देन प्रबंधित नहीं किया जाता। खरीदार और विक्रेता पूरी तरह जिम्मेदार हैं। Re-Bali किसी भी वस्तु की प्रामाणिकता या गुणवत्ता की गारंटी नहीं देता। वस्तु देखे बिना कभी भुगतान न करें। सार्वजनिक स्थान पर मिलें।",
  ja: "\n---\n⚠️ Re-Baliは掲載プラットフォームに過ぎず、取引の管理は行いません。買い手と売り手が全責任を負います。Re-Baliは商品の真正性や品質を保証しません。商品を確認する前に支払いをしないでください。公共の場所で会いましょう。",
};

function getSafetySuffix(lang: string): string {
  return SAFETY_SUFFIXES[lang] || SAFETY_SUFFIXES.en;
}

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

async function translateText(text: string, targetLang: string, sourceLang: string): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

async function sendFonnte(token: string, target: string, message: string) {
  const cleanTarget = target.replace(/[^0-9]/g, "");
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: cleanTarget, message, countryCode: "0" }),
  });
  return res.json();
}

// Generate next short code for a participant: A, B, C... Z, AA, AB...
function nextShortCode(existingCodes: string[]): string {
  const used = new Set(existingCodes.filter(Boolean));
  // Try single letters first
  for (let i = 0; i < 26; i++) {
    const code = String.fromCharCode(65 + i);
    if (!used.has(code)) return code;
  }
  // Then double letters
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      if (!used.has(code)) return code;
    }
  }
  return "ZZ";
}

// Assign short_code if missing, for the given role column
async function ensureShortCode(
  supabase: any,
  conversation: any,
  roleColumn: "seller_short_code" | "buyer_short_code",
  participantIdColumn: "seller_id" | "buyer_id"
): Promise<string> {
  if (conversation[roleColumn]) return conversation[roleColumn];

  // Get all existing codes for this participant
  const { data: existingConvs } = await supabase
    .from("conversations")
    .select(roleColumn)
    .eq(participantIdColumn, conversation[participantIdColumn])
    .eq("relay_status", "active");

  const existingCodes = (existingConvs || []).map((c: any) => c[roleColumn]);
  const code = nextShortCode(existingCodes);

  await supabase
    .from("conversations")
    .update({ [roleColumn]: code })
    .eq("id", conversation.id);

  conversation[roleColumn] = code;
  return code;
}

// Find seller's conversation by short_code
async function findConvByShortCode(
  supabase: any,
  sellerId: string,
  code: string,
  roleColumn: "seller_short_code" | "buyer_short_code"
): Promise<any | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, relay_status, buyer_phone, total_msg_count, buyer_msg_count, seller_msg_count, unlocked, seller_short_code, buyer_short_code")
    .eq(roleColumn === "seller_short_code" ? "seller_id" : "buyer_id", sellerId)
    .eq("relay_status", "active")
    .eq(roleColumn, code.toUpperCase())
    .maybeSingle();
  return data;
}

// Build help message listing active conversations for a participant
async function buildHelpMessage(
  supabase: any,
  participantId: string,
  roleColumn: "seller_short_code" | "buyer_short_code",
  participantIdColumn: "seller_id" | "buyer_id",
  otherIdColumn: "buyer_id" | "seller_id"
): Promise<string> {
  const { data: convs } = await supabase
    .from("conversations")
    .select(`id, listing_id, ${roleColumn}, ${otherIdColumn}`)
    .eq(participantIdColumn, participantId)
    .eq("relay_status", "active")
    .gt("total_msg_count", 0)
    .order("updated_at", { ascending: false });

  if (!convs || convs.length === 0) return "";

  const lines: string[] = [];
  for (const c of convs) {
    const { data: listing } = await supabase
      .from("listings")
      .select("title_original")
      .eq("id", c.listing_id)
      .single();

    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", c[otherIdColumn])
      .single();

    const code = c[roleColumn] || "?";
    const title = listing?.title_original || "?";
    const name = otherProfile?.display_name || "?";
    lines.push(`#${code} - ${title} (${name})`);
  }

  return `You have multiple active conversations. Prefix your reply with the code:\n${lines.join("\n")}`;
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

    // Try to parse token (buyer's first message)
    const tokenMatch = messageBody.match(/(?:ref:)?RB\|L=([a-f0-9-]+)\|B=([a-f0-9-]+)\|/i);

    let listingId: string | null = null;
    let buyerId: string | null = null;
    let cleanMessage = messageBody;

    if (tokenMatch) {
      listingId = tokenMatch[1];
      buyerId = tokenMatch[2];
      cleanMessage = messageBody.replace(tokenMatch[0], "").trim();
    }

    // If no token, try to find existing conversation by sender phone
    if (!listingId || !buyerId) {
      // Parse #X short_code prefix from message
      const codeMatch = cleanMessage.match(/^#([A-Za-z]{1,2})\s+/);
      const shortCode = codeMatch ? codeMatch[1].toUpperCase() : null;
      if (codeMatch) {
        cleanMessage = cleanMessage.replace(codeMatch[0], "").trim();
      }

      // Check if sender is a buyer (by buyer_phone)
      const { data: buyerConvs } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, relay_status, buyer_phone, total_msg_count, buyer_msg_count, seller_msg_count, unlocked, seller_short_code, buyer_short_code")
        .eq("buyer_phone", sender)
        .eq("relay_status", "active")
        .gt("total_msg_count", 0)
        .order("updated_at", { ascending: false });

      // Check if sender is a seller (by phone/whatsapp in profiles)
      const { data: allWaProfiles } = await supabase
        .from("profiles")
        .select("id, phone, whatsapp")
        .not("whatsapp", "is", null);

      const sellerProfile = allWaProfiles?.find((p: any) => {
        const normPhone = (p.phone || "").replace(/[^0-9]/g, "");
        const normWa = (p.whatsapp || "").replace(/[^0-9]/g, "");
        return normPhone === sender || normWa === sender;
      }) || null;

      let sellerConvs: any[] = [];
      if (sellerProfile) {
        const { data } = await supabase
          .from("conversations")
          .select("id, listing_id, buyer_id, seller_id, relay_status, buyer_phone, total_msg_count, buyer_msg_count, seller_msg_count, unlocked, seller_short_code, buyer_short_code")
          .eq("seller_id", sellerProfile.id)
          .eq("relay_status", "active")
          .gt("total_msg_count", 0)
          .order("updated_at", { ascending: false });
        sellerConvs = data || [];
      }

      const hasBuyerConvs = buyerConvs && buyerConvs.length > 0;
      const hasSellerConvs = sellerConvs.length > 0;

      // If sender has conversations as both buyer and seller, use the code to disambiguate
      // Try seller first if code matches, then buyer
      if (shortCode) {
        // Try seller conv with this code
        if (hasSellerConvs) {
          const match = sellerConvs.find((c: any) => c.seller_short_code === shortCode);
          if (match) {
            return await handleRelay(supabase, FONNTE_TOKEN, match, sender, cleanMessage, "seller");
          }
        }
        // Try buyer conv with this code
        if (hasBuyerConvs) {
          const match = buyerConvs.find((c: any) => c.buyer_short_code === shortCode);
          if (match) {
            return await handleRelay(supabase, FONNTE_TOKEN, match, sender, cleanMessage, "buyer");
          }
        }
        // Code didn't match anything — send help
        const helpParts: string[] = [];
        if (hasSellerConvs) {
          const h = await buildHelpMessage(supabase, sellerProfile!.id, "seller_short_code", "seller_id", "buyer_id");
          if (h) helpParts.push("As seller:\n" + h);
        }
        if (hasBuyerConvs) {
          const buyerUserId = buyerConvs[0].buyer_id;
          const h = await buildHelpMessage(supabase, buyerUserId, "buyer_short_code", "buyer_id", "seller_id");
          if (h) helpParts.push("As buyer:\n" + h);
        }
        if (helpParts.length > 0) {
          await sendFonnte(FONNTE_TOKEN, sender, `⚠️ Code #${shortCode} not found.\n\n${helpParts.join("\n\n")}`);
        }
        return new Response(JSON.stringify({ status: "invalid_code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // No code provided
      // If only one conversation total, route automatically
      const totalConvs = (buyerConvs?.length || 0) + sellerConvs.length;

      if (totalConvs === 0) {
        console.log("Ignoring message from", sender, "— no token, no active conversation");
        return new Response(JSON.stringify({ status: "no_token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (totalConvs === 1) {
        if (hasSellerConvs) {
          return await handleRelay(supabase, FONNTE_TOKEN, sellerConvs[0], sender, cleanMessage, "seller");
        } else {
          return await handleRelay(supabase, FONNTE_TOKEN, buyerConvs![0], sender, cleanMessage, "buyer");
        }
      }

      // Multiple conversations — send help message
      const helpParts: string[] = [];
      if (hasSellerConvs) {
        // Ensure all seller convs have short codes
        for (const c of sellerConvs) {
          await ensureShortCode(supabase, c, "seller_short_code", "seller_id");
        }
        const h = await buildHelpMessage(supabase, sellerProfile!.id, "seller_short_code", "seller_id", "buyer_id");
        if (h) helpParts.push(h);
      }
      if (hasBuyerConvs) {
        const buyerUserId = buyerConvs[0].buyer_id;
        for (const c of buyerConvs) {
          await ensureShortCode(supabase, c, "buyer_short_code", "buyer_id");
        }
        const h = await buildHelpMessage(supabase, buyerUserId, "buyer_short_code", "buyer_id", "seller_id");
        if (h) helpParts.push(h);
      }

      await sendFonnte(FONNTE_TOKEN, sender, helpParts.join("\n\n"));
      return new Response(JSON.stringify({ status: "needs_code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Token-based flow (buyer's first/subsequent message with token) ===

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
      .select("*, seller_short_code, buyer_short_code")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();

    let conversation = existingConv;
    if (!conversation) {
      // Assign short codes at creation
      const [{ data: sellerExisting }, { data: buyerExisting }] = await Promise.all([
        supabase
          .from("conversations")
          .select("seller_short_code")
          .eq("seller_id", listing.seller_id)
          .eq("relay_status", "active"),
        supabase
          .from("conversations")
          .select("buyer_short_code")
          .eq("buyer_id", buyerId)
          .eq("relay_status", "active"),
      ]);

      const sellerCode = nextShortCode((sellerExisting || []).map((c: any) => c.seller_short_code));
      const buyerCode = nextShortCode((buyerExisting || []).map((c: any) => c.buyer_short_code));

      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: listing.seller_id,
          buyer_phone: sender,
          relay_status: "active",
          seller_short_code: sellerCode,
          buyer_short_code: buyerCode,
        })
        .select("*, seller_short_code, buyer_short_code")
        .single();
      conversation = newConv;
    } else if (!conversation.buyer_phone) {
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

    // Ensure short codes exist (for older conversations)
    await Promise.all([
      ensureShortCode(supabase, conversation, "seller_short_code", "seller_id"),
      ensureShortCode(supabase, conversation, "buyer_short_code", "buyer_id"),
    ]);

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
        await sendFonnte(
          FONNTE_TOKEN,
          sender,
          "✅ Message envoyé. ⚠️ Attention : le numéro d'expédition n'est pas celui renseigné dans votre profil. Vous recevrez la réponse sur le numéro enregistré dans votre profil Re-Bali."
        );

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
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
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

  // Ensure short codes exist
  await Promise.all([
    ensureShortCode(supabase, conversation, "seller_short_code", "seller_id"),
    ensureShortCode(supabase, conversation, "buyer_short_code", "buyer_id"),
  ]);

  // Save original message in DB
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

  // Get both profiles
  const [senderProfileRes, recipientProfileRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("phone, whatsapp, display_name, preferred_lang")
      .eq("id", role === "buyer" ? conversation.buyer_id : conversation.seller_id)
      .single(),
    supabase
      .from("profiles")
      .select("phone, whatsapp, display_name, preferred_lang")
      .eq("id", role === "buyer" ? conversation.seller_id : conversation.buyer_id)
      .single(),
  ]);

  const senderProfile = senderProfileRes.data;
  const recipientProfile = recipientProfileRes.data;

  const senderLang = senderProfile?.preferred_lang || "en";
  const recipientLang = recipientProfile?.preferred_lang || "en";

  // Determine target phone
  let targetPhone: string;
  if (role === "buyer") {
    targetPhone = (recipientProfile?.whatsapp || recipientProfile?.phone || "").replace(/[^\d+]/g, "");
    if (!targetPhone) {
      return new Response(JSON.stringify({ status: "no_seller_phone" }), {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }
  } else {
    targetPhone = conversation.buyer_phone || "";
    if (!targetPhone) {
      return new Response(JSON.stringify({ status: "no_buyer_phone" }), {
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }
  }

  // Translate message
  const translatedMessage = await translateText(message, recipientLang, senderLang);

  // Build prefix with short code for the RECIPIENT
  // If sending to seller, use seller_short_code; if sending to buyer, use buyer_short_code
  const recipientCode = role === "buyer" ? conversation.seller_short_code : conversation.buyer_short_code;
  const prefix = `[#${recipientCode}] 📦 Re-Bali (${listingTitle}):\n`;

  await sendFonnte(FONNTE_TOKEN, targetPhone, prefix + translatedMessage + getSafetySuffix(recipientLang));

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
    const { data: sellerCheck } = await supabase
      .from("profiles")
      .select("phone_verified, is_banned, phone, whatsapp")
      .eq("id", conversation.seller_id)
      .single();

    const { data: buyerCheck } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", conversation.buyer_id)
      .single();

    if (
      sellerCheck?.phone_verified &&
      !sellerCheck?.is_banned &&
      !buyerCheck?.is_banned
    ) {
      await supabase
        .from("conversations")
        .update({ unlocked: true, unlocked_at: new Date().toISOString() })
        .eq("id", conversation.id);

      const sellerRealPhone = sellerCheck.whatsapp || sellerCheck.phone || "";
      const sellerPhoneClean = sellerRealPhone.replace(/[^\d+]/g, "");

      const unlockMsgBuyer = `🔓 Re-Bali: Conversation unlocked! You can now contact the seller directly: ${sellerRealPhone}`;
      const unlockMsgSeller = `🔓 Re-Bali: Conversation unlocked! The buyer can now see your phone number. You can continue chatting directly.`;

      const buyerPhone = conversation.buyer_phone;
      await Promise.all([
        sendFonnte(FONNTE_TOKEN, buyerPhone, unlockMsgBuyer),
        sendFonnte(FONNTE_TOKEN, sellerPhoneClean, unlockMsgSeller),
      ]);

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
