
-- Mark existing ellocontent users
UPDATE public.profiles SET source = 'ellocontent' 
WHERE id IN (SELECT DISTINCT user_id FROM public.generated_carousels)
   OR id IN (SELECT DISTINCT user_id FROM public.ellocontent_subscriptions);
