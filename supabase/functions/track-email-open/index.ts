
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pixel_id = url.searchParams.get('pixel_id');

    if (!pixel_id) {
      return new Response('Missing pixel_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar email pelo tracking_pixel_id
    const { data: emailData, error: emailError } = await supabase
      .from('emails')
      .select('id')
      .eq('tracking_pixel_id', pixel_id)
      .single();

    if (emailError || !emailData) {
      console.error('Email not found for pixel_id:', pixel_id);
      return new Response(new Uint8Array(0), {
        status: 200,
        headers: { 'Content-Type': 'image/gif', ...corsHeaders },
      });
    }

    // Verificar se já existe evento de abertura para este email
    const { data: existingEvent } = await supabase
      .from('email_events')
      .select('id')
      .eq('email_id', emailData.id)
      .eq('event_type', 'opened')
      .single();

    // Só registrar se não existe evento de abertura anterior
    if (!existingEvent) {
      const userAgent = req.headers.get('user-agent') || '';
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';

      await supabase
        .from('email_events')
        .insert({
          email_id: emailData.id,
          event_type: 'opened',
          user_agent: userAgent,
          ip_address: ipAddress === 'unknown' ? null : ipAddress,
          timestamp: new Date().toISOString()
        });

      console.log('Email opened:', emailData.id);
    }

    // Retornar pixel transparente (GIF 1x1)
    const pixelData = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    ]);

    return new Response(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...corsHeaders
      },
    });

  } catch (error: any) {
    console.error('Error in track-email-open function:', error);
    return new Response(new Uint8Array(0), {
      status: 200,
      headers: { 'Content-Type': 'image/gif', ...corsHeaders },
    });
  }
};

serve(handler);
