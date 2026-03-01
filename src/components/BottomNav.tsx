import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, profile } = useAuth();

  // Fetch total unread message count (single RPC call instead of N+1)
  const { data: totalUnread = 0 } = useQuery({
    queryKey: ['total-unread', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_total_unread_messages', {
        _user_id: user!.id,
      });
      return data ?? 0;
    },
    enabled: !!user && !!profile?.phone_verified,
    refetchInterval: 15000,
  });

  const NAV_ITEMS = [
    { icon: Home, labelKey: 'nav.home', path: '/' },
    { icon: Search, labelKey: 'nav.browse', path: '/browse' },
    { icon: Plus, labelKey: 'nav.sell', path: '/create', accent: true },
    ...(user && profile?.phone_verified
      ? [{ icon: MessageCircle, labelKey: 'nav.messages', path: '/messages' }]
      : []),
    { icon: User, labelKey: 'nav.profile', path: '/profile' },
  ];

  const handleNav = (path: string) => {
    if (!user && ['/favorites', '/profile', '/create', '/messages'].includes(path)) {
      navigate('/auth');
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-10 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.accent) {
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-[8px] font-semibold text-primary">{t(item.labelKey)}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 1.5} />
                {item.path === '/messages' && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <span className={cn("text-[9px]", isActive && "font-bold")}>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
