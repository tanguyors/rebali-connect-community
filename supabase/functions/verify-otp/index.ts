import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone_number, otp_code, user_id } = await req.json();
    if (!phone_number || !otp_code || !user_id) {
      return new Response(JSON.stringify({ error: "phone_number, otp_code and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get latest non-expired verification for this user + phone
    const { data: verifications } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("user_id", user_id)
      .eq("phone_number", phone_number)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (!verifications || verifications.length === 0) {
      return new Response(JSON.stringify({ error: "no_valid_otp" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verification = verifications[0];

    if (verification.attempts >= 3) {
      return new Response(JSON.stringify({ error: "max_attempts" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the provided OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(otp_code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (otpHash !== verification.otp_hash) {
      // Increment attempts
      await supabase
        .from("phone_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);

      return new Response(JSON.stringify({ error: "invalid_otp", attempts_left: 2 - verification.attempts }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OTP correct - mark as verified
    await supabase
      .from("phone_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    // Update profile — normalize whatsapp number (keep + prefix, strip spaces/dashes)
    const normalizedPhone = phone_number.replace(/[^\d+]/g, "");
    await supabase
      .from("profiles")
      .update({ phone_verified: true, whatsapp: normalizedPhone })
      .eq("id", user_id);

    // Get user profile for referral code and language
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, preferred_lang")
      .eq("id", user_id)
      .single();

    const userLang = profile?.preferred_lang || "en";
    const refCode = profile?.referral_code || "";
    const refLink = `https://re-bali.com/auth?tab=signup&ref=${refCode}`;

    // Validate referral if this user was referred
    try {
      const { data: referral } = await supabase.from("referrals")
        .select("id")
        .eq("referred_id", user_id)
        .eq("status", "pending")
        .limit(1);

      if (referral && referral.length > 0) {
        const authHeader = req.headers.get("authorization") || "";
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-points`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader || `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ action: "validate_referral" }),
          }
        );
      }
    } catch (e) {
      console.error("referral validation error (non-blocking):", e);
    }

    // Send promotional WhatsApp message with referral info (non-blocking)
    try {
      const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
      if (FONNTE_TOKEN && refCode) {
        const promoMessages: Record<string, (code: string, link: string) => string> = {
          en: (c, l) => `🎉 *EARN POINTS ON RE-BALI!*\n\nYour WhatsApp is now verified! ✅\n\nInvite up to *12 friends* and earn *50 points for every 3 friends* who verify their WhatsApp! That's up to *200 points*! 🎯\n\n🎁 Your invitation code: *${c}*\n\n📲 Share this link:\n${l}\n\nStart earning points and unlock exclusive rewards! 🚀`,
          id: (c, l) => `🎉 *DAPATKAN POIN DI RE-BALI!*\n\nWhatsApp Anda sudah terverifikasi! ✅\n\nUndang hingga *12 teman* dan dapatkan *50 poin untuk setiap 3 teman* yang memverifikasi WhatsApp mereka! Hingga *200 poin*! 🎯\n\n🎁 Kode undangan Anda: *${c}*\n\n📲 Bagikan link ini:\n${l}\n\nMulai kumpulkan poin dan dapatkan hadiah eksklusif! 🚀`,
          fr: (c, l) => `🎉 *GAGNEZ DES POINTS SUR RE-BALI !*\n\nVotre WhatsApp est maintenant vérifié ! ✅\n\nInvitez jusqu'à *12 amis* et gagnez *50 points pour chaque 3 amis* qui vérifient leur WhatsApp ! Soit jusqu'à *200 points* ! 🎯\n\n🎁 Votre code d'invitation : *${c}*\n\n📲 Partagez ce lien :\n${l}\n\nCommencez à gagner des points et débloquez des récompenses exclusives ! 🚀`,
          es: (c, l) => `🎉 *¡GANA PUNTOS EN RE-BALI!*\n\n¡Tu WhatsApp ya está verificado! ✅\n\nInvita hasta *12 amigos* y gana *50 puntos por cada 3 amigos* que verifiquen su WhatsApp. ¡Hasta *200 puntos*! 🎯\n\n🎁 Tu código de invitación: *${c}*\n\n📲 Comparte este enlace:\n${l}\n\n¡Empieza a ganar puntos y desbloquea recompensas exclusivas! 🚀`,
          de: (c, l) => `🎉 *PUNKTE VERDIENEN AUF RE-BALI!*\n\nIhr WhatsApp ist jetzt verifiziert! ✅\n\nLaden Sie bis zu *12 Freunde* ein und verdienen Sie *50 Punkte für je 3 Freunde*, die ihr WhatsApp verifizieren! Bis zu *200 Punkte*! 🎯\n\n🎁 Ihr Einladungscode: *${c}*\n\n📲 Teilen Sie diesen Link:\n${l}\n\nSammeln Sie Punkte und schalten Sie exklusive Belohnungen frei! 🚀`,
          nl: (c, l) => `🎉 *VERDIEN PUNTEN OP RE-BALI!*\n\nJe WhatsApp is nu geverifieerd! ✅\n\nNodig tot *12 vrienden* uit en verdien *50 punten voor elke 3 vrienden* die hun WhatsApp verifiëren! Tot *200 punten*! 🎯\n\n🎁 Jouw uitnodigingscode: *${c}*\n\n📲 Deel deze link:\n${l}\n\nBegin punten te verdienen en ontgrendel exclusieve beloningen! 🚀`,
          ru: (c, l) => `🎉 *ЗАРАБАТЫВАЙТЕ БАЛЛЫ НА RE-BALI!*\n\nВаш WhatsApp подтверждён! ✅\n\nПриглашайте до *12 друзей* и получайте *50 баллов за каждых 3 друзей*, которые подтвердят свой WhatsApp! До *200 баллов*! 🎯\n\n🎁 Ваш код приглашения: *${c}*\n\n📲 Поделитесь ссылкой:\n${l}\n\nНачните зарабатывать баллы и открывайте эксклюзивные награды! 🚀`,
          zh: (c, l) => `🎉 *在 RE-BALI 赚取积分！*\n\n您的 WhatsApp 已验证！✅\n\n邀请最多 *12 位朋友*，每 *3 位朋友* 验证 WhatsApp 即可获得 *50 积分*！最多 *200 积分*！🎯\n\n🎁 您的邀请码：*${c}*\n\n📲 分享链接：\n${l}\n\n开始赚取积分，解锁专属奖励！🚀`,
          ar: (c, l) => `🎉 *اكسب نقاطاً على RE-BALI!*\n\nتم التحقق من WhatsApp الخاص بك! ✅\n\nادعُ حتى *12 صديقاً* واكسب *50 نقطة لكل 3 أصدقاء* يتحققون من WhatsApp! حتى *200 نقطة*! 🎯\n\n🎁 رمز الدعوة الخاص بك: *${c}*\n\n📲 شارك هذا الرابط:\n${l}\n\nابدأ بكسب النقاط واحصل على مكافآت حصرية! 🚀`,
          hi: (c, l) => `🎉 *RE-BALI पर पॉइंट्स कमाएं!*\n\nआपका WhatsApp सत्यापित हो गया है! ✅\n\n*12 दोस्तों* तक को आमंत्रित करें और हर *3 दोस्तों* के WhatsApp सत्यापित करने पर *50 पॉइंट्स* कमाएं! *200 पॉइंट्स* तक! 🎯\n\n🎁 आपका आमंत्रण कोड: *${c}*\n\n📲 यह लिंक शेयर करें:\n${l}\n\nपॉइंट्स कमाना शुरू करें और विशेष पुरस्कार अनलॉक करें! 🚀`,
          ja: (c, l) => `🎉 *RE-BALIでポイントを獲得！*\n\nWhatsAppが認証されました！✅\n\n最大*12人の友達*を招待して、*3人が認証するごとに50ポイント*獲得！最大*200ポイント*！🎯\n\n🎁 あなたの招待コード：*${c}*\n\n📲 このリンクを共有：\n${l}\n\nポイントを貯めて限定特典をゲット！🚀`,
          tr: (c, l) => `🎉 *RE-BALI'DE PUAN KAZANIN!*\n\nWhatsApp'ınız doğrulandı! ✅\n\n*12 arkadaşınıza* kadar davet edin ve WhatsApp'ını doğrulayan her *3 arkadaş* için *50 puan* kazanın! *200 puana* kadar! 🎯\n\n🎁 Davet kodunuz: *${c}*\n\n📲 Bu linki paylaşın:\n${l}\n\nPuan kazanmaya başlayın ve özel ödüllerin kilidini açın! 🚀`,
        };

        const msgFn = promoMessages[userLang] || promoMessages.en;
        const cleanTarget = phone_number.replace(/[^0-9]/g, "");
        const formData = new FormData();
        formData.append("target", cleanTarget);
        formData.append("message", msgFn(refCode, refLink));
        formData.append("countryCode", "0");

        await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: FONNTE_TOKEN },
          body: formData,
        });
      }
    } catch (e) {
      console.error("promo message error (non-blocking):", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
