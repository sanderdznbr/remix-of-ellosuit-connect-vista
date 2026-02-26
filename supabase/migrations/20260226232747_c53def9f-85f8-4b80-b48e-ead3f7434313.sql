
-- Add marketplace_style_id to generated_carousels to track which marketplace style was used
ALTER TABLE public.generated_carousels 
ADD COLUMN marketplace_style_id UUID REFERENCES public.marketplace_styles(id) ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX idx_generated_carousels_marketplace_style ON public.generated_carousels(marketplace_style_id) WHERE marketplace_style_id IS NOT NULL;

-- Allow anyone to read carousels for community gallery (public read)
-- Keep existing RLS policies, just add a SELECT policy for community viewing
CREATE POLICY "Anyone can view carousels with marketplace style" 
ON public.generated_carousels 
FOR SELECT 
USING (marketplace_style_id IS NOT NULL);
