import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

const CATEGORIES = [
  'bug',
  'payment',
  'blocked',
  'report',
  'suggestion',
  'partnership',
  'other',
] as const;

type Category = typeof CATEGORIES[number];

export default function Contact() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [category, setCategory] = useState<Category>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !message.trim() || !email.trim()) {
      toast({ title: t('contact.fillAll'), variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact', {
        body: {
          category,
          subject: subject.trim(),
          message: message.trim(),
          email: email.trim(),
          userId: user?.id || null,
        },
      });

      if (error) throw error;

      toast({ title: t('contact.sent') });
      setSubject('');
      setMessage('');
      setCategory('bug');
    } catch {
      toast({ title: t('contact.error'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Support - Re-Bali"
        description="Contact Re-Bali support team for help with your account, listings, or any other issue."
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('contact.title')}</CardTitle>
            <CardDescription>{t('contact.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t('contact.category')}</Label>
                <RadioGroup value={category} onValueChange={(v) => setCategory(v as Category)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value={cat} id={`cat-${cat}`} />
                      <Label htmlFor={`cat-${cat}`} className="cursor-pointer flex-1">{t(`contact.cat_${cat}`)}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="contact-email">{t('contact.email')}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="contact-subject">{t('contact.subject')}</Label>
                <Input
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('contact.subjectPlaceholder')}
                  maxLength={200}
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="contact-message">{t('contact.message')}</Label>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contact.messagePlaceholder')}
                  rows={5}
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                {t('contact.send')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
