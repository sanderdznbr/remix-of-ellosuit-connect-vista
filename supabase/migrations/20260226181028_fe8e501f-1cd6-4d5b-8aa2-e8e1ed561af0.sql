-- Update admin@gmail.com subscription to growth plan
UPDATE subscriptions 
SET plan_type = 'growth', monthly_price = 197.00, status = 'active'
WHERE company_id = '60008c43-e536-482d-a090-91904de57534';
