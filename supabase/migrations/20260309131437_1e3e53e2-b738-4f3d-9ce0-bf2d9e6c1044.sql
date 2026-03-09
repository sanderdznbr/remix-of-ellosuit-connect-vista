-- Allow authenticated users to SELECT available gift keys by key code (for redemption)
CREATE POLICY "Users can lookup available gift keys"
  ON public.gift_keys FOR SELECT TO authenticated
  USING (status = 'available');