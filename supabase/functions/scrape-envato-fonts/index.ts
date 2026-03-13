const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page = 1 } = await req.json();
    const pageNum = Math.max(1, Math.min(page, 20));

    const url = pageNum === 1
      ? 'https://elements.envato.com/pt-br/fonts'
      : `https://elements.envato.com/pt-br/fonts/pg-${pageNum}`;

    console.log('Scraping Envato fonts page:', url);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`Envato returned ${res.status}`);
    }

    const html = await res.text();

    // Extract font card data from the HTML
    // Envato Elements uses img tags with alt text for font names and src for previews
    const fonts: { name: string; previewUrl: string; pageUrl: string }[] = [];

    // Match image elements that are font previews
    // Pattern: look for card items with image and title
    const cardRegex = /<a[^>]*href="(\/pt-br\/[^"]*font[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
    let match;
    
    while ((match = cardRegex.exec(html)) !== null && fonts.length < 20) {
      const [, href, imgSrc, altText] = match;
      if (imgSrc && altText && !altText.includes('Envato') && imgSrc.includes('elements-cover-images')) {
        fonts.push({
          name: altText.replace(/ - .*$/, '').trim(),
          previewUrl: imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc,
          pageUrl: `https://elements.envato.com${href}`,
        });
      }
    }

    // Fallback: try broader image pattern if cards didn't match
    if (fonts.length === 0) {
      const imgRegex = /<img[^>]*src="(https?:\/\/[^"]*elements-cover-images[^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
      while ((match = imgRegex.exec(html)) !== null && fonts.length < 20) {
        const [, imgSrc, altText] = match;
        if (altText && !altText.includes('Envato') && altText.length > 2) {
          fonts.push({
            name: altText.replace(/ - .*$/, '').trim(),
            previewUrl: imgSrc,
            pageUrl: url,
          });
        }
      }
    }

    // Second fallback: extract from data attributes or JSON-LD
    if (fonts.length === 0) {
      // Try to find any preview images with reasonable patterns
      const anyImgRegex = /<img[^>]*src="(https?:\/\/[^"]*(?:envato|imgix)[^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
      while ((match = anyImgRegex.exec(html)) !== null && fonts.length < 20) {
        const [, imgSrc, altText] = match;
        if (altText && altText.length > 2 && altText.length < 100 && !altText.toLowerCase().includes('logo')) {
          fonts.push({
            name: altText.replace(/ - .*$/, '').trim(),
            previewUrl: imgSrc,
            pageUrl: url,
          });
        }
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const uniqueFonts = fonts.filter(f => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    }).slice(0, 15);

    console.log(`Found ${uniqueFonts.length} fonts on page ${pageNum}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fonts: uniqueFonts, 
        page: pageNum,
        hasMore: uniqueFonts.length >= 10,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping fonts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape fonts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
