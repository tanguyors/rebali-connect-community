import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlockUser, useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Ban } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BlockUserButtonProps {
  targetUserId: string;
  targetDisplayName?: string;
  className?: string;
}

export default function BlockUserButton({ targetUserId, targetDisplayName, className }: BlockUserButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const blockedIds = useBlockedUsers();
  const { blockUser, unblockUser, isBlocked } = useBlockUser();
  const [loading, setLoading] = useState(false);

  if (!user || user.id === targetUserId) return null;

  const blocked = isBlocked(blockedIds, targetUserId);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (blocked) {
        await unblockUser(targetUserId);
        toast({ title: t('block.unblocked') });
      } else {
        await blockUser(targetUserId);
        toast({ title: t('block.blocked'), description: t('block.blockedDesc') });
      }
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
    setLoading(false);
  };

  if (blocked) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${className || ''}`}
      >
        <Ban className="h-4 w-4" />
        {t('block.unblock')}
      </button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors ${className || ''}`}>
          <Ban className="h-4 w-4" />
          {t('block.blockUser')}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('block.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {(t('block.confirmDesc') as string).replace('{{name}}', targetDisplayName || 'this user')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t('block.blockUser')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
