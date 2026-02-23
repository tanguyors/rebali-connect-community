import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const listingId = url.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing id", { status: 400 });
  }

  const siteUrl = "https://re-bali.com";
  const canonicalUrl = `${siteUrl}/listing/${listingId}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch listing + first image
  const { data: listing } = await supabase
    .from("listings")
    .select("title_original, description_original, price, currency, category, location_area")
    .eq("id", listingId)
    .eq("status", "active")
    .single();

  if (!listing) {
    // Redirect to home if listing not found
    return Response.redirect(siteUrl, 302);
  }

  const { data: img } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  const imageUrl = img
    ? `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/listings/${img.storage_path}`
    : `${siteUrl}/pwa-512x512.png`;

  const title = listing.title_original.slice(0, 60);
  const description = listing.description_original.slice(0, 160);
  const priceText =
    listing.price > 0
      ? `${new Intl.NumberFormat(listing.currency === "IDR" ? "id-ID" : "en-US", { style: "currency", currency: listing.currency, maximumFractionDigits: listing.currency === "IDR" ? 0 : 2 }).format(listing.price)}`
      : "Free";

  // Detect bots/crawlers — serve OG tags without redirect
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isBot = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|googlebot|bingbot|bot|crawl|spider/i.test(ua);

  // Real users get an immediate HTTP 302 redirect
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": canonicalUrl,
        "Cache-Control": "no-cache",
      },
    });
  }

  // Bots get the OG meta tags
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Re-Bali</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)} — ${priceText}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="450" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Re-Bali" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)} — ${priceText}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
  <p>${escapeHtml(title)} - Re-Bali</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
