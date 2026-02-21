import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatPrice, CATEGORY_ICONS, CATEGORY_PLACEHOLDERS } from '@/lib/constants';
import { MapPin, Eye, Phone, MessageCircle, Flag, User, Calendar, Share2, Heart, ChevronRight, ThumbsUp, Star, Briefcase, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr, id as idLocale, es, zhCN, de, nl, ru } from 'date-fns/locale';
import ListingCard from '@/components/ListingCard';

const DATE_LOCALES: Record<string, any> = { fr, id: idLocale, es, zh: zhCN, de, nl, ru };

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [currentImage, setCurrentImage] = useState(0);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(id, storage_path, sort_order), listing_translations(lang, title, description, is_machine), profiles!seller_id(id, display_name, whatsapp, phone, user_type, avatar_url, created_at)')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: favCount } = useQuery({
    queryKey: ['fav-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', id!);
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: isFavorited, refetch: refetchFav } = useQuery({
    queryKey: ['is-fav', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('listing_id', id!)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id,
  });

  const seller = listing?.profiles as any;

  const { data: sellerReviews } = useQuery({
    queryKey: ['seller-reviews', seller?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('seller_id', seller.id);
      return data || [];
    },
    enabled: !!seller?.id,
  });

  const { data: sellerListings } = useQuery({
    queryKey: ['seller-listings', seller?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('seller_id', seller.id)
        .eq('status', 'active')
        .neq('id', id!)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!seller?.id,
  });

  const { data: sellerListingCount } = useQuery({
    queryKey: ['seller-listing-count', seller?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!seller?.id,
  });

  // Similar listings: same category, exclude current listing
  const { data: similarListings } = useQuery({
    queryKey: ['similar-listings', listing?.category, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('category', listing!.category)
        .eq('status', 'active')
        .neq('id', id!)
        .order('created_at', { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!listing?.category,
  });

  useEffect(() => {
    if (id) {
      supabase.rpc('increment_views', { _listing_id: id });
    }
  }, [id]);

  if (isLoading) return <div className="container mx-auto px-4 py-8"><div className="animate-pulse h-96 bg-muted rounded-lg" /></div>;
  if (!listing) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.noResults')}</div>;

  const translation = listing.listing_translations?.find((tr: any) => tr.lang === language);
  const enTranslation = listing.listing_translations?.find((tr: any) => tr.lang === 'en');
  const title = translation?.title && translation.title !== 'Pending translation' ? translation.title : enTranslation?.title && enTranslation.title !== 'Pending translation' ? enTranslation.title : listing.title_original;
  const description = translation?.description && translation.description !== 'Pending translation' ? translation.description : enTranslation?.description && enTranslation.description !== 'Pending translation' ? enTranslation.description : listing.description_original;
  const isTranslated = translation && translation.title !== 'Pending translation';

  const images = (listing.listing_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const isPro = seller?.user_type === 'business';

  const avgRating = sellerReviews && sellerReviews.length > 0
    ? (sellerReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / sellerReviews.length).toFixed(1)
    : null;

  const timeAgo = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: DATE_LOCALES[language],
  });

  const toggleFavorite = async () => {
    if (!user) return;
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('listing_id', id!).eq('user_id', user.id);
    } else {
      await supabase.from('favorites').insert({ listing_id: id!, user_id: user.id });
    }
    refetchFav();
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;
    await supabase.from('reports').insert({
      listing_id: listing.id,
      reporter_id: user.id,
      reason: reportReason as any,
      details: reportDetails,
    });
    toast({ title: t('report.submitted'), description: t('report.thankYou') });
    setReportOpen(false);
    setReportReason('');
    setReportDetails('');
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-foreground hover:underline">{t('nav.home')}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/browse?category=${listing.category}`} className="hover:text-foreground hover:underline">
            {t(`categories.${listing.category}`)}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground truncate max-w-[200px]">{title}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 pb-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left column */}
          <div>
            {/* Image gallery */}
            <div className="relative rounded-xl overflow-hidden bg-muted mb-2">
              <div className="aspect-[4/3]">
                <img
                  src={images.length > 0
                    ? supabase.storage.from('listings').getPublicUrl(images[currentImage]?.storage_path).data.publicUrl
                    : CATEGORY_PLACEHOLDERS[listing.category] || '/placeholder.svg'}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Share & Fav floating buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: t('listing.linkCopied') }); }}
                  className="w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-md"
                >
                  <Share2 className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={toggleFavorite}
                  className="w-10 h-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-md"
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-foreground'}`} />
                </button>
              </div>
              {/* Photo count */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur text-foreground text-sm font-semibold px-3 py-1.5 rounded-lg shadow-md">
                  {t('listing.seePhotos')} ({images.length})
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => setCurrentImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${i === currentImage ? 'border-primary' : 'border-transparent hover:border-border'}`}>
                    <img src={supabase.storage.from('listings').getPublicUrl(img.storage_path).data.publicUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Price */}
            <div className="mt-6">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{title}</h1>
              <p className="text-3xl font-extrabold text-primary mb-1">{formatPrice(listing.price, listing.currency)}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                <span>{timeAgo}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{listing.views_count}</span>
                <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{favCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="rounded-full gap-1.5 px-3 py-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t(`locations.${listing.location_area}`)}
                </Badge>
                {isTranslated && <Badge variant="outline" className="rounded-full text-xs">{t('listing.translatedBy')}</Badge>}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Key Information */}
            <div>
              <h2 className="text-xl font-extrabold mb-4">{t('listing.keyInfo')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <ThumbsUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('listing.condition')}</p>
                    <p className="font-bold">{t(`conditions.${listing.condition}`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_ICONS[listing.category]}</span>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('listing.category')}</p>
                    <p className="font-bold">{t(`categories.${listing.category}`)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Description */}
            <div>
              <h2 className="text-xl font-extrabold mb-3">{t('listing.description')}</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{description}</p>
            </div>

            <Separator className="my-6" />

            {/* Location */}
            <div>
              <h2 className="text-xl font-extrabold mb-3">{t('listing.location')}</h2>
              <p className="font-bold mb-3">{t(`locations.${listing.location_area}`)}, Bali</p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(t(`locations.${listing.location_area}`) + ', Bali, Indonesia')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow"
              >
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(t(`locations.${listing.location_area}`) + ',Bali,Indonesia')}&zoom=13&size=700x300&scale=2&maptype=roadmap&key=&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:water|color:0xc9d6e5`}
                  alt={t(`locations.${listing.location_area}`)}
                  className="w-full h-48 object-cover bg-muted"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="bg-muted/50 w-full h-48 flex items-center justify-center" style={{ marginTop: '-12rem' }}>
                  <div className="bg-card rounded-xl shadow-md px-5 py-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-bold">{t(`locations.${listing.location_area}`)}, Bali</span>
                  </div>
                </div>
              </a>
            </div>

            <Separator className="my-6" />
            <div>
              <h2 className="text-xl font-extrabold mb-4">{t('listing.soldBy')}</h2>
              <Link to={`/seller/${seller?.id}`} className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {seller?.avatar_url ? (
                    <img src={seller.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <User className="h-7 w-7 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg group-hover:text-primary transition-colors">{seller?.display_name || 'User'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {avgRating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-4 w-4 text-accent fill-accent" />
                        {avgRating} ({sellerReviews?.length})
                      </span>
                    )}
                    <span>{sellerListingCount} {t('seller.activeListings')}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{t('profile.memberSince')} {seller?.created_at ? new Date(seller.created_at).toLocaleDateString() : ''}</span>
              </div>
              {isPro && (
                <Badge className="mt-2 bg-primary text-primary-foreground gap-1 rounded-full">
                  <Briefcase className="h-3.5 w-3.5" />
                  Pro
                </Badge>
              )}
            </div>

            {/* Seller's other listings */}
            {sellerListings && sellerListings.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold">{t('listing.sellerListings')}</h2>
                    <Button variant="ghost" size="sm" asChild className="gap-1 text-primary font-bold">
                      <Link to={`/seller/${seller?.id}`}>
                        {t('listing.seeMoreListings')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sellerListings.map((l: any) => (
                      <ListingCard key={l.id} listing={l} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Report */}
            {user && user.id !== listing.seller_id && (
              <div className="mt-6 pt-4 border-t border-border">
                <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Flag className="h-4 w-4" />
                      {t('listing.reportListing')}
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('report.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={reportReason} onValueChange={setReportReason}>
                        <SelectTrigger><SelectValue placeholder={t('report.reason')} /></SelectTrigger>
                        <SelectContent>
                          {['scam','prohibited','duplicate','spam','wrong_category','other'].map(r => (
                            <SelectItem key={r} value={r}>{t(`report.${r}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea placeholder={t('report.detailsPlaceholder')} value={reportDetails} onChange={e => setReportDetails(e.target.value)} />
                      <Button onClick={handleReport} disabled={!reportReason} className="w-full">{t('common.submit')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Similar listings */}
            {similarListings && similarListings.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold">{t('listing.similarListings')}</h2>
                    <Button variant="ghost" size="sm" asChild className="gap-1 text-primary font-bold">
                      <Link to={`/browse?category=${listing.category}`}>
                        {t('common.viewAll')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {similarListings.map((l: any) => (
                      <ListingCard key={l.id} listing={l} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Seller card */}
              <Card className="shadow-md">
                <CardContent className="p-5">
                  <Link to={`/seller/${seller?.id}`} className="flex items-center gap-3 mb-4 group">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {seller?.avatar_url ? (
                        <img src={seller.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold group-hover:text-primary transition-colors">{seller?.display_name || 'User'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {avgRating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                            {avgRating} ({sellerReviews?.length})
                          </span>
                        )}
                        <span>{sellerListingCount} {t('seller.activeListings')}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>

                  {/* CTA Buttons like LeBonCoin */}
                  <div className="space-y-2.5">
                    {seller?.whatsapp && (
                      <Button className="w-full gap-2 rounded-full font-bold text-base h-12" asChild>
                        <a href={`https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your listing: ${title}`} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-5 w-5" />
                          {t('listing.whatsapp')}
                        </a>
                      </Button>
                    )}
                    {seller?.phone && (
                      <Button variant="outline" className="w-full gap-2 rounded-full font-bold text-base h-12" asChild>
                        <a href={`tel:${seller.phone}`}>
                          <Phone className="h-5 w-5" />
                          {t('listing.call')}
                        </a>
                      </Button>
                    )}
                    {!seller?.whatsapp && !seller?.phone && (
                      <p className="text-sm text-muted-foreground text-center py-2">{t('listing.noWhatsapp')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Favorite button */}
              {user && (
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  className="w-full gap-2 rounded-full font-bold h-11"
                  onClick={toggleFavorite}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? t('listing.removeFromFavorites') : t('listing.addToFavorites')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 flex gap-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <button
          onClick={toggleFavorite}
          className="w-12 h-12 rounded-full border border-border flex items-center justify-center flex-shrink-0"
        >
          <Heart className={`h-5 w-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-foreground'}`} />
        </button>
        {seller?.whatsapp ? (
          <Button className="flex-1 gap-2 rounded-full font-bold text-base h-12" asChild>
            <a href={`https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your listing: ${title}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              {t('listing.contactBtn')}
            </a>
          </Button>
        ) : seller?.phone ? (
          <Button className="flex-1 gap-2 rounded-full font-bold text-base h-12" asChild>
            <a href={`tel:${seller.phone}`}>
              <Phone className="h-5 w-5" />
              {t('listing.call')}
            </a>
          </Button>
        ) : (
          <Button className="flex-1 rounded-full font-bold text-base h-12" disabled>
            {t('listing.contactBtn')}
          </Button>
        )}
      </div>
    </div>
  );
}
