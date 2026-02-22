import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
    if (!FONNTE_TOKEN) {
      return new Response(JSON.stringify({ error: "FONNTE_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone_number, user_id, lang } = await req.json();
    if (!phone_number || !user_id) {
      return new Response(JSON.stringify({ error: "phone_number and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone is banned
    const { data: banned } = await supabase
      .from("banned_devices")
      .select("id")
      .eq("phone_number", phone_number)
      .limit(1);

    if (banned && banned.length > 0) {
      return new Response(JSON.stringify({ error: "phone_banned" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone already used by another account
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("whatsapp", phone_number)
      .neq("id", user_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "phone_already_used" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limit: max 3 attempts in last 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("phone_verifications")
      .select("id")
      .eq("user_id", user_id)
      .gte("created_at", fifteenMinAgo);

    if (recent && recent.length >= 3) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Hash OTP with SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Store in phone_verifications
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.from("phone_verifications").insert({
      user_id,
      phone_number,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    // OTP messages per language
    const otpMessages: Record<string, (code: string) => string> = {
      en: (c) => `Your Re-Bali verification code: ${c}. Valid for 5 minutes.`,
      id: (c) => `Kode verifikasi Re-Bali Anda: ${c}. Berlaku selama 5 menit.`,
      fr: (c) => `Votre code de vérification Re-Bali : ${c}. Valable 5 minutes.`,
      es: (c) => `Tu código de verificación Re-Bali: ${c}. Válido por 5 minutos.`,
      zh: (c) => `您的 Re-Bali 验证码：${c}。有效期5分钟。`,
      de: (c) => `Ihr Re-Bali-Verifizierungscode: ${c}. Gültig für 5 Minuten.`,
      nl: (c) => `Uw Re-Bali verificatiecode: ${c}. Geldig voor 5 minuten.`,
      ru: (c) => `Ваш код подтверждения Re-Bali: ${c}. Действителен 5 минут.`,
      tr: (c) => `Re-Bali doğrulama kodunuz: ${c}. 5 dakika geçerlidir.`,
      ar: (c) => `رمز التحقق الخاص بك في Re-Bali: ${c}. صالح لمدة 5 دقائق.`,
      hi: (c) => `आपका Re-Bali सत्यापन कोड: ${c}। 5 मिनट के लिए मान्य।`,
      ja: (c) => `Re-Bali 認証コード: ${c}。5分間有効です。`,
    };
    const msgFn = otpMessages[lang || "en"] || otpMessages.en;

    // Send via Fonnte
    const formData = new FormData();
    formData.append("target", phone_number);
    formData.append("message", msgFn(otp));
    formData.append("countryCode", "62");

    const fonntRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: FONNTE_TOKEN },
      body: formData,
    });

    const fonntData = await fonntRes.json();

    if (!fonntRes.ok || fonntData.status === false) {
      return new Response(JSON.stringify({ error: "sms_send_failed", details: fonntData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
