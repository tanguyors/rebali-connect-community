
-- =============================================
-- RE-BALI MARKETPLACE SCHEMA
-- =============================================

-- ENUMS
CREATE TYPE public.user_type AS ENUM ('private', 'business');
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'sold', 'archived');
CREATE TYPE public.listing_category AS ENUM ('real_estate', 'furniture_home', 'vehicles', 'horeca_equipment', 'business_assets', 'relocation_services', 'misc');
CREATE TYPE public.item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'for_parts');
CREATE TYPE public.report_reason AS ENUM ('scam', 'prohibited', 'duplicate', 'spam', 'wrong_category', 'other');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  user_type public.user_type NOT NULL DEFAULT 'private',
  preferred_lang TEXT NOT NULL DEFAULT 'en',
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- USER ROLES (separate table for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============================================
-- LISTINGS
-- =============================================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.listing_status NOT NULL DEFAULT 'active',
  category public.listing_category NOT NULL,
  title_original TEXT NOT NULL,
  description_original TEXT NOT NULL,
  lang_original TEXT NOT NULL DEFAULT 'en',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  location_area TEXT NOT NULL,
  condition public.item_condition NOT NULL DEFAULT 'good',
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers can delete their own listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Enforce 5 active listing limit
CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT COUNT(*) INTO active_count
    FROM public.listings
    WHERE seller_id = NEW.seller_id AND status = 'active' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Maximum 5 active listings allowed per user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_listing_limit
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.check_listing_limit();

-- =============================================
-- LISTING TRANSLATIONS
-- =============================================
CREATE TABLE public.listing_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Pending translation',
  description TEXT NOT NULL DEFAULT 'Pending translation',
  is_machine BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, lang)
);

ALTER TABLE public.listing_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translations are viewable by everyone"
  ON public.listing_translations FOR SELECT USING (true);

CREATE POLICY "Sellers can manage their listing translations"
  ON public.listing_translations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid())
  );

CREATE POLICY "Sellers can update their listing translations"
  ON public.listing_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid())
  );

-- =============================================
-- LISTING IMAGES
-- =============================================
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Images are viewable by everyone"
  ON public.listing_images FOR SELECT USING (true);

CREATE POLICY "Sellers can add images to their listings"
  ON public.listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid())
  );

CREATE POLICY "Sellers can update their listing images"
  ON public.listing_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid())
  );

CREATE POLICY "Sellers can delete their listing images"
  ON public.listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid())
  );

-- =============================================
-- REPORTS
-- =============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  details TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own listing images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- HELPER: updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listing_translations_updated_at
  BEFORE UPDATE ON public.listing_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RPC: Get active listing count for a user
-- =============================================
CREATE OR REPLACE FUNCTION public.get_active_listing_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.listings
  WHERE seller_id = _user_id AND status = 'active'
$$;

-- =============================================
-- RPC: Increment views
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_views(_listing_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings SET views_count = views_count + 1 WHERE id = _listing_id
$$;
