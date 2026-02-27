import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, Rocket, Star } from 'lucide-react';
import { formatPrice, CATEGORY_PLACEHOLDERS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

interface ListingCardSmallProps {
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
    extra_fields?: any;
    listing_images?: { storage_path: string }[];
    listing_translations?: { lang: string; title: string }[];
    profiles?: { user_type: string; is_verified_seller: boolean } | null;
  };
  boostTypes?: string[];
}

export default function ListingCardSmall({ listing, boostTypes }: ListingCardSmallProps) {
  const { t, language } = useLanguage();

  const isBoosted = boostTypes?.includes('boost') || false;
  const isFeatured = boostTypes?.includes('boost_premium') || false;

  const isPro = listing.profiles?.user_type === 'business';

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

  return (
    <Link to={`/listing/${listing.id}`} className="block flex-shrink-0 w-[160px] sm:w-[180px]">
      <Card className={`overflow-hidden hover:shadow-md transition-all duration-200 group h-full ${
        isFeatured ? 'ring-2 ring-amber-400 shadow-amber-200/50' : isBoosted ? 'ring-2 ring-blue-400 shadow-blue-200/50' : ''
      }`}>
        <div className="aspect-square overflow-hidden bg-muted relative">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {(isBoosted || isFeatured) && (
            <div className="absolute top-1.5 left-1.5">
              {isFeatured ? (
                <Badge className="bg-amber-500 text-white text-[9px] gap-0.5 px-1 py-0 font-bold shadow">
                  <Star className="h-2.5 w-2.5" />
                </Badge>
              ) : (
                <Badge className="bg-blue-500 text-white text-[9px] gap-0.5 px-1 py-0 font-bold shadow">
                  <Rocket className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
          )}
          {isPro && (
            <Badge className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] gap-0.5 px-1 py-0 font-bold shadow">
              <Briefcase className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
        <CardContent className="p-2">
          <h3 className="font-semibold text-xs line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm font-bold text-primary">
            {listing.category === 'emploi' && listing.extra_fields?.salary_negotiable === 'true'
              ? t('createListing.salaryNegotiable')
              : formatPrice(listing.price, listing.currency)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{t(`locations.${listing.location_area}`)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
