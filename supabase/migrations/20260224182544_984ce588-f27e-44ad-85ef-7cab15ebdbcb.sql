
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
    
    -- Check if user has active Pro subscription -> 50 listings
    SELECT EXISTS(
      SELECT 1 FROM public.pro_subscriptions
      WHERE user_id = NEW.seller_id
        AND status = 'active'
        AND expires_at > now()
    ) INTO is_pro;
    
    IF is_pro THEN
      max_listings := 50;
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
