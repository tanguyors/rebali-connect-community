export const CATEGORY_TREE: Record<string, readonly string[]> = {
  emploi: ["offres_emploi", "formations_pro"],
  vehicules: [
    "voitures",
    "motos",
    "caravaning",
    "utilitaires",
    "camions",
    "nautisme",
    "equip_auto",
    "equip_moto",
    "equip_caravaning",
    "equip_nautisme",
  ],
  immobilier: ["ventes_immobilieres", "locations", "colocations", "bureaux_commerces"],
  mode: ["vetements", "chaussures", "accessoires_bagagerie", "montres_bijoux"],
  vacances: ["locations_saisonnieres"],
  loisirs: [
    "antiquites",
    "collection",
    "cd_musique",
    "dvd_films",
    "instruments_musique",
    "livres",
    "modelisme",
    "vins_gastronomie",
    "jeux_jouets",
    "loisirs_creatifs",
    "sport_plein_air",
    "velos",
    "equip_velos",
  ],
  animaux: ["animaux", "accessoires_animaux", "animaux_perdus"],
  electronique: [
    "ordinateurs",
    "accessoires_info",
    "tablettes_liseuses",
    "photo_audio_video",
    "telephones_connectes",
    "accessoires_telephone",
    "consoles",
    "jeux_video",
  ],
  services: [
    "artistes_musiciens",
    "baby_sitting",
    "billetterie",
    "covoiturage",
    "cours_particuliers",
    "entraide_voisins",
    "evenements",
    "services_personne",
    "services_animaux",
    "services_demenagement",
    "services_reparations_electroniques",
    "services_reparations_mecaniques",
    "services_jardinerie_bricolage",
    "services_evenementiels",
    "autres_services",
  ],
  famille: ["equip_bebe", "mobilier_enfant", "vetements_bebe"],
  maison_jardin: [
    "ameublement",
    "papeterie_fournitures",
    "electromenager",
    "arts_table",
    "decoration",
    "linge_maison",
    "bricolage",
    "jardin_plantes",
  ],
  materiel_pro: [
    "tracteurs",
    "materiel_agricole",
    "btp_chantier",
    "poids_lourds",
    "manutention_levage",
    "equip_industriels",
    "equip_restaurants_hotels",
    "equip_fournitures_bureau",
    "equip_commerces_marches",
    "materiel_medical",
  ],
  divers: ["autres"],
};

export const CATEGORIES = Object.keys(CATEGORY_TREE);

export const CONDITIONS = ["new", "like_new", "good", "fair", "for_parts"] as const;

export const LOCATIONS = [
  "canggu",
  "ubud",
  "seminyak",
  "lovina",
  "uluwatu",
  "denpasar",
  "sanur",
  "nusa_dua",
  "nusa_penida",
  "kuta",
  "jimbaran",
  "tabanan",
  "karangasem",
  "singaraja",
  "other",
] as const;

export const CURRENCIES = ["IDR", "USD", "EUR"] as const;

// Approximate GPS coordinates for each Bali location area
export const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  canggu: { lat: -8.6478, lng: 115.1385 },
  ubud: { lat: -8.5069, lng: 115.2625 },
  seminyak: { lat: -8.6913, lng: 115.1683 },
  lovina: { lat: -8.1527, lng: 115.0251 },
  uluwatu: { lat: -8.8291, lng: 115.0849 },
  denpasar: { lat: -8.65, lng: 115.2167 },
  sanur: { lat: -8.6936, lng: 115.2622 },
  nusa_dua: { lat: -8.8003, lng: 115.2331 },
  nusa_penida: { lat: -8.7275, lng: 115.5444 },
  kuta: { lat: -8.718, lng: 115.169 },
  jimbaran: { lat: -8.79, lng: 115.16 },
  tabanan: { lat: -8.541, lng: 115.125 },
  karangasem: { lat: -8.4483, lng: 115.6127 },
  singaraja: { lat: -8.112, lng: 115.0882 },
  other: { lat: -8.4095, lng: 115.1889 },
};

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CATEGORY_ICONS: Record<string, string> = {
  emploi: "💼",
  vehicules: "🚗",
  immobilier: "🏠",
  mode: "👗",
  vacances: "🏖️",
  loisirs: "🎮",
  animaux: "🐾",
  electronique: "💻",
  services: "🔧",
  famille: "👶",
  maison_jardin: "🛋️",
  materiel_pro: "🏗️",
  divers: "📦",
};

