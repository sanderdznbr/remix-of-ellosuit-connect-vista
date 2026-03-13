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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = pageNum === 1
      ? 'https://elements.envato.com/pt-br/fonts'
      : `https://elements.envato.com/pt-br/fonts/pg-${pageNum}`;

    console.log('Scraping Envato fonts page via Firecrawl:', url);

    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html'],
        waitFor: 3000,
        onlyMainContent: false,
      }),
    });

    if (!scrapeRes.ok) {
      const errData = await scrapeRes.json().catch(() => ({}));
      console.error('Firecrawl error:', scrapeRes.status, errData);
      throw new Error(errData.error || `Firecrawl returned ${scrapeRes.status}`);
    }

    const scrapeData = await scrapeRes.json();
    const html = scrapeData?.data?.html || scrapeData?.html || '';

    if (!html) {
      console.error('No HTML returned from Firecrawl');
      throw new Error('No HTML content returned');
    }

    console.log('Got HTML length:', html.length);

    // Extract font cards from rendered HTML
    const fonts: { name: string; previewUrl: string; pageUrl: string }[] = [];

    // Pattern 1: img tags with src containing envato CDN and alt text
    const imgRegex = /<img[^>]*src=["']([^"']*(?:imgix\.net|elements-cover-images|envatousercontent)[^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null && fonts.length < 20) {
      const [, imgSrc, altText] = match;
      if (altText && altText.length > 2 && altText.length < 100 && !altText.toLowerCase().includes('envato') && !altText.toLowerCase().includes('logo')) {
        const cleanUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
        fonts.push({
          name: altText.replace(/\s*-\s*(?:Fonts|Font Family|Typeface).*$/i, '').replace(/\s*Visualização:?\s*/i, '').trim(),
          previewUrl: cleanUrl,
          pageUrl: url,
        });
      }
    }

    // Pattern 2: Try reversed order (alt before src)
    if (fonts.length === 0) {
      const imgRegex2 = /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*(?:imgix\.net|elements-cover-images|envatousercontent)[^"']*)["'][^>]*>/gi;
      while ((match = imgRegex2.exec(html)) !== null && fonts.length < 20) {
        const [, altText, imgSrc] = match;
        if (altText && altText.length > 2 && altText.length < 100 && !altText.toLowerCase().includes('envato')) {
          const cleanUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
          fonts.push({
            name: altText.replace(/\s*-\s*(?:Fonts|Font Family|Typeface).*$/i, '').replace(/\s*Visualização:?\s*/i, '').trim(),
            previewUrl: cleanUrl,
            pageUrl: url,
          });
        }
      }
    }

    // Pattern 3: Look for any large images that could be font previews
    if (fonts.length === 0) {
      const anyImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
      while ((match = anyImgRegex.exec(html)) !== null && fonts.length < 20) {
        const [, imgSrc, altText] = match;
        if (
          imgSrc && altText && 
          altText.length > 2 && altText.length < 100 &&
          !altText.toLowerCase().includes('logo') &&
          !altText.toLowerCase().includes('avatar') &&
          !imgSrc.includes('data:image/svg') &&
          (imgSrc.includes('http') || imgSrc.startsWith('//'))
        ) {
          const cleanUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
          fonts.push({
            name: altText.replace(/\s*-\s*(?:Fonts|Font Family|Typeface).*$/i, '').replace(/\s*Visualização:?\s*/i, '').trim(),
            previewUrl: cleanUrl,
            pageUrl: url,
          });
        }
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const uniqueFonts = fonts.filter(f => {
      const key = f.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    console.log(`Found ${uniqueFonts.length} fonts on page ${pageNum}`);

    return new Response(
      JSON.stringify({
        success: true,
        fonts: uniqueFonts,
        page: pageNum,
        hasMore: uniqueFonts.length >= 5,
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
