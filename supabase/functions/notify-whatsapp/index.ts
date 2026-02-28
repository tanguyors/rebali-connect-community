import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_MAP: Record<string, string> = {
  en: "en", id: "id", fr: "fr", es: "es", zh: "zh-CN", de: "de",
  nl: "nl", ru: "ru", tr: "tr", ar: "ar", hi: "hi", ja: "ja",
};

async function translateText(text: string, targetLang: string, sourceLang = "auto"): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    const tl = LANG_MAP[targetLang] || targetLang;
    const sl = sourceLang === "auto" ? "auto" : (LANG_MAP[sourceLang] || sourceLang);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

// Pre-translated notification templates
const NOTIF_TEMPLATES: Record<string, { newMsg: string; from: string; reply: string }> = {
  en: { newMsg: "New message on Re-Bali for", from: "", reply: "Reply here" },
  fr: { newMsg: "Nouveau message sur Re-Bali pour", from: "", reply: "Répondre ici" },
  id: { newMsg: "Pesan baru di Re-Bali untuk", from: "", reply: "Balas di sini" },
  es: { newMsg: "Nuevo mensaje en Re-Bali para", from: "", reply: "Responder aquí" },
  de: { newMsg: "Neue Nachricht auf Re-Bali für", from: "", reply: "Hier antworten" },
  nl: { newMsg: "Nieuw bericht op Re-Bali voor", from: "", reply: "Antwoord hier" },
  ru: { newMsg: "Новое сообщение на Re-Bali для", from: "", reply: "Ответить здесь" },
  zh: { newMsg: "Re-Bali上的新消息，关于", from: "", reply: "在此回复" },
  tr: { newMsg: "Re-Bali'de yeni mesaj:", from: "", reply: "Buradan yanıtlayın" },
  ar: { newMsg: "رسالة جديدة على Re-Bali بخصوص", from: "", reply: "الرد هنا" },
  hi: { newMsg: "Re-Bali पर नया संदेश:", from: "", reply: "यहाँ उत्तर दें" },
  ja: { newMsg: "Re-Baliの新着メッセージ：", from: "", reply: "ここで返信" },
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

    // Get recipient's WhatsApp number AND preferred language
    const { data: recipient } = await supabase
      .from("profiles")
      .select("whatsapp, display_name, preferred_lang")
      .eq("id", recipientId)
      .single();

    if (!recipient?.whatsapp || !fonnte) {
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

    const recipientLang = recipient.preferred_lang || "en";
    const tmpl = NOTIF_TEMPLATES[recipientLang] || NOTIF_TEMPLATES.en;

    const listingTitle = (conv as any).listings?.title_original || "an item";
    const senderName = sender?.display_name || "Someone";

    // Translate message preview to recipient's language
    let preview = "";
    if (message_preview) {
      const translatedPreview = await translateText(message_preview, recipientLang);
      const truncated = translatedPreview.substring(0, 100) + (translatedPreview.length > 100 ? "..." : "");
      preview = `"${truncated}"`;
    }

    // Get the first image of the listing
    const { data: listingImage } = await supabase
      .from("listing_images")
      .select("storage_path")
      .eq("listing_id", conv.listing_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .single();

    const imageUrl = listingImage
      ? `${supabaseUrl}/storage/v1/object/public/listings/${listingImage.storage_path}`
      : "";

    // Conversation link for replying
    const convLink = `https://re-bali.com/messages?conv=${conversation_id}`;

    const waMessage = `📩 ${tmpl.newMsg} "${listingTitle}"

${senderName}: ${preview}

${tmpl.reply}: ${convLink}`;

    // Send via Fonnte using FormData for proper image attachment
    const cleanTarget = recipient.whatsapp.replace(/[^0-9]/g, "");
    const formData = new FormData();
    formData.append("target", cleanTarget);
    formData.append("message", waMessage);
    formData.append("countryCode", "0");
    if (imageUrl) {
      formData.append("url", imageUrl);
    }

    console.log("Sending to Fonnte with imageUrl:", imageUrl, "target:", cleanTarget);

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnte,
      },
      body: formData,
    });
    const fonnteResult = await fonnteRes.json();
    console.log("Fonnte response:", JSON.stringify(fonnteResult));

    // Send push notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          user_id: recipientId,
          title: `📩 ${senderName}`,
          body: message_preview ? message_preview.substring(0, 100) : listingTitle,
          url: `/messages?conv=${conversation_id}`,
          tag: `msg-${conversation_id}`,
        }),
      });
    } catch (pushErr) {
      console.error("Push notification error:", pushErr);
    }

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
