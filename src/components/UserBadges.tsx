import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sprout, Clock, Award, Crown, CheckCircle, ShieldCheck,
  Handshake, Target, Flame, Trophy, Medal
} from 'lucide-react';

interface UserBadgesProps {
  userId: string;
  profile: {
    created_at: string;
    phone_verified: boolean;
    is_verified_seller: boolean;
    trust_score?: number;
  };
  compact?: boolean;
}

interface BadgeDef {
  key: string;
  icon: React.ElementType;
  color: string;
  condition: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
  ageDays: number;
  completedDeals: number;
  trustScore: number;
  phoneVerified: boolean;
  isVerified: boolean;
}

const BADGES: BadgeDef[] = [
  { key: 'newMember', icon: Sprout, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', condition: c => c.ageDays < 7 },
  { key: 'activeMember', icon: Clock, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', condition: c => c.ageDays >= 30 && c.ageDays < 180 },
  { key: 'veteran', icon: Award, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', condition: c => c.ageDays >= 180 && c.ageDays < 365 },
  { key: 'elder', icon: Crown, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', condition: c => c.ageDays >= 365 },
  { key: 'whatsappVerified', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20', condition: c => c.phoneVerified },
  { key: 'identityVerified', icon: ShieldCheck, color: 'bg-green-500/10 text-green-600 border-green-500/20', condition: c => c.isVerified },
  { key: 'firstDeal', icon: Handshake, color: 'bg-teal-500/10 text-teal-600 border-teal-500/20', condition: c => c.completedDeals >= 1 && c.completedDeals < 5 },
  { key: 'fiveDeals', icon: Target, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', condition: c => c.completedDeals >= 5 && c.completedDeals < 20 },
  { key: 'twentyDeals', icon: Flame, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', condition: c => c.completedDeals >= 20 && c.completedDeals < 50 },
  { key: 'fiftyDeals', icon: Trophy, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', condition: c => c.completedDeals >= 50 },
  { key: 'safeSeller', icon: ShieldCheck, color: 'bg-sky-500/10 text-sky-600 border-sky-500/20', condition: c => c.trustScore >= 70 },
  { key: 'trustedPro', icon: Medal, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', condition: c => c.trustScore >= 85 && c.completedDeals >= 10 },
];

export default function UserBadges({ userId, profile, compact }: UserBadgesProps) {
  const { t } = useLanguage();

  const { data } = useQuery({
    queryKey: ['user-badges-data', userId],
    queryFn: async () => {
      const { count: dealCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .eq('deal_closed', true)
        .eq('buyer_confirmed', true);
      return { completedDeals: dealCount || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const ageDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const ctx: BadgeContext = {
    ageDays,
    completedDeals: data.completedDeals,
    trustScore: profile.trust_score || 0,
    phoneVerified: profile.phone_verified,
    isVerified: profile.is_verified_seller,
  };

  const earned = BADGES.filter(b => b.condition(ctx));
  if (earned.length === 0) return null;

  const displayed = compact ? earned.slice(0, 3) : earned;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-1.5">
        {displayed.map(badge => (
          <Tooltip key={badge.key}>
            <TooltipTrigger asChild>
              <Badge className={`gap-1 cursor-default ${badge.color}`}>
                <badge.icon className="h-3 w-3" />
                <span className="text-[10px]">{t(`badges.${badge.key}`)}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t(`badges.${badge.key}Desc`)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {compact && earned.length > 3 && (
          <Badge variant="secondary" className="text-[10px]">+{earned.length - 3}</Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
