
-- Pro Subscriptions table
CREATE TABLE public.pro_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT DEFAULT 'manual',
  payment_reference TEXT,
  price_idr INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own pro subscriptions"
ON public.pro_subscriptions
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all pro subscriptions"
ON public.pro_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert subscriptions (manual activation)
CREATE POLICY "Admins can insert pro subscriptions"
ON public.pro_subscriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update subscriptions
CREATE POLICY "Admins can update pro subscriptions"
ON public.pro_subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for future payment integration)
CREATE POLICY "Service role can manage pro subscriptions"
ON public.pro_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_pro_subscriptions_updated_at
BEFORE UPDATE ON public.pro_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update check_listing_limit to account for pro subscriptions
CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  active_count INTEGER;
  account_age INTERVAL;
  max_listings INTEGER;
  extra_slots INTEGER;
  is_pro BOOLEAN;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT (now() - p.created_at) INTO account_age
    FROM public.profiles p WHERE p.id = NEW.seller_id;
    
    IF account_age < INTERVAL '7 days' THEN
      max_listings := 3;
    ELSE
      max_listings := 5;
    END IF;
    
    -- Check if user has active Pro subscription -> 15 listings
    SELECT EXISTS(
      SELECT 1 FROM public.pro_subscriptions
      WHERE user_id = NEW.seller_id
        AND status = 'active'
        AND expires_at > now()
    ) INTO is_pro;
    
    IF is_pro THEN
      max_listings := 15;
    END IF;
    
    -- Add extra slots from active extra_listings addons
    SELECT COALESCE(SUM(ua.extra_slots), 0) INTO extra_slots
    FROM public.user_addons ua
    WHERE ua.user_id = NEW.seller_id
      AND ua.addon_type = 'extra_listings'
      AND ua.active = true
      AND (ua.expires_at IS NULL OR ua.expires_at > now());
    
    max_listings := max_listings + extra_slots;
    
    SELECT COUNT(*) INTO active_count
    FROM public.listings
    WHERE seller_id = NEW.seller_id AND status = 'active' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF active_count >= max_listings THEN
      RAISE EXCEPTION 'Maximum % active listings allowed', max_listings;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
