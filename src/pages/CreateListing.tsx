import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, CATEGORY_TREE, LOCATIONS, CONDITIONS, CURRENCIES, CATEGORY_ICONS, MAX_ACTIVE_LISTINGS, formatPrice } from '@/lib/constants';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { toast } from '@/hooks/use-toast';
import { Upload, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const STEPS = ['stepCategory', 'stepDetails', 'stepPhotos', 'stepPreview'] as const;

export default function CreateListing() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState<{ id: string; storage_path: string; url: string }[]>([]);

  const [form, setForm] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    price: '',
    currency: 'IDR',
    location: '',
    condition: 'good',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { data: activeCount } = useQuery({
    queryKey: ['active-listing-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.rpc('get_active_listing_count', { _user_id: user.id });
      return data || 0;
    },
    enabled: !!user,
  });

  const canPost = isEditMode || (activeCount || 0) < MAX_ACTIVE_LISTINGS;

  // Load existing listing for edit mode
  useEffect(() => {
    if (!editId || !user) return;
    const loadListing = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_images(id, storage_path, sort_order)')
        .eq('id', editId)
        .eq('seller_id', user.id)
        .single();
      if (!data) { navigate('/my-listings'); return; }
      setIsEditMode(true);
      setForm({
        category: data.category,
        subcategory: data.subcategory || '',
        title: data.title_original,
        description: data.description_original,
        price: String(data.price),
        currency: data.currency,
        location: data.location_area,
        condition: data.condition,
      });
      const imgs = (data.listing_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      setExistingImageUrls(imgs.map((img: any) => ({
        id: img.id,
        storage_path: img.storage_path,
        url: supabase.storage.from('listings').getPublicUrl(img.storage_path).data.publicUrl,
      })));
    };
    loadListing();
  }, [editId, user]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 10 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }, [photos]);

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const canProceed = () => {
    if (step === 0) return !!form.category && !!form.subcategory;
    if (step === 1) return form.title && form.description && form.price !== '' && form.location;
    if (step === 2) return photos.length > 0 || existingImageUrls.length > 0;
    return true;
  };

  // Content filtering patterns
  const SUSPICIOUS_PATTERNS = [
    /wa\.me\//i, /t\.me\//i, /bit\.ly\//i, /tinyurl\.com/i,
    /https?:\/\/[^\s]+/i, /telegram/i, /whatsapp\.com/i, /signal\.me/i,
    /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/,
  ];

  const checkContent = (text: string): boolean => {
    return SUSPICIOUS_PATTERNS.some(p => p.test(text));
  };

  // Watermark function
  const addWatermark = async (file: File, username: string): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Watermark text
        const date = new Date().toLocaleDateString('fr-FR');
        const text = `Re-Bali - @${username} - ${date}`;
        const fontSize = Math.max(14, Math.floor(img.width / 40));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;

        const metrics = ctx.measureText(text);
        const x = img.width - metrics.width - 15;
        const y = img.height - 15;

        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.9);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePublish = async () => {
    if (!user || !canPost) return;

    // Check content for suspicious patterns
    if (checkContent(form.description) || checkContent(form.title)) {
      toast({ title: t('security.contentBlocked'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && editId) {
        // Update existing listing
        const { error } = await supabase.from('listings').update({
          category: form.category as any,
          subcategory: form.subcategory,
          title_original: form.title,
          description_original: form.description,
          price: parseFloat(form.price) || 0,
          currency: form.currency,
          location_area: form.location,
          condition: form.condition as any,
        }).eq('id', editId);
        if (error) throw error;

        // Upload new images
        const username = profile?.display_name || 'user';
        const startIndex = existingImageUrls.length;
        for (let i = 0; i < photos.length; i++) {
          const watermarked = await addWatermark(photos[i], username);
          const path = `${user.id}/${editId}/${startIndex + i}.jpg`;
          await supabase.storage.from('listings').upload(path, watermarked);
          await supabase.from('listing_images').insert({
            listing_id: editId,
            storage_path: path,
            sort_order: startIndex + i,
          });
        }

        toast({ title: t('listing.updated') });
        navigate(`/listing/${editId}`);
      } else {
        // Create new listing
        const { data: listing, error } = await supabase.from('listings').insert({
          seller_id: user.id,
          category: form.category as any,
          subcategory: form.subcategory,
          title_original: form.title,
          description_original: form.description,
          price: parseFloat(form.price) || 0,
          currency: form.currency,
          location_area: form.location,
          condition: form.condition as any,
          status: 'active',
        }).select().single();

        if (error) throw error;

        // Upload images with watermark
        const username = profile?.display_name || 'user';
        for (let i = 0; i < photos.length; i++) {
          const watermarked = await addWatermark(photos[i], username);
          const ext = 'jpg';
          const path = `${user.id}/${listing.id}/${i}.${ext}`;
          await supabase.storage.from('listings').upload(path, watermarked);
          await supabase.from('listing_images').insert({
            listing_id: listing.id,
            storage_path: path,
            sort_order: i,
          });
        }

        // Create translation placeholders
        const translations = SUPPORTED_LANGUAGES.map(lang => ({
          listing_id: listing.id,
          lang: lang.code,
          title: lang.code === 'en' ? form.title : 'Pending translation',
          description: lang.code === 'en' ? form.description : 'Pending translation',
          is_machine: true,
        }));
        await supabase.from('listing_translations').insert(translations);

        toast({ title: t('createListing.listingCreated') });
        navigate(`/listing/${listing.id}`);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!profile?.phone_verified) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">{t('createListing.whatsappRequired')}</p>
        <Button className="mt-4" onClick={() => navigate('/profile')}>{t('createListing.verifyWhatsapp')}</Button>
      </div>
    );
  }

  if (!canPost) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">{t('createListing.limitReached')}</p>
        <p className="text-sm text-muted-foreground mt-2">{activeCount}/{MAX_ACTIVE_LISTINGS} {t('myListings.activeCount')}</p>
        <Button className="mt-4" onClick={() => navigate('/my-listings')}>{t('nav.myListings')}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">{isEditMode ? t('listing.editListing') : t('createListing.title')}</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-sm hidden sm:inline">{t(`createListing.${s}`)}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Category */}
      {step === 0 && (
        <div className="space-y-6">
          {/* Main categories */}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <Card key={cat}
                className={`cursor-pointer transition-all hover:shadow-md ${form.category === cat ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setForm(f => ({ ...f, category: cat, subcategory: '' }))}>
                <CardContent className="p-4 text-center">
                  <span className="text-3xl block mb-2">{CATEGORY_ICONS[cat]}</span>
                  <span className="font-medium text-sm">{t(`categories.${cat}`)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Subcategories */}
          {form.category && CATEGORY_TREE[form.category] && (
            <div>
              <Label className="mb-2 block">{t('createListing.selectSubcategory')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_TREE[form.category].map(sub => (
                  <Card key={sub}
                    className={`cursor-pointer transition-all hover:shadow-md ${form.subcategory === sub ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setForm(f => ({ ...f, subcategory: sub }))}>
                    <CardContent className="p-3 text-center">
                      <span className="font-medium text-sm">{t(`subcategories.${sub}`)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>{t('createListing.titleLabel')} *</Label>
            <Input placeholder={t('createListing.titlePlaceholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>{t('createListing.descriptionLabel')} *</Label>
            <Textarea placeholder={t('createListing.descriptionPlaceholder')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('createListing.priceLabel')} *</Label>
              <Input type="number" min="0" placeholder={t('createListing.pricePlaceholder')} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <Label>{t('createListing.currencyLabel')}</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t('createListing.locationLabel')} *</Label>
            <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
              <SelectTrigger><SelectValue placeholder={t('createListing.selectLocation')} /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(l => (
                  <SelectItem key={l} value={l}>{t(`locations.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('createListing.conditionLabel')}</Label>
            <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map(c => <SelectItem key={c} value={c}>{t(`conditions.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2: Photos */}
      {step === 2 && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {existingImageUrls.map((img, i) => (
              <div key={`existing-${img.id}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button onClick={async () => {
                  await supabase.from('listing_images').delete().eq('id', img.id);
                  await supabase.storage.from('listings').remove([img.storage_path]);
                  setExistingImageUrls(prev => prev.filter((_, idx) => idx !== i));
                }} className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {(photos.length + existingImageUrls.length) < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">{t('createListing.dragOrClick')}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{photos.length + existingImageUrls.length}/10 — {t('createListing.maxPhotos')}</p>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {(existingImageUrls[0] || previews[0]) && <img src={existingImageUrls[0]?.url || previews[0]} alt="" className="w-full aspect-[4/3] object-cover rounded-lg" />}
            <Badge>{CATEGORY_ICONS[form.category]} {t(`categories.${form.category}`)} — {t(`subcategories.${form.subcategory}`)}</Badge>
            <h2 className="text-xl font-bold">{form.title}</h2>
            <p className="text-2xl font-bold text-primary">{formatPrice(parseFloat(form.price) || 0, form.currency)}</p>
            <p className="text-sm text-muted-foreground">{t(`locations.${form.location}`)} · {t(`conditions.${form.condition}`)}</p>
            <p className="text-muted-foreground">{form.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> {t('common.back')}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={loading}>
            {isEditMode ? t('listing.update') : t('createListing.publishListing')}
          </Button>
        )}
      </div>
    </div>
  );
}
