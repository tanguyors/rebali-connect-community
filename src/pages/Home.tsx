import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import ListingCard from '@/components/ListingCard';
import AnimatedHeroText from '@/components/AnimatedHeroText';
import { Search, Camera, MessageCircle, Handshake, Sparkles } from 'lucide-react';
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

  const steps = [
    { icon: Camera, title: t('home.step1Title'), desc: t('home.step1Desc') },
    { icon: MessageCircle, title: t('home.step2Title'), desc: t('home.step2Desc') },
    { icon: Handshake, title: t('home.step3Title'), desc: t('home.step3Desc') },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <AnimatedHeroText />
          </div>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('home.heroSub')}
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button type="submit" size="lg">{t('common.search')}</Button>
          </form>
        </div>
      </section>

      {/* Categories - horizontal scroll on mobile */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">{t('home.categories')}</h2>
        <div className="flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-7 md:overflow-visible scrollbar-hide">
          {CATEGORIES.map(cat => (
            <Link key={cat} to={`/browse?category=${cat}`} className="flex-shrink-0 w-28 md:w-auto">
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="p-4 text-center">
                  <span className="text-3xl mb-2 block">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-xs md:text-sm font-medium">{t(`categories.${cat}`)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Listings */}
      {listings && listings.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">{t('home.latest')}</h2>
            <Button variant="ghost" asChild>
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

      {/* How it works */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t('home.howItWorks')}</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 md:p-12">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('home.freePlatform')}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">{t('home.freeDesc')}</p>
          <Button size="lg" asChild>
            <Link to="/create">{t('nav.sell')} →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