export const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  emploi: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=450&fit=crop",
  vehicules: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=450&fit=crop",
  immobilier: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&h=450&fit=crop",
  mode: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=450&fit=crop",
  vacances: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop",
  loisirs: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=600&h=450&fit=crop",
  animaux: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=450&fit=crop",
  electronique: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=450&fit=crop",
  services: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600&h=450&fit=crop",
  famille: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=450&fit=crop",
  maison_jardin: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=450&fit=crop",
  materiel_pro: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=450&fit=crop",
  divers: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=450&fit=crop",
};

export const MAX_ACTIVE_LISTINGS = 5;
export const MAX_PHOTOS = 10;

// Re-Bali WhatsApp proxy number (set to your actual Re-Bali WhatsApp number)
export const REBALI_WA_NUMBER = "62881037357842";

// Category-specific extra fields configuration
// type: 'text' | 'number' | 'select'
export type ExtraFieldDef = {
  key: string;
  labelKey: string; // i18n key
  type: "text" | "number" | "select";
  options?: readonly string[]; // for select type
  required?: boolean;
  placeholder?: string;
  suffix?: string;
  rawOptions?: boolean; // if true, display option values as-is (no i18n translation)
};
export const CONTRACT_TYPES = ["cdi", "cdd", "interim", "freelance", "stage", "alternance", "independant"] as const;
export const JOB_SECTORS = [
  "immobilier",
  "informatique",
  "commerce",
  "sante",
  "education",
  "restauration",
  "transport",
  "batiment",
  "industrie",
  "finance",
  "communication",
  "juridique",
  "agriculture",
  "tourisme",
  "autre",
] as const;
export const WORK_TIMES = ["full_time", "part_time"] as const;
export const FUEL_TYPES = ["essence", "diesel", "electrique", "hybride", "gpl"] as const;
export const PROPERTY_TYPES = ["apartment", "house", "villa", "land", "commercial", "room"] as const;

export const VEHICLE_BRANDS = [
  "Audi",
  "BMW",
  "Chevrolet",
  "Citroën",
  "Daihatsu",
  "Ducati",
  "Fiat",
  "Ford",
  "Harley-Davidson",
  "Honda",
  "Hyundai",
  "Isuzu",
  "Jeep",
  "Kawasaki",
  "Kia",
  "KTM",
  "Land Rover",
  "Lexus",
  "Mazda",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Opel",
  "Peugeot",
  "Piaggio",
  "Porsche",
  "Renault",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Triumph",
  "Vespa",
  "Volkswagen",
  "Volvo",
  "Yamaha",
  "autre",
] as const;

export const COMPUTER_BRANDS = [
  "Acer",
  "Apple",
  "Asus",
  "Dell",
  "HP",
  "Huawei",
  "Lenovo",
  "LG",
  "Microsoft",
  "MSI",
  "Razer",
  "Samsung",
  "Toshiba",
  "autre",
] as const;

export const PHONE_BRANDS = [
  "Apple",
  "Google",
  "Honor",
  "HTC",
  "Huawei",
  "Motorola",
  "Nokia",
  "Nothing",
  "OnePlus",
  "Oppo",
  "Realme",
  "Samsung",
  "Sony",
  "Vivo",
  "Xiaomi",
  "autre",
] as const;

export const TABLET_BRANDS = [
  "Amazon",
  "Apple",
  "Huawei",
  "Lenovo",
  "Microsoft",
  "Samsung",
  "Xiaomi",
  "autre",
] as const;

export const CONSOLE_BRANDS = ["Microsoft", "Nintendo", "Sony", "Valve", "autre"] as const;

export const PHOTO_AUDIO_VIDEO_BRANDS = [
  "Bang & Olufsen",
  "Beats",
  "Bose",
  "Canon",
  "DJI",
  "Fujifilm",
  "Garmin",
  "GoPro",
  "JBL",
  "Marshall",
  "Nikon",
  "Olympus",
  "Panasonic",
  "Philips",
  "Samsung",
  "Sharp",
  "Sony",
  "TCL",
  "autre",
] as const;

export const ACCESSORIES_INFO_BRANDS = [
  "Corsair",
  "HP",
  "Logitech",
  "Microsoft",
  "Razer",
  "Samsung",
  "SteelSeries",
  "autre",
] as const;

export const PHONE_ACCESSORIES_BRANDS = ["Anker", "Apple", "Belkin", "JBL", "Samsung", "Spigen", "autre"] as const;

