
-- Table to log search queries for trending feature
CREATE TABLE public.search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even anonymous)
CREATE POLICY "Anyone can log searches" ON public.search_logs FOR INSERT WITH CHECK (true);

-- Only admins can read raw logs
CREATE POLICY "Admins can view search logs" ON public.search_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for trending aggregation
CREATE INDEX idx_search_logs_term_created ON public.search_logs (created_at DESC, term);

-- Function to get trending searches (last 7 days, top N)
CREATE OR REPLACE FUNCTION public.get_trending_searches(max_results integer DEFAULT 6)
RETURNS TABLE(term text, search_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT lower(trim(sl.term)) as term, COUNT(*) as search_count
  FROM public.search_logs sl
  WHERE sl.created_at > now() - INTERVAL '7 days'
    AND length(trim(sl.term)) >= 2
  GROUP BY lower(trim(sl.term))
  ORDER BY search_count DESC
  LIMIT max_results;
$$;
