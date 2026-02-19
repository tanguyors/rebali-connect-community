import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Check, Bell } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export default function VIP() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');

  const features = [
    t('vip.feature1'),
    t('vip.feature2'),
    t('vip.feature3'),
    t('vip.feature4'),
  ];

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: t('notifications.vipNotify') });
    setEmail('');
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <Crown className="h-16 w-16 text-accent mx-auto mb-4" />
      <h1 className="text-4xl font-bold mb-3">{t('vip.title')}</h1>
      <p className="text-lg text-muted-foreground mb-8">{t('vip.subtitle')}</p>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-3 text-left">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground mb-4">{t('vip.notify')}</p>
      <form onSubmit={handleNotify} className="flex gap-2 max-w-sm mx-auto">
        <Input type="email" placeholder={t('vip.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required />
        <Button type="submit"><Bell className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