export const FASHION_BRANDS = [
  "Adidas",
  "Balenciaga",
  "Burberry",
  "Calvin Klein",
  "Chanel",
  "Converse",
  "Dior",
  "Dolce & Gabbana",
  "Fendi",
  "Gucci",
  "H&M",
  "Hermès",
  "Hugo Boss",
  "Lacoste",
  "Levi's",
  "Louis Vuitton",
  "Mango",
  "Michael Kors",
  "New Balance",
  "Nike",
  "Prada",
  "Puma",
  "Ralph Lauren",
  "Ray-Ban",
  "Reebok",
  "Saint Laurent",
  "The North Face",
  "Tommy Hilfiger",
  "Uniqlo",
  "Valentino",
  "Vans",
  "Versace",
  "Zara",
  "autre",
] as const;

export const ANIMAL_TYPES = ["chien", "chat", "oiseau", "poisson", "reptile", "rongeur", "cheval", "autre"] as const;

export const CATEGORIES_WITHOUT_CONDITION = ["emploi", "immobilier", "services", "vacances", "animaux"] as const;

export const CATEGORY_FIELDS: Record<string, ExtraFieldDef[]> = {
  emploi: [
    {
      key: "contract_type",
      labelKey: "extraFields.contractType",
      type: "select",
      options: CONTRACT_TYPES,
      required: true,
    },
    { key: "job_sector", labelKey: "extraFields.jobSector", type: "select", options: JOB_SECTORS },
    { key: "work_time", labelKey: "extraFields.workTime", type: "select", options: WORK_TIMES },
    { key: "salary", labelKey: "extraFields.salary", type: "text", placeholder: "ex: 5-10M IDR/month" },
    { key: "company_name", labelKey: "extraFields.companyName", type: "text" },
  ],
  vehicules: [
    {
      key: "brand",
      labelKey: "extraFields.brand",
      type: "select",
      options: VEHICLE_BRANDS,
      rawOptions: true,
      required: true,
    },
    { key: "model", labelKey: "extraFields.model", type: "text" },
    { key: "year", labelKey: "extraFields.year", type: "number", placeholder: "ex: 2022" },
    { key: "mileage", labelKey: "extraFields.mileage", type: "number", suffix: "km" },
    { key: "fuel_type", labelKey: "extraFields.fuelType", type: "select", options: FUEL_TYPES },
  ],
  immobilier: [
    {
      key: "property_type",
      labelKey: "extraFields.propertyType",
      type: "select",
      options: PROPERTY_TYPES,
      required: true,
    },
    { key: "surface", labelKey: "extraFields.surface", type: "number", suffix: "m²" },
    { key: "rooms", labelKey: "extraFields.rooms", type: "number" },
    { key: "furnished", labelKey: "extraFields.furnished", type: "select", options: ["yes", "no"] as const },
  ],
  mode: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: FASHION_BRANDS, rawOptions: true },
    { key: "size", labelKey: "extraFields.size", type: "text", placeholder: "ex: M, 42, US 10" },
  ],
  electronique: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: COMPUTER_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
};

// Subcategory-specific field overrides (takes priority over category-level)
export const SUBCATEGORY_FIELDS: Record<string, ExtraFieldDef[]> = {
  ordinateurs: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: COMPUTER_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  accessoires_info: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: ACCESSORIES_INFO_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  tablettes_liseuses: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: TABLET_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  photo_audio_video: [
    {
      key: "brand",
      labelKey: "extraFields.brand",
      type: "select",
      options: PHOTO_AUDIO_VIDEO_BRANDS,
      rawOptions: true,
    },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  telephones_connectes: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: PHONE_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  accessoires_telephone: [
    {
      key: "brand",
      labelKey: "extraFields.brand",
      type: "select",
      options: PHONE_ACCESSORIES_BRANDS,
      rawOptions: true,
    },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  consoles: [
    { key: "brand", labelKey: "extraFields.brand", type: "select", options: CONSOLE_BRANDS, rawOptions: true },
    { key: "model", labelKey: "extraFields.model", type: "text" },
  ],
  jeux_video: [{ key: "model", labelKey: "extraFields.model", type: "text" }],
  animaux: [
    { key: "animal_type", labelKey: "extraFields.animalType", type: "select", options: ANIMAL_TYPES },
    { key: "breed", labelKey: "extraFields.breed", type: "text" },
    { key: "age", labelKey: "extraFields.age", type: "text", placeholder: "ex: 2 ans" },
  ],
};

export function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Free";
  const formatter = new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  });
  return formatter.format(price);
}
