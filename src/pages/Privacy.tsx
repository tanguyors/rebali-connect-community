import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">{t('legal.privacyTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('legal.lastUpdated')}: 21/02/2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. {t('legal.privacyCollection')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyCollectionText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. {t('legal.privacyUse')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyUseText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. {t('legal.privacyStorage')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyStorageText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. {t('legal.privacySharing')}</h2>
          <p className="text-muted-foreground">{t('legal.privacySharingText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. {t('legal.privacyCookies')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyCookiesText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. {t('legal.privacyRights')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyRightsText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. {t('legal.privacySecurity')}</h2>
          <p className="text-muted-foreground">{t('legal.privacySecurityText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. {t('legal.privacyContact')}</h2>
          <p className="text-muted-foreground">{t('legal.privacyContactText')}</p>
        </section>
      </div>
    </div>
  );
}
