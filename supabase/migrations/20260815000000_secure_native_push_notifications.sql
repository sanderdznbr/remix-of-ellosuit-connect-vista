-- Secure native push registrations and keep each APNs token tied to one user.
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'ios',
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.device_tokens
SET enabled = false, updated_at = now()
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS device_tokens_token_idx
  ON public.device_tokens (token);

CREATE INDEX IF NOT EXISTS device_tokens_user_enabled_idx
  ON public.device_tokens (user_id, enabled);

DROP POLICY IF EXISTS "Users can manage their device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can view their own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can insert their own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can update their own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can delete their own device tokens" ON public.device_tokens;

CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
  ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
