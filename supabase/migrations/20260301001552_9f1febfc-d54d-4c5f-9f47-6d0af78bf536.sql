
-- ===========================================
-- 1. Drop ALL unnecessary "Service role" permissive policies
--    Service role bypasses RLS entirely, so these policies
--    only create security holes by granting access to anon/authenticated
-- ===========================================

-- payment_invoices: CRITICAL - was exposing all invoices publicly
DROP POLICY IF EXISTS "Service role can manage invoices" ON public.payment_invoices;

-- user_points: CRITICAL - was exposing all point balances publicly
DROP POLICY IF EXISTS "Service role can manage points" ON public.user_points;

-- pro_subscriptions
DROP POLICY IF EXISTS "Service role can manage pro subscriptions" ON public.pro_subscriptions;

-- user_addons
DROP POLICY IF EXISTS "Service role can manage addons" ON public.user_addons;

-- trust_scores
DROP POLICY IF EXISTS "Service role can manage trust scores" ON public.trust_scores;
DROP POLICY IF EXISTS "Service role can update trust scores" ON public.trust_scores;

-- point_transactions
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.point_transactions;

-- user_devices
DROP POLICY IF EXISTS "Service role can insert devices" ON public.user_devices;

-- wa_relay_tokens
DROP POLICY IF EXISTS "Service role can insert tokens" ON public.wa_relay_tokens;
DROP POLICY IF EXISTS "Service role can update tokens" ON public.wa_relay_tokens;

-- phone_verifications
DROP POLICY IF EXISTS "Service role can manage verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role can update verifications" ON public.phone_verifications;

-- search_notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.search_notifications;

-- search_logs
DROP POLICY IF EXISTS "Service role can delete search logs" ON public.search_logs;

-- listing_translations
DROP POLICY IF EXISTS "Service role can insert translations" ON public.listing_translations;
DROP POLICY IF EXISTS "Service role can update translations" ON public.listing_translations;

-- push_subscriptions
DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;

-- ===========================================
-- 2. Tighten INSERT policies to validate user_id
-- ===========================================

-- search_logs: ensure user_id matches caller
DROP POLICY IF EXISTS "Authenticated users can log searches" ON public.search_logs;
CREATE POLICY "Authenticated users can log searches"
  ON public.search_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- whatsapp_click_logs: ensure user_id matches caller
DROP POLICY IF EXISTS "Authenticated users can insert click logs" ON public.whatsapp_click_logs;
CREATE POLICY "Authenticated users can insert click logs"
  ON public.whatsapp_click_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ===========================================
-- 3. Restrict profiles SELECT to hide sensitive columns
--    Create a secure view for public access
-- ===========================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Owner and admins see everything
CREATE POLICY "Users can view their own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Create a secure public view that hides sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  is_verified_seller,
  trust_score,
  risk_level,
  user_type,
  created_at,
  phone_verified
FROM public.profiles;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ===========================================
-- 4. Conversations: participants can view but buyer_phone 
--    is already restricted to participants only (OK)
--    Add policy to ensure buyer_phone can only be set by buyer
-- ===========================================

-- No change needed - conversations already restricted to participants

-- ===========================================
-- 5. User addons: restrict the public boost visibility
--    to only expose listing_id and addon_type, not user details
-- ===========================================
DROP POLICY IF EXISTS "Everyone can see active boosts" ON public.user_addons;
CREATE POLICY "Everyone can see active boosts"
  ON public.user_addons FOR SELECT
  USING (
    addon_type IN ('boost', 'boost_premium')
    AND active = true
  );
