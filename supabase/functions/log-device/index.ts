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

    const { device_hash, user_agent, user_id } = await req.json();
    if (!device_hash || !user_id) {
      return new Response(JSON.stringify({ error: "device_hash and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if device is banned
    const { data: banned } = await supabase
      .from("banned_devices")
      .select("id")
      .eq("device_hash", device_hash)
      .limit(1);

    if (banned && banned.length > 0) {
      return new Response(JSON.stringify({ error: "device_banned" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract IP from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") ||
               "unknown";

    // Parse user agent for OS/browser
    const ua = user_agent || "";
    let os = "unknown";
    let browser = "unknown";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";

    // Check VPN via ipinfo.io (optional)
    let isVpn = false;
    const IPINFO_TOKEN = Deno.env.get("IPINFO_TOKEN");
    if (IPINFO_TOKEN && ip !== "unknown") {
      try {
        const ipRes = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`);
        const ipData = await ipRes.json();
        // ipinfo privacy detection
        if (ipData.privacy) {
          isVpn = ipData.privacy.vpn || ipData.privacy.proxy || ipData.privacy.hosting || false;
        }
        // Also check if org suggests datacenter
        if (ipData.org && /hosting|datacenter|cloud|vpn/i.test(ipData.org)) {
          isVpn = true;
        }
      } catch {
        // Silently fail - VPN detection is optional
      }
    }

    // Store device info
    await supabase.from("user_devices").insert({
      user_id,
      device_hash,
      ip_address: ip,
      user_agent: ua,
      os,
      browser,
      is_vpn: isVpn,
    });

    // Check for multi-account: same IP created 2+ accounts in 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: sameIpDevices } = await supabase
      .from("user_devices")
      .select("user_id")
      .eq("ip_address", ip)
      .gte("created_at", dayAgo);

    const uniqueUsers = new Set(sameIpDevices?.map((d: any) => d.user_id));
    const multiAccount = uniqueUsers.size >= 2;

    // Flag risk if VPN or multi-account
    if (isVpn || multiAccount) {
      const riskLevel = isVpn && multiAccount ? "high" : "medium";
      await supabase
        .from("profiles")
        .update({ risk_level: riskLevel })
        .eq("id", user_id);
    }

    return new Response(JSON.stringify({ success: true, is_vpn: isVpn, multi_account: multiAccount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
