const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, urls } = body;

    // Action: download images via proxy (avoids CORS)
    if (action === 'download' && Array.isArray(urls)) {
      console.log(`Proxying download for ${urls.length} Instagram images`);
      const results: { base64: string; mimeType: string }[] = [];

      for (const imgUrl of urls.slice(0, 20)) {
        try {
          const resp = await fetch(imgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/*',
              'Referer': 'https://www.instagram.com/',
            },
          });
          if (!resp.ok) continue;

          const buffer = await resp.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          const contentType = resp.headers.get('content-type') || 'image/jpeg';
          results.push({ base64, mimeType: contentType });
        } catch (e) {
          console.warn('Failed to download:', imgUrl, e);
        }
      }

      return new Response(
        JSON.stringify({ images: results, count: results.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: scrape post for image URLs
    if (!url || (!url.includes('instagram.com/p/') && !url.includes('instagram.com/reel/'))) {
      return new Response(
        JSON.stringify({ error: 'URL de post do Instagram inválida. Use um link como https://www.instagram.com/p/XXXXX/' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Instagram post:', url);

    // Normalize URL - ensure it ends with /
    let cleanUrl = url.split('?')[0];
    if (!cleanUrl.endsWith('/')) cleanUrl += '/';

    // Try fetching the page with oembed first (public API, no auth needed)
    // Instagram's oembed gives us a thumbnail, but for full images we need to scrape
    const resp = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      console.error('Failed to fetch Instagram page:', resp.status);
      return new Response(
        JSON.stringify({ error: `Falha ao acessar o post (${resp.status}). O post pode ser privado.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await resp.text();
    const galleryImageUrls: string[] = [];
    const seen = new Set<string>();

    const pushUrl = (imgUrl: string) => {
      // Clean URL params that are just tracking
      const clean = imgUrl.split('&amp;').join('&');
      const key = clean.split('?')[0];
      if (!seen.has(key) && !key.includes('s150x150') && !key.includes('s320x320')) {
        seen.add(key);
        galleryImageUrls.push(clean);
      }
    };

    // Strategy 1: Extract from meta og:image tags
    const ogImageRegex = /<meta\s+(?:property|name)=\"og:image\"\s+content=\"([^\"]+)\"/gi;
    let match;
    while ((match = ogImageRegex.exec(html)) !== null) {
      pushUrl(match[1].replace(/&amp;/g, '&'));
    }

    // Strategy 2: Look for image URLs in JSON data embedded in the page
    // Instagram embeds data in window._sharedData or similar JSON structures
    const cdnUrlRegex = /https:\/\/[^\"'\s]*?(?:cdninstagram|instagram)[^\"'\s]*?\.(?:jpg|jpeg|png|webp)(?:\?[^\"'\s]*)?/gi;
    while ((match = cdnUrlRegex.exec(html)) !== null) {
      const decoded = match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
      // Only keep high-res images (e.g., containing 1080 or large dimensions)
      if (decoded.includes('1080') || decoded.includes('1440') || decoded.includes('750x') || 
          decoded.includes('/p/') || decoded.includes('e35') || decoded.includes('e15')) {
        pushUrl(decoded);
      }
    }

    // Strategy 3: If we didn't find high-res, take all CDN images
    if (galleryImageUrls.length === 0) {
      const allCdnRegex = /https:\/\/[^\"'\s\\]*?(?:cdninstagram|instagram\.f)[^\"'\s\\]*?\.(?:jpg|jpeg|png|webp)(?:\?[^\"'\s\\]*)?/gi;
      while ((match = allCdnRegex.exec(html)) !== null) {
        const decoded = match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
        pushUrl(decoded);
      }
    }

    // Extract title from meta tags
    const titleMatch = html.match(/<meta\s+(?:property|name)=\"og:title\"\s+content=\"([^\"]+)\"/i) ||
                       html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/ \| Instagram$/, '').trim() : 'Post do Instagram';

    console.log(`Found ${galleryImageUrls.length} images in Instagram post: ${title}`);

    if (galleryImageUrls.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhuma imagem encontrada. O post pode ser privado ou o Instagram bloqueou o acesso. Tente novamente em alguns minutos.',
          title,
          images: [],
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ title, images: galleryImageUrls, count: galleryImageUrls.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Instagram scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
