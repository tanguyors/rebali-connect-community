
-- Fix duplicate SELECT policy on banned_devices (remove the overly permissive one)
DROP POLICY IF EXISTS "Service role can read banned devices" ON public.banned_devices;
