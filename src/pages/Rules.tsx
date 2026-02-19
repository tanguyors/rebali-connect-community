import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';

export default function Rules() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
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
    </div>
  );
}
