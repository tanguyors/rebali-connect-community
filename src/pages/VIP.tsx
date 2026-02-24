import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Crown, Check, X, Rocket, BarChart3, Package, Lock,
  Zap, Star, TrendingUp, ShieldCheck, Award
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const FREE_FEATURES = [
  { key: 'listings5', included: true },
  { key: 'basicSearch', included: true },
  { key: 'whatsappContact', included: true },
  { key: 'trustBadges', included: true },
  { key: 'listings15', included: false },
  { key: 'freeBoosts', included: false },
  { key: 'analytics', included: false },
  { key: 'proBadge', included: false },
];

const PRO_FEATURES = [
  { key: 'listings5', included: true },
  { key: 'basicSearch', included: true },
  { key: 'whatsappContact', included: true },
  { key: 'trustBadges', included: true },
  { key: 'listings15', included: true },
  { key: 'freeBoosts', included: true },
  { key: 'analytics', included: true },
  { key: 'proBadge', included: true },
];

const PRO_HIGHLIGHTS = [
  { icon: Package, key: 'listings15' },
  { icon: Rocket, key: 'freeBoosts' },
  { icon: BarChart3, key: 'analytics' },
  { icon: Award, key: 'proBadge' },
];

export default function VIP() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const { data: activeSub } = useQuery({
    queryKey: ['pro-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('pro_subscriptions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const monthlyPrice = 149000;
  const annualPrice = 1490000;
  const annualMonthly = Math.round(annualPrice / 12);
  const savingsPercent = Math.round((1 - annualMonthly / monthlyPrice) * 100);

  const currentPrice = billingCycle === 'monthly' ? monthlyPrice : annualPrice;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-bold text-amber-600">{t('pro.badge')}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold">{t('pro.title')}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">{t('pro.subtitle')}</p>
      </div>

      {/* Active subscription banner */}
      {activeSub && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-bold text-sm">{t('pro.activeSubscription')}</p>
              <p className="text-xs text-muted-foreground">
                {t('pro.expiresAt')} {new Date((activeSub as any).expires_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PRO_HIGHLIGHTS.map(h => {
          const Icon = h.icon;
          return (
            <div key={h.key} className="text-center p-4 rounded-2xl bg-card border border-border/50">
              <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold">{t(`pro.feature.${h.key}`)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t(`pro.feature.${h.key}Desc`)}</p>
            </div>
          );
        })}
      </div>

      {/* Pricing Cards */}
      <div className="space-y-4">
        {/* Billing toggle */}
        <div className="flex justify-center">
          <Tabs value={billingCycle} onValueChange={v => setBillingCycle(v as any)}>
            <TabsList>
              <TabsTrigger value="monthly">{t('pro.monthly')}</TabsTrigger>
              <TabsTrigger value="annual" className="gap-1.5">
                {t('pro.annual')}
                <Badge className="text-[10px] bg-green-500 text-white">-{savingsPercent}%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free plan */}
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm font-bold text-muted-foreground mb-1">{t('pro.freePlan')}</p>
                <p className="text-3xl font-extrabold">{t('common.free')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('pro.freeForever')}</p>
              </div>
              <div className="space-y-2.5 pt-4 border-t">
                {FREE_FEATURES.map(f => (
                  <div key={f.key} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${f.included ? '' : 'text-muted-foreground/50'}`}>
                      {t(`pro.feature.${f.key}`)}
                    </span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" disabled>
                {t('pro.currentPlan')}
              </Button>
            </CardContent>
          </Card>

          {/* Pro plan */}
          <Card className="border-2 border-primary shadow-lg relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4">{t('pro.recommended')}</Badge>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm font-bold text-primary mb-1">{t('pro.proPlan')}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <p className="text-3xl font-extrabold">
                    {billingCycle === 'monthly'
                      ? `Rp ${monthlyPrice.toLocaleString()}`
                      : `Rp ${annualMonthly.toLocaleString()}`}
                  </p>
                  <span className="text-sm text-muted-foreground">/{t('pro.perMonth')}</span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Rp {annualPrice.toLocaleString()} / {t('pro.perYear')}
                  </p>
                )}
              </div>
              <div className="space-y-2.5 pt-4 border-t">
                {PRO_FEATURES.map(f => (
                  <div key={f.key} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{t(`pro.feature.${f.key}`)}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full gap-2" disabled>
                <Lock className="h-4 w-4" />
                {t('pro.comingSoon')}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">{t('pro.paymentMethods')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ-like section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">{t('pro.faqTitle')}</h2>
          {['faq1', 'faq2', 'faq3'].map(k => (
            <div key={k} className="space-y-1">
              <p className="font-semibold text-sm">{t(`pro.${k}Q`)}</p>
              <p className="text-sm text-muted-foreground">{t(`pro.${k}A`)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
