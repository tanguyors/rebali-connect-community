import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ListingCard from '@/components/ListingCard';
import AnimatedHeroText from '@/components/AnimatedHeroText';
import { Search, Plus, Sparkles } from 'lucide-react';
import { CATEGORIES, CATEGORY_ICONS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: listings } = useQuery({
    queryKey: ['latest-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div>
      {/* Hero – clean & minimal like LeBonCoin */}
      <section className="bg-card border-b border-border/50">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <div className="mb-4">
            <AnimatedHeroText />
          </div>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('home.heroSub')}
          </p>
          <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base border-border bg-background rounded-full"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full px-6">{t('common.search')}</Button>
          </form>
        </div>
      </section>

      {/* Categories – horizontal row */}
      <section className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                to={`/browse?category=${cat}`}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-primary"
              >
                <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                <span>{t(`categories.${cat}`)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner – warm peach/coral like LeBonCoin */}
      <section className="container mx-auto px-4 mt-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent/15 via-accent/10 to-primary/10 px-8 py-10 md:py-12">
          {/* Decorative blob */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/20 rounded-full blur-2xl" />
          <div className="absolute -left-6 -bottom-8 w-32 h-32 bg-primary/15 rounded-full blur-2xl" />
          <div className="relative z-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('home.freePlatform')}</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">{t('home.freeDesc')}</p>
            <Button size="lg" className="rounded-full gap-2 px-8 shadow-md" asChild>
              <Link to="/create">
                <Plus className="h-5 w-5" />
                {t('nav.sell')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Listings */}
      {listings && listings.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t('home.latest')}</h2>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary">
              <Link to="/browse">{t('common.viewAll')} →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* How it works – simple cards */}
      <section className="bg-card border-t border-border/50 py-14 mt-4">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t('home.howItWorks')}</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { emoji: '📸', title: t('home.step1Title'), desc: t('home.step1Desc') },
              { emoji: '💬', title: t('home.step2Title'), desc: t('home.step2Desc') },
              { emoji: '🤝', title: t('home.step3Title'), desc: t('home.step3Desc') },
            ].map((step, i) => (
              <div key={i} className="text-center p-6">
                <span className="text-4xl mb-3 block">{step.emoji}</span>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
