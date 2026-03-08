
-- Add source column to profiles to differentiate ellocontent vs ellosuit users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;

-- Update trigger to include source from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, username, source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    lower(replace(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), ' ', '_')) || '_' || substr(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'source', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET source = COALESCE(EXCLUDED.source, profiles.source);
  RETURN NEW;
END;
$function$;
