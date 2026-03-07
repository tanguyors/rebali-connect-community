import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Copy, Share2, CheckCircle, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  status: string;
  created_at: string;
  validated_at: string | null;
  referred_id: string;
}

export default function ReferralWidget() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const referralCode = profile?.referral_code || '';
  const referralLink = `${window.location.origin}/auth?tab=signup&ref=${referralCode}`;

  useEffect(() => {
    if (!user) return;
    const fetchReferrals = async () => {
      const { data } = await supabase
        .from('referrals')
        .select('id, status, created_at, validated_at, referred_id')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      setReferrals(data || []);
      setLoading(false);
    };
    fetchReferrals();
  }, [user]);

  if (!user || !profile) return null;

  const validated = referrals.filter(r => r.status === 'validated').length;
  const pending = referrals.filter(r => r.status === 'pending').length;
  const totalPointsEarned = Math.floor(validated / 3) * 50;
  const progressToNext = validated % 3;
  const maxInvites = 12;
  const remaining = Math.max(0, maxInvites - referrals.length);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: t('referral.codeCopied') || 'Code copied!' });
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    const shareText = `${t('referral.shareMessage')} ${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: referralLink });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: t('referral.linkCopied') || 'Link copied!' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t('referral.title')}
        </CardTitle>
        <CardDescription>{t('referral.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Code & Share */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg tracking-widest text-center font-bold">
            {referralCode}
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy code">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" onClick={handleShare} title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">{t('referral.totalInvited') || 'Invited'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{validated}</p>
            <p className="text-xs text-muted-foreground">{t('referral.validated') || 'Validated'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <Gift className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{totalPointsEarned}</p>
            <p className="text-xs text-muted-foreground">{t('referral.pointsEarned') || 'Points'}</p>
          </div>
        </div>

        {/* Progress to next reward */}
        {/* Progress to next 50pts reward */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('referral.nextReward')}</span>
            <span className="font-medium">{progressToNext}/3 {t('referral.validated') || 'Validated'}</span>
          </div>
          <Progress value={(progressToNext / 3) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {t('referral.rewardExplainer') || `Every 3 validated referrals = 50 points`}
          </p>
        </div>

        {/* Overall invitation limit */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('referral.invitationLimit') || 'Invitations used'}</span>
            <span className="font-medium">{referrals.length}/{maxInvites}</span>
          </div>
          <Progress value={(referrals.length / maxInvites) * 100} className="h-2" />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {remaining} {t('referral.remainingInvites') || 'invitations remaining'}
            </p>
          )}
          {remaining === 0 && (
            <p className="text-xs text-muted-foreground">
              {t('referral.limitReached') || 'Maximum invitations reached'}
            </p>
          )}
        </div>

        {/* Referral history */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('referral.history') || 'History'}</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    {ref.status === 'validated' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant={ref.status === 'validated' ? 'default' : 'secondary'} className="text-xs">
                    {ref.status === 'validated' ? t('referral.statusValidated') || 'Validated' : t('referral.statusPending') || 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {referrals.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('referral.noReferralsYet') || 'No referrals yet. Share your code!'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
