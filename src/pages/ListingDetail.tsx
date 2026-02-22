import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { formatPrice, CATEGORY_ICONS, CATEGORY_PLACEHOLDERS, REBALI_WA_NUMBER } from '@/lib/constants';
import { MapPin, Eye, Phone, MessageCircle, Flag, User, Calendar, Share2, Heart, ChevronRight, ThumbsUp, Star, Briefcase, ArrowRight, ShieldCheck } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { fr, id as idLocale, es, zhCN, de, nl, ru } from 'date-fns/locale';
import ListingCard from '@/components/ListingCard';

const DATE_LOCALES: Record<string, any> = { fr, id: idLocale, es, zh: zhCN, de, nl, ru };

const BALI_COORDS: Record<string, { lat: string; lng: string; bbox: string }> = {
  canggu: { lat: '-8.6478', lng: '115.1385', bbox: '115.08,-8.70,115.19,-8.59' },
  ubud: { lat: '-8.5069', lng: '115.2625', bbox: '115.21,-8.56,115.32,-8.45' },
  seminyak: { lat: '-8.6913', lng: '115.1686', bbox: '115.12,-8.74,115.22,-8.64' },
  lovina: { lat: '-8.1520', lng: '115.0255', bbox: '114.97,-8.20,115.08,-8.10' },
  uluwatu: { lat: '-8.8291', lng: '115.0849', bbox: '115.03,-8.88,115.14,-8.78' },
  denpasar: { lat: '-8.6500', lng: '115.2167', bbox: '115.17,-8.70,115.27,-8.60' },
  sanur: { lat: '-8.6928', lng: '115.2620', bbox: '115.21,-8.74,115.31,-8.64' },
  nusa_dua: { lat: '-8.8003', lng: '115.2333', bbox: '115.18,-8.85,115.29,-8.75' },
  nusa_penida: { lat: '-8.7275', lng: '115.5444', bbox: '115.44,-8.80,115.62,-8.66' },
  kuta: { lat: '-8.7180', lng: '115.1690', bbox: '115.12,-8.77,115.22,-8.67' },
  jimbaran: { lat: '-8.7900', lng: '115.1650', bbox: '115.12,-8.84,115.22,-8.74' },
  tabanan: { lat: '-8.5410', lng: '115.1250', bbox: '115.07,-8.59,115.18,-8.49' },
  karangasem: { lat: '-8.4484', lng: '115.6127', bbox: '115.56,-8.50,115.67,-8.40' },
  singaraja: { lat: '-8.1120', lng: '115.0880', bbox: '115.04,-8.16,115.14,-8.06' },
  other: { lat: '-8.4095', lng: '115.1889', bbox: '114.43,-8.85,115.71,-8.06' },
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [mobileContactOpen, setMobileContactOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(id, storage_path, sort_order), listing_translations(lang, title, description, is_machine), profiles!seller_id(id, display_name, whatsapp, phone, user_type, avatar_url, created_at, is_verified_seller)')
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
      supabase.rpc('increment_views', { _listing_id: id }).then(({ error }) => {
        if (error) console.error('increment_views error:', error);
      });
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

  const handleSendMessage = async () => {
    if (!user || !listing || user.id === listing.seller_id) return;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('buyer_id', user.id)
      .eq('seller_id', listing.seller_id)
      .maybeSingle();
    if (existing) {
      navigate(`/messages?conv=${existing.id}`);
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
        .select('id')
        .single();
      if (newConv) {
        toast({ title: t('messages.conversationStarted') });
        navigate(`/messages?conv=${newConv.id}`);
      }
    }
  };

  const handleLoginFromDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('common.login') + ' ✓' });
      setLoginDialogOpen(false);
      setLoginEmail('');
      setLoginPassword('');
    }
    setLoginLoading(false);
  };

  const handleMagicLinkFromDialog = async () => {
    if (!loginEmail) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: loginEmail });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.magicLinkSent') });
    setLoginLoading(false);
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
                className="block rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow relative"
              >
                <iframe
                  title="Map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${BALI_COORDS[listing.location_area]?.bbox || '115.1,-8.8,115.3,-8.6'}&layer=mapnik&marker=${BALI_COORDS[listing.location_area]?.lat || '-8.65'},${BALI_COORDS[listing.location_area]?.lng || '115.2'}`}
                  className="w-full h-52 pointer-events-none"
                  style={{ border: 0 }}
                />
                <div className="absolute bottom-3 left-3 bg-card rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{t(`locations.${listing.location_area}`)}, Bali</span>
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
              <div className="flex items-center gap-2 mt-2">
                {isPro && (
                  <Badge className="bg-primary text-primary-foreground gap-1 rounded-full">
                    <Briefcase className="h-3.5 w-3.5" />
                    Pro
                  </Badge>
                )}
                {seller?.is_verified_seller && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t('security.verifiedSeller')}
                  </Badge>
                )}
              </div>
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold group-hover:text-primary transition-colors">{seller?.display_name || 'User'}</p>
                        {seller?.is_verified_seller && (
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        )}
                      </div>
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

                  {/* CTA Buttons - WhatsApp Proxy */}
                  <div className="space-y-2.5">
                    {user && user.id !== listing.seller_id ? (
                      <Button className="w-full gap-2 rounded-full font-bold text-base h-12" asChild>
                        <a
                          href={`https://wa.me/${REBALI_WA_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in your item "${title}" at ${formatPrice(listing.price, listing.currency)}. Is it still available?\n—\nref:RB|L=${listing.id}|B=${user.id}|`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { supabase.from('whatsapp_click_logs').insert({ listing_id: listing.id, user_id: user.id }); }}
                        >
                          <MessageCircle className="h-5 w-5" />
                          {t('listing.contactWhatsApp')}
                        </a>
                      </Button>
                    ) : !user ? (
                      <Button className="w-full gap-2 rounded-full font-bold text-base h-12" onClick={() => setLoginDialogOpen(true)}>
                        <MessageCircle className="h-5 w-5" />
                        {t('listing.contactWhatsApp')}
                      </Button>
                    ) : null}
                    {seller?.phone_verified && (
                      <div className="flex items-center justify-center gap-1.5 text-sm text-green-600">
                        <ShieldCheck className="h-4 w-4" />
                        {t('listing.phoneVerified')}
                      </div>
                    )}
                    {user && user.id !== listing.seller_id && (
                      <Button variant="secondary" className="w-full gap-2 rounded-full font-bold text-base h-12" onClick={handleSendMessage}>
                        <MessageCircle className="h-5 w-5" />
                        {t('messages.sendMessage')}
                      </Button>
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

      {/* Mobile bottom bar with Drawer */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-card border-t border-border px-4 py-3 flex gap-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <button
          onClick={toggleFavorite}
          className="w-12 h-12 rounded-full border border-border flex items-center justify-center flex-shrink-0"
        >
          <Heart className={`h-5 w-5 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-foreground'}`} />
        </button>

        <Drawer open={mobileContactOpen} onOpenChange={(open) => {
          setMobileContactOpen(open);
          if (open && !customMessage) {
            setCustomMessage(`Hi, I'm interested in your item "${title}" at ${formatPrice(listing.price, listing.currency)}. Is it still available?`);
          }
        }}>
          <DrawerTrigger asChild>
            <Button className="flex-1 gap-2 rounded-full font-bold text-base h-12" onClick={() => {
              if (!user) { setLoginDialogOpen(true); return; }
              if (user.id === listing.seller_id) return;
              setMobileContactOpen(true);
            }}>
              <MessageCircle className="h-5 w-5" />
              {t('listing.contactWhatsApp')}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('listing.contactWhatsApp')}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              {/* Seller info */}
              <Link to={`/seller/${seller?.id}`} className="flex items-center gap-3 group" onClick={() => setMobileContactOpen(false)}>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {seller?.avatar_url ? (
                    <img src={seller.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold group-hover:text-primary transition-colors">{seller?.display_name || 'User'}</p>
                    {seller?.is_verified_seller && <ShieldCheck className="h-4 w-4 text-green-600" />}
                  </div>
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

              {isPro && (
                <Badge className="bg-primary text-primary-foreground gap-1 rounded-full">
                  <Briefcase className="h-3.5 w-3.5" />
                  Pro
                </Badge>
              )}

              <Separator />

              {/* Message form */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('listing.yourMessage')}</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Send via WhatsApp */}
              <Button 
                className="w-full gap-2 rounded-full font-bold text-base h-12" 
                onClick={() => {
                  const waUrl = `https://wa.me/${REBALI_WA_NUMBER}?text=${encodeURIComponent(`${customMessage}\n—\nref:RB|L=${listing.id}|B=${user?.id || ''}|`)}`;
                  window.open(waUrl, '_blank', 'noopener,noreferrer');
                  if (user) supabase.from('whatsapp_click_logs').insert({ listing_id: listing.id, user_id: user.id });
                  setMobileContactOpen(false);
                }}
              >
                <MessageCircle className="h-5 w-5" />
                {t('listing.sendViaWhatsApp')}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('listing.loginToContact')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLoginFromDialog} className="space-y-4">
            <div>
              <Label>{t('auth.email')}</Label>
              <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
            </div>
            <div>
              <Label>{t('auth.password')}</Label>
              <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loginLoading}>{t('common.login')}</Button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={handleMagicLinkFromDialog} className="text-primary hover:underline">{t('auth.magicLink')}</button>
              <button type="button" onClick={() => { setLoginDialogOpen(false); navigate('/auth?tab=signup'); }} className="text-primary hover:underline">{t('common.signup')}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
