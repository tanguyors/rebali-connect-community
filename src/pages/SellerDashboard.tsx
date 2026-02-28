import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Heart, MessageCircle, TrendingUp, BarChart3, Crown, Lock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function SellerDashboard() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  const isProOrBusiness = profile?.user_type === 'business';

  // Check Pro subscription
  const { data: hasPro } = useQuery({
    queryKey: ['has-pro', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pro_subscriptions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1);
      return data && data.length > 0;
    },
    enabled: !!user,
  });

  // Fetch all user's listings with images
  const { data: listings = [] } = useQuery({
    queryKey: ['dashboard-listings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title_original, status, views_count, created_at, category, price, currency, listing_images(storage_path, sort_order)')
        .eq('seller_id', user!.id)
        .in('status', ['active', 'sold'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && isProOrBusiness,
  });

  // Fetch favorites counts
  const listingIds = listings.map((l: any) => l.id);
  const { data: favCounts = [] } = useQuery({
    queryKey: ['dashboard-favs', listingIds],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_listing_fav_counts', { _listing_ids: listingIds });
      return data || [];
    },
    enabled: listingIds.length > 0,
  });

  // Fetch WhatsApp click counts per listing
  const { data: waClicks = [] } = useQuery({
    queryKey: ['dashboard-wa-clicks', user?.id, period],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_click_logs')
        .select('listing_id')
        .in('listing_id', listingIds);

      if (period === '7d') {
        query = query.gte('clicked_at', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (period === '30d') {
        query = query.gte('clicked_at', new Date(Date.now() - 30 * 86400000).toISOString());
      }

      const { data } = await query;
      return data || [];
    },
    enabled: listingIds.length > 0,
  });

  // Fetch conversation counts per listing
  const { data: conversations = [] } = useQuery({
    queryKey: ['dashboard-convos', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('listing_id')
        .eq('seller_id', user!.id);
      return data || [];
    },
    enabled: !!user && isProOrBusiness,
  });

  // Aggregate stats
  const statsMap = useMemo(() => {
    const map: Record<string, { favs: number; waClicks: number; convos: number }> = {};
    listingIds.forEach(id => {
      map[id] = { favs: 0, waClicks: 0, convos: 0 };
    });
    favCounts.forEach((f: any) => {
      if (map[f.listing_id]) map[f.listing_id].favs = f.fav_count;
    });
    waClicks.forEach((w: any) => {
      if (map[w.listing_id]) map[w.listing_id].waClicks++;
    });
    conversations.forEach((c: any) => {
      if (map[c.listing_id]) map[c.listing_id].convos++;
    });
    return map;
  }, [listingIds, favCounts, waClicks, conversations]);

  // Totals
  const totals = useMemo(() => {
    const totalViews = listings.reduce((sum: number, l: any) => sum + (l.views_count || 0), 0);
    const totalFavs = Object.values(statsMap).reduce((sum, s) => sum + s.favs, 0);
    const totalWaClicks = Object.values(statsMap).reduce((sum, s) => sum + s.waClicks, 0);
    const totalConvos = Object.values(statsMap).reduce((sum, s) => sum + s.convos, 0);
    const activeCount = listings.filter((l: any) => l.status === 'active').length;
    const soldCount = listings.filter((l: any) => l.status === 'sold').length;
    return { totalViews, totalFavs, totalWaClicks, totalConvos, activeCount, soldCount };
  }, [listings, statsMap]);

  // Sort listings by engagement
  const [sortBy, setSortBy] = useState<'views' | 'favs' | 'wa'>('views');
  const sortedListings = useMemo(() => {
    return [...listings].sort((a: any, b: any) => {
      if (sortBy === 'views') return (b.views_count || 0) - (a.views_count || 0);
      if (sortBy === 'favs') return (statsMap[b.id]?.favs || 0) - (statsMap[a.id]?.favs || 0);
      return (statsMap[b.id]?.waClicks || 0) - (statsMap[a.id]?.waClicks || 0);
    });
  }, [listings, statsMap, sortBy]);

  if (!user) { navigate('/auth'); return null; }

  // Not a Business account → show upgrade prompt
  if (!isProOrBusiness) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.businessOnly')}</p>
        <Button onClick={() => navigate('/profile')}>{t('dashboard.goToProfile')}</Button>
      </div>
    );
  }

  // Business but no Pro → show promo
  if (!hasPro) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Crown className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.proRequired')}</p>
        <Button onClick={() => navigate('/points')} className="gap-2">
          <Crown className="h-4 w-4" /> {t('dashboard.subscribePro')}
        </Button>
      </div>
    );
  }

  const getConversionRate = () => {
    if (totals.totalViews === 0) return '0';
    return ((totals.totalConvos / totals.totalViews) * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">
          <Crown className="h-3.5 w-3.5" /> Pro
        </Badge>
      </div>

      {/* Period selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('dashboard.last7days')}</SelectItem>
            <SelectItem value="30d">{t('dashboard.last30days')}</SelectItem>
            <SelectItem value="all">{t('dashboard.allTime')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totals.totalViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.totalViews')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold">{totals.totalFavs}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.totalFavorites')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <MessageCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totals.totalWaClicks}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.waClicks')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{getConversionRate()}%</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.conversionRate')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Listings breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('dashboard.listingsPerformance')}</CardTitle>
              <CardDescription>
                {totals.activeCount} {t('dashboard.active')} · {totals.soldCount} {t('dashboard.sold')}
              </CardDescription>
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="views">{t('dashboard.sortViews')}</SelectItem>
                <SelectItem value="favs">{t('dashboard.sortFavorites')}</SelectItem>
                <SelectItem value="wa">{t('dashboard.sortWaClicks')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedListings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('dashboard.noListings')}</p>
          ) : (
            <div className="space-y-3">
              {sortedListings.map((listing: any) => {
                const imgUrl = listing.listing_images?.[0]?.storage_path
                  ? supabase.storage.from('listings').getPublicUrl(listing.listing_images[0].storage_path).data.publicUrl
                  : '/placeholder.svg';
                const stats = statsMap[listing.id] || { favs: 0, waClicks: 0, convos: 0 };

                return (
                  <div
                    key={listing.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                  >
                    <img src={imgUrl} alt="" className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{listing.title_original}</h3>
                          <Badge variant={listing.status === 'active' ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                            {listing.status === 'active' ? t('dashboard.active') : t('dashboard.sold')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1" title={t('dashboard.totalViews')}>
                          <Eye className="h-3.5 w-3.5" /> {listing.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-rose-500" title={t('dashboard.totalFavorites')}>
                          <Heart className="h-3.5 w-3.5" /> {stats.favs}
                        </span>
                        <span className="flex items-center gap-1 text-green-600" title={t('dashboard.waClicks')}>
                          <MessageCircle className="h-3.5 w-3.5" /> {stats.waClicks}
                        </span>
                        <span className="flex items-center gap-1 text-primary" title={t('dashboard.conversations')}>
                          💬 {stats.convos}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
