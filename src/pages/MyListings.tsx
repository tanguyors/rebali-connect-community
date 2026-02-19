import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, CATEGORY_ICONS, MAX_ACTIVE_LISTINGS } from '@/lib/constants';
import { Plus, Eye, ArchiveRestore } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function MyListings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  if (!user) { navigate('/auth'); return null; }

  const activeListings = listings?.filter((l: any) => l.status === 'active') || [];
  const soldListings = listings?.filter((l: any) => l.status === 'sold') || [];
  const archivedListings = listings?.filter((l: any) => l.status === 'archived') || [];

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('listings').update({ status: status as any }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['my-listings'] });
    toast({ title: `Listing ${status}` });
  };

  const ListingRow = ({ listing }: { listing: any }) => {
    const imgUrl = listing.listing_images?.[0]?.storage_path
      ? supabase.storage.from('listings').getPublicUrl(listing.listing_images[0].storage_path).data.publicUrl
      : '/placeholder.svg';
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-3 flex gap-3">
          <img src={imgUrl} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{listing.title_original}</h3>
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
    </div>
  );
}
