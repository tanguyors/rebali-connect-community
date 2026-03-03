import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'terms' | 'privacy';
}

export function LegalDialog({ open, onOpenChange, type }: LegalDialogProps) {
  const { t } = useLanguage();

  const sections = type === 'terms'
    ? [
        { title: `1. ${t('legal.termsAcceptance')}`, text: t('legal.termsAcceptanceText') },
        { title: `2. ${t('legal.termsDescription')}`, text: t('legal.termsDescriptionText') },
        { title: `3. ${t('legal.termsAccount')}`, text: t('legal.termsAccountText') },
        { title: `4. ${t('legal.termsListings')}`, text: t('legal.termsListingsText') },
        { title: `5. ${t('legal.termsProhibited')}`, text: t('legal.termsProhibitedText') },
        { title: `6. ${t('legal.termsLiability')}`, text: t('legal.termsLiabilityText') },
        { title: `7. ${t('legal.termsModification')}`, text: t('legal.termsModificationText') },
        { title: `8. ${t('legal.termsContact')}`, text: t('legal.termsContactText') },
      ]
    : [
        { title: `1. ${t('legal.privacyCollection')}`, text: t('legal.privacyCollectionText') },
        { title: `2. ${t('legal.privacyUse')}`, text: t('legal.privacyUseText') },
        { title: `3. ${t('legal.privacyStorage')}`, text: t('legal.privacyStorageText') },
        { title: `4. ${t('legal.privacySharing')}`, text: t('legal.privacySharingText') },
        { title: `5. ${t('legal.privacyCookies')}`, text: t('legal.privacyCookiesText') },
        { title: `6. ${t('legal.privacyRights')}`, text: t('legal.privacyRightsText') },
        { title: `7. ${t('legal.privacySecurity')}`, text: t('legal.privacySecurityText') },
        { title: `8. ${t('legal.privacyContact')}`, text: t('legal.privacyContactText') },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {type === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('legal.lastUpdated')}: 21/02/2026
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] px-6 pb-6">
          <div className="space-y-5 pr-4">
            {sections.map((s, i) => (
              <section key={i}>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
