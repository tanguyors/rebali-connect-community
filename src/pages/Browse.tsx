import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useListingBoosts, useListingFavCounts } from '@/hooks/useListingEnrichment';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/ListingCard';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CATEGORIES, LOCATIONS, CONDITIONS, CATEGORY_TREE, LOCATION_COORDS, getDistanceKm } from '@/lib/constants';
import { SlidersHorizontal, X, MapPin, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const PAGE_SIZE = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Browse() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [location, setLocation] = useState(searchParams.get('location') || 'all');
  const [subcategory, setSubcategory] = useState('all');
  const [condition, setCondition] = useState('all');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoError(t('filters.geoNotSupported'));
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation('all');
        setGeoLoading(false);
      },
      () => {
        setGeoError(t('filters.geoError'));
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearGeo = () => {
    setUserCoords(null);
    setRadiusKm(25);
  };

  // Infinite query
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['listings', debouncedSearch, category, subcategory, location, condition, sort, minPrice, maxPrice],
    queryFn: async ({ pageParam = 0 }) => {
      // If searching, use multilingual search RPC to get matching IDs first
      let matchingIds: string[] | null = null;
      if (debouncedSearch) {
        const { data: ids } = await supabase.rpc('search_listings', { search_term: debouncedSearch });
        matchingIds = (ids as string[]) || [];
        if (matchingIds.length === 0) return [];
      }

      let query = supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title), profiles:seller_id(user_type, is_verified_seller)')
        .eq('status', 'active');

      if (matchingIds) query = query.in('id', matchingIds);
      if (category !== 'all') query = query.eq('category', category as any);
      if (subcategory !== 'all') query = query.eq('subcategory', subcategory);
      if (location !== 'all') query = query.eq('location_area', location);
      if (condition !== 'all') query = query.eq('condition', condition as any);
      if (minPrice) query = query.gte('price', Number(minPrice));
      if (maxPrice) query = query.lte('price', Number(maxPrice));

      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'price_low') query = query.order('price', { ascending: true });
      else if (sort === 'price_high') query = query.order('price', { ascending: false });

      const { data } = await query.range(pageParam, pageParam + PAGE_SIZE - 1);
      return data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((acc, page) => acc + page.length, 0);
    },
  });

  // Flatten all pages into a single array
  const listings = useMemo(() => data?.pages.flat() || [], [data]);

  // Batch fetch boosts & fav counts
  const listingIds = listings.map((l: any) => l.id);
  const { data: boostsMap } = useListingBoosts(listingIds);
  const { data: favCountsMap } = useListingFavCounts(listingIds);

  // Filter by distance client-side, then sort boosted listings first
  const filteredListings = useMemo(() => {
    let result = listings;
    if (userCoords) {
      result = result.filter((l: any) => {
        const coords = LOCATION_COORDS[l.location_area];
        if (!coords) return true;
        return getDistanceKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng) <= radiusKm;
      });
    }
    if (boostsMap && boostsMap.size > 0) {
      result = [...result].sort((a: any, b: any) => {
        const aBoost = boostsMap.has(a.id) ? 1 : 0;
        const bBoost = boostsMap.has(b.id) ? 1 : 0;
        return bBoost - aBoost;
      });
    }
    return result;
  }, [listings, userCoords, radiusKm, boostsMap]);

  // Intersection Observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setSubcategory('all');
    setLocation('all');
    setCondition('all');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    clearGeo();
    setSearchParams({});
  };

  const hasFilters = search || category !== 'all' || subcategory !== 'all' || location !== 'all' || condition !== 'all' || minPrice || maxPrice || userCoords;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">{t('nav.browse')}</h1>

      {/* Search bar with autocomplete */}
      <div className="flex gap-2 mb-4">
        <SearchAutocomplete value={search} onChange={setSearch} />
        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 ${showFilters ? '' : 'hidden md:grid'}`}>
        <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory('all'); }}>
          <SelectTrigger><SelectValue placeholder={t('filters.allCategories')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {category !== 'all' && CATEGORY_TREE[category] && (
          <Select value={subcategory} onValueChange={setSubcategory}>
            <SelectTrigger><SelectValue placeholder={t('filters.allSubcategories')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allSubcategories')}</SelectItem>
              {CATEGORY_TREE[category].map(sc => (
                <SelectItem key={sc} value={sc}>{t(`subcategories.${sc}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger><SelectValue placeholder={t('filters.allLocations')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allLocations')}</SelectItem>
            {LOCATIONS.map(l => (
              <SelectItem key={l} value={l}>{t(`locations.${l}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger><SelectValue placeholder={t('filters.allConditions')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allConditions')}</SelectItem>
            {CONDITIONS.map(c => (
              <SelectItem key={c} value={c}>{t(`conditions.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('filters.sortNewest')}</SelectItem>
            <SelectItem value="price_low">{t('filters.sortPriceLow')}</SelectItem>
            <SelectItem value="price_high">{t('filters.sortPriceHigh')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price range + Geolocation */}
      <div className={`flex flex-wrap items-end gap-3 mb-6 ${showFilters ? '' : 'hidden md:flex'}`}>
        <Input
          type="number"
          placeholder={t('filters.minPrice')}
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          className="w-32"
        />
        <Input
          type="number"
          placeholder={t('filters.maxPrice')}
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          className="w-32"
        />
        <div className="flex-1" />
        {userCoords ? (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-primary">
              <MapPin className="h-4 w-4" />
              <span>{t('filters.localized')}</span>
            </div>
            <div className="flex items-center gap-2 w-48">
              <Slider
                value={[radiusKm]}
                onValueChange={([v]) => setRadiusKm(v)}
                min={1}
                max={100}
                step={1}
              />
              <span className="text-sm font-medium whitespace-nowrap">{radiusKm} km</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearGeo} className="gap-1 text-muted-foreground">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={locateMe} disabled={geoLoading} className="gap-1.5">
            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {t('filters.locateMe')}
          </Button>
        )}
        {geoError && <p className="text-xs text-destructive">{geoError}</p>}
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-4 gap-1">
          <X className="h-3 w-3" /> {t('filters.clearFilters')}
        </Button>
      )}

      {/* Results */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredListings?.length || 0} {t('filters.results')}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredListings && filteredListings.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} boostTypes={boostsMap?.get(listing.id)} favCount={favCountsMap?.get(listing.id) ?? 0} />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
            {!hasNextPage && filteredListings.length >= PAGE_SIZE && (
              <p className="text-sm text-muted-foreground">{t('filters.noMoreResults') || 'No more results'}</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">{t('common.noResults')}</p>
        </div>
      )}
    </div>
  );
}
