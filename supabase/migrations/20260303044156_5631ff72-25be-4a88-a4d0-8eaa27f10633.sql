ALTER TABLE public.generated_carousels 
ADD COLUMN IF NOT EXISTS generation_config jsonb DEFAULT '{}';