
-- Saved search alerts (VIP-only feature)
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications for matched listings
CREATE TABLE public.search_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  notified_wa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: saved_searches
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
ON public.saved_searches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches FOR DELETE
USING (auth.uid() = user_id);

-- RLS: search_notifications
CREATE POLICY "Users can view their own notifications"
ON public.search_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.search_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.search_notifications FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_active ON public.saved_searches(is_active) WHERE is_active = true;
CREATE INDEX idx_search_notifications_user ON public.search_notifications(user_id);
CREATE INDEX idx_search_notifications_unread ON public.search_notifications(user_id, read) WHERE read = false;

-- Function to call edge function when a listing is created with status 'active'
CREATE OR REPLACE FUNCTION public.notify_saved_searches_on_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/notify-saved-searches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      ),
      body := jsonb_build_object(
        'listing_id', NEW.id,
        'title', NEW.title_original,
        'description', NEW.description_original,
        'category', NEW.category,
        'price', NEW.price,
        'seller_id', NEW.seller_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on listings insert
CREATE TRIGGER on_listing_created_notify_searches
AFTER INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_saved_searches_on_listing();
