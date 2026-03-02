
-- Update Gateway style with specific prompt
UPDATE marketplace_styles 
SET style_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      style_config,
      '{imageGeneration,prompt_style}',
      '"Create an Instagram carousel post (1080x1350, portrait 4:5) in the GATEWAY style. This style is characterized by:\n\n1. VISUAL DNA: Premium, dark-toned editorial aesthetic. Deep black and charcoal backgrounds with strategic gold, amber or white accent elements. High-contrast dramatic lighting. The feel is EXCLUSIVE, ASPIRATIONAL and POWERFUL — like a luxury brand campaign or high-end magazine spread.\n\n2. TYPOGRAPHY: Bold condensed uppercase titles with strong weight. Sans-serif fonts with tight tracking. Title text is LARGE and DOMINANT, filling significant vertical space. Subtitles are thin/light weight for contrast hierarchy. Text placement is strategic — often centered or left-aligned with generous negative space.\n\n3. COLOR PALETTE: Predominantly dark (#0D0D0D, #1A1A1A) with warm metallic accents (gold #C5A55A, amber #D4A847) or crisp white. Occasional use of deep jewel tones (emerald, sapphire). NO pastel colors, NO bright neon.\n\n4. COMPOSITION: Clean, structured layouts with strong visual hierarchy. Large hero photos with cinematic cropping. Generous white/negative space. Symmetrical or rule-of-thirds composition. Full bleed imagery with text overlaid.\n\n5. PHOTOGRAPHY STYLE: Cinematic color grading, shallow depth of field, dramatic shadows. Professional studio-quality or editorial street photography. Moody, rich tonal range.\n\n6. DECORATIVE ELEMENTS: Minimal — thin lines, subtle geometric frames, elegant dividers. No clutter. The luxury comes from RESTRAINT and QUALITY, not from excessive decoration.\n\n7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências. Use APENAS o estilo visual.\n\n8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.\n\n9. SEM BORDAS: Full bleed, sem barras ou bordas."'::jsonb
    ),
    '{imageGeneration,negative_prompt}',
    '"cartoon, anime, illustration, pastel colors, neon bright colors, stock photo generic, gradient background, minimalist flat design, cluttered layout, cheap typography, white background only, comic style, watercolor"'::jsonb
  ),
  '{colors}',
  '{"primary": "#C5A55A", "secondary": "#0D0D0D", "accent": "#1A1A1A", "text": "#FFFFFF", "textDark": "#0D0D0D", "background_dark": "#0D0D0D", "background_light": "#F5F0E8", "highlight": "#D4A847"}'::jsonb
),
description = 'Estilo premium e exclusivo com estética editorial escura, acentos dourados e tipografia bold. Ideal para marcas de luxo, mentoria e conteúdo aspiracional.'
WHERE id = 'e4bed344-58d0-4009-b23a-98178333bdce';

-- Update Coach style with specific prompt
UPDATE marketplace_styles 
SET style_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      style_config,
      '{imageGeneration,prompt_style}',
      '"Create an Instagram carousel post (1080x1350, portrait 4:5) in the COACH style. This style is characterized by:\n\n1. VISUAL DNA: Warm, motivational and empowering aesthetic. The feel is INSPIRATIONAL, AUTHENTIC and ENERGETIC — like a personal branding campaign for coaches, speakers and mentors. Mix of strong personal photos with bold motivational typography.\n\n2. TYPOGRAPHY: Extra bold, condensed uppercase fonts for titles — MASSIVE and IMPACTFUL. Mix of serif (for authority) and sans-serif (for modernity). Titles often span multiple lines with varied sizes for emphasis on KEY WORDS. Text-heavy but organized with clear hierarchy.\n\n3. COLOR PALETTE: Warm earth tones and energetic accents. Rich browns (#8B6914), warm oranges (#E8732A), deep reds (#B22222), cream/beige (#F5F0E8), with contrasting dark backgrounds (#1A1A1A). Occasional pops of teal or green (#8FA9A0) for balance. The palette feels WARM and HUMAN.\n\n4. COMPOSITION: Dynamic layouts mixing large portrait photos with bold text blocks. Asymmetric but balanced. Often uses the subject (person) as the visual anchor with text wrapping around or overlaying. Magazine-editorial feel with a personal touch.\n\n5. PHOTOGRAPHY STYLE: Warm color grading, golden hour lighting, authentic natural expressions. Confident poses — arms crossed, looking at camera, speaking gestures. Professional but approachable. High contrast with warm shadows.\n\n6. DECORATIVE ELEMENTS: Accent lines, highlight bars behind key words, subtle texture overlays. Occasional use of quote marks, arrows pointing to key messages. Organic shapes and brush strokes for authenticity.\n\n7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências. Use APENAS o estilo visual.\n\n8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.\n\n9. SEM BORDAS: Full bleed, sem barras ou bordas."'::jsonb
    ),
    '{imageGeneration,negative_prompt}',
    '"cartoon, anime, illustration, cold blue tones, corporate sterile, stock photo generic, flat minimalist, neon cyberpunk, watercolor, comic style, low quality phone photo"'::jsonb
  ),
  '{colors}',
  '{"primary": "#E8732A", "secondary": "#1A1A1A", "accent": "#F5F0E8", "text": "#FFFFFF", "textDark": "#1A1A1A", "background_dark": "#1A1A1A", "background_light": "#F5F0E8", "highlight": "#8B6914"}'::jsonb
),
description = 'Estilo motivacional e empoderador com tons quentes, tipografia bold e fotos impactantes. Ideal para coaches, mentores e conteúdo de desenvolvimento pessoal.'
WHERE id = 'c6d89a83-9faa-4870-9b61-7b50a55858f0';

