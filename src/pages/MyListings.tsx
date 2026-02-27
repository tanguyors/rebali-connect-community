import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, CATEGORY_ICONS, MAX_ACTIVE_LISTINGS } from '@/lib/constants';
import { Plus, Eye, ArchiveRestore, Pencil, Rocket, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function MyListings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [boostListingId, setBoostListingId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const { data: listings } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch active boosts for user's listings
  const { data: activeBoosts } = useQuery({
    queryKey: ['my-boosts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_addons')
        .select('listing_id, addon_type')
        .eq('user_id', user.id)
        .eq('active', true)
        .in('addon_type', ['boost', 'boost_premium']);
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) { navigate('/auth'); return null; }

  const activeListings = listings?.filter((l: any) => l.status === 'active') || [];
  const soldListings = listings?.filter((l: any) => l.status === 'sold') || [];
  const archivedListings = listings?.filter((l: any) => l.status === 'archived') || [];

  const statusToastMap: Record<string, string> = {
    active: 'notifications.listingActive',
    sold: 'notifications.listingSold',
    archived: 'notifications.listingArchived',
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('listings').update({ status: status as any }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['my-listings'] });
    toast({ title: t(statusToastMap[status] || status) });
  };

  const getBoostStatus = (listingId: string) => {
    const boost = activeBoosts?.find(b => b.listing_id === listingId);
    if (boost?.addon_type === 'boost_premium') return 'featured';
    if (boost?.addon_type === 'boost') return 'boosted';
    return null;
  };

  const openBoostDialog = (listingId: string) => {
    setBoostListingId(listingId);
    setBoostDialogOpen(true);
  };

  const purchaseBoost = async (type: string) => {
    if (!boostListingId) return;
    setPurchasing(true);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'purchase', addon_type: type, listing_id: boostListingId },
    });
    if (error || data?.error) {
      const msg = data?.error === 'insufficient_points'
        ? t('points.insufficientPoints')
        : t('points.purchaseError');
      toast({ title: msg, variant: 'destructive' });
    } else {
      toast({ title: t('points.purchaseSuccess') });
      qc.invalidateQueries({ queryKey: ['my-boosts'] });
    }
    setPurchasing(false);
    setBoostDialogOpen(false);
  };

  const ListingRow = ({ listing }: { listing: any }) => {
    const imgUrl = listing.listing_images?.[0]?.storage_path
      ? supabase.storage.from('listings').getPublicUrl(listing.listing_images[0].storage_path).data.publicUrl
      : '/placeholder.svg';
    const boostStatus = getBoostStatus(listing.id);
    return (
      <Card className={`overflow-hidden ${boostStatus === 'featured' ? 'ring-2 ring-amber-400 shadow-amber-200/50' : boostStatus === 'boosted' ? 'ring-2 ring-blue-400 shadow-blue-200/50' : ''}`}>
        <CardContent className="p-3 flex gap-3">
          <img src={imgUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm truncate">{listing.title_original}</h3>
              {boostStatus === 'featured' && (
                <Badge className="bg-amber-500 text-white text-[9px] gap-0.5 px-1.5 py-0 shrink-0">
                  <Star className="h-2.5 w-2.5" /> Featured
                </Badge>
              )}
              {boostStatus === 'boosted' && (
                <Badge className="bg-blue-500 text-white text-[9px] gap-0.5 px-1.5 py-0 shrink-0">
                  <Rocket className="h-2.5 w-2.5" /> Boost
                </Badge>
              )}
            </div>
            <p className="text-primary font-bold text-sm">{formatPrice(listing.price, listing.currency)}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{CATEGORY_ICONS[listing.category]}</span>
              <span>{t(`locations.${listing.location_area}`)}</span>
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{listing.views_count}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {listing.status === 'active' && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate(`/create?edit=${listing.id}`)} className="gap-1">
                  <Pencil className="h-3 w-3" /> {t('listing.edit')}
                </Button>
                {!boostStatus && (
                  <Button size="sm" variant="outline" onClick={() => openBoostDialog(listing.id)} className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50">
                    <Rocket className="h-3 w-3" /> Boost
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => updateStatus(listing.id, 'sold')}>
                  {t('listing.markSold')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(listing.id, 'archived')}>
                  {t('listing.archive')}
                </Button>
              </>
            )}
            {(listing.status === 'sold' || listing.status === 'archived') && (
              <Button size="sm" variant="outline" onClick={() => updateStatus(listing.id, 'active')}>
                <ArchiveRestore className="h-3 w-3 mr-1" /> {t('listing.reactivate')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('myListings.title')}</h1>
        <Button onClick={() => navigate('/create')} className="gap-1">
          <Plus className="h-4 w-4" /> {t('nav.sell')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {activeListings.length}/{MAX_ACTIVE_LISTINGS} {t('myListings.activeCount')}
      </p>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">{t('myListings.active')} ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="sold">{t('myListings.sold')} ({soldListings.length})</TabsTrigger>
          <TabsTrigger value="archived">{t('myListings.archived')} ({archivedListings.length})</TabsTrigger>
        </TabsList>
        {['active', 'sold', 'archived'].map(tab => {
          const items = tab === 'active' ? activeListings : tab === 'sold' ? soldListings : archivedListings;
          return (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {items.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">{t('myListings.noListings')}</p>
              ) : items.map((l: any) => <ListingRow key={l.id} listing={l} />)}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Boost Dialog */}
      <Dialog open={boostDialogOpen} onOpenChange={setBoostDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-500" /> Boost cette annonce
            </DialogTitle>
            <DialogDescription>Choisis le type de boost à appliquer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => purchaseBoost('boost')}
              disabled={purchasing}
              className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors flex items-center gap-3 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Boost 48h</p>
                <p className="text-xs text-muted-foreground">Tête de liste dans ta catégorie</p>
              </div>
              <span className="font-bold text-primary">40 pts</span>
            </button>
            <button
              onClick={() => purchaseBoost('boost_premium')}
              disabled={purchasing}
              className="w-full p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 transition-colors flex items-center gap-3 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Boost Premium</p>
                <p className="text-xs text-muted-foreground">Mise en avant sur la page d'accueil</p>
              </div>
              <span className="font-bold text-primary">80 pts</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
