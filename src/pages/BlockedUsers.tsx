import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedUsers, useBlockUser } from '@/hooks/useBlockedUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Ban, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function BlockedUsers() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const blockedIds = useBlockedUsers();
  const { unblockUser } = useBlockUser();
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ['blocked-profiles', blockedIds],
    queryFn: async () => {
      if (blockedIds.length === 0) return [];
      const { data } = await supabase
        .from('public_profiles')
        .select('id, display_name, avatar_url')
        .in('id', blockedIds);
      return data || [];
    },
    enabled: blockedIds.length > 0,
  });

  if (!user) { navigate('/auth'); return null; }

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId);
    try {
      await unblockUser(userId);
      toast({ title: t('block.unblocked') });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
    setUnblocking(null);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => navigate('/profile')}>
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </Button>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Ban className="h-6 w-6" /> {t('block.blockedUsersTitle')}
      </h1>

      {blockedIds.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Ban className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t('block.noBlockedUsers')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_url} />
                  <AvatarFallback>{(p.display_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.display_name || t('common.anonymous')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unblocking === p.id}
                  onClick={() => handleUnblock(p.id)}
                  className="gap-1.5 shrink-0"
                >
                  <Ban className="h-3.5 w-3.5" />
                  {t('block.unblock')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
