import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/contexts/LanguageContext';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_NAME = 'Re-Bali';
const SITE_URL = 'https://re-bali.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION = "Bali's trusted connection platform for expats, locals, and businesses. Buy and sell furniture, vehicles, real estate & more — 100% free.";
const SUPPORTED_LANGS = ['en', 'fr', 'es', 'de', 'nl', 'id', 'ja', 'zh', 'ru', 'ar', 'hi', 'tr'];

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOHeadProps) {
  const { language } = useLanguage();
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Buy & Sell Second-Hand in Bali`;
  const canonicalUrl = url ? `${SITE_URL}${url}` : undefined;
  const pathForHreflang = url || '/';

  return (
    <Helmet>
      <html lang={language} />
      <title>{fullTitle}</title>
      <meta name="description" content={description.slice(0, 160)} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description.slice(0, 160)} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description.slice(0, 160)} />
      <meta name="twitter:image" content={image} />

      {/* Hreflang */}
      {SUPPORTED_LANGS.map((lang) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${SITE_URL}${pathForHreflang}?lang=${lang}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${pathForHreflang}`} />

      {/* JSON-LD */}
      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}
