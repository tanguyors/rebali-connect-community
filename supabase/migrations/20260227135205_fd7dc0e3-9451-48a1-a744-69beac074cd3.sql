
-- Batch function: get favorites counts for multiple listings (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_listing_fav_counts(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, fav_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.listing_id, COUNT(*)::integer as fav_count
  FROM public.favorites f
  WHERE f.listing_id = ANY(_listing_ids)
  GROUP BY f.listing_id
$$;

-- Batch function: get active boosts for multiple listings (eliminates N+1)
CREATE OR REPLACE FUNCTION public.get_active_boosts(_listing_ids uuid[])
RETURNS TABLE(listing_id uuid, addon_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ua.listing_id, ua.addon_type
  FROM public.user_addons ua
  WHERE ua.listing_id = ANY(_listing_ids)
    AND ua.active = true
    AND ua.addon_type IN ('boost', 'boost_premium')
$$;
