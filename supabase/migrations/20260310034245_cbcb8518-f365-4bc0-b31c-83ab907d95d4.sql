INSERT INTO marketplace_styles (
  name,
  description,
  category,
  price_credits,
  price_brl,
  is_active,
  is_featured,
  is_free,
  sort_order,
  tags,
  preview_images,
  style_config
) VALUES (
  'Content',
  'Estilo clássico com imagem de fundo e texto sobreposto editável. Personalize cores, fontes e tamanhos livremente.',
  'editorial',
  0,
  0,
  true,
  true,
  true,
  0,
  ARRAY['editável', 'texto', 'clássico', 'personalizado'],
  ARRAY['https://jwddiyuezqrpuakazvgg.supabase.co/storage/v1/object/public/marketplace-assets/styles/content/content-cover.jpg'],
  '{
    "colors": {
      "primary": "#8B5CF6",
      "secondary": "#1A1A2E",
      "accent": "#C084FC",
      "text": "#FFFFFF",
      "textDark": "#1A1A1A",
      "background_dark": "#0F0F23",
      "background_light": "#F5F0E8",
      "highlight": "#A78BFA"
    },
    "imageGeneration": {
      "prompt_prefix": "High quality editorial photo, clean composition, suitable for social media background, 1080x1350 portrait format.",
      "negative_prompt": "text, words, letters, typography, writing, captions, watermarks, logos, UI elements, cartoon, anime, illustration"
    }
  }'::jsonb
);