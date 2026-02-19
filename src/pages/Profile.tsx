import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { t, setLanguage } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    whatsapp: '',
    user_type: 'private',
    preferred_lang: 'en',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        phone: profile.phone || '',
        whatsapp: profile.whatsapp || '',
        user_type: profile.user_type || 'private',
        preferred_lang: profile.preferred_lang || 'en',
      });
    }
  }, [profile]);

  if (!user) { navigate('/auth'); return null; }

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        user_type: form.user_type as any,
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">{t('profile.title')}</h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>{t('profile.displayName')}</Label>
            <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <Label>{t('profile.phone')} ({t('common.optional')})</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+62..." />
          </div>
          <div>
            <Label>{t('profile.whatsapp')} ({t('common.optional')})</Label>
            <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+62..." />
          </div>
          <div>
            <Label>{t('profile.userType')}</Label>
            <Select value={form.user_type} onValueChange={v => setForm(f => ({ ...f, user_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{t('profile.private')}</SelectItem>
                <SelectItem value="business">{t('profile.business')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('profile.preferredLang')}</Label>
            <Select value={form.preferred_lang} onValueChange={v => setForm(f => ({ ...f, preferred_lang: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">{t('common.save')}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
