
-- Function to sync subscription_limits based on ellocontent plan
CREATE OR REPLACE FUNCTION public.sync_ellocontent_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  plan text;
  storage_gb integer;
BEGIN
  -- Only act on active subscriptions
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  plan := lower(NEW.plan_name);

  -- Determine storage limit based on plan
  IF plan LIKE '%growth%' THEN
    storage_gb := 10;
  ELSIF plan LIKE '%pro%' THEN
    storage_gb := 5;
  ELSIF plan LIKE '%starter%' THEN
    storage_gb := 1;
  ELSE
    storage_gb := 1;
  END IF;

  -- Upsert subscription_limits
  INSERT INTO public.subscription_limits (company_id, max_storage_gb, max_users)
  VALUES (NEW.company_id, storage_gb, 1)
  ON CONFLICT (company_id) DO UPDATE SET
    max_storage_gb = storage_gb,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- Create trigger on ellocontent_subscriptions
DROP TRIGGER IF EXISTS sync_plan_limits_on_ellocontent ON public.ellocontent_subscriptions;
CREATE TRIGGER sync_plan_limits_on_ellocontent
  AFTER INSERT OR UPDATE ON public.ellocontent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ellocontent_plan_limits();

-- Also create trigger for the subscriptions table
CREATE OR REPLACE FUNCTION public.sync_subscription_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  storage_gb integer;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_type = 'growth' THEN
    storage_gb := 10;
  ELSIF NEW.plan_type = 'pro' THEN
    storage_gb := 5;
  ELSIF NEW.plan_type = 'starter' THEN
    storage_gb := 1;
  ELSIF NEW.plan_type = 'enterprise' THEN
    storage_gb := 50;
  ELSE
    storage_gb := 1;
  END IF;

  INSERT INTO public.subscription_limits (company_id, max_storage_gb, max_users)
  VALUES (NEW.company_id, storage_gb, 1)
  ON CONFLICT (company_id) DO UPDATE SET
    max_storage_gb = storage_gb,
    updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_plan_limits_on_subscription ON public.subscriptions;
CREATE TRIGGER sync_plan_limits_on_subscription
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subscription_plan_limits();
