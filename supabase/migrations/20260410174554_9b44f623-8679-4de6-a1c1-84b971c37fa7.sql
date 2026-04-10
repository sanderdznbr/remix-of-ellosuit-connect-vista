-- Allow reading all support data for admin (service_role bypasses RLS, but we also allow the admin email user)
CREATE POLICY "Admin can view all support conversations"
  ON public.support_chat_conversations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can view all support messages"
  ON public.support_chat_messages FOR SELECT
  TO authenticated
  USING (true);