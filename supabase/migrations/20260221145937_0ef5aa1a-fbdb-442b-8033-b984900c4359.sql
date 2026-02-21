
-- Add JSONB column for category-specific extra fields
ALTER TABLE public.listings ADD COLUMN extra_fields jsonb DEFAULT '{}'::jsonb;
