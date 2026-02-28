import { useLanguage } from '@/contexts/LanguageContext';
import SEOHead from '@/components/SEOHead';

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SEOHead title={t('legal.termsTitle')} url="/terms" />
      <h1 className="text-3xl font-bold mb-8">{t('legal.termsTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('legal.lastUpdated')}: 21/02/2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. {t('legal.termsAcceptance')}</h2>
          <p className="text-muted-foreground">{t('legal.termsAcceptanceText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. {t('legal.termsDescription')}</h2>
          <p className="text-muted-foreground">{t('legal.termsDescriptionText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. {t('legal.termsAccount')}</h2>
          <p className="text-muted-foreground">{t('legal.termsAccountText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. {t('legal.termsListings')}</h2>
          <p className="text-muted-foreground">{t('legal.termsListingsText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. {t('legal.termsProhibited')}</h2>
          <p className="text-muted-foreground">{t('legal.termsProhibitedText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. {t('legal.termsLiability')}</h2>
          <p className="text-muted-foreground">{t('legal.termsLiabilityText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. {t('legal.termsModification')}</h2>
          <p className="text-muted-foreground">{t('legal.termsModificationText')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. {t('legal.termsContact')}</h2>
          <p className="text-muted-foreground">{t('legal.termsContactText')}</p>
        </section>
      </div>
    </div>
  );
}
