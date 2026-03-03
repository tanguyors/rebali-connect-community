import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { openExternal, openExternalAuthenticated } from '@/lib/openExternal';
import { isNativePlatform } from '@/capacitor';
import { Coins, Rocket, Crown, Package, ArrowUp, ArrowDown, RefreshCw, History, Sparkles, Star, ShieldPlus, TrendingUp, CreditCard, Zap, Lock } from 'lucide-react';

interface PointsData {
  balance: number;
  total_earned: number;
  total_spent: number;
  monthly_dynamic_earned?: number;
}

interface Addon {
  id: string;
  addon_type: string;
  expires_at: string;
  active: boolean;
  listing_id: string | null;
  extra_slots: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  reason: string;
  created_at: string;
}

const ADDON_CONFIG = [
  { type: 'boost', icon: Rocket, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { type: 'boost_premium', icon: Star, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/20', needsListing: true },
  { type: 'vip', icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  { type: 'extra_listings', icon: Package, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  { type: 'protection', icon: ShieldPlus, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
];

const POINT_PACKS = [
  { id: 'starter', points: 50, price: 29000, icon: Zap },
  { id: 'popular', points: 120, price: 59000, icon: Star, bestValue: true },
  { id: 'premium', points: 250, price: 99000, icon: Crown },
  { id: 'mega', points: 600, price: 199000, icon: Sparkles },
];

export default function PointsShop() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState<PointsData | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addonCosts, setAddonCosts] = useState<Record<string, number>>({});
  const [monthlyCap, setMonthlyCap] = useState(150);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [boostType, setBoostType] = useState<string>('boost');
  const [userListings, setUserListings] = useState<{ id: string; title_original: string }[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  const handleBuyPoints = async (packId: string) => {
    if (!user) { navigate('/auth'); return; }
    setBuyingPack(packId);
    try {
      const { data, error } = await supabase.functions.invoke('xendit-create-invoice', {
        body: { type: 'points', pack_id: packId },
      });
      if (error || data?.error) {
        toast({ title: data?.error || 'Payment error', variant: 'destructive' });
      } else if (data?.invoice_url) {
        openExternal(data.invoice_url);
        toast({ title: t('points.redirectingPayment') });
      }
    } catch {
      toast({ title: 'Payment error', variant: 'destructive' });
    }
    setBuyingPack(null);
  };

  const fetchData = async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'get_balance' },
    });
    if (!error && data) {
      setPoints(data.points);
      setAddons(data.addons || []);
      setTransactions(data.transactions || []);
      setAddonCosts(data.addon_costs || {});
      if (data.monthly_cap) setMonthlyCap(data.monthly_cap);
    }
    setLoading(false);
  };

  const syncBadges = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'sync_badges' },
    });
    if (!error && data) {
      setPoints(data.points);
      if (data.new_points > 0) {
        toast({ title: `+${data.new_points} ${t('points.pointsEarned')}!` });
      } else {
        toast({ title: t('points.alreadySynced') });
      }
      await fetchData();
    }
    setSyncing(false);
  };

  const openBoostDialog = async (type: string) => {
    setBoostType(type);
    setBoostDialogOpen(true);
    setLoadingListings(true);
    const { data } = await supabase
      .from('listings')
      .select('id, title_original')
      .eq('seller_id', user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setUserListings(data || []);
    setLoadingListings(false);
  };

  const purchaseAddon = async (addonType: string, listingId?: string) => {
    setPurchasing(addonType);
    setBoostDialogOpen(false);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'purchase', addon_type: addonType, listing_id: listingId },
    });
    if (error || data?.error) {
      const msg = data?.error === 'insufficient_points'
        ? t('points.insufficientPoints')
        : data?.error === 'max_extra_listings_reached'
        ? t('points.maxExtraListings')
        : t('points.purchaseError');
      toast({ title: msg, variant: 'destructive' });
    } else {
      toast({ title: t('points.purchaseSuccess') });
      setPoints(data.points);
      await fetchData();
    }
    setPurchasing(null);
  };

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isNativePlatform) {
      openExternalAuthenticated(`${window.location.origin}/points`);
      navigate(-1 as any);
      return;
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Gamification nudge: find cheapest addon the user can't afford
  const balance = points?.balance || 0;
  const sortedCosts = Object.entries(addonCosts).sort((a, b) => a[1] - b[1]);
  const nextGoal = sortedCosts.find(([, cost]) => cost > balance);
  const ptsAway = nextGoal ? nextGoal[1] - balance : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Points Balance */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('points.yourBalance')}</p>
                <p className="text-4xl font-bold">{balance}</p>
                <p className="text-xs text-muted-foreground">
                  {t('points.earned')}: {points?.total_earned || 0} · {t('points.spent')}: {points?.total_spent || 0}
                </p>
              </div>
            </div>
            <Button onClick={syncBadges} disabled={syncing} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {t('points.syncBadges')}
            </Button>
          </div>

          {/* Dynamic earning status */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{t('points.monthlyDynamic')}: {points?.monthly_dynamic_earned || 0}/{monthlyCap}</span>
          </div>

          {/* Gamification nudge */}
          {nextGoal && ptsAway > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm font-medium text-primary">
                ✨ {t('points.nudge').replace('{pts}', String(ptsAway)).replace('{addon}', t(`points.addon.${nextGoal[0]}`))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('points.shopTitle')}
          </CardTitle>
          <CardDescription>{t('points.shopDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ADDON_CONFIG.map(addon => {
            const cost = addonCosts[addon.type] || 0;
            const Icon = addon.icon;
            const canAfford = balance >= cost;
            const activeAddon = addons.find(a => a.addon_type === addon.type && a.active);
            const needsListing = addon.type === 'boost' || addon.type === 'boost_premium';

            return (
              <div key={addon.type} className={`flex items-center gap-4 p-4 rounded-xl border ${addon.bgColor}`}>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${addon.bgColor}`}>
                  <Icon className={`h-6 w-6 ${addon.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t(`points.addon.${addon.type}`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`points.addon.${addon.type}Desc`)}</p>
                  {activeAddon && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {t('points.activeUntil')} {new Date(activeAddon.expires_at).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg">{cost}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                  <Button
                    size="sm"
                    disabled={!canAfford || purchasing === addon.type}
                    onClick={() => needsListing ? openBoostDialog(addon.type) : purchaseAddon(addon.type)}
                    className="mt-1"
                  >
                    {purchasing === addon.type ? '...' : t('points.buy')}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Buy Points */}
      <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t('points.buyPoints')}
            </CardTitle>
            <CardDescription>{t('points.buyPointsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {POINT_PACKS.map(pack => {
                const PackIcon = pack.icon;
                return (
                  <div
                    key={pack.id}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      pack.bestValue
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {pack.bestValue && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
                        {t('points.bestValue')}
                      </Badge>
                    )}
                    <div className="flex flex-col items-center text-center gap-2 pt-1">
                      <PackIcon className={`h-7 w-7 ${pack.bestValue ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-bold text-sm">{t(`points.pack.${pack.id}`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`points.pack.${pack.id}Desc`)}</p>
                      <p className="text-2xl font-bold text-primary">{pack.points}</p>
                      <p className="text-[10px] text-muted-foreground">{t('points.packPrice').replace('{price}', pack.price.toLocaleString())}</p>
                      <Button
                        size="sm"
                        className="w-full gap-1.5 mt-1"
                        disabled={buyingPack === pack.id}
                        onClick={() => handleBuyPoints(pack.id)}
                      >
                        {buyingPack === pack.id ? (
                          <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        {buyingPack === pack.id ? '...' : t('points.buyNow')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-center space-y-1">
              <p className="text-[10px] text-muted-foreground">{t('points.paymentMethods')}</p>
            </div>
          </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('points.history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('points.noTransactions')}</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {tx.type === 'earned' ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : tx.type === 'admin' ? (
                      <ArrowUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {tx.reason.startsWith('badge:')
                          ? `🏅 ${t(`badges.${tx.reason.replace('badge:', '')}`)}`
                          : tx.reason.startsWith('addon:')
                          ? `🛒 ${t(`points.addon.${tx.reason.replace('addon:', '')}`)}`
                          : tx.reason.startsWith('dynamic:')
                          ? `⚡ ${t(`points.dynamic.${tx.reason.replace('dynamic:', '')}`)}`
                          : tx.reason
                        }
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.type === 'earned' || tx.type === 'admin' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'spent' ? '-' : '+'}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Boost Listing Selector Dialog */}
      <Dialog open={boostDialogOpen} onOpenChange={setBoostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-500" />
              {t('points.boostSelectTitle')}
            </DialogTitle>
            <DialogDescription>{t('points.boostSelectDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loadingListings ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userListings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('points.noActiveListings')}</p>
            ) : (
              userListings.map(listing => (
                <button
                  key={listing.id}
                  onClick={() => purchaseAddon(boostType, listing.id)}
                  disabled={purchasing === boostType}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium truncate">{listing.title_original}</span>
                  <Rocket className="h-4 w-4 text-blue-500 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
