CREATE POLICY "Adminmasters can view all ellocontent subscriptions"
ON public.ellocontent_subscriptions
FOR SELECT
TO authenticated
USING (public.is_adminmaster(auth.uid()));