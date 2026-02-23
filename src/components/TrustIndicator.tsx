import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';

interface TrustIndicatorProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function TrustIndicator({ score, riskLevel }: TrustIndicatorProps) {
  const { t } = useLanguage();

  const color =
    score >= 60 ? 'bg-green-500' :
    score >= 30 ? 'bg-amber-500' :
    'bg-red-500';

  const textColor =
    score >= 60 ? 'text-green-600' :
    score >= 30 ? 'text-amber-600' :
    'text-red-600';

  const label =
    riskLevel === 'low' ? t('badges.trustLow') :
    riskLevel === 'medium' ? t('badges.trustMedium') :
    t('badges.trustHigh');

  return (
    <div className="flex items-center gap-3 w-full">
      <ShieldCheck className={`h-5 w-5 flex-shrink-0 ${textColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">{t('security.trustScore')}</span>
          <span className={`text-xs font-bold ${textColor}`}>{score}/100 — {label}</span>
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
