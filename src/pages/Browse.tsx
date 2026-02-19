import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/ListingCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, LOCATIONS, CONDITIONS } from '@/lib/constants';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Browse() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [location, setLocation] = useState(searchParams.get('location') || 'all');
  const [condition, setCondition] = useState('all');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', search, category, location, condition, sort],
    queryFn: async () => {
      let query = supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('status', 'active');

      if (search) query = query.or(`title_original.ilike.%${search}%,description_original.ilike.%${search}%`);
      if (category !== 'all') query = query.eq('category', category as any);
      if (location !== 'all') query = query.eq('location_area', location);
      if (condition !== 'all') query = query.eq('condition', condition as any);

      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'price_low') query = query.order('price', { ascending: true });
      else if (sort === 'price_high') query = query.order('price', { ascending: false });

      const { data } = await query.limit(50);
      return data || [];
    },
  });

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setLocation('all');
    setCondition('all');
    setSort('newest');
    setSearchParams({});
  };

  const hasFilters = search || category !== 'all' || location !== 'all' || condition !== 'all';

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">{t('nav.browse')}</h1>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('home.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 ${showFilters ? '' : 'hidden md:grid'}`}>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder={t('filters.allCategories')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger><SelectValue placeholder={t('filters.allLocations')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allLocations')}</SelectItem>
            {LOCATIONS.map(l => (
              <SelectItem key={l} value={l}>{l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
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

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-4 gap-1">
          <X className="h-3 w-3" /> {t('filters.clearFilters')}
        </Button>
      )}

      {/* Results */}
      <p className="text-sm text-muted-foreground mb-4">
        {listings?.length || 0} {t('filters.results')}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : listings && listings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">{t('common.noResults')}</p>
        </div>
      )}
    </div>
  );
}
