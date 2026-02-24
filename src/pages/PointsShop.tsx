import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Coins, Rocket, Crown, Package, ArrowUp, ArrowDown, RefreshCw, History, Sparkles } from 'lucide-react';

interface PointsData {
  balance: number;
  total_earned: number;
  total_spent: number;
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
  { type: 'vip', icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  { type: 'extra_listings', icon: Package, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
];

export default function PointsShop() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState<PointsData | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addonCosts, setAddonCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

  const purchaseAddon = async (addonType: string) => {
    setPurchasing(addonType);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'purchase', addon_type: addonType },
    });
    if (error || data?.error) {
      const msg = data?.error === 'insufficient_points' 
        ? t('points.insufficientPoints') 
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
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

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
                <p className="text-4xl font-bold">{points?.balance || 0}</p>
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
            const canAfford = (points?.balance || 0) >= cost;
            const activeAddon = addons.find(a => a.addon_type === addon.type && a.active);

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
                    onClick={() => purchaseAddon(addon.type)}
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
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {tx.reason.startsWith('badge:') 
                          ? `🏅 ${t(`badges.${tx.reason.replace('badge:', '')}`)}`
                          : tx.reason.startsWith('addon:')
                          ? `🛒 ${t(`points.addon.${tx.reason.replace('addon:', '')}`)}`
                          : tx.reason
                        }
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.type === 'earned' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'earned' ? '+' : '-'}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
