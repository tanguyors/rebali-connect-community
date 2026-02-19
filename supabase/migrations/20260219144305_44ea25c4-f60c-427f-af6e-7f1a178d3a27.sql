
-- Convert category from enum to text to support dynamic categories
ALTER TABLE public.listings 
  ALTER COLUMN category TYPE text USING category::text;

-- Add subcategory column
ALTER TABLE public.listings 
  ADD COLUMN subcategory text;

-- Migrate existing data to new category keys
UPDATE public.listings SET subcategory = 
  CASE category
    WHEN 'real_estate' THEN 'ventes_immobilieres'
    WHEN 'furniture_home' THEN 'ameublement'
    WHEN 'vehicles' THEN 'voitures'
    WHEN 'horeca_equipment' THEN 'equipements_restaurants_hotels'
    WHEN 'business_assets' THEN 'equipements_fournitures_bureau'
    WHEN 'relocation_services' THEN 'services_demenagement'
    WHEN 'misc' THEN 'autres'
  END;

UPDATE public.listings SET category = 
  CASE category
    WHEN 'real_estate' THEN 'immobilier'
    WHEN 'furniture_home' THEN 'maison_jardin'
    WHEN 'vehicles' THEN 'vehicules'
    WHEN 'horeca_equipment' THEN 'materiel_pro'
    WHEN 'business_assets' THEN 'materiel_pro'
    WHEN 'relocation_services' THEN 'services'
    WHEN 'misc' THEN 'divers'
  END;

-- Drop the old enum type (no longer needed)
DROP TYPE IF EXISTS public.listing_category;
