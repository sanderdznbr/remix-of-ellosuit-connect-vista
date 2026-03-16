-- Add post_format column to generated_carousels
ALTER TABLE public.generated_carousels 
ADD COLUMN IF NOT EXISTS post_format text NOT NULL DEFAULT 'portrait';

-- Add post_format column to carousel_generation_jobs
ALTER TABLE public.carousel_generation_jobs 
ADD COLUMN IF NOT EXISTS post_format text NOT NULL DEFAULT 'portrait';

-- Add comment explaining values
COMMENT ON COLUMN public.generated_carousels.post_format IS 'Format: portrait (1080x1350 4:5), square (1080x1080 1:1), story (1080x1920 9:16)';
COMMENT ON COLUMN public.carousel_generation_jobs.post_format IS 'Format: portrait (1080x1350 4:5), square (1080x1080 1:1), story (1080x1920 9:16)';