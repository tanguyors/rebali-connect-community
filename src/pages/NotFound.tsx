import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center py-20">
      <SEOHead title="404 — Page Not Found" noindex />
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-xl font-semibold">{t('notFound.title')}</p>
        <p className="mb-6 text-muted-foreground">{t('notFound.description')}</p>
        <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
}
