import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ListingCard from '@/components/ListingCard';
import { User, Briefcase, Star, Calendar, MessageCircle, Phone, Package, ShieldCheck, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import UserBadges from '@/components/UserBadges';
import TrustIndicator from '@/components/TrustIndicator';

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const { data: seller } = useQuery({
    queryKey: ['seller', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: listings } = useQuery({
    queryKey: ['seller-listings', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(storage_path, sort_order), listing_translations(lang, title)')
        .eq('seller_id', id!)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ['seller-reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles!reviewer_id(display_name, avatar_url)')
        .eq('seller_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Check if current user has a qualifying deal conversation with this seller
  const { data: dealConversation } = useQuery({
    queryKey: ['deal-conversation', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('seller_id', id!)
        .eq('buyer_id', user!.id)
        .eq('deal_closed', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user && user.id !== id,
  });

  // Check if user already reviewed this deal conversation
  const { data: existingReview } = useQuery({
    queryKey: ['existing-review', dealConversation?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('conversation_id', dealConversation!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!dealConversation?.id,
  });

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  // Determine review eligibility
  const canReview = user && user.id !== id && dealConversation && !existingReview;
  const getReviewMessage = () => {
    if (!user || user.id === id) return null;
    if (!dealConversation) return t('seller.reviewRequiresDeal');
    if (existingReview) return t('seller.alreadyReviewed');
    // Account age checks are enforced by RLS, but show a client-side hint
    if (seller) {
      const sellerAge = Date.now() - new Date(seller.created_at).getTime();
      if (sellerAge < 7 * 24 * 60 * 60 * 1000) return t('seller.accountTooNew');
    }
    return null;
  };

  const handleSubmitReview = async () => {
    if (!user || !id || !dealConversation) return;
    const { error } = await supabase.from('reviews').insert({
      seller_id: id,
      reviewer_id: user.id,
      rating,
      comment: comment || null,
      conversation_id: dealConversation.id,
      is_verified_purchase: true,
    } as any);
    if (error) {
      // Parse RLS error for user-friendly message
      if (error.message?.includes('row-level security')) {
        const reviewMsg = getReviewMessage();
        toast({ title: reviewMsg || t('seller.reviewRequiresDeal'), variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: t('seller.reviewSubmitted') });
      setReviewOpen(false);
      setComment('');
      setRating(5);
      refetchReviews();
    }
  };

  const isPro = seller?.user_type === 'business';
  const reviewMessage = getReviewMessage();

  if (!seller) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.loading')}</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Seller info header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{seller.display_name || 'User'}</h1>
                {isPro && (
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Briefcase className="h-3 w-3" />
                    Pro
                  </Badge>
                )}
                {seller.is_verified_seller && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t('security.verifiedSeller')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('profile.memberSince')} {new Date(seller.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {listings?.length || 0} {t('seller.activeListings')}
                </span>
              </div>
              {/* Star rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{avgRating > 0 ? avgRating.toFixed(1) : '-'}/5</span>
                <span className="text-sm text-muted-foreground">({reviews?.length || 0} {t('seller.reviews')})</span>
              </div>
            </div>

            {/* Badges & Trust */}
            <div className="mt-3 space-y-3 border-t pt-3 w-full">
              <UserBadges userId={id!} profile={seller} />
              <TrustIndicator score={seller.trust_score} riskLevel={seller.risk_level as 'low' | 'medium' | 'high'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('seller.reviewsTitle')} ({reviews?.length || 0})</h2>
          {canReview ? (
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger asChild>
                <Button size="sm">{t('seller.leaveReview')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('seller.leaveReview')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors cursor-pointer ${
                            star <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder={t('seller.reviewPlaceholder')}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <Button onClick={handleSubmitReview} className="w-full">{t('common.submit')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : user && user.id !== id && reviewMessage ? (
            <p className="text-xs text-muted-foreground max-w-[200px] text-right">{reviewMessage}</p>
          ) : null}
        </div>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{review.profiles?.display_name || 'User'}</span>
                      {review.is_verified_purchase && (
                        <Badge variant="secondary" className="gap-1 text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3" />
                          {t('seller.verifiedPurchase')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('seller.noReviews')}</p>
        )}
      </div>

      {/* Active listings */}
      <h2 className="text-xl font-bold mb-4">{t('seller.allListings')} ({listings?.length || 0})</h2>
      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-10">{t('common.noResults')}</p>
      )}
    </div>
  );
}
