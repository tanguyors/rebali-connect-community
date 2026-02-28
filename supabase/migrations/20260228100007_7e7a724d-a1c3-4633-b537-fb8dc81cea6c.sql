
-- Add image_hash column for duplicate detection
ALTER TABLE public.listing_images
  ADD COLUMN IF NOT EXISTS image_hash text;

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_listing_images_hash ON public.listing_images (image_hash) WHERE image_hash IS NOT NULL;

-- Function to check duplicate images across different sellers
CREATE OR REPLACE FUNCTION public.check_duplicate_image(_hash text, _seller_id uuid)
RETURNS TABLE(listing_id uuid, seller_id uuid, title_original text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT l.id as listing_id, l.seller_id, l.title_original
  FROM public.listing_images li
  JOIN public.listings l ON l.id = li.listing_id
  WHERE li.image_hash = _hash
    AND l.seller_id != _seller_id
    AND l.status = 'active'
  LIMIT 5
$$;
