import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ListingCard from '@/components/ListingCard';
import AnimatedHeroText from '@/components/AnimatedHeroText';
import { Search, Plus, ArrowRight } from 'lucide-react';
import CategoryMarquee from '@/components/CategoryMarquee';
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
      <CategoryMarquee />

      {/* Hero – friendly & colorful */}
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

      {/* Categories grid */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-xl md:text-2xl font-extrabold mb-6">{t('nav.browse')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/browse?category=${cat}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{CATEGORY_ICONS[cat]}</span>
              <span className="text-xs font-semibold text-center text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                {t(`categories.${cat}`)}
              </span>
            </Link>
          ))}
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
            <Button size="lg" variant="secondary" className="rounded-full gap-2 px-8 font-bold shadow-md" asChild>
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
            <h2 className="text-xl md:text-2xl font-extrabold">{t('home.latest')}</h2>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary font-bold">
              <Link to="/browse">
                {t('common.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
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
    </div>
  );
}
