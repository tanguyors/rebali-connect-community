ALTER TABLE public.id_verifications
ADD COLUMN documents_purged_at timestamptz DEFAULT NULL;