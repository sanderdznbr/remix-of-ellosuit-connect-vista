
ALTER TABLE public.marketplace_styles
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS marketplace_styles_owner_idx ON public.marketplace_styles(owner_id);

-- Update SELECT policy so private styles are only visible to their owner
DROP POLICY IF EXISTS "Anyone can view marketplace styles" ON public.marketplace_styles;

CREATE POLICY "View marketplace styles (public or owner)"
  ON public.marketplace_styles
  FOR SELECT
  USING (
    is_active = true
    AND (
      is_private = false
      OR owner_id = auth.uid()
    )
  );

-- Allow authenticated users to create their own private styles
CREATE POLICY "Users can create their own private styles"
  ON public.marketplace_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND is_private = true
  );

-- Allow owners to update their own private styles
CREATE POLICY "Owners can update their private styles"
  ON public.marketplace_styles
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() AND is_private = true)
  WITH CHECK (owner_id = auth.uid() AND is_private = true);

-- Allow owners to delete their own private styles
CREATE POLICY "Owners can delete their private styles"
  ON public.marketplace_styles
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() AND is_private = true);
