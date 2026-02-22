
-- Step 1: ALTER conversations table
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_msg_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_msg_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_msg_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS relay_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Step 2: ALTER messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS from_role text;

-- Step 3: CREATE wa_relay_tokens table
CREATE TABLE IF NOT EXISTS public.wa_relay_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_relay_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert tokens"
  ON public.wa_relay_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update tokens"
  ON public.wa_relay_tokens FOR UPDATE
  USING (true);

CREATE POLICY "Users can read their own tokens"
  ON public.wa_relay_tokens FOR SELECT
  USING (buyer_id = auth.uid());

CREATE POLICY "Admins can read all tokens"
  ON public.wa_relay_tokens FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: CREATE risk_events table
CREATE TABLE IF NOT EXISTS public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert risk events"
  ON public.risk_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read risk events"
  ON public.risk_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 5: Admin RLS policies for conversations
CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all conversations"
  ON public.conversations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
