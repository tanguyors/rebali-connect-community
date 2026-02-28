const SITE = 'https://re-bali.com';
const OG_IMAGE = `${SITE}/og-image.png`;
const SITE_NAME = 'Re-Bali';

const BOT_UA = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegrambot|applebot|discordbot|pinterestbot/i;

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  type?: string;
  jsonLd?: Record<string, unknown>[];
}

const PAGES: Record<string, PageMeta> = {
  '/': {
    title: `${SITE_NAME} — Buy & Sell Second-Hand in Bali`,
    description: "Bali's trusted platform connecting expats, locals, and businesses. Buy and sell furniture, vehicles, real estate & more — 100% free.",
    canonical: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/browse?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  },
  '/browse': {
    title: `Browse Listings — ${SITE_NAME}`,
    description: 'Browse thousands of second-hand items in Bali. Furniture, vehicles, electronics, real estate and more.',
    canonical: '/browse',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Browse' },
        ],
      },
    ],
  },
  '/about': {
    title: `About — ${SITE_NAME}`,
    description: 'Learn about Re-Bali, the trusted marketplace for buying and selling second-hand items in Bali.',
    canonical: '/about',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'About' },
        ],
      },
    ],
  },
  '/safety': {
    title: `Safety Tips — ${SITE_NAME}`,
    description: 'Stay safe while buying and selling on Re-Bali. Tips for secure transactions in Bali.',
    canonical: '/safety',
  },
  '/rules': {
    title: `Community Rules — ${SITE_NAME}`,
    description: 'Community guidelines for Re-Bali marketplace. Fair trading rules for all users.',
    canonical: '/rules',
  },
  '/terms': {
    title: `Terms of Service — ${SITE_NAME}`,
    description: 'Terms and conditions for using Re-Bali marketplace platform.',
    canonical: '/terms',
  },
  '/privacy': {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: 'How Re-Bali collects, uses, and protects your personal data.',
    canonical: '/privacy',
  },
  '/vip': {
    title: `VIP & Pro Plans — ${SITE_NAME}`,
    description: 'Upgrade to Re-Bali Pro for more listings, priority support, and premium features.',
    canonical: '/vip',
  },
  '/trust-badges': {
    title: `Trust & Verification — ${SITE_NAME}`,
    description: 'Build trust on Re-Bali with verified badges, phone verification, and seller ratings.',
    canonical: '/trust-badges',
  },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPage(meta: PageMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const c = `${SITE}${meta.canonical}`;
  const jsonLdBlocks = (meta.jsonLd || [])
    .map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <title>${t}</title>
    <meta name="description" content="${d}"/>
    <link rel="canonical" href="${c}"/>
    <meta property="og:type" content="${meta.type || 'website'}"/>
    <meta property="og:title" content="${t}"/>
    <meta property="og:description" content="${d}"/>
    <meta property="og:image" content="${OG_IMAGE}"/>
    <meta property="og:url" content="${c}"/>
    <meta property="og:site_name" content="${SITE_NAME}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${t}"/>
    <meta name="twitter:description" content="${d}"/>
    <meta name="twitter:image" content="${OG_IMAGE}"/>
    ${jsonLdBlocks}
</head>
<body>
    <h1>${t}</h1>
    <p>${d}</p>
    <p><a href="${c}">Visit ${SITE_NAME}</a></p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') || '';

  // Only serve to bots; redirect humans to the SPA
  if (!BOT_UA.test(ua)) {
    const path = url.searchParams.get('path') || '/';
    return new Response(null, {
      status: 302,
      headers: { Location: `${SITE}${path}` },
    });
  }

  const path = url.searchParams.get('path') || '/';
  const meta = PAGES[path];

  if (!meta) {
    // Fallback for unknown pages
    return new Response(renderPage({
      title: `${SITE_NAME} — Buy & Sell Second-Hand in Bali`,
      description: "Bali's trusted platform for second-hand items in Bali.",
      canonical: path,
    }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(renderPage(meta), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
