import { useState, useEffect, useRef } from 'react';
import { isNativePlatform } from '@/capacitor';
import { openExternalAuthenticated, WEBAPP_URL } from '@/lib/openExternal';
import { LegalDialog } from '@/components/LegalDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { User, Camera, Shield, Star, BarChart3, Eye, ShoppingBag, Package, Mail, Lock, Trash2, ExternalLink, MessageCircle, CheckCircle, ShieldCheck, Clock, Upload, LogOut, Coins, FileText, ShieldAlert, Ban } from 'lucide-react';
import UserBadges from '@/components/UserBadges';
import TrustIndicator from '@/components/TrustIndicator';
import SavedSearches from '@/components/SavedSearches';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import ReferralWidget from '@/components/ReferralWidget';

const profileSchema = z.object({
  display_name: z.string().trim().min(2, 'Min 2 characters').max(50, 'Max 50 characters'),
  preferred_lang: z.string(),
});

function WhatsAppVerification({ user, profile, refreshProfile }: { user: any; profile: any; refreshProfile: () => Promise<void> }) {
  const { t, language } = useLanguage();
  const [phone, setPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  if (profile?.phone_verified) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold">{t('security.whatsappVerified')}</p>
              <p className="text-sm text-muted-foreground">{profile.whatsapp}</p>
            </div>
            <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t('security.whatsappVerified')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isValidPhone = /^\+\d{7,15}$/.test(phone);

  const handleSendOtp = async () => {
    if (!isValidPhone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone_number: phone, user_id: user.id, lang: language },
      });
      if (error) throw error;
      if (data?.error) {
        const errorKey = data.error === 'rate_limited' ? 'rateLimited'
          : data.error === 'phone_already_used' ? 'phoneAlreadyUsed'
          : data.error === 'phone_banned' ? 'phoneBanned' : 'codeError';
        toast({ title: t(`security.${errorKey}`), variant: 'destructive' });
      } else {
        toast({ title: t('security.codeSent') });
        setStep('otp');
      }
    } catch {
      toast({ title: t('security.codeError'), variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone_number: phone, otp_code: otpValue, user_id: user.id },
      });
      if (error) throw error;
      if (data?.error) {
        const errorKey = data.error === 'max_attempts' ? 'maxAttemptsReached'
          : data.error === 'no_valid_otp' ? 'noValidOtp' : 'verificationFailed';
        toast({ title: t(`security.${errorKey}`), variant: 'destructive' });
      } else {
        toast({ title: t('security.verificationSuccess') });
        await refreshProfile();
      }
    } catch {
      toast({ title: t('security.verificationFailed'), variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> {t('security.verifyWhatsapp')}
        </CardTitle>
        <CardDescription>{t('security.verifyWhatsappDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <>
            <div>
              <Label>{t('security.phoneNumber')}</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62812345678" />
              {phone && !isValidPhone && (
                <p className="text-sm text-destructive mt-1">{t('security.invalidPhoneFormat') || 'Format: +[country code][number]'}</p>
              )}
            </div>
            <Button onClick={handleSendOtp} disabled={loading || !isValidPhone} className="w-full">
              {t('security.sendCode')}
            </Button>
          </>
        ) : (
          <>
            <div>
              <Label>{t('security.enterCode')}</Label>
              <div className="flex justify-center mt-2">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button onClick={handleVerifyOtp} disabled={loading || otpValue.length !== 6} className="w-full">
              {t('security.verifyCode')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setStep('phone'); setOtpValue(''); }}>
              {t('common.back')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function IdVerification({ user, profile, refreshProfile }: { user: any; profile: any; refreshProfile: () => Promise<void> }) {
  const { t } = useLanguage();
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('id_verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) setVerificationStatus(data[0].status);
      setLoadingStatus(false);
    };
    fetchStatus();
  }, [user.id]);

  if (loadingStatus) return null;

  // Already verified
  if (profile?.is_verified_seller || verificationStatus === 'approved') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-700">{t('security.verifiedSeller')}</p>
              <p className="text-sm text-muted-foreground">{t('security.verifiedSellerDesc')}</p>
            </div>
            <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {t('security.verifiedSeller')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending verification
  if (verificationStatus === 'pending') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-700">{t('security.verificationPending')}</p>
              <p className="text-sm text-muted-foreground">{t('security.verificationPendingDesc')}</p>
            </div>
            <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Clock className="h-3.5 w-3.5 mr-1" /> {t('admin.pending')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('security.fileTooLarge'), variant: 'destructive' });
      return;
    }
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selfieFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('selfie', selfieFile);

      const { data, error } = await supabase.functions.invoke('encrypt-upload', {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVerificationStatus('pending');
      toast({ title: t('security.verificationSubmitted') });
    } catch (err: any) {
      toast({ title: t('security.verificationError'), description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> {t('security.becomeVerified')}
        </CardTitle>
        <CardDescription>{t('security.selfieOnlyDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verificationStatus === 'rejected' && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {t('security.verificationRejected')}
          </div>
        )}
        <div>
          <Label>{t('security.takeSelfie')}</Label>
          <p className="text-xs text-muted-foreground mb-2">{t('security.selfieInstructions')}</p>
          {selfiePreview ? (
            <div className="relative">
              <img src={selfiePreview} alt="Selfie preview" className="w-full max-w-xs rounded-lg border mx-auto" />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full max-w-xs mx-auto block"
                onClick={() => {
                  setSelfieFile(null);
                  setSelfiePreview(null);
                  if (selfieInputRef.current) selfieInputRef.current.value = '';
                }}
              >
                {t('security.retakeSelfie')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full py-8 border-dashed flex flex-col items-center gap-2"
              onClick={() => selfieInputRef.current?.click()}
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('security.openCamera')}</span>
            </Button>
          )}
          {/* capture="user" forces front camera, no file import allowed */}
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleSelfieCapture}
          />
        </div>
        <Button onClick={handleSubmit} disabled={submitting || !selfieFile} className="w-full">
          {submitting ? t('common.loading') : t('security.submitVerification')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { t, setLanguage } = useLanguage();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: '',
    preferred_lang: 'en',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [legalDialog, setLegalDialog] = useState<'terms' | 'privacy' | null>(null);

  // Stats
  const [stats, setStats] = useState({ active: 0, sold: 0, totalViews: 0, avgRating: 0, reviewCount: 0 });
  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        preferred_lang: profile.preferred_lang || 'en',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Fetch stats
    const fetchStats = async () => {
      const { data: listings } = await supabase
        .from('listings')
        .select('status, views_count')
        .eq('seller_id', user.id);

      const active = listings?.filter(l => l.status === 'active').length || 0;
      const sold = listings?.filter(l => l.status === 'sold').length || 0;
      const totalViews = listings?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0;

      const { data: revs } = await supabase
        .from('reviews')
        .select('rating, comment, created_at, reviewer_id, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const avgRating = revs && revs.length > 0
        ? revs.reduce((sum, r) => sum + r.rating, 0) / revs.length
        : 0;

      setStats({ active, sold, totalViews, avgRating, reviewCount: revs?.length || 0 });
      setReviews(revs || []);
    };
    fetchStats();
  }, [user]);

  if (!user) { navigate('/auth'); return null; }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t('profile.avatarError'), variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t('profile.avatarTooLarge'), variant: 'destructive' });
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload error', description: uploadError.message, variant: 'destructive' });
      setAvatarUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    await refreshProfile();
    toast({ title: t('profile.avatarUpdated') });
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name,
        preferred_lang: form.preferred_lang,
      })
      .eq('id', user.id);

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: t('profile.saved') });
      setLanguage(form.preferred_lang as any);
      await refreshProfile();
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('profile.passwordResetSent') });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Archive all active listings
    await supabase
      .from('listings')
      .update({ status: 'archived' as any })
      .eq('seller_id', user.id)
      .eq('status', 'active');

    // Ban the profile (soft delete)
    await supabase
      .from('profiles')
      .update({ is_banned: true, display_name: '[Deleted Account]' })
      .eq('id', user.id);

    await supabase.auth.signOut();
    toast({ title: t('profile.accountDeleted') });
    setDeleting(false);
    setDeleteDialogOpen(false);
    navigate('/');
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : '';

  const initials = (profile?.display_name || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      {/* Header with Avatar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile?.display_name || t('profile.displayName')}</h1>
                <Badge variant={profile?.user_type === 'business' ? 'default' : 'secondary'}>
                  {profile?.user_type === 'business' ? t('common.pro') : t('common.private')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.memberSince')} {memberSince}</p>
              {stats.reviewCount > 0 && (
                <div className="flex items-center gap-1 justify-center sm:justify-start">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-semibold">{stats.avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({stats.reviewCount} {t('seller.reviews')})</span>
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/seller/${encodeURIComponent(user.id)}`)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {t('profile.viewPublicProfile')}
              </Button>
            </div>
          </div>

          {/* Badges & Trust */}
          {profile && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <UserBadges userId={user.id} profile={profile} />
              <TrustIndicator score={profile.trust_score} riskLevel={profile.risk_level as 'low' | 'medium' | 'high'} />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                if (isNativePlatform) {
                  openExternalAuthenticated(`${WEBAPP_URL}/points`);
                } else {
                  navigate('/points');
                }
              }}>
                <Coins className="h-4 w-4" />
                {t('points.shopTitle')}
              </Button>
              {profile.user_type === 'business' && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/dashboard')}>
                  <BarChart3 className="h-4 w-4" />
                  {t('dashboard.title')}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/blocked-users')}>
                <Ban className="h-4 w-4" />
                {t('block.blockedUsersTitle')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Package, label: t('profile.statsActive'), value: stats.active, color: 'text-primary', href: '/my-listings' },
          { icon: ShoppingBag, label: t('profile.statsSold'), value: stats.sold, color: 'text-accent', href: '/my-listings?tab=sold' },
          { icon: Eye, label: t('profile.statsTotalViews'), value: stats.totalViews, color: 'text-muted-foreground', href: null },
          { icon: Star, label: t('profile.statsAvgRating'), value: stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : '—', color: 'text-accent', href: `/seller/${encodeURIComponent(user.id)}` },
        ].map((stat, i) => (
          <Card
            key={i}
            className={stat.href ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}
            onClick={() => stat.href && navigate(stat.href)}
          >
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className="text-xs text-muted-foreground text-center">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t('profile.sectionInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('profile.displayName')} *</Label>
            <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            {errors.display_name && <p className="text-sm text-destructive mt-1">{errors.display_name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t('profile.userType')}</Label>
              <Input value={profile?.user_type === 'business' ? t('profile.business') : t('profile.private')} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">{t('profile.userTypeNotEditable')}</p>
            </div>
            <div>
              <Label>{t('profile.preferredLang')}</Label>
              <select
                value={form.preferred_lang}
                onChange={e => setForm(f => ({ ...f, preferred_lang: e.target.value }))}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">{t('common.save')}</Button>
        </CardContent>
      </Card>

      {/* WhatsApp Verification */}
      <WhatsAppVerification user={user} profile={profile} refreshProfile={refreshProfile} />

      {/* Referral Widget */}
      <ReferralWidget />

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('notifications.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      {/* Saved Search Alerts (VIP) */}
      <SavedSearches />

      {/* Identity Verification */}
      <IdVerification user={user} profile={profile} refreshProfile={refreshProfile} />

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> {t('profile.sectionSecurity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('auth.email')}</Label>
            <Input value={user.email || ''} disabled className="bg-muted" />
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleResetPassword} className="flex-1">
              <Lock className="h-4 w-4 mr-2" />
              {t('profile.changePassword')}
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('profile.deleteAccount')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('profile.deleteAccountTitle')}</DialogTitle>
                  <DialogDescription>{t('profile.deleteAccountDesc')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                    {deleting ? t('common.loading') : t('common.confirm')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Received */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> {t('profile.sectionReviews')}</CardTitle>
          {stats.reviewCount > 0 && (
            <CardDescription>
              {stats.avgRating.toFixed(1)} / 5 — {stats.reviewCount} {t('seller.reviews')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('seller.noReviews')}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="flex gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={(rev.profiles as any)?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {((rev.profiles as any)?.display_name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{(rev.profiles as any)?.display_name || '?'}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? 'fill-accent text-accent' : 'text-muted'}`} />
                        ))}
                      </div>
                    </div>
                    {rev.comment && <p className="text-sm text-muted-foreground mt-0.5">{rev.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Links (for mobile/app where footer is hidden) */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="gap-2 text-sm justify-start"
            onClick={() => setLegalDialog('terms')}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {t('legal.termsTitle')}
          </Button>
          <Button
            variant="ghost"
            className="gap-2 text-sm justify-start"
            onClick={() => setLegalDialog('privacy')}
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {t('legal.privacyTitle')}
          </Button>
        </CardContent>
      </Card>

      <LegalDialog
        open={legalDialog !== null}
        onOpenChange={(open) => !open && setLegalDialog(null)}
        type={legalDialog || 'terms'}
      />

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={async () => {
          await signOut();
          navigate('/');
        }}
      >
        <LogOut className="h-4 w-4" />
        {t('common.logout')}
      </Button>
    </div>
  );
}
