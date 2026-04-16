// Edge function: Change font style on a generated card image
// Step 1: AI removes all text from the image (clean background)
// Step 2: AI re-renders the same text with the chosen font style reference

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callAI(apiKey: string, messages: any[], retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages,
          modalities: ['image', 'text'],
        }),
      });

      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        throw new Error('RATE_LIMIT');
      }
      if (res.status === 402) throw new Error('PAYMENT_REQUIRED');

      if (!res.ok) {
        const errText = await res.text();
        console.error(`AI call failed [${res.status}]:`, errText.slice(0, 300));
        if (attempt < retries) continue;
        throw new Error(`AI_ERROR_${res.status}`);
      }

      const raw = await res.text();
      const patterns = ['"url":"data:image/', '"url": "data:image/'];
      for (const pattern of patterns) {
        const idx = raw.indexOf(pattern);
        if (idx === -1) continue;
        const urlStart = raw.indexOf('"', idx + 5) + 1;
        const urlEnd = raw.indexOf('"', urlStart);
        if (urlEnd === -1) continue;
        return raw.slice(urlStart, urlEnd);
      }
      
      console.error('No image found in AI response');
      if (attempt < retries) continue;
      return null;
    } catch (e) {
      if (attempt < retries && !(e instanceof Error && (e.message === 'RATE_LIMIT' || e.message === 'PAYMENT_REQUIRED'))) continue;
      throw e;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      imageUrl,         // base64 data URL or https URL of the current card image
      textContent,      // { title, subtitle, body } - the text currently on the card
      fontReference,    // font name (e.g. "Playfair Display") or Envato preview image URL
      fontPreviewUrl,   // optional: Envato font preview image URL for visual reference
      accentColor,      // optional: accent color for decorative elements
    } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const texts = textContent || {};
    const accent = accentColor || '#8B5CF6';

    // Build text content description
    const textParts: string[] = [];
    if (texts.title) textParts.push(`TÍTULO: "${texts.title}"`);
    if (texts.subtitle) textParts.push(`SUBTÍTULO: "${texts.subtitle}"`);
    if (texts.body) textParts.push(`CORPO: "${texts.body}"`);
    if (texts.bodyTop) textParts.push(`TEXTO PRINCIPAL: "${texts.bodyTop}"`);
    if (texts.bodyBottom) textParts.push(`TEXTO SECUNDÁRIO: "${texts.bodyBottom}"`);
    
    const textDescription = textParts.length > 0 
      ? textParts.join('\n') 
      : 'Mantenha o mesmo texto que está na imagem original.';

    console.log(`=== CHANGE FONT === Font: ${fontReference || 'custom'}`);

    // Build the message content array
    const contentParts: any[] = [];

    // Main instruction
    contentParts.push({
      type: 'text',
      text: `Você é um designer gráfico especialista em tipografia. Sua tarefa é MUDAR A FONTE/TIPOGRAFIA de uma imagem de post para Instagram.

TAREFA EM 2 PASSOS:
1. REMOVA completamente todos os textos/letras/palavras da imagem original, preenchendo as áreas com continuação natural do fundo (inpainting perfeito).
2. ADICIONE os mesmos textos de volta, mas usando uma tipografia COMPLETAMENTE DIFERENTE da original.

TEXTOS QUE DEVEM ESTAR NA IMAGEM FINAL (copie EXATAMENTE):
${textDescription}

ESTILO DA NOVA TIPOGRAFIA:
${fontReference ? `Use uma tipografia no estilo "${fontReference}" — ${fontReference.includes('Serif') || fontReference.includes('Playfair') || fontReference.includes('Garamond') || fontReference.includes('Merriweather') || fontReference.includes('Lora') ? 'serifada, elegante e clássica' : fontReference.includes('Bebas') || fontReference.includes('Oswald') || fontReference.includes('Anton') || fontReference.includes('Archivo') ? 'bold, condensada e impactante' : 'moderna, limpa e geométrica'}.` : 'Use uma tipografia moderna e diferente da original.'}

REGRAS CRÍTICAS:
- O fundo, fotos, elementos decorativos e layout devem permanecer IDÊNTICOS — mude APENAS a tipografia
- Mantenha EXATAMENTE as mesmas posições de texto
- Mantenha EXATAMENTE o mesmo conteúdo textual (copie caractere por caractere)
- A nova fonte deve ser profissional e legível
- Mantenha o mesmo esquema de cores do texto
- Formato: mesma proporção da imagem original
- Cor de destaque: ${accent}
- NÃO altere as fotos, elementos gráficos ou fundo`
    });

    // Add the original image
    contentParts.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });

    // Add font preview image if available (Envato visual reference)
    if (fontPreviewUrl) {
      contentParts.push({
        type: 'text',
        text: `A imagem abaixo mostra a REFERÊNCIA VISUAL da fonte desejada. Use esta tipografia como referência para renderizar os textos:`
      });
      contentParts.push({
        type: 'image_url',
        image_url: { url: fontPreviewUrl }
      });
    }

    const result = await callAI(LOVABLE_API_KEY, [
      { role: 'user', content: contentParts }
    ]);

    if (!result) {
      return new Response(JSON.stringify({ error: 'Falha ao processar a mudança de fonte' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== CHANGE FONT === Complete!');

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('change-card-font error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    
    if (msg === 'RATE_LIMIT') {
      return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (msg === 'PAYMENT_REQUIRED') {
      return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos em Configurações.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
