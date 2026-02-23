const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const listingId = url.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing id", { status: 400, headers: corsHeaders });
  }

  const siteUrl = "https://re-bali.com";
  const canonicalUrl = `${siteUrl}/listing/${listingId}`;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const headers = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Fetch listing
  const listingRes = await fetch(
    `${supabaseUrl}/rest/v1/listings?select=title_original,description_original,price,currency,category,location_area&id=eq.${listingId}&status=eq.active&limit=1`,
    { headers }
  );
  const listings = await listingRes.json();
  const listing = listings?.[0];

  if (!listing) {
    return Response.redirect(siteUrl, 302);
  }

  // Fetch first image
  const imgRes = await fetch(
    `${supabaseUrl}/rest/v1/listing_images?select=storage_path&listing_id=eq.${listingId}&order=sort_order.asc&limit=1`,
    { headers }
  );
  const images = await imgRes.json();
  const img = images?.[0];

  const imageUrl = img
    ? `${supabaseUrl}/storage/v1/object/public/listings/${img.storage_path}`
    : `${siteUrl}/pwa-512x512.png`;

  const title = listing.title_original.slice(0, 60);
  const description = listing.description_original.slice(0, 160);
  const priceText =
    listing.price > 0
      ? new Intl.NumberFormat(listing.currency === "IDR" ? "id-ID" : "en-US", {
          style: "currency",
          currency: listing.currency,
          maximumFractionDigits: listing.currency === "IDR" ? 0 : 2,
        }).format(listing.price)
      : "Free";

  // Detect bots/crawlers
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isBot = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|googlebot|bingbot|bot|crawl|spider/i.test(ua);

  // Real users get a 302 redirect
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, "Location": canonicalUrl, "Cache-Control": "no-cache" },
    });
  }

  // Bots get OG meta tags
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} - Re-Bali</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${esc(title)} — ${priceText}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="450" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="Re-Bali" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)} — ${priceText}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body><p>${esc(title)} - Re-Bali</p></body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
});

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
