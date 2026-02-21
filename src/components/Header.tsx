import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Plus, User, LogOut, Shield, Search, Heart, MessageCircle, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export default function Header() {
  const { t } = useLanguage();
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const authGuard = (path: string) => () => {
    navigate(user ? path : '/auth');
  };

  const navLinks = [
    { href: '/browse', label: t('nav.browse') },
    { href: '/about', label: t('nav.about') },
    { href: '/safety', label: t('nav.safety') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Re-Bali" className="h-10" />
          </Link>
          <Button className="hidden md:inline-flex gap-1.5 rounded-full px-6" onClick={() => navigate('/create')}>
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

          <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3" onClick={authGuard('/browse')}>
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px]">{t('nav.searches')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3" onClick={authGuard('/favorites')}>
            <Heart className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px]">{t('nav.favorites')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col items-center gap-0.5 h-auto py-1.5 px-3" onClick={authGuard('/messages')}>
            <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[10px]">{t('nav.messages')}</span>
          </Button>

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

        <div className="flex sm:hidden items-center gap-1">
          <LanguageSwitcher />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-2 mt-8">
              <Button className="justify-start gap-1.5" onClick={() => { navigate('/create'); setMobileOpen(false); }}>
                  <Plus className="h-4 w-4" />
                  {t('nav.sell')}
                </Button>
                {!user && (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => { navigate('/auth'); setMobileOpen(false); }}>
                      {t('common.login')}
                    </Button>
                    <Button className="justify-start" onClick={() => { navigate('/auth?tab=signup'); setMobileOpen(false); }}>
                      {t('common.signup')}
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
