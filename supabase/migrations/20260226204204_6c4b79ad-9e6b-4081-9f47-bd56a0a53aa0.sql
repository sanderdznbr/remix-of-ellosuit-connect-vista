
INSERT INTO public.marketplace_styles (
  name,
  description,
  preview_images,
  price_credits,
  price_brl,
  category,
  is_active,
  is_featured,
  sort_order,
  tags,
  style_config
) VALUES (
  'Gringe',
  'Estilo editorial urbano com tipografia bold, fotos em preto e branco com overlay de cor sage/teal, recortes de revista, colagens e composição magazine. Ideal para posts de autoridade, vendas e conteúdo de impacto.',
  ARRAY[
    '/marketplace/gringe-1.png',
    '/marketplace/gringe-2.png',
    '/marketplace/gringe-3.png',
    '/marketplace/gringe-4.png',
    '/marketplace/gringe-5.png',
    '/marketplace/gringe-6.png',
    '/marketplace/gringe-7.png',
    '/marketplace/gringe-8.png',
    '/marketplace/gringe-9.png',
    '/marketplace/gringe-10.png'
  ],
  50,
  9.90,
  'editorial',
  true,
  true,
  1,
  ARRAY['editorial', 'urbano', 'magazine', 'bold', 'autoridade', 'vendas'],
  '{
    "styleName": "Gringe",
    "version": "1.0",
    "description": "Estilo editorial urbano inspirado em colagens de revista com tipografia bold, fotos em preto e branco com overlay de cor sage/teal muted, recortes de papel e composição assimétrica.",
    
    "imageGeneration": {
      "prompt_prefix": "Editorial magazine collage style Instagram post, 1080x1350 portrait format.",
      "prompt_style": "Create a bold editorial magazine-style social media post with the following STRICT visual rules:\n\n1. PHOTOGRAPHY: Use a dramatic black-and-white photograph of the person as the main visual element. The person should be in a confident, editorial pose (sitting on furniture, leaning against objects, walking in urban environments, etc). Apply a desaturated sage/teal green color overlay (hex #8FA9A0) with 40-60% opacity over the entire photo, creating a muted tonal look.\n\n2. TYPOGRAPHY HIERARCHY: Use MULTIPLE font styles mixed together in the same layout:\n   - MAIN HEADLINE: Extremely large, bold condensed sans-serif font (like Impact or Oswald Black) in pure white or cream, taking up 40-60% of the card area. Letters should be MASSIVE, sometimes breaking across multiple lines.\n   - ACCENT TEXT: Bold italic or hand-drawn/brush script font in dark charcoal/black, used for emphasis words. Place these on white rectangular label/sticker backgrounds with slight rotation.\n   - BODY TEXT: Clean sans-serif in white or cream, smaller size for supporting context.\n   - Mix serif and sans-serif fonts deliberately for editorial contrast.\n\n3. TEXT PLACEMENT: Text should be layered OVER the photo in an asymmetric, editorial layout. Text boxes should look like cut-out magazine labels/stickers with white or cream backgrounds. Some text should have highlight backgrounds in the sage/teal accent color (#8FA9A0).\n\n4. DECORATIVE ELEMENTS:\n   - Small chat bubble icons in sage/teal green with three white dots\n   - Thin white diagonal lines as compositional elements\n   - Geometric X or cross marks as accent decorations\n   - Corner brand watermarks (name + tagline) in all 4 corners in very small white text\n   - Username/handle centered at top in small bold text\n\n5. COLOR PALETTE (STRICT):\n   - Primary photo tone: Desaturated sage/teal (#8FA9A0, #7A9990, #6B8E84)\n   - Text: Pure white (#FFFFFF), cream (#F5F0E8), charcoal black (#1A1A1A)\n   - Accent backgrounds: White (#FFFFFF) for text labels, sage green for highlight strips\n   - Dark cards: Use #1A1A1A or #0D0D0D as background with textured dark patterns\n\n6. COMPOSITION: Editorial magazine collage style. The photo should take up most of the frame. Text is layered aggressively over the photo. Multiple text blocks at different angles and sizes create visual tension. The overall feel should be like a high-end fashion/business magazine spread.\n\n7. VARIETY: Alternate between:\n   - Cards with person photos + bold text overlay (MOST COMMON)\n   - Cards with abstract/textured dark backgrounds + large typography only\n   - Cards with lighter cream/white backgrounds + editorial typography + small object photos (hands, accessories, etc.)\n   - Cards with industrial/urban elements (metal bars, scaffolding, concrete) as compositional props\n\n8. MOOD: Confident, authoritative, rebellious, premium editorial. Like a mix between GQ magazine and street art poster design.",
      "negative_prompt": "cartoon, anime, illustration, 3d render, colorful rainbow, gradient, neon colors, pastel colors, cute, playful, childish, minimalist flat design, stock photo smile, generic corporate, blue and purple gradients, rounded friendly shapes",
      "imageType": "photo",
      "lightingStyle": "cinematic",
      "cameraAngle": "front",
      "fidelity": "high"
    },

    "colors": {
      "primary": "#8FA9A0",
      "secondary": "#1A1A1A",
      "accent": "#F5F0E8",
      "text": "#FFFFFF",
      "textDark": "#1A1A1A",
      "background_light": "#F5F0E8",
      "background_dark": "#0D0D0D",
      "highlight": "#8FA9A0"
    },

    "typography": {
      "headline": {
        "style": "condensed bold sans-serif",
        "examples": ["Impact", "Oswald Black", "Anton", "Bebas Neue"],
        "size": "extra-large, 40-60% of card area",
        "weight": "900/black",
        "transform": "uppercase",
        "color": "#FFFFFF"
      },
      "accent": {
        "style": "bold italic brush/hand-drawn",
        "examples": ["Permanent Marker", "Rock Salt", "Caveat Bold"],
        "placement": "on white label stickers",
        "color": "#1A1A1A"
      },
      "body": {
        "style": "clean sans-serif",
        "examples": ["Helvetica", "Inter", "DM Sans"],
        "size": "small",
        "color": "#FFFFFF"
      }
    },

    "layout": {
      "format": "1080x1350 portrait (4:5)",
      "composition": "asymmetric editorial collage",
      "photoTreatment": "black-and-white with sage/teal color overlay",
      "textOverPhoto": true,
      "cornerBranding": true,
      "textLabels": "white rectangular sticker-style backgrounds"
    },

    "cardVariations": [
      {
        "type": "hero_photo",
        "description": "Full bleed B&W photo with teal overlay, massive bold headline text layered over, accent text in sticker labels, chat bubble decorations"
      },
      {
        "type": "dark_typography",
        "description": "Dark textured background (#0D0D0D) with large teal-tinted headline text, white text box with body copy, subtle radial texture patterns"
      },
      {
        "type": "light_editorial",
        "description": "Cream/white background with editorial typography, B&W photo elements (hands, objects), bold mixed typography, vintage object props (floppy disk, paper bag)"
      },
      {
        "type": "urban_scene",
        "description": "Urban/industrial setting photo in B&W with teal overlay, person in scene, bold text layered with sticker labels and diagonal line decorations"
      }
    ]
  }'::jsonb
);
