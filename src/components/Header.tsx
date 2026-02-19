import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Plus, User, LogOut, Shield } from 'lucide-react';
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
            <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              Re-Bali
            </span>
          </Link>
          <Button className="hidden md:inline-flex gap-1.5 rounded-full px-6" onClick={() => navigate('/create')}>
            <Plus className="h-4 w-4" />
            {t('nav.sell')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
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
            </>
          ) : (
            <div className="hidden sm:flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                {t('common.login')}
              </Button>
              <Button size="sm" onClick={() => navigate('/auth?tab=signup')}>
                {t('common.signup')}
              </Button>
            </div>
          )}

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
