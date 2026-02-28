const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGS = ['en', 'fr', 'es', 'de', 'nl', 'id', 'ja', 'zh', 'ru', 'ar', 'hi', 'tr'];

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

  function hreflangBlock(path: string): string {
    let block = '';
    for (const lang of LANGS) {
      block += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${siteUrl}${path}?lang=${lang}"/>\n`;
    }
    block += `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${path}"/>\n`;
    return block;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Static pages with hreflang
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflangBlock(page.loc)}  </url>
`;
  }

  // Listing pages with hreflang
  if (Array.isArray(listings)) {
    for (const listing of listings) {
      const lastmod = listing.updated_at
        ? listing.updated_at.split("T")[0]
        : today;
      const path = `/listing/${listing.id}`;
      xml += `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${hreflangBlock(path)}  </url>
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
