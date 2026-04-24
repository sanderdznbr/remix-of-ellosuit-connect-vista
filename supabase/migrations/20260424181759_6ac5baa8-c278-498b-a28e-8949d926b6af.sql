
DO $$
DECLARE
  v_user_id uuid := 'ab39528f-727d-418e-be5a-ea80900cf3a5';
BEGIN
  DELETE FROM public.company_users WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;
