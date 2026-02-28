import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Eye, CreditCard, AlertTriangle, UserCheck } from 'lucide-react';

export default function Safety() {
  const { t } = useLanguage();

  const tips = [
    { icon: MapPin, title: t('safety.tip1Title'), desc: t('safety.tip1Desc') },
    { icon: Eye, title: t('safety.tip2Title'), desc: t('safety.tip2Desc') },
    { icon: CreditCard, title: t('safety.tip3Title'), desc: t('safety.tip3Desc') },
    { icon: AlertTriangle, title: t('safety.tip4Title'), desc: t('safety.tip4Desc') },
    { icon: UserCheck, title: t('safety.tip5Title'), desc: t('safety.tip5Desc') },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('safety.title')} url="/safety" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('safety.title') },
        ],
      }} />
      <h1 className="text-4xl font-bold mb-8">{t('safety.title')}</h1>
      <div className="space-y-4">
        {tips.map((tip, i) => (
          <Card key={i}>
            <CardContent className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <tip.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ fontFamily: 'DM Sans' }}>{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.desc}</p>
              </div>
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
