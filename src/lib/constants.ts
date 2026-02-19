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
