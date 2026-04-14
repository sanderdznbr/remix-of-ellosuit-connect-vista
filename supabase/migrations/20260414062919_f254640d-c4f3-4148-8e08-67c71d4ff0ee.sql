-- Drop ALL existing policies on daily_trends to start clean
DROP POLICY IF EXISTS "Admins can manage daily trends" ON public.daily_trends;
DROP POLICY IF EXISTS "Users can view own company daily trends" ON public.daily_trends;
DROP POLICY IF EXISTS "Users can insert own company daily trends" ON public.daily_trends;
DROP POLICY IF EXISTS "Users can update own company daily trends" ON public.daily_trends;
DROP POLICY IF EXISTS "Users can delete own company daily trends" ON public.daily_trends;

-- Create new policies using user_belongs_to_company (checks any role in company_users)
CREATE POLICY "Users can view own company daily trends"
ON public.daily_trends FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_company(company_id, auth.uid())
  OR public.is_adminmaster(auth.uid())
);

CREATE POLICY "Users can insert own company daily trends"
ON public.daily_trends FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_company(company_id, auth.uid())
  OR public.is_adminmaster(auth.uid())
);

CREATE POLICY "Users can update own company daily trends"
ON public.daily_trends FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_company(company_id, auth.uid())
  OR public.is_adminmaster(auth.uid())
);

CREATE POLICY "Users can delete own company daily trends"
ON public.daily_trends FOR DELETE
TO authenticated
USING (
  public.is_company_admin(auth.uid(), company_id)
  OR public.is_adminmaster(auth.uid())
);