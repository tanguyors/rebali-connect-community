import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { User, Briefcase } from 'lucide-react';

export default function Auth() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState<'private' | 'business'>('private');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else navigate('/');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: t('auth.passwordMismatch'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, user_type: userType },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.magicLinkSent') });
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.magicLinkSent') });
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.magicLinkSent') });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
          <TabsTrigger value="signup">{t('common.signup')}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.loginTitle')}</CardTitle>
              <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('auth.password')}</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{t('common.login')}</Button>
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={handleForgotPassword} className="text-primary hover:underline">{t('auth.forgotPassword')}</button>
                  <button type="button" onClick={handleMagicLink} className="text-primary hover:underline">{t('auth.magicLink')}</button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.signupTitle')}</CardTitle>
              <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                {/* User type selector */}
                <div>
                  <Label>{t('auth.accountType')}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setUserType('private')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        userType === 'private'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('auth.privateAccount')}</span>
                      <span className="text-xs text-muted-foreground text-center">{t('auth.privateDesc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('business')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        userType === 'business'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <Briefcase className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('auth.proAccount')}</span>
                      <span className="text-xs text-muted-foreground text-center">{t('auth.proDesc')}</span>
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{t('auth.displayName')}</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('auth.password')}</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
                </div>
                <div>
                  <Label>{t('auth.confirmPassword')}</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{t('common.signup')}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
