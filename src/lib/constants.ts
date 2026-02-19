export const CATEGORIES = [
  'real_estate',
  'furniture_home',
  'vehicles',
  'horeca_equipment',
  'business_assets',
  'relocation_services',
  'misc',
] as const;

export const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const;

export const LOCATIONS = [
  'canggu', 'ubud', 'seminyak', 'lovina', 'uluwatu',
  'denpasar', 'sanur', 'nusa_dua', 'nusa_penida', 'kuta',
  'jimbaran', 'tabanan', 'karangasem', 'singaraja', 'other',
] as const;

export const CURRENCIES = ['IDR', 'USD', 'EUR'] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  real_estate: '🏠',
  furniture_home: '🛋️',
  vehicles: '🏍️',
  horeca_equipment: '🍳',
  business_assets: '💼',
  relocation_services: '📦',
  misc: '🔖',
};

export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  real_estate: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&h=450&fit=crop',
  furniture_home: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=450&fit=crop',
  vehicles: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=450&fit=crop',
  horeca_equipment: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=450&fit=crop',
  business_assets: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=450&fit=crop',
  relocation_services: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=450&fit=crop',
  misc: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=450&fit=crop',
};

export const MAX_ACTIVE_LISTINGS = 5;
export const MAX_PHOTOS = 10;

export function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  const formatter = new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  });
  return formatter.format(price);
}
