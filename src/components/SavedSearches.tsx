import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
          <h3 className="font-semibold text-lg">Alertes de recherche</h3>
          <p className="text-sm text-muted-foreground">
            Recevez des notifications quand une annonce correspond à vos mots-clés.
            Fonctionnalité réservée aux membres VIP.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/points'}>
            <Crown className="h-4 w-4" />
            Devenir VIP
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleAdd = async () => {
    const keyword = newKeyword.trim();
    if (!keyword || keyword.length < 2) {
      toast({ title: 'Mot-clé trop court (min 2 caractères)', variant: 'destructive' });
      return;
    }
    if (searches.length >= MAX_SAVED_SEARCHES) {
      toast({ title: `Maximum ${MAX_SAVED_SEARCHES} alertes autorisées`, variant: 'destructive' });
      return;
    }
    // Check duplicate
    if (searches.some((s: any) => s.keyword.toLowerCase() === keyword.toLowerCase())) {
      toast({ title: 'Ce mot-clé existe déjà', variant: 'destructive' });
      return;
    }

    setAdding(true);
    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id,
      keyword,
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Alerte ajoutée !' });
      setNewKeyword('');
      qc.invalidateQueries({ queryKey: ['saved-searches'] });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['saved-searches'] });
    toast({ title: 'Alerte supprimée' });
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
          Alertes de recherche
          <Badge variant="secondary" className="ml-auto">{searches.length}/{MAX_SAVED_SEARCHES}</Badge>
        </CardTitle>
        <CardDescription>
          Recevez une notification in-app et WhatsApp quand une annonce correspond à vos mots-clés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            placeholder="Ex: iPhone, scooter, villa..."
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
            Ajouter
          </Button>
        </div>

        {/* List */}
        {searches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune alerte configurée. Ajoutez un mot-clé ci-dessus.
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
