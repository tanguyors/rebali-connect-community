
-- Add short codes for both seller and buyer routing
ALTER TABLE public.conversations 
  ADD COLUMN seller_short_code TEXT,
  ADD COLUMN buyer_short_code TEXT;
