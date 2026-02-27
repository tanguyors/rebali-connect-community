
-- 1. Fix favorites: restrict SELECT to owner only (was public)
DROP POLICY IF EXISTS "Favorites are viewable by everyone" ON public.favorites;
CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Keep favorites count public via a secure function
CREATE OR REPLACE FUNCTION public.get_favorites_count(_listing_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.favorites WHERE listing_id = _listing_id
$$;
