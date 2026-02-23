
-- Add deal_closed columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deal_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS deal_closed_by uuid;

-- Add conversation_id and is_verified_purchase to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean NOT NULL DEFAULT false;

-- Unique constraint: one review per conversation
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_conversation_id_unique UNIQUE (conversation_id);

-- Foreign key from reviews.conversation_id to conversations.id
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);

-- Drop old INSERT policy on reviews
DROP POLICY IF EXISTS "Users can create reviews for others" ON public.reviews;

-- New INSERT policy with verified purchase conditions
CREATE POLICY "Users can create reviews for others"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND auth.uid() <> seller_id
  AND (
    -- Allow legacy reviews without conversation_id (optional, remove if you want to block)
    conversation_id IS NULL
    OR
    -- Verified purchase: qualifying conversation exists
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.profiles buyer_p ON buyer_p.id = c.buyer_id
      JOIN public.profiles seller_p ON seller_p.id = c.seller_id
      WHERE c.id = reviews.conversation_id
        AND c.deal_closed = true
        AND c.buyer_id = auth.uid()
        AND buyer_p.created_at < now() - interval '7 days'
        AND seller_p.created_at < now() - interval '7 days'
        AND EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id = c.buyer_id
            AND m.from_role IS DISTINCT FROM 'system'
        )
        AND EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id = c.seller_id
            AND m.from_role IS DISTINCT FROM 'system'
        )
    )
  )
);
