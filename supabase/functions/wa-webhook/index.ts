import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://re-bali.com";

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
      return new Response(JSON.stringify({ status: "banned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the sender's profile by phone/whatsapp
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, phone, whatsapp, preferred_lang")
      .or("phone.not.is.null,whatsapp.not.is.null");

    const senderProfile = allProfiles?.find((p: any) => {
      const normPhone = (p.phone || "").replace(/[^0-9]/g, "");
      const normWa = (p.whatsapp || "").replace(/[^0-9]/g, "");
      return normPhone === sender || normWa === sender;
    }) || null;

    // Also check buyer_phone on conversations
    const { data: buyerConvs } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, listing_id")
      .eq("buyer_phone", sender)
      .eq("relay_status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    // Find most recent conversation for this sender
    let conversation: any = null;
    let senderId: string | null = null;

    if (senderProfile) {
      // Check conversations where sender is buyer or seller
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, buyer_id, seller_id, listing_id")
        .or(`buyer_id.eq.${senderProfile.id},seller_id.eq.${senderProfile.id}`)
        .eq("relay_status", "active")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (convs && convs.length > 0) {
        conversation = convs[0];
        senderId = senderProfile.id;
      }
    }

    // Fallback: check by buyer_phone
    if (!conversation && buyerConvs && buyerConvs.length > 0) {
      conversation = buyerConvs[0];
      senderId = buyerConvs[0].buyer_id;
    }

    if (!conversation || !senderId) {
      console.log("Ignoring message from", sender, "— no active conversation found");
      return new Response(JSON.stringify({ status: "no_conversation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the message into the in-app chat
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: senderId,
      content: messageBody,
      from_role: "whatsapp",
    });

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Reply telling them to use the app
    const lang = senderProfile?.preferred_lang || "en";
    const replyMsg = getRedirectMessage(lang, conversation.id);
    await sendFonnte(FONNTE_TOKEN, sender, replyMsg);

    return new Response(JSON.stringify({ status: "relayed_to_app" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wa-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getRedirectMessage(lang: string, convId: string): string {
  const link = `${APP_URL}/messages?conv=${convId}`;
  const messages: Record<string, string> = {
    en: `✅ Your message has been received and added to your conversation on Re-Bali.\n\n💬 Reply directly in the app for a better experience:\n${link}`,
    fr: `✅ Votre message a été reçu et ajouté à votre conversation sur Re-Bali.\n\n💬 Répondez directement dans l'app pour une meilleure expérience :\n${link}`,
    id: `✅ Pesan Anda telah diterima dan ditambahkan ke percakapan Anda di Re-Bali.\n\n💬 Balas langsung di aplikasi untuk pengalaman yang lebih baik:\n${link}`,
    es: `✅ Su mensaje ha sido recibido y añadido a su conversación en Re-Bali.\n\n💬 Responda directamente en la app para una mejor experiencia:\n${link}`,
    zh: `✅ 您的消息已收到并添加到您在 Re-Bali 上的对话中。\n\n💬 直接在应用中回复以获得更好的体验：\n${link}`,
    de: `✅ Ihre Nachricht wurde empfangen und zu Ihrer Unterhaltung auf Re-Bali hinzugefügt.\n\n💬 Antworten Sie direkt in der App für ein besseres Erlebnis:\n${link}`,
    nl: `✅ Uw bericht is ontvangen en toegevoegd aan uw gesprek op Re-Bali.\n\n💬 Antwoord direct in de app voor een betere ervaring:\n${link}`,
    ru: `✅ Ваше сообщение получено и добавлено в ваш разговор на Re-Bali.\n\n💬 Отвечайте прямо в приложении для лучшего опыта:\n${link}`,
    tr: `✅ Mesajınız alındı ve Re-Bali'deki sohbetinize eklendi.\n\n💬 Daha iyi bir deneyim için doğrudan uygulamada yanıtlayın:\n${link}`,
    ar: `✅ تم استلام رسالتك وإضافتها إلى محادثتك على Re-Bali.\n\n💬 قم بالرد مباشرة في التطبيق لتجربة أفضل:\n${link}`,
    hi: `✅ आपका संदेश प्राप्त हुआ और Re-Bali पर आपकी बातचीत में जोड़ा गया।\n\n💬 बेहतर अनुभव के लिए सीधे ऐप में जवाब दें:\n${link}`,
    ja: `✅ メッセージを受信し、Re-Baliの会話に追加しました。\n\n💬 より良い体験のためにアプリで直接返信してください：\n${link}`,
  };
  return messages[lang] || messages.en;
}
