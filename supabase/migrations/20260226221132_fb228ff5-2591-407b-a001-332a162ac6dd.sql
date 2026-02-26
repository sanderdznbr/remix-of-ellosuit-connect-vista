
-- 1. Fix FK to cascade deletes
ALTER TABLE public.purchased_styles
  DROP CONSTRAINT purchased_styles_style_id_fkey;

ALTER TABLE public.purchased_styles
  ADD CONSTRAINT purchased_styles_style_id_fkey
  FOREIGN KEY (style_id) REFERENCES public.marketplace_styles(id) ON DELETE CASCADE;

-- 2. Add RLS policies for admin management of marketplace_styles
CREATE POLICY "Authenticated users can insert marketplace styles"
ON public.marketplace_styles FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update marketplace styles"
ON public.marketplace_styles FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete marketplace styles"
ON public.marketplace_styles FOR DELETE
USING (auth.role() = 'authenticated');

-- 3. Also allow SELECT of ALL styles (not just active) for admin management
DROP POLICY IF EXISTS "Anyone can view active marketplace styles" ON public.marketplace_styles;
CREATE POLICY "Anyone can view marketplace styles"
ON public.marketplace_styles FOR SELECT
USING (true);
