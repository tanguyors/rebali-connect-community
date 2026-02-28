import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';

export default function Rules() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('rules.title')} url="/rules" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('rules.title') },
        ],
      }} />
      <h1 className="text-4xl font-bold mb-8">{t('rules.title')}</h1>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Card key={i}>
            <CardContent className="p-4 flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {i}
              </span>
              <p className="text-sm">{t(`rules.rule${i}`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Legal disclaimer */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground italic">{t('security.disclaimer')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
