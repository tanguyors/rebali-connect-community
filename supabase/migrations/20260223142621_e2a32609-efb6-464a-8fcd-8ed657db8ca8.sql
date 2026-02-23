
-- 1. Add buyer_confirmed columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz;

-- 2. Add reviewed_user_id to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewed_user_id uuid;

-- 3. Drop the existing UNIQUE constraint on conversation_id (allows 2 reviews per conversation)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_conversation_id_key;

-- 4. Add composite UNIQUE constraint (one review per person per conversation)
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_conversation_reviewer_unique UNIQUE (conversation_id, reviewer_id);

-- 5. Drop the old INSERT policy on reviews
DROP POLICY IF EXISTS "Users can create reviews for others" ON public.reviews;

-- 6. New INSERT policy: bidirectional rating with buyer_confirmed required
CREATE POLICY "Users can create reviews for others"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id <> reviewed_user_id
  AND conversation_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM conversations c
      JOIN profiles reviewer_p ON reviewer_p.id = auth.uid()
      JOIN profiles reviewed_p ON reviewed_p.id = reviews.reviewed_user_id
    WHERE c.id = reviews.conversation_id
      AND c.deal_closed = true
      AND c.buyer_confirmed = true
      AND (
        (c.buyer_id = auth.uid() AND c.seller_id = reviews.reviewed_user_id)
        OR (c.seller_id = auth.uid() AND c.buyer_id = reviews.reviewed_user_id)
      )
      AND reviewer_p.created_at < now() - interval '7 days'
      AND reviewed_p.created_at < now() - interval '7 days'
      AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id = c.buyer_id AND m.from_role IS DISTINCT FROM 'system'
      )
      AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id = c.seller_id AND m.from_role IS DISTINCT FROM 'system'
      )
  )
);
