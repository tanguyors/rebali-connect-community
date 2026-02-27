import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ListingCard from '@/components/ListingCard';
import ListingMarquee from '@/components/ListingMarquee';
import AnimatedHeroText from '@/components/AnimatedHeroText';
import { Search, Plus, ArrowRight, Star } from 'lucide-react';
import CategoryMarquee from '@/components/CategoryMarquee';
import { CATEGORY_ICONS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useListingBoosts, useListingFavCounts } from '@/hooks/useListingEnrichment';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

function useCategoryListings(category: string) {
  return useQuery({
    queryKey: ['category-listings', category],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title), profiles:seller_id(user_type, is_verified_seller), favorites(count)')
        .eq('status', 'active')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });
}

function useFeaturedListings() {
  return useQuery({
    queryKey: ['featured-listings'],
    queryFn: async () => {
      const { data: boosts } = await supabase
        .from('user_addons')
        .select('listing_id')
        .eq('addon_type', 'boost_premium')
        .eq('active', true);

      if (!boosts || boosts.length === 0) return [];

      const listingIds = boosts.map(b => b.listing_id).filter(Boolean) as string[];
      if (listingIds.length === 0) return [];

      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title), profiles:seller_id(user_type, is_verified_seller), favorites(count)')
        .eq('status', 'active')
        .in('id', listingIds)
        .limit(20);

      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['latest-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title), profiles:seller_id(user_type, is_verified_seller), favorites(count)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: featuredListings, isLoading: featuredLoading } = useFeaturedListings();

  // Batch fetch boosts & fav counts for all listings (eliminates N+1)
  const latestIds = (listings || []).map((l: any) => l.id);
  const featuredIds = (featuredListings || []).map((l: any) => l.id);
  const allIds = [...new Set([...latestIds, ...featuredIds])];
  const { data: boostsMap } = useListingBoosts(allIds);
  const { data: favCountsMap } = useListingFavCounts(allIds);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
  };

  const hasFeatured = !featuredLoading && featuredListings && featuredListings.length > 0;

  return (
    <div>
      <CategoryMarquee />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-14 md:py-20 text-center relative z-10">
          <div className="mb-5">
            <AnimatedHeroText />
          </div>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto font-medium">
            {t('home.heroSub')}
          </p>
          <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-11 h-13 text-base border-border bg-card rounded-full shadow-sm"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full px-7 font-bold shadow-md">{t('common.search')}</Button>
          </form>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-10 md:py-12">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="absolute -left-6 -bottom-8 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          <div className="relative z-10 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-primary-foreground">{t('home.freePlatform')}</h2>
            <p className="text-primary-foreground/80 max-w-md mx-auto mb-6 font-medium">{t('home.freeDesc')}</p>
            <Button size="lg" variant="secondary" className="rounded-full gap-2 px-8 font-bold shadow-md" onClick={() => navigate(user ? '/create' : '/auth')}>
                <Plus className="h-5 w-5" />
                {t('nav.sell')}
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Listings - Marquee */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-extrabold">{t('home.latest')}</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary font-bold">
            <Link to="/browse">
              {t('common.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ListingMarquee listings={listings || []} isLoading={isLoading} emptyMessage={t('common.noResults')} />
      </section>

      {/* ⭐ Featured / En Vedette - Large cards grid */}
      {(featuredLoading || hasFeatured) && (
        <section className="bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10 border-y border-amber-200/30 py-10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                {t('home.featured')}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ))
              ) : (
                featuredListings!.map((listing: any, i: number) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <ListingCard listing={listing} boostTypes={boostsMap?.get(listing.id)} favCount={favCountsMap?.get(listing.id) ?? 0} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-card border-t border-border/50 py-14 mt-4">
        <div className="container mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-extrabold text-center mb-10">{t('home.howItWorks')}</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { emoji: '📸', title: t('home.step1Title'), desc: t('home.step1Desc') },
              { emoji: '💬', title: t('home.step2Title'), desc: t('home.step2Desc') },
              { emoji: '🤝', title: t('home.step3Title'), desc: t('home.step3Desc') },
            ].map((step, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-background border border-border/50">
                <span className="text-5xl mb-4 block">{step.emoji}</span>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category: Immobilier (with featured injection) */}
      <CategoryRow category="immobilier" featuredListings={featuredListings} />

      {/* Category: Emploi (with featured injection) */}
      <CategoryRow category="emploi" featuredListings={featuredListings} />
    </div>
  );
}

function CategoryRow({ category, featuredListings }: { category: string; featuredListings?: any[] }) {
  const { t } = useLanguage();
  const { data: listings, isLoading } = useCategoryListings(category);

  // Use a stable ref for randomization to avoid re-shuffling on every render
  const seedRef = useRef(Math.random());

  // Inject 1-2 featured listings into the category marquee (stable order)
  const mergedListings = useMemo(() => {
    if (!listings || listings.length === 0) return [];
    if (!featuredListings || featuredListings.length === 0) return listings;

    const categoryIds = new Set(listings.map((l: any) => l.id));
    const eligible = featuredListings.filter((f: any) => !categoryIds.has(f.id));
    // Stable shuffle using seed
    const seed = seedRef.current;
    const shuffled = [...eligible].sort((a, b) => {
      const ha = (a.id.charCodeAt(0) * seed) % 1;
      const hb = (b.id.charCodeAt(0) * seed) % 1;
      return ha - hb;
    });
    const toInject = shuffled.slice(0, Math.min(2, shuffled.length));

    if (toInject.length === 0) return listings;

    const result = [...listings];
    toInject.forEach((item: any, idx: number) => {
      const pos = Math.min(Math.floor((seed * (idx + 1) * 7) % (result.length + 1)), result.length);
      result.splice(pos, 0, item);
    });
    return result;
  }, [listings, featuredListings]);

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
          {CATEGORY_ICONS[category]} {t(`categories.${category}`)}
        </h2>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary font-bold">
          <Link to={`/browse?category=${category}`}>
            {t('common.viewAll')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <ListingMarquee listings={mergedListings} isLoading={isLoading} emptyMessage={t('common.noResults')} />
    </section>
  );
}
