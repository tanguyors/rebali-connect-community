import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/capacitor';
import { openExternalAuthenticated, WEBAPP_URL } from '@/lib/openExternal';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Bell, Plus, Trash2, Crown, Lock } from 'lucide-react';

const MAX_SAVED_SEARCHES = 3;

export default function SavedSearches() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);

  // Check VIP status
  const { data: hasVip } = useQuery({
    queryKey: ['user-vip', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_addons')
        .select('id')
        .eq('user_id', user!.id)
        .eq('addon_type', 'vip')
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1);
      return data && data.length > 0;
    },
    enabled: !!user,
  });

  // Fetch saved searches
  const { data: searches = [] } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && !!hasVip,
  });

  if (!user) return null;

  // Not VIP → show promo card
  if (!hasVip) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{t('savedSearches.promoTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('savedSearches.promoDesc')}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => isNativePlatform ? openExternalAuthenticated(`${WEBAPP_URL}/points`) : window.location.href = '/points'}>
            <Crown className="h-4 w-4" />
            {isNativePlatform ? t('points.openWebapp') : t('savedSearches.becomeVip')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleAdd = async () => {
    const keyword = newKeyword.trim();
    if (!keyword || keyword.length < 2) {
      toast({ title: t('savedSearches.tooShort'), variant: 'destructive' });
      return;
    }
    if (searches.length >= MAX_SAVED_SEARCHES) {
      toast({ title: (t('savedSearches.maxReached') || '').replace('{{max}}', String(MAX_SAVED_SEARCHES)), variant: 'destructive' });
      return;
    }
    if (searches.some((s: any) => s.keyword.toLowerCase() === keyword.toLowerCase())) {
      toast({ title: t('savedSearches.duplicate'), variant: 'destructive' });
      return;
    }

    setAdding(true);
    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id,
      keyword,
    });
    if (error) {
      toast({ title: t('savedSearches.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('savedSearches.added') });
      setNewKeyword('');
      qc.invalidateQueries({ queryKey: ['saved-searches'] });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['saved-searches'] });
    toast({ title: t('savedSearches.deleted') });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('saved_searches').update({ is_active: active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['saved-searches'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('savedSearches.title')}
          <Badge variant="secondary" className="ml-auto">{searches.length}/{MAX_SAVED_SEARCHES}</Badge>
        </CardTitle>
        <CardDescription>
          {t('savedSearches.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            placeholder={t('savedSearches.placeholder')}
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            disabled={searches.length >= MAX_SAVED_SEARCHES}
          />
          <Button
            onClick={handleAdd}
            disabled={adding || searches.length >= MAX_SAVED_SEARCHES || !newKeyword.trim()}
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('savedSearches.add')}
          </Button>
        </div>

        {/* List */}
        {searches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('savedSearches.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {searches.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-md border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(checked) => handleToggle(s.id, checked)}
                  />
                  <span className={`text-sm font-medium ${!s.is_active ? 'text-muted-foreground line-through' : ''}`}>
                    {s.keyword}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
