
-- Allow service role to delete old search logs
CREATE POLICY "Service role can delete search logs" ON public.search_logs FOR DELETE USING (true);
