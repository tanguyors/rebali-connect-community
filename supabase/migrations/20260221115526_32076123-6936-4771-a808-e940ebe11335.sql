
-- Function to search listings across all languages
CREATE OR REPLACE FUNCTION public.search_listings(search_term text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT l.id FROM public.listings l
  WHERE l.status = 'active'
    AND (l.title_original ILIKE '%' || search_term || '%'
         OR l.description_original ILIKE '%' || search_term || '%')
  UNION
  SELECT DISTINCT lt.listing_id FROM public.listing_translations lt
  JOIN public.listings l ON l.id = lt.listing_id
  WHERE l.status = 'active'
    AND (lt.title ILIKE '%' || search_term || '%'
         OR lt.description ILIKE '%' || search_term || '%')
$$;

-- Allow service role to insert/update translations (for edge function)
CREATE POLICY "Service role can insert translations"
ON public.listing_translations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update translations"
ON public.listing_translations
FOR UPDATE
USING (true);
