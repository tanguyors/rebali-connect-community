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
import { Plus, Eye, ArchiveRestore, Pencil, Rocket, Star, Trash2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

function formatCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff / (1000 * 60)) % 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const remH = h % 24;
    return `${d}j ${remH}h`;
  }
  return `${h}h ${m}m`;
}

function BoostCountdown({ expiresAt, type }: { expiresAt: string; type: string }) {
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatCountdown(expiresAt));
    }, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!timeLeft) return null;

  const isFeatured = type === 'boost_premium';
  return (
    <Badge className={`text-[9px] gap-0.5 px-1.5 py-0 shrink-0 ${isFeatured ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
      <Clock className="h-2.5 w-2.5" /> {timeLeft}
    </Badge>
  );
}

export default function MyListings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [boostListingId, setBoostListingId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmBoostType, setConfirmBoostType] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(initialTab);

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

  // Fetch active boosts WITH expires_at
  const { data: activeBoosts } = useQuery({
    queryKey: ['my-boosts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_addons')
        .select('listing_id, addon_type, expires_at')
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

  const deleteListing = async (id: string) => {
    setDeleting(true);
    await supabase.from('listing_images').delete().eq('listing_id', id);
    await supabase.from('favorites').delete().eq('listing_id', id);
    await supabase.from('listing_translations').delete().eq('listing_id', id);
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } else {
      toast({ title: t('myListings.deleted') });
      qc.invalidateQueries({ queryKey: ['my-listings'] });
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const getBoostInfo = (listingId: string) => {
    const boost = activeBoosts?.find(b => b.listing_id === listingId);
    if (!boost) return null;
    // Check if expired
    if (boost.expires_at && new Date(boost.expires_at).getTime() <= Date.now()) return null;
    return { type: boost.addon_type, expiresAt: boost.expires_at };
  };

  const openBoostDialog = (listingId: string) => {
    setBoostListingId(listingId);
    setBoostDialogOpen(true);
  };

  const selectBoostType = (type: string) => {
    setConfirmBoostType(type);
  };

  const purchaseBoost = async () => {
    if (!boostListingId || !confirmBoostType) return;
    setPurchasing(true);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'purchase', addon_type: confirmBoostType, listing_id: boostListingId },
    });
    if (error || data?.error) {
      const msg = data?.error === 'insufficient_points'
        ? t('points.insufficientPoints')
        : t('points.purchaseError');
      toast({ title: msg, variant: 'destructive' });
    } else {
      toast({ title: t('points.purchaseSuccess') });
      await qc.invalidateQueries({ queryKey: ['my-boosts'] });
      await qc.invalidateQueries({ queryKey: ['my-listings'] });
    }
    setPurchasing(false);
    setConfirmBoostType(null);
    setBoostDialogOpen(false);
  };

  const ListingRow = ({ listing }: { listing: any }) => {
    const imgUrl = listing.listing_images?.[0]?.storage_path
      ? supabase.storage.from('listings').getPublicUrl(listing.listing_images[0].storage_path).data.publicUrl
      : '/placeholder.svg';
    const boostInfo = getBoostInfo(listing.id);
    const isFeatured = boostInfo?.type === 'boost_premium';
    const isBoosted = !!boostInfo;

    return (
      <Card className={`overflow-hidden ${isFeatured ? 'ring-2 ring-amber-400 shadow-amber-200/50' : isBoosted ? 'ring-2 ring-blue-400 shadow-blue-200/50' : ''}`}>
        <CardContent className="p-3 flex gap-3">
          <img src={imgUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <h3 className="font-medium text-sm truncate">{listing.title_original}</h3>
              {isFeatured && (
                <Badge className="bg-amber-500 text-white text-[9px] gap-0.5 px-1.5 py-0 shrink-0">
                  <Star className="h-2.5 w-2.5" /> Featured
                </Badge>
              )}
              {isBoosted && !isFeatured && (
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
              {boostInfo?.expiresAt && (
                <BoostCountdown expiresAt={boostInfo.expiresAt} type={boostInfo.type} />
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {listing.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/create?edit=${listing.id}`)} className="gap-1 h-7 text-xs px-2">
                    <Pencil className="h-3 w-3" /> {t('listing.edit')}
                  </Button>
                  {!isBoosted && (
                    <Button size="sm" variant="outline" onClick={() => openBoostDialog(listing.id)} className="gap-1 h-7 text-xs px-2 text-blue-600 border-blue-300 hover:bg-blue-50">
                      <Rocket className="h-3 w-3" /> Boost
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => updateStatus(listing.id, 'sold')} className="h-7 text-xs px-2">
                    {t('listing.markSold')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(listing.id, 'archived')} className="h-7 text-xs px-2">
                    {t('listing.archive')}
                  </Button>
                </>
              )}
              {(listing.status === 'sold' || listing.status === 'archived') && (
                <>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(listing.id, 'active')} className="h-7 text-xs px-2">
                    <ArchiveRestore className="h-3 w-3 mr-1" /> {t('listing.reactivate')}
                  </Button>
                  {listing.status === 'archived' && (
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(listing.id)} className="h-7 text-xs px-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> {t('common.delete')}
                    </Button>
                  )}
                </>
              )}
            </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full grid grid-cols-3">
          <TabsTrigger value="active" className="text-xs sm:text-sm">{t('myListings.active')} ({activeListings.length})</TabsTrigger>
          <TabsTrigger value="sold" className="text-xs sm:text-sm">{t('myListings.sold')} ({soldListings.length})</TabsTrigger>
          <TabsTrigger value="archived" className="text-xs sm:text-sm">{t('myListings.archived')} ({archivedListings.length})</TabsTrigger>
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
      <Dialog open={boostDialogOpen} onOpenChange={(open) => { if (!open) { setConfirmBoostType(null); } setBoostDialogOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-500" /> Boost cette annonce
            </DialogTitle>
            <DialogDescription>
              {confirmBoostType ? 'Confirme ton achat' : 'Choisis le type de boost à appliquer'}
            </DialogDescription>
          </DialogHeader>

          {!confirmBoostType ? (
            <div className="space-y-3">
              <button
                onClick={() => selectBoostType('boost')}
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
                onClick={() => selectBoostType('boost_premium')}
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
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-primary/20 bg-muted/50 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${confirmBoostType === 'boost_premium' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                  {confirmBoostType === 'boost_premium' ? <Star className="h-5 w-5 text-amber-500" /> : <Rocket className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{confirmBoostType === 'boost_premium' ? 'Boost Premium' : 'Boost 48h'}</p>
                  <p className="text-xs text-muted-foreground">{confirmBoostType === 'boost_premium' ? '80 pts' : '40 pts'}</p>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Es-tu sûr de vouloir utiliser tes points pour ce boost ?
              </p>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setConfirmBoostType(null)} disabled={purchasing}>
                  Retour
                </Button>
                <Button onClick={purchaseBoost} disabled={purchasing}>
                  {purchasing ? '...' : 'Confirmer'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('myListings.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('myListings.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteListing(deleteId)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? '...' : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
