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

    // Find the sender's profile to get their language
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, phone, whatsapp, preferred_lang")
      .or("phone.not.is.null,whatsapp.not.is.null");

    const senderProfile = allProfiles?.find((p: any) => {
      const normPhone = (p.phone || "").replace(/[^0-9]/g, "");
      const normWa = (p.whatsapp || "").replace(/[^0-9]/g, "");
      return normPhone === sender || normWa === sender;
    }) || null;

    // Send a message telling them to use the app — do NOT insert into conversations
    const lang = senderProfile?.preferred_lang || "en";
    const replyMsg = getUseAppMessage(lang);
    await sendFonnte(FONNTE_TOKEN, sender, replyMsg);

    return new Response(JSON.stringify({ status: "redirected_to_app" }), {
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

function getUseAppMessage(lang: string): string {
  const messages: Record<string, string> = {
    en: `⚠️ Replies via WhatsApp are not supported.\n\n💬 Please use the Re-Bali app to read and reply to your messages:\n${APP_URL}/messages`,
    fr: `⚠️ Les réponses via WhatsApp ne sont pas prises en charge.\n\n💬 Utilisez l'application Re-Bali pour lire et répondre à vos messages :\n${APP_URL}/messages`,
    id: `⚠️ Balasan melalui WhatsApp tidak didukung.\n\n💬 Gunakan aplikasi Re-Bali untuk membaca dan membalas pesan Anda:\n${APP_URL}/messages`,
    es: `⚠️ Las respuestas por WhatsApp no son compatibles.\n\n💬 Use la app Re-Bali para leer y responder sus mensajes:\n${APP_URL}/messages`,
    zh: `⚠️ 不支持通过WhatsApp回复。\n\n💬 请使用Re-Bali应用阅读和回复消息：\n${APP_URL}/messages`,
    de: `⚠️ Antworten über WhatsApp werden nicht unterstützt.\n\n💬 Nutzen Sie die Re-Bali-App zum Lesen und Beantworten:\n${APP_URL}/messages`,
    nl: `⚠️ Antwoorden via WhatsApp worden niet ondersteund.\n\n💬 Gebruik de Re-Bali-app om berichten te lezen en beantwoorden:\n${APP_URL}/messages`,
    ru: `⚠️ Ответы через WhatsApp не поддерживаются.\n\n💬 Используйте приложение Re-Bali для чтения и ответа:\n${APP_URL}/messages`,
    tr: `⚠️ WhatsApp üzerinden yanıtlar desteklenmiyor.\n\n💬 Mesajlarınızı okumak ve yanıtlamak için Re-Bali uygulamasını kullanın:\n${APP_URL}/messages`,
    ar: `⚠️ الردود عبر واتساب غير مدعومة.\n\n💬 استخدم تطبيق Re-Bali لقراءة الرسائل والرد عليها:\n${APP_URL}/messages`,
    hi: `⚠️ WhatsApp के जरिए जवाब समर्थित नहीं हैं।\n\n💬 संदेश पढ़ने और जवाब देने के लिए Re-Bali ऐप का उपयोग करें:\n${APP_URL}/messages`,
    ja: `⚠️ WhatsAppでの返信はサポートされていません。\n\n💬 メッセージの閲覧と返信にはRe-Baliアプリをご利用ください：\n${APP_URL}/messages`,
  };
  return messages[lang] || messages.en;
}
