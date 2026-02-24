import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';

interface TrustIndicatorProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function TrustIndicator({ score, riskLevel }: TrustIndicatorProps) {
  const { t } = useLanguage();

  const color =
    score >= 70 ? 'bg-green-500' :
    score >= 40 ? 'bg-amber-500' :
    'bg-red-500';

  const textColor =
    score >= 70 ? 'text-green-600' :
    score >= 40 ? 'text-amber-600' :
    'text-red-600';

  const label =
    riskLevel === 'low' ? t('badges.trustSafe') :
    riskLevel === 'medium' ? t('badges.trustStandard') :
    t('badges.trustRisky');

  return (
    <div className="flex items-center gap-3 w-full">
      <ShieldCheck className={`h-5 w-5 flex-shrink-0 ${textColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{t('security.trustScore')}</span>
          <span className={`text-xs font-bold ${textColor}`}>{label}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.max(score, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
