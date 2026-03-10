INSERT INTO public.marketplace_styles (
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
  strict_instructions,
  style_config
) VALUES (
  'IMOB01',
  'Template imobiliário profissional com foto full-bleed e cards sobrepostos de informações e preço. Baseado em layout SVG customizado.',
  'corporativo',
  0,
  0,
  true,
  true,
  true,
  1,
  ARRAY['imobiliário', 'real estate', 'imóvel', 'casa', 'apartamento'],
  ARRAY[]::text[],
  '',
  '{
    "description": "Template imobiliário SVG - foto full-bleed com cards sobrepostos",
    "is_real_estate": true,
    "real_estate_mode": "single",
    "colors": {
      "primary": "#2D5A3D",
      "secondary": "#1A1A1A",
      "accent": "#D9D9D9",
      "text": "#FFFFFF",
      "textDark": "#111111",
      "background_dark": "#414141",
      "background_light": "#D9D9D9",
      "highlight": "#2D5A3D"
    },
    "cardVariations": [
      {"type": "cover", "description": "Foto full-bleed com card de informações à direita e preço à esquerda"},
      {"type": "content", "description": "Foto full-bleed com detalhes sobrepostos em card branco"},
      {"type": "cta", "description": "Foto desfocada com card CTA centralizado"}
    ],
    "imageGeneration": {
      "fidelity": "high",
      "imageType": "photo",
      "prompt_style": "Real estate template with property photo as full background. Overlay white rounded cards at bottom with property specs and price. Professional marketing layout.",
      "prompt_prefix": "Premium real estate marketing post for Instagram. Property photo as full-bleed background. 1080x1350 portrait format.",
      "negative_prompt": "cartoon, anime, illustration, 3d render"
    }
  }'::jsonb
);