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
import { formatPrice, CATEGORY_ICONS, CATEGORY_PLACEHOLDERS } from '@/lib/constants';
import { MapPin, Eye, Phone, MessageCircle, Flag, User, Calendar, Share2, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';

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
  const seller = listing.profiles as any;

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
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="grid md:grid-cols-[1fr_350px] gap-6">
        {/* Images */}
        <div>
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
            <img
              src={images.length > 0
                ? supabase.storage.from('listings').getPublicUrl(images[currentImage]?.storage_path).data.publicUrl
                : CATEGORY_PLACEHOLDERS[listing.category] || '/placeholder.svg'}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img: any, i: number) => (
                <button key={img.id} onClick={() => setCurrentImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${i === currentImage ? 'border-primary' : 'border-transparent'}`}>
                  <img src={supabase.storage.from('listings').getPublicUrl(img.storage_path).data.publicUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{CATEGORY_ICONS[listing.category]} {t(`categories.${listing.category}`)}</Badge>
              <Badge variant="outline">{t(`conditions.${listing.condition}`)}</Badge>
              {isTranslated && <Badge variant="outline" className="text-xs">{t('listing.translatedBy')}</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{title}</h1>
            <p className="text-3xl font-bold text-primary mb-4">{formatPrice(listing.price, listing.currency)}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{t(`locations.${listing.location_area}`)}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{listing.views_count} {t('listing.views')}</span>
              <span className="flex items-center gap-1"><Heart className={`h-4 w-4 ${isFavorited ? 'text-red-500 fill-red-500' : ''}`} />{favCount ?? 0} {t('listing.favorites')}</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'DM Sans' }}>{t('listing.description')}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{description}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Seller Card */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3" style={{ fontFamily: 'DM Sans' }}>{t('listing.sellerInfo')}</h3>
              <Link to={`/seller/${seller?.id}`} className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-primary hover:underline">{seller?.display_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.memberSince')} {seller?.created_at ? new Date(seller.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </Link>
              {seller?.whatsapp && (
                <Button className="w-full mb-2 gap-2" asChild>
                  <a href={`https://wa.me/${seller.whatsapp.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your listing: ${title}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {t('listing.whatsapp')}
                  </a>
                </Button>
              )}
              {seller?.phone && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={`tel:${seller.phone}`}>
                    <Phone className="h-4 w-4" />
                    {t('listing.call')}
                  </a>
                </Button>
              )}
              {!seller?.whatsapp && !seller?.phone && (
                <p className="text-sm text-muted-foreground">{t('listing.noWhatsapp')}</p>
              )}
            </CardContent>
          </Card>

          {/* Favorite */}
          {user && (
            <Button
              variant={isFavorited ? "default" : "outline"}
              size="sm"
              className="w-full gap-2"
              onClick={toggleFavorite}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
              {isFavorited ? t('listing.removeFromFavorites') : t('listing.addToFavorites')}
            </Button>
          )}

          {/* Share */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: t('listing.linkCopied') });
            }}
          >
            <Share2 className="h-4 w-4" />
            {t('common.share')}
          </Button>

          {/* Report */}
          {user && user.id !== listing.seller_id && (
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <Flag className="h-4 w-4" />
                  {t('listing.reportListing')}
                </Button>
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
          )}
        </div>
      </div>
    </div>
  );
}
