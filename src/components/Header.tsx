import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Plus, User, LogOut, Shield, Search, Heart, Bell, Sun, Moon, MessageCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Header() {
  const { t } = useLanguage();
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState('');
  const { theme, setTheme } = useTheme();

  const authGuard = (path: string) => () => {
    navigate(user ? path : '/auth');
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_total_unread_messages', { _user_id: user!.id });
      return (data as number) || 0;
    },
    enabled: !!user,
    refetchInterval: 15_000,
  });

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b safe-area-top">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Mobile: language left, logo center, theme right */}
        <div className="flex sm:hidden items-center justify-between w-full">
          <LanguageSwitcher />
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <img src={logo} alt="Re-Bali" className="h-8" />
          </Link>
          <div className="flex items-center gap-1">
            {user && <NotificationBell compact />}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Re-Bali" className="h-8" />
          </Link>
          <Button className="gap-1.5 rounded-full px-6" onClick={authGuard('/create')}>
            <Plus className="h-4 w-4" />
            {t('nav.sell')}
          </Button>
        </div>

        <div className="hidden sm:flex items-center gap-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = headerSearch.trim();
              if (q) navigate(`/browse?q=${encodeURIComponent(q)}`);
            }}
            className="relative mr-2"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="pl-8 h-9 w-48 lg:w-64 rounded-full text-sm"
            />
          </form>
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <NotificationBell />
          <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3" onClick={authGuard('/favorites')}>
            <Heart className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px]">{t('nav.favorites')}</span>
          </Button>
          {user && profile?.phone_verified && (
            <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3 relative" onClick={() => navigate('/messages')}>
              <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <span className="text-[10px]">{t('nav.messages')}</span>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3">
                  <User className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px]">{t('nav.profile')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/my-listings')}>
                  {t('nav.myListings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  {t('nav.profile')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('nav.admin')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3" onClick={() => navigate('/auth')}>
              <User className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px]">{t('nav.loginSignup')}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
