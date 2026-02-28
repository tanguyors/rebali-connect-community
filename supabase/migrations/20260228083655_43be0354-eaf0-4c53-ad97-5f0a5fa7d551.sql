
-- Table to track Xendit payment invoices
CREATE TABLE public.payment_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  xendit_invoice_id text NOT NULL UNIQUE,
  xendit_invoice_url text NOT NULL,
  invoice_type text NOT NULL, -- 'points' or 'pro_subscription'
  pack_id text, -- e.g. 'starter', 'popular', 'premium', 'mega'
  plan_type text, -- e.g. 'monthly', 'annual'
  amount_idr integer NOT NULL,
  points_amount integer, -- for point packs
  status text NOT NULL DEFAULT 'pending', -- pending, paid, expired, failed
  paid_at timestamp with time zone,
  xendit_callback_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices"
ON public.payment_invoices FOR SELECT
USING (user_id = auth.uid());

-- Service role can manage all invoices (for webhook)
CREATE POLICY "Service role can manage invoices"
ON public.payment_invoices FOR ALL
USING (true) WITH CHECK (true);

-- Users can create their own invoices
CREATE POLICY "Users can create their own invoices"
ON public.payment_invoices FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_payment_invoices_updated_at
BEFORE UPDATE ON public.payment_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for webhook lookups
CREATE INDEX idx_payment_invoices_xendit_id ON public.payment_invoices (xendit_invoice_id);
CREATE INDEX idx_payment_invoices_user_status ON public.payment_invoices (user_id, status);
