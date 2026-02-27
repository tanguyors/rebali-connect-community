
CREATE OR REPLACE FUNCTION public.get_total_unread_messages(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE (c.buyer_id = _user_id OR c.seller_id = _user_id)
    AND m.sender_id != _user_id
    AND m.read = false
$$;
