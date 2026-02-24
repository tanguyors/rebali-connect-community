import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sprout, Clock, Award, Crown, Package, TrendingUp,
  MessageCircle, MessagesSquare, Star, Trophy, CheckCircle, ShieldCheck,
  Shield, Info, Coins, Zap, Gem, LayoutGrid
} from 'lucide-react';

const BADGE_LIST = [
  { key: 'newMember', icon: Sprout, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'activeMember', icon: Clock, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { key: 'veteran', icon: Award, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { key: 'elder', icon: Crown, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { key: 'firstSeller', icon: Package, color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  { key: 'activeSeller', icon: TrendingUp, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  { key: 'communicator', icon: MessageCircle, color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { key: 'superCommunicator', icon: MessagesSquare, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  { key: 'wellRated', icon: Star, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { key: 'topSeller', icon: Trophy, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { key: 'whatsappVerified', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { key: 'identityVerified', icon: ShieldCheck, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
];

const TRUST_FACTORS = [
  { key: 'accountAge', max: 30 },
  { key: 'activeListings', max: 20 },
  { key: 'messagesSent', max: 10 },
  { key: 'positiveReviews', max: 15 },
  { key: 'whatsappVerifiedFactor', max: 15 },
  { key: 'idVerified', max: 20 },
];

const POINTS_BADGES = [
  { key: 'newMember', pts: 5 },
  { key: 'activeMember', pts: 10 },
  { key: 'veteran', pts: 20 },
  { key: 'elder', pts: 25 },
  { key: 'firstSeller', pts: 10 },
  { key: 'activeSeller', pts: 15 },
  { key: 'communicator', pts: 5 },
  { key: 'superCommunicator', pts: 15 },
  { key: 'wellRated', pts: 10 },
  { key: 'topSeller', pts: 20 },
  { key: 'whatsappVerified', pts: 15 },
  { key: 'identityVerified', pts: 25 },
];

const ADDONS = [
  { key: 'boost', icon: Zap, cost: 30 },
  { key: 'vip', icon: Gem, cost: 80 },
  { key: 'extraListings', icon: LayoutGrid, cost: 50 },
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
              <li>{t('trustPage.penalty.vpn')}</li>
              <li>{t('trustPage.penalty.multiAccount')}</li>
            </ul>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">60-100 — {t('badges.trustLow')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">30-59 — {t('badges.trustMedium')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">0-29 — {t('badges.trustHigh')}</span>
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

          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold">{t('trustPage.pointsHowToSpend')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
