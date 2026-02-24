import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sprout, Clock, Award, Crown, CheckCircle, ShieldCheck,
  Handshake, Target, Flame, Trophy, Medal,
  Shield, Info, Coins, Zap, Star, LayoutGrid, ShieldPlus, Gem
} from 'lucide-react';

const BADGE_LIST = [
  { key: 'newMember', icon: Sprout, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'activeMember', icon: Clock, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { key: 'veteran', icon: Award, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { key: 'elder', icon: Crown, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'whatsappVerified', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { key: 'identityVerified', icon: ShieldCheck, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { key: 'firstDeal', icon: Handshake, color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  { key: 'fiveDeals', icon: Target, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  { key: 'twentyDeals', icon: Flame, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { key: 'fiftyDeals', icon: Trophy, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { key: 'safeSeller', icon: ShieldCheck, color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { key: 'trustedPro', icon: Medal, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
];

const TRUST_FACTORS = [
  { key: 'accountAge', max: 20 },
  { key: 'activeListings', max: 15 },
  { key: 'completedDeals', max: 20 },
  { key: 'positiveReviews', max: 20 },
  { key: 'whatsappVerifiedFactor', max: 10 },
  { key: 'idVerified', max: 15 },
];

const POINTS_BADGES = [
  { key: 'newMember', pts: 10 },
  { key: 'activeMember', pts: 10 },
  { key: 'veteran', pts: 20 },
  { key: 'elder', pts: 30 },
  { key: 'whatsappVerified', pts: 20 },
  { key: 'identityVerified', pts: 40 },
  { key: 'firstDeal', pts: 20 },
  { key: 'fiveDeals', pts: 30 },
  { key: 'twentyDeals', pts: 50 },
  { key: 'fiftyDeals', pts: 60 },
  { key: 'safeSeller', pts: 25 },
  { key: 'trustedPro', pts: 60 },
];

const DYNAMIC_REWARDS = [
  { key: 'completedDeal', pts: 5 },
  { key: 'fiveStarReview', pts: 3 },
  { key: 'validatedReport', pts: 10 },
];

const ADDONS = [
  { key: 'boost', icon: Zap, cost: 40 },
  { key: 'boost_premium', icon: Star, cost: 80 },
  { key: 'vip', icon: Gem, cost: 120 },
  { key: 'extraListings', icon: LayoutGrid, cost: 90 },
  { key: 'protection', icon: ShieldPlus, cost: 150 },
];

export default function TrustBadges() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('trustPage.title')}</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t('trustPage.subtitle')}</p>
      </div>

      {/* Trust Score Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('trustPage.howScoreWorks')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('trustPage.scoreExplanation')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {TRUST_FACTORS.map(f => (
              <div key={f.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{t(`trustPage.factor.${f.key}`)}</span>
                <Badge variant="secondary" className="text-xs">+{f.max} pts max</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/30 space-y-2">
            <p className="text-sm font-medium">{t('trustPage.penalties')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('trustPage.penalty.reports')}</li>
              <li>{t('trustPage.penalty.fakeListings')}</li>
              <li>{t('trustPage.penalty.vpn')}</li>
              <li>{t('trustPage.penalty.multiAccount')}</li>
            </ul>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">70-100 — {t('badges.trustSafe')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">40-69 — {t('badges.trustStandard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">0-39 — {t('badges.trustRisky')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t('trustPage.badgesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('trustPage.badgesExplanation')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {BADGE_LIST.map(badge => {
              const Icon = badge.icon;
              return (
                <div key={badge.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge className={`gap-1 flex-shrink-0 mt-0.5 ${badge.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold">{t(`badges.${badge.key}`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`badges.${badge.key}Desc`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Points Shop Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('trustPage.pointsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('trustPage.pointsExplanation')}</p>

          {/* Badge points */}
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('trustPage.pointsHowToEarn')}</h3>
            <p className="text-xs text-muted-foreground">{t('trustPage.pointsEarnExplanation')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POINTS_BADGES.map(pb => (
                <div key={pb.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{t(`badges.${pb.key}`)}</span>
                  <Badge variant="secondary" className="text-xs">+{pb.pts} pts</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic rewards */}
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('trustPage.dynamicEarningTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('trustPage.dynamicEarningDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DYNAMIC_REWARDS.map(dr => (
                <div key={dr.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{t(`trustPage.dynamic.${dr.key}`)}</span>
                  <Badge variant="secondary" className="text-xs">+{dr.pts} pts</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">{t('trustPage.monthlyCap')}</p>
          </div>

          {/* Shop items */}
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('trustPage.pointsHowToSpend')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ADDONS.map(addon => {
                const Icon = addon.icon;
                return (
                  <div key={addon.key} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
                    <Icon className="h-6 w-6 text-primary" />
                    <p className="text-sm font-semibold">{t(`trustPage.addon.${addon.key}`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`trustPage.addon.${addon.key}Desc`)}</p>
                    <Badge variant="secondary">{addon.cost} pts</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/30 space-y-2">
            <p className="text-sm font-medium">{t('trustPage.pointsNote')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('trustPage.pointsNote1')}</li>
              <li>{t('trustPage.pointsNote2')}</li>
              <li>{t('trustPage.pointsNote3')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