-- Update Plug style with specific prompt  
UPDATE marketplace_styles 
SET style_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      style_config,
      '{imageGeneration,prompt_style}',
      '"Create an Instagram carousel post (1080x1350, portrait 4:5) in the PLUG style. This style is characterized by:\n\n1. VISUAL DNA: Modern, connected, digital-native aesthetic. The feel is BOLD, URBAN and TECH-FORWARD — like a cutting-edge digital agency or tech startup brand. Strong graphic design influence with collage elements and mixed-media compositions.\n\n2. TYPOGRAPHY: Ultra bold, wide sans-serif fonts. Mixed weights within the same title for dynamic rhythm. All-caps with tight line spacing. Experimental text placement — rotated, stacked, or breaking conventional grids. Neon-glow or outline text effects on dark backgrounds.\n\n3. COLOR PALETTE: Electric and vibrant. Deep dark backgrounds (#0A0A14, #111120) with electric blue (#0066FF, #00A3FF), hot pink (#FF0080), neon green (#00FF88), or vivid purple (#8B5CF6). High contrast combinations. Gradient effects between neon colors. The palette feels ELECTRIC and DIGITAL.\n\n4. COMPOSITION: Collage-style mixed media. Overlapping layers, cut-out photos with colored borders, geometric shapes as containers. Grid-breaking layouts. Photos mixed with graphic elements, icons, and abstract shapes. Dense but organized visual information.\n\n5. PHOTOGRAPHY STYLE: High contrast, desaturated base with selective color pops. Urban contexts — city scenes, tech environments, creative spaces. Photo treatments include duotone, halftone dots, or glitch effects. Cut-out silhouettes on graphic backgrounds.\n\n6. DECORATIVE ELEMENTS: Geometric shapes (circles, rectangles, arrows), connection/network icons, circuit-like lines, pixel art accents, glitch textures, halftone patterns, sticker/badge elements. MORE decoration than other styles — the density is part of the aesthetic.\n\n7. PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas, logos ou informações pessoais das referências. Use APENAS o estilo visual.\n\n8. IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.\n\n9. SEM BORDAS: Full bleed, sem barras ou bordas."'::jsonb
    ),
    '{imageGeneration,negative_prompt}',
    '"cartoon, anime, watercolor, pastel soft, corporate boring, old-fashioned, serif elegant, luxury gold, warm earth tones, minimalist empty, low contrast, vintage retro filter"'::jsonb
  ),
  '{colors}',
  '{"primary": "#0066FF", "secondary": "#0A0A14", "accent": "#FF0080", "text": "#FFFFFF", "textDark": "#0A0A14", "background_dark": "#0A0A14", "background_light": "#E8F0FF", "highlight": "#00FF88"}'::jsonb
),
description = 'Estilo digital, urbano e tech-forward com cores neon vibrantes, tipografia experimental e composição de colagem. Ideal para marcas de tecnologia, agências digitais e conteúdo moderno.'
WHERE id = '766ecff0-c936-4d29-a981-805d4d1bebd9';
