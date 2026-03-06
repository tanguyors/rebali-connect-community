import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import ListingCard from '@/components/ListingCard';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

export default function Favorites() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const blockedIds = useBlockedUsers();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['my-favorites', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('favorites')
        .select('listing_id, listings!favorites_listing_id_fkey(*, listing_images(storage_path, sort_order), listing_translations(lang, title))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data || [])
        .map((f: any) => f.listings)
        .filter((l: any) => l && l.status === 'active' && !blockedIds.includes(l.seller_id));
    },
    enabled: !!user,
  });

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold mb-6">{t('favorites.title')}</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : favorites && favorites.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('favorites.empty')}</p>
          <Button asChild>
            <Link to="/browse">{t('nav.browse')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
