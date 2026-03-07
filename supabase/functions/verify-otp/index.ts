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

    // Validate referral if this user was referred
    try {
      const { data: referral } = await supabase.from("referrals")
        .select("id")
        .eq("referred_id", user_id)
        .eq("status", "pending")
        .limit(1);

      if (referral && referral.length > 0) {
        // Call manage-points to validate the referral
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
