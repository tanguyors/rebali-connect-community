const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const siteUrl = "https://re-bali.com";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Fetch all active listings
  const listingsRes = await fetch(
    `${supabaseUrl}/rest/v1/listings?select=id,updated_at,category&status=eq.active&order=updated_at.desc&limit=5000`,
    { headers }
  );
  const listings = await listingsRes.json();

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/browse", priority: "0.9", changefreq: "hourly" },
    { loc: "/about", priority: "0.5", changefreq: "monthly" },
    { loc: "/safety", priority: "0.5", changefreq: "monthly" },
    { loc: "/rules", priority: "0.4", changefreq: "monthly" },
    { loc: "/trust-badges", priority: "0.6", changefreq: "weekly" },
    { loc: "/vip", priority: "0.6", changefreq: "monthly" },
    { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  ];

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Listing pages
  if (Array.isArray(listings)) {
    for (const listing of listings) {
      const lastmod = listing.updated_at
        ? listing.updated_at.split("T")[0]
        : today;
      xml += `  <url>
    <loc>${siteUrl}/listing/${listing.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
