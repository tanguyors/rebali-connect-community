import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Eye, Clock, Briefcase, Heart } from 'lucide-react';
import { formatPrice, CATEGORY_ICONS, CATEGORY_PLACEHOLDERS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr, id as idLocale, es, zhCN, de, nl, ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

const DATE_LOCALES: Record<string, any> = { fr, id: idLocale, es, zh: zhCN, de, nl, ru };

interface ListingCardProps {
  listing: {
    id: string;
    title_original: string;
    price: number;
    currency: string;
    location_area: string;
    category: string;
    condition: string;
    views_count: number;
    created_at: string;
    seller_id: string;
    listing_images?: { storage_path: string }[];
    listing_translations?: { lang: string; title: string }[];
  };
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { t, language } = useLanguage();

  const { data: sellerProfile } = useQuery({
    queryKey: ['seller-profile', listing.seller_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', listing.seller_id)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: favCount } = useQuery({
    queryKey: ['fav-count', listing.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listing.id);
      return count || 0;
    },
    staleTime: 60 * 1000,
  });

  const isPro = sellerProfile?.user_type === 'business';

  const translation = listing.listing_translations?.find(tr => tr.lang === language);
  const enTranslation = listing.listing_translations?.find(tr => tr.lang === 'en');
  const title = translation?.title && translation.title !== 'Pending translation'
    ? translation.title
    : enTranslation?.title && enTranslation.title !== 'Pending translation'
      ? enTranslation.title
      : listing.title_original;

  const imageUrl = listing.listing_images?.[0]?.storage_path
    ? supabase.storage.from('listings').getPublicUrl(listing.listing_images[0].storage_path).data.publicUrl
    : CATEGORY_PLACEHOLDERS[listing.category] || '/placeholder.svg';

  const timeAgo = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: DATE_LOCALES[language],
  });

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <Badge className="absolute top-2 left-2 bg-card/90 text-foreground text-xs">
            {CATEGORY_ICONS[listing.category]} {t(`categories.${listing.category}`)}
          </Badge>
          {isPro && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs gap-1">
              <Briefcase className="h-3 w-3" />
              Pro
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-lg font-bold text-primary">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {t(`locations.${listing.location_area}`)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.views_count}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {favCount ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
