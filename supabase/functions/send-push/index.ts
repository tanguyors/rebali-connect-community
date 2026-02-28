import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push implementation using web-push library
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    webpush.setVapidDetails(
      "mailto:contact@re-bali.com",
      vapidPublic,
      vapidPrivate
    );

    const { user_id, title, body, url, tag } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/",
      tag: tag || "rebali",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    });

    let sent = 0;
    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        sent++;
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint}:`, err?.statusCode || err);
        // 404 or 410 = subscription expired, clean up
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
      console.log(`Cleaned ${staleIds.length} stale push subscriptions`);
    }

    console.log(`Push sent to ${sent}/${subscriptions.length} devices for user ${user_id}`);

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
