
-- Add photo_count and batch_id columns to generated_portraits for multi-photo generation
ALTER TABLE public.generated_portraits 
ADD COLUMN IF NOT EXISTS photo_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS batch_id text;

-- Add image_card_count and face_card_count to carousel_generation_jobs
ALTER TABLE public.carousel_generation_jobs
ADD COLUMN IF NOT EXISTS image_card_count integer,
ADD COLUMN IF NOT EXISTS face_card_count integer;
