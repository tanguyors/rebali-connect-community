
-- Points balance table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage points" ON public.user_points
  FOR ALL USING (true) WITH CHECK (true);

-- Points transaction history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'spent')),
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.point_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can insert transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (true);

-- Active add-ons
CREATE TABLE public.user_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  addon_type text NOT NULL CHECK (addon_type IN ('boost', 'vip', 'extra_listings')),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  expires_at timestamptz,
  extra_slots integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addons" ON public.user_addons
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage addons" ON public.user_addons
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Everyone can see active boosts" ON public.user_addons
  FOR SELECT USING (addon_type = 'boost' AND active = true);

-- Index for quick lookups
CREATE INDEX idx_user_addons_active ON public.user_addons(user_id, addon_type, active);
CREATE INDEX idx_point_transactions_user ON public.point_transactions(user_id, created_at DESC);
