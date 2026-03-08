-- Allow authenticated users to insert gift keys
CREATE POLICY "Users can insert gift keys"
ON public.gift_keys
FOR INSERT
TO authenticated
WITH CHECK (purchased_by = auth.uid());

-- Allow users to update gift keys for redemption
CREATE POLICY "Users can redeem gift keys"
ON public.gift_keys
FOR UPDATE
TO authenticated
USING (status = 'available')
WITH CHECK (redeemed_by = auth.uid());