import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, MessageCircle, User, Languages } from 'lucide-react';
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
    staleTime: 1000 * 60 * 10, // cache translations for 10 min
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const sendMessage = async () => {
    if (!message.trim() || !activeConvId || !user) return;
    // Check WhatsApp verification
    if (!profile?.phone_verified) {
      toast({ title: t('messages.whatsappRequired'), variant: 'destructive' });
      navigate('/profile');
      return;
    }
    const content = message.trim();
    setMessage('');
    await supabase.from('messages').insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      content,
    });
    // Update conversation timestamp
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId);
    queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
    queryClient.invalidateQueries({ queryKey: ['last-messages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });

    // Send WhatsApp notification to recipient (fire and forget)
    supabase.functions.invoke('notify-whatsapp', {
      body: {
        conversation_id: activeConvId,
        sender_id: user.id,
        message_preview: content,
      },
    }).catch(() => {}); // silent fail
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const activeConv = conversations?.find((c: any) => c.id === activeConvId);
  const otherUser = activeConv
    ? (activeConv.buyer_id === user.id ? activeConv.seller : activeConv.buyer)
    : null;

  const showConvList = !isMobile || !activeConvId;
  const showChat = !isMobile || !!activeConvId;

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <h1 className="text-2xl font-extrabold mb-4">{t('messages.title')}</h1>
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Conversation List */}
        {showConvList && (
          <div className={`${isMobile ? 'w-full' : 'w-80 flex-shrink-0'} flex flex-col border border-border rounded-lg overflow-hidden`}>
            <div className="flex-1 overflow-y-auto">
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
                  const listingImg = conv.listings?.listing_images?.[0]?.storage_path;

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
          <div className="flex-1 flex flex-col border border-border rounded-lg overflow-hidden">
            {activeConv ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/30">
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
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {convMessages?.map((msg: any) => {
                    const isMine = msg.sender_id === user.id;
                    const translated = !isMine && translations?.[msg.id];
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

                {/* Input */}
                {!profile?.phone_verified ? (
                  <div className="p-3 border-t border-border">
                    <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4" />
                      {t('messages.whatsappRequired')}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 border-t border-border flex gap-2">
                    <Input
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={t('messages.placeholder')}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} size="icon" disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
