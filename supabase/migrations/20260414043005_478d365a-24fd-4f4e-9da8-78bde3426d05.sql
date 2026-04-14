
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage trend configs" ON public.trend_configs;

-- Create separate policies for each operation
CREATE POLICY "Users can view own company trend configs"
ON public.trend_configs FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can insert own company trend configs"
ON public.trend_configs FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can update own company trend configs"
ON public.trend_configs FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id, auth.uid()));

CREATE POLICY "Users can delete own company trend configs"
ON public.trend_configs FOR DELETE
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));
