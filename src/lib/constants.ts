export const CATEGORY_TREE: Record<string, readonly string[]> = {
  emploi: ['offres_emploi', 'formations_pro'],
  vehicules: ['voitures', 'motos', 'caravaning', 'utilitaires', 'camions', 'nautisme', 'equip_auto', 'equip_moto', 'equip_caravaning', 'equip_nautisme'],
  immobilier: ['ventes_immobilieres', 'locations', 'colocations', 'bureaux_commerces'],
  mode: ['vetements', 'chaussures', 'accessoires_bagagerie', 'montres_bijoux'],
  vacances: ['locations_saisonnieres'],
  loisirs: ['antiquites', 'collection', 'cd_musique', 'dvd_films', 'instruments_musique', 'livres', 'modelisme', 'vins_gastronomie', 'jeux_jouets', 'loisirs_creatifs', 'sport_plein_air', 'velos', 'equip_velos'],
  animaux: ['animaux', 'accessoires_animaux', 'animaux_perdus'],
  electronique: ['ordinateurs', 'accessoires_info', 'tablettes_liseuses', 'photo_audio_video', 'telephones_connectes', 'accessoires_telephone', 'consoles', 'jeux_video'],
  services: ['artistes_musiciens', 'baby_sitting', 'billetterie', 'covoiturage', 'cours_particuliers', 'entraide_voisins', 'evenements', 'services_personne', 'services_animaux', 'services_demenagement', 'services_reparations_electroniques', 'services_reparations_mecaniques', 'services_jardinerie_bricolage', 'services_evenementiels', 'autres_services'],
  famille: ['equip_bebe', 'mobilier_enfant', 'vetements_bebe'],
  maison_jardin: ['ameublement', 'papeterie_fournitures', 'electromenager', 'arts_table', 'decoration', 'linge_maison', 'bricolage', 'jardin_plantes'],
  materiel_pro: ['tracteurs', 'materiel_agricole', 'btp_chantier', 'poids_lourds', 'manutention_levage', 'equip_industriels', 'equip_restaurants_hotels', 'equip_fournitures_bureau', 'equip_commerces_marches', 'materiel_medical'],
  divers: ['autres'],
};

export const CATEGORIES = Object.keys(CATEGORY_TREE);

export const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const;

export const LOCATIONS = [
  'canggu', 'ubud', 'seminyak', 'lovina', 'uluwatu',
  'denpasar', 'sanur', 'nusa_dua', 'nusa_penida', 'kuta',
  'jimbaran', 'tabanan', 'karangasem', 'singaraja', 'other',
] as const;

export const CURRENCIES = ['IDR', 'USD', 'EUR'] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  emploi: '💼',
  vehicules: '🚗',
  immobilier: '🏠',
  mode: '👗',
  vacances: '🏖️',
  loisirs: '🎮',
  animaux: '🐾',
  electronique: '💻',
  services: '🔧',
  famille: '👶',
  maison_jardin: '🛋️',
  materiel_pro: '🏗️',
  divers: '📦',
};

export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  emploi: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=450&fit=crop',
  vehicules: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=450&fit=crop',
  immobilier: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&h=450&fit=crop',
  mode: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=450&fit=crop',
  vacances: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop',
  loisirs: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&h=450&fit=crop',
  animaux: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=450&fit=crop',
  electronique: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=450&fit=crop',
  services: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=450&fit=crop',
  famille: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=450&fit=crop',
  maison_jardin: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=450&fit=crop',
  materiel_pro: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=450&fit=crop',
  divers: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=450&fit=crop',
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
