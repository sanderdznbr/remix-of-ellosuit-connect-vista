UPDATE marketplace_styles 
SET style_config = jsonb_set(
  jsonb_set(
    style_config,
    '{requires_screenshots}',
    'true'::jsonb
  ),
  '{screenshot_device_types}',
  '["mobile", "web", "tablet"]'::jsonb
)
WHERE id = '391b30f6-204f-49b2-a2ab-a2b114141e96';