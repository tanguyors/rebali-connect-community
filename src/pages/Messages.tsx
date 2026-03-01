import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Send, ArrowLeft, MessageCircle, User, Languages, Share2, AlertTriangle, Handshake, CheckCircle2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, id as idLocale, es, zhCN, de, nl, ru } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

const DATE_LOCALES: Record<string, any> = { fr, id: idLocale, es, zh: zhCN, de, nl, ru };

export default function Messages() {
  const { t, language } = useLanguage();
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get('conv');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dealClosedDialogOpen, setDealClosedDialogOpen] = useState(false);
  const [inlineRating, setInlineRating] = useState(5);
  const [inlineHoverRating, setInlineHoverRating] = useState(0);
  const [inlineComment, setInlineComment] = useState('');

  // Fetch conversations
  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, listings!conversations_listing_id_fkey(title_original, listing_images(storage_path, sort_order)), buyer:profiles!conversations_buyer_id_fkey(id, display_name, avatar_url), seller:profiles!conversations_seller_id_fkey(id, display_name, avatar_url)')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order('updated_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch messages for active conversation
  const { data: convMessages } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId!)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!activeConvId,
  });

  // Translate received messages to user's preferred language
  const otherMessages = useMemo(() => {
    if (!convMessages || !user) return [];
    return convMessages.filter((m: any) => m.sender_id !== user.id);
  }, [convMessages, user]);

  const { data: translations } = useQuery({
    queryKey: ['msg-translations', activeConvId, language, otherMessages.map((m: any) => m.id).join(',')],
    queryFn: async () => {
      if (otherMessages.length === 0) return {};
      const texts = otherMessages.map((m: any) => m.content);
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { texts, target_lang: language },
      });
      if (error || !data?.translated) return {};
      const result: Record<string, string> = {};
      otherMessages.forEach((m: any, i: number) => {
        if (data.translated[i] && data.translated[i] !== m.content) {
          result[m.id] = data.translated[i];
        }
      });
      return result;
    },
    enabled: otherMessages.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // Check if current user already rated this conversation
  const activeConv = conversations?.find((c: any) => c.id === activeConvId);
  const { data: myReview } = useQuery({
    queryKey: ['my-review', activeConvId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('conversation_id', activeConvId!)
        .eq('reviewer_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeConvId && !!user && !!(activeConv as any)?.buyer_confirmed,
  });

  // Check if the other party already rated
  const { data: otherReview } = useQuery({
    queryKey: ['other-review', activeConvId, user?.id],
    queryFn: async () => {
      const otherUserId = activeConv?.buyer_id === user!.id ? activeConv?.seller_id : activeConv?.buyer_id;
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('conversation_id', activeConvId!)
        .eq('reviewer_id', otherUserId!)
        .maybeSingle();
      return data;
    },
    enabled: !!activeConvId && !!user && !!activeConv && !!(activeConv as any)?.buyer_confirmed,
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!activeConvId) return;
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        queryClient.setQueryData(['messages', activeConvId], (old: any[] | undefined) => {
          if (!old) return [payload.new];
          if (old.some((m: any) => m.id === payload.new.id)) return old;
          return [...old, payload.new];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvId, queryClient]);

  // Realtime subscription for conversation list updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`conv-updates:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['last-messages'] });
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Fetch last messages for conversation list
  const { data: lastMessages } = useQuery({
    queryKey: ['last-messages', conversations?.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      if (!conversations || conversations.length === 0) return {};
      const result: Record<string, any> = {};
      for (const conv of conversations) {
        const { data } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        result[conv.id] = data;
      }
      return result;
    },
    enabled: !!conversations && conversations.length > 0,
  });

  // Fetch unread counts
  const { data: unreadCounts } = useQuery({
    queryKey: ['unread-counts', user?.id, conversations?.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      if (!conversations || conversations.length === 0) return {};
      const result: Record<string, number> = {};
      for (const conv of conversations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read', false)
          .neq('sender_id', user!.id);
        result[conv.id] = count || 0;
      }
      return result;
    },
    enabled: !!conversations && conversations.length > 0 && !!user,
  });

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (activeConvId && user) {
      supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConvId)
        .neq('sender_id', user.id)
        .eq('read', false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
        });
    }
  }, [activeConvId, user, convMessages]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile) {
      const html = document.documentElement;
      const body = document.body;
      const origStyles = {
        bodyOverflow: body.style.overflow, bodyPosition: body.style.position,
        bodyWidth: body.style.width, bodyHeight: body.style.height,
        bodyTouchAction: body.style.touchAction, bodyOverscroll: body.style.overscrollBehavior,
        htmlOverflow: html.style.overflow, htmlOverscroll: html.style.overscrollBehavior,
      };
      body.style.overflow = 'hidden'; body.style.position = 'fixed';
      body.style.width = '100%'; body.style.height = '100%';
      body.style.touchAction = 'none'; body.style.overscrollBehavior = 'none';
      html.style.overflow = 'hidden'; html.style.overscrollBehavior = 'none';
      const preventScroll = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.messages-scroll-area')) e.preventDefault();
      };
      document.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        body.style.overflow = origStyles.bodyOverflow; body.style.position = origStyles.bodyPosition;
        body.style.width = origStyles.bodyWidth; body.style.height = origStyles.bodyHeight;
        body.style.touchAction = origStyles.bodyTouchAction; body.style.overscrollBehavior = origStyles.bodyOverscroll;
        html.style.overflow = origStyles.htmlOverflow; html.style.overscrollBehavior = origStyles.htmlOverscroll;
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isMobile]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const sendMessage = async () => {
    if (!message.trim() || !activeConvId || !user) return;
    if (!profile?.phone_verified) {
      toast({ title: t('messages.whatsappRequired'), variant: 'destructive' });
      navigate('/profile');
      return;
    }
    const content = message.trim();
    setMessage('');
    await supabase.from('messages').insert({
      conversation_id: activeConvId, sender_id: user.id, content,
    });
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId);
    queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
    queryClient.invalidateQueries({ queryKey: ['last-messages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    supabase.functions.invoke('notify-whatsapp', {
      body: { conversation_id: activeConvId, sender_id: user.id, message_preview: content },
    }).catch(() => {});
  };

  const handleBuyerConfirm = async () => {
    if (!activeConvId || !user) return;
    await supabase.from('conversations').update({
      buyer_confirmed: true,
      buyer_confirmed_at: new Date().toISOString(),
    } as any).eq('id', activeConvId);
    await supabase.from('messages').insert({
      conversation_id: activeConvId, sender_id: user.id,
      content: `✅ ${t('messages.buyerConfirmDeal')}`, from_role: 'system',
    });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
    toast({ title: t('messages.buyerConfirmDeal') });
  };

  const handleSubmitRating = async () => {
    if (!activeConvId || !user || !activeConv) return;
    const reviewedUserId = activeConv.buyer_id === user.id ? activeConv.seller_id : activeConv.buyer_id;
    const { error } = await supabase.from('reviews').insert({
      seller_id: reviewedUserId,
      reviewer_id: user.id,
      reviewed_user_id: reviewedUserId,
      rating: inlineRating,
      comment: inlineComment || null,
      conversation_id: activeConvId,
      is_verified_purchase: true,
    } as any);
    if (error) {
      if (error.message?.includes('row-level security')) {
        // Try to determine specific reason
        const reviewerProfile = profile;
        const reviewerAge = reviewerProfile ? Math.floor((Date.now() - new Date(reviewerProfile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        if (reviewerAge < 7) {
          toast({ title: t('seller.accountTooNew'), variant: 'destructive' });
        } else {
          toast({ title: t('seller.accountTooNew'), description: t('seller.noExchangeYet'), variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    // System message
    await supabase.from('messages').insert({
      conversation_id: activeConvId, sender_id: user.id,
      content: `⭐ ${t('messages.ratedBySystem').replace('{name}', profile?.display_name || 'User')}`,
      from_role: 'system',
    });
    toast({ title: t('messages.ratingSubmitted') });
    setInlineComment('');
    setInlineRating(5);
    queryClient.invalidateQueries({ queryKey: ['my-review', activeConvId] });
    queryClient.invalidateQueries({ queryKey: ['other-review', activeConvId] });
    queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });

    // Check if both rated -> close conversation
    const otherUserId = activeConv.buyer_id === user.id ? activeConv.seller_id : activeConv.buyer_id;
    const { data: otherRev } = await supabase
      .from('reviews')
      .select('id')
      .eq('conversation_id', activeConvId)
      .eq('reviewer_id', otherUserId)
      .maybeSingle();
    if (otherRev) {
      await supabase.from('conversations').update({ relay_status: 'closed' }).eq('id', activeConvId);
      await supabase.from('messages').insert({
        conversation_id: activeConvId, sender_id: user.id,
        content: `🎉 ${t('messages.transactionComplete')}`, from_role: 'system',
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const otherUser = activeConv
    ? (activeConv.buyer_id === user.id ? activeConv.seller : activeConv.buyer)
    : null;

  const showConvList = !isMobile || !activeConvId;
  const showChat = !isMobile || !!activeConvId;

  // Determine conversation state
  const isDealClosed = !!(activeConv as any)?.deal_closed;
  const isBuyerConfirmed = !!(activeConv as any)?.buyer_confirmed;
  const isClosed = activeConv?.relay_status === 'closed';
  const isBuyer = activeConv?.buyer_id === user.id;
  const isSeller = activeConv?.seller_id === user.id;
  const hasRated = !!myReview;

  // Input zone logic
  const canSendMessages = activeConv && !isClosed && (
    !isDealClosed || // normal conversation
    (isDealClosed && !isBuyerConfirmed) // deal closed but buyer hasn't confirmed yet, allow discussion
  ) && !hasRated; // once you rated, no more messages

  return (
    <div className={`container mx-auto px-4 ${isMobile ? 'h-[calc(100dvh-6.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex flex-col overflow-hidden' : 'py-8'}`}>
      {!isMobile && <h1 className="text-2xl font-extrabold mb-4">{t('messages.title')}</h1>}
      <div className={`flex gap-4 ${isMobile ? 'flex-1 min-h-0' : 'h-[calc(100vh-12rem)]'}`}>
        {/* Conversation List */}
        {showConvList && (
          <div className={`${isMobile ? 'w-full' : 'w-80 flex-shrink-0'} flex flex-col border border-border rounded-lg overflow-hidden`}>
            <div className="flex-1 overflow-y-auto messages-scroll-area">
              {convsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((conv: any) => {
                  const other = conv.buyer_id === user.id ? conv.seller : conv.buyer;
                  const last = lastMessages?.[conv.id];
                  const unread = unreadCounts?.[conv.id] || 0;
                  const isActive = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSearchParams({ conv: conv.id })}
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border ${isActive ? 'bg-muted' : ''}`}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={other?.avatar_url || ''} />
                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{other?.display_name || 'User'}</p>
                          {last && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(last.created_at), { addSuffix: false, locale: DATE_LOCALES[language] })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.listings?.title_original}</p>
                        {last && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {last.sender_id === user.id ? `${t('messages.you')}: ` : ''}{last.content}
                          </p>
                        )}
                      </div>
                      {unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{t('messages.empty')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat */}
        {showChat && (
          <div className="flex-1 flex flex-col border border-border rounded-lg overflow-hidden min-h-0">
            {activeConv ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/30 flex-shrink-0">
                  {isMobile && (
                    <button onClick={() => setSearchParams({})} className="mr-1">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                   <div className="flex-1 min-w-0">
                     <p className="font-semibold text-sm">{otherUser?.display_name || 'User'}</p>
                     <Link to={`/listing/${activeConv.listing_id}`} className="text-xs text-primary hover:underline truncate block">
                       {activeConv.listings?.title_original}
                     </Link>
                   </div>
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0">
                          <Share2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t('messages.shareInfo')}</span>
                        </Button>
                      </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="h-5 w-5 text-destructive" />
                           {t('messages.shareInfoTitle')}
                         </AlertDialogTitle>
                         <AlertDialogDescription asChild>
                           <div className="space-y-3">
                             <p>{t('messages.shareInfoWarning')}</p>
                             <ul className="list-disc pl-5 space-y-1.5 text-sm">
                               <li>{t('messages.shareInfoBullet1')}</li>
                               <li className="font-semibold text-destructive">{t('messages.shareInfoBullet2')}</li>
                               <li>{t('messages.shareInfoBullet3')}</li>
                             </ul>
                           </div>
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                         <AlertDialogAction
                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                           onClick={async () => {
                             if (!user || !activeConvId || !profile?.whatsapp) return;
                             const shareMsg = `📞 ${profile.display_name || 'User'}\nWhatsApp: ${profile.whatsapp}`;
                             await supabase.from('messages').insert({
                               conversation_id: activeConvId, sender_id: user.id, content: shareMsg,
                             });
                             await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId);
                             queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
                             toast({ title: t('messages.shareInfoSent') });
                           }}
                         >
                           {t('messages.shareInfoConfirm')}
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                   {/* Deal Closed Button - only for seller when deal not yet closed */}
                   {isSeller && !isDealClosed && (
                     <AlertDialog open={dealClosedDialogOpen} onOpenChange={setDealClosedDialogOpen}>
                       <AlertDialogTrigger asChild>
                         <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-shrink-0 border-green-500/50 text-green-600 hover:bg-green-500/10">
                           <Handshake className="h-3.5 w-3.5" />
                           <span className="hidden sm:inline">{t('messages.dealClosed')}</span>
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle className="flex items-center gap-2">
                             <Handshake className="h-5 w-5 text-green-600" />
                             {t('messages.dealClosed')}
                           </AlertDialogTitle>
                           <AlertDialogDescription>
                             {t('messages.dealClosedConfirm')
                               .replace('{buyer}', otherUser?.display_name || 'User')
                               .replace('{listing}', activeConv.listings?.title_original || '')}
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                           <AlertDialogAction
                             className="bg-green-600 text-white hover:bg-green-700"
                             onClick={async () => {
                               try {
                                 await supabase.from('conversations').update({
                                   deal_closed: true, deal_closed_at: new Date().toISOString(), deal_closed_by: user.id,
                                 } as any).eq('id', activeConvId!);
                                 await supabase.from('listings').update({ status: 'sold' as any }).eq('id', activeConv.listing_id);
                                 const { data: otherConvs } = await supabase
                                   .from('conversations').select('id')
                                   .eq('listing_id', activeConv.listing_id).neq('id', activeConvId!);
                                 if (otherConvs && otherConvs.length > 0) {
                                   for (const oc of otherConvs) {
                                     await supabase.from('conversations').update({ relay_status: 'closed' }).eq('id', oc.id);
                                     await supabase.from('messages').insert({
                                       conversation_id: oc.id, sender_id: user.id,
                                       content: t('messages.productSold'), from_role: 'system',
                                     });
                                   }
                                 }
                                 await supabase.from('messages').insert({
                                   conversation_id: activeConvId!, sender_id: user.id,
                                   content: `🤝 ${t('messages.dealClosed')}`, from_role: 'system',
                                 });
                                 queryClient.invalidateQueries({ queryKey: ['conversations'] });
                                 queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
                                 queryClient.invalidateQueries({ queryKey: ['last-messages'] });
                                 toast({ title: t('messages.dealClosedSuccess') });
                               } catch (err) {
                                 toast({ title: 'Error', variant: 'destructive' });
                               }
                             }}
                           >
                             {t('common.confirm')}
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   )}
                </div>

                {/* Deal closed banner */}
                {isDealClosed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-green-700 text-sm flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('messages.dealClosedBanner').replace('{date}', new Date((activeConv as any).deal_closed_at).toLocaleDateString())}
                  </div>
                )}

                {/* Buyer confirmation banner */}
                {isDealClosed && !isBuyerConfirmed && isBuyer && !isClosed && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-800 text-sm flex-shrink-0">
                    <Handshake className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{t('messages.buyerConfirmBanner')}</span>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={handleBuyerConfirm}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('messages.buyerConfirmDeal')}
                    </Button>
                  </div>
                )}

                {/* Seller waiting for buyer confirmation */}
                {isDealClosed && !isBuyerConfirmed && isSeller && !isClosed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border text-muted-foreground text-sm flex-shrink-0">
                    {t('messages.waitingBuyerConfirm')}
                  </div>
                )}

                {/* Product sold banner (for other conversations closed) */}
                {isClosed && !isDealClosed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border text-muted-foreground text-sm flex-shrink-0">
                    {t('messages.productSold')}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 messages-scroll-area">
                  {convMessages?.map((msg: any) => {
                    const isMine = msg.sender_id === user.id;
                    const isSystem = msg.from_role === 'system';
                    const translated = !isMine && !isSystem && translations?.[msg.id];

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-muted/50 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                          <p className="text-sm whitespace-pre-line">{translated || msg.content}</p>
                          {translated && (
                            <p className="text-[10px] mt-1 text-muted-foreground/70 italic flex items-center gap-1">
                              <Languages className="h-3 w-3 inline" />
                              {msg.content}
                            </p>
                          )}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: DATE_LOCALES[language] })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Inline rating form - when buyer confirmed and user hasn't rated yet */}
                {isDealClosed && isBuyerConfirmed && !hasRated && !isClosed && (
                  <div className="p-3 border-t border-border flex-shrink-0 bg-yellow-500/5">
                    <p className="text-sm font-medium mb-2">{t('messages.rateUser')}</p>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setInlineHoverRating(star)}
                          onMouseLeave={() => setInlineHoverRating(0)}
                          onClick={() => setInlineRating(star)}
                        >
                          <Star
                            className={`h-6 w-6 transition-colors cursor-pointer ${
                              star <= (inlineHoverRating || inlineRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder={t('messages.ratingPlaceholder')}
                      value={inlineComment}
                      onChange={e => setInlineComment(e.target.value)}
                      className="mb-2 text-sm h-16"
                    />
                    <Button size="sm" onClick={handleSubmitRating} className="w-full">
                      {t('messages.submitRating')}
                    </Button>
                  </div>
                )}

                {/* User already rated, waiting for other */}
                {isDealClosed && isBuyerConfirmed && hasRated && !isClosed && (
                  <div className="p-3 border-t border-border flex-shrink-0 text-center">
                    <p className="text-sm text-muted-foreground">{t('messages.youRated')}</p>
                  </div>
                )}

                {/* Input */}
                {isClosed ? (
                  <div className="p-3 border-t border-border flex-shrink-0 text-center">
                    <p className="text-sm text-muted-foreground">{t('messages.conversationClosed')}</p>
                  </div>
                ) : canSendMessages ? (
                  !profile?.phone_verified ? (
                    <div className="p-3 border-t border-border flex-shrink-0">
                      <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/profile')}>
                        <User className="h-4 w-4" />
                        {t('messages.whatsappRequired')}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 border-t border-border flex gap-2 flex-shrink-0">
                      <Input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={t('messages.placeholder')}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        className="flex-1 h-9 text-sm"
                      />
                      <Button onClick={sendMessage} size="icon" disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                ) : null}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('messages.selectConversation')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
