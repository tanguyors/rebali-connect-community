import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer({ className }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <footer className={`border-t bg-card mt-auto ${className || ''}`}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Re-Bali
            </h3>
            <p className="text-sm text-muted-foreground">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.marketplace')}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/browse" className="hover:text-foreground transition-colors">{t('nav.browse')}</Link>
              <Link to="/create" className="hover:text-foreground transition-colors">{t('nav.sell')}</Link>
              <Link to="/vip" className="hover:text-foreground transition-colors">{t('nav.vip')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.company')}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">{t('nav.about')}</Link>
              <Link to="/safety" className="hover:text-foreground transition-colors">{t('nav.safety')}</Link>
              <Link to="/rules" className="hover:text-foreground transition-colors">{t('nav.rules')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.legal')}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">{t('footer.terms')}</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
            </div>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Re-Bali. {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
