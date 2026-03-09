const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || !url.includes('behance.net/gallery/')) {
      return new Response(
        JSON.stringify({ error: 'URL de galeria do Behance inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Behance gallery:', url);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!resp.ok) {
      console.error('Failed to fetch Behance page:', resp.status);
      return new Response(
        JSON.stringify({ error: `Falha ao acessar a página (${resp.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await resp.text();

    // Extract image URLs from srcset attributes in project module pictures
    // Pattern: mir-s3-cdn-cf.behance.net/project_modules/...
    const imageUrls: string[] = [];
    const seen = new Set<string>();

    // Match srcset URLs from source and img tags
    const srcsetRegex = /srcset="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    let match;
    while ((match = srcsetRegex.exec(html)) !== null) {
      let imgUrl = match[1].split(' ')[0]; // remove width descriptor like "1080w"
      
      // Upgrade to highest quality: replace max_1200_webp or similar with max_3840
      imgUrl = imgUrl.replace(/\/max_\d+_webp\//, '/max_3840/');
      imgUrl = imgUrl.replace(/\/max_\d+\//, '/max_3840/');
      imgUrl = imgUrl.replace(/\/disp\//, '/max_3840/');
      
      // Deduplicate by the unique file hash (everything after the last /)
      const fileKey = imgUrl.split('/').pop() || imgUrl;
      if (!seen.has(fileKey)) {
        seen.add(fileKey);
        imageUrls.push(imgUrl);
      }
    }

    // Also try img src for any missed images
    const imgSrcRegex = /src="(https:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"]+)"/g;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      let imgUrl = match[1];
      imgUrl = imgUrl.replace(/\/max_\d+_webp\//, '/max_3840/');
      imgUrl = imgUrl.replace(/\/max_\d+\//, '/max_3840/');
      imgUrl = imgUrl.replace(/\/disp\//, '/max_3840/');
      
      const fileKey = imgUrl.split('/').pop() || imgUrl;
      if (!seen.has(fileKey)) {
        seen.add(fileKey);
        imageUrls.push(imgUrl);
      }
    }

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' on Behance', '').trim() : 'Behance Gallery';

    console.log(`Found ${imageUrls.length} images in gallery: ${title}`);

    return new Response(
      JSON.stringify({ title, images: imageUrls, count: imageUrls.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Behance scraper error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
