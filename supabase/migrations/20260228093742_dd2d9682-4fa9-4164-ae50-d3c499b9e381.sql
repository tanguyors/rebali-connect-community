
CREATE OR REPLACE FUNCTION public.notify_saved_searches_on_listing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url := 'https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/notify-saved-searches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1),
          current_setting('app.settings.service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'listing_id', NEW.id,
        'title', NEW.title_original,
        'description', NEW.description_original,
        'category', NEW.category,
        'price', NEW.price,
        'seller_id', NEW.seller_id,
        'extra_fields', COALESCE(NEW.extra_fields, '{}'::jsonb)
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
