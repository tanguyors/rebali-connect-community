import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, Shield, Users } from 'lucide-react';

export default function About() {
  const { t } = useLanguage();

  const values = [
    { icon: Shield, title: t('about.trust'), desc: t('about.trustText') },
    { icon: Heart, title: t('about.sustainability'), desc: t('about.sustainabilityText') },
    { icon: Users, title: t('about.community'), desc: t('about.communityText') },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SEOHead title={t('about.title')} description={t('about.description')} url="/about" jsonLd={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://re-bali.com/" },
          { "@type": "ListItem", position: 2, name: t('about.title') },
        ],
      }} />
      <h1 className="text-4xl font-bold mb-4">{t('about.title')}</h1>
      <p className="text-lg text-muted-foreground mb-8">{t('about.description')}</p>

      <h2 className="text-2xl font-bold mb-3">{t('about.mission')}</h2>
      <p className="text-muted-foreground mb-10">{t('about.missionText')}</p>

      <h2 className="text-2xl font-bold mb-6">{t('about.values')}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {values.map((v, i) => (
          <div key={i} className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <v.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'DM Sans' }}>{v.title}</h3>
            <p className="text-sm text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
