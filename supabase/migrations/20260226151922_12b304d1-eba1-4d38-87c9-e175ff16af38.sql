-- Add cover_url column for fast thumbnail loading
ALTER TABLE public.generated_carousels ADD COLUMN IF NOT EXISTS cover_url text;