import { createClient } from "npm:@supabase/supabase-js@2";
import { WebhookReceiver } from 'npm:livekit-server-sdk@2.13.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 [LiveKit Webhook] Received webhook request');

    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!livekitApiKey || !livekitApiSecret) {
      console.error('❌ Missing LiveKit credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar assinatura do webhook
    const receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);
    const body = await req.text();
    
    let event;
    try {
      event = await receiver.receive(body, req.headers.get('Authorization') || '');
      console.log('✅ [LiveKit Webhook] Signature validated');
    } catch (error) {
      console.error('❌ [LiveKit Webhook] Invalid signature:', error);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📦 [LiveKit Webhook] Event type:', event.event);
    console.log('📦 [LiveKit Webhook] Egress ID:', event.egressInfo?.egressId);

    // Processar apenas eventos de conclusão de gravação
    if (event.event !== 'egress_ended') {
      console.log('ℹ️ [LiveKit Webhook] Ignoring event type:', event.event);
      return new Response(JSON.stringify({ message: 'Event processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const egressInfo = event.egressInfo;
    if (!egressInfo) {
      console.error('❌ [LiveKit Webhook] No egress info in event');
      return new Response(JSON.stringify({ error: 'No egress info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📹 [LiveKit Webhook] Processing egress_ended event');
    console.log('🔍 [LiveKit Webhook] Egress status:', egressInfo.status);

    // Verificar se a gravação foi bem-sucedida
    if (egressInfo.status !== 'EGRESS_COMPLETE') {
      console.error('❌ [LiveKit Webhook] Egress failed with status:', egressInfo.status);
      console.error('❌ [LiveKit Webhook] Error:', egressInfo.error);
      
      // Atualizar registro no database com erro
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from('meeting_recordings')
        .update({
          file_url: null,
          duration_seconds: 0,
        })
        .eq('livekit_recording_id', egressInfo.egressId);

      return new Response(JSON.stringify({ message: 'Egress failed', error: egressInfo.error }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair informações do arquivo
    const fileResult = egressInfo.fileResults?.[0];
    if (!fileResult || !fileResult.downloadUrl) {
      console.error('❌ [LiveKit Webhook] No file result or download URL');
      return new Response(JSON.stringify({ error: 'No file result' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const downloadUrl = fileResult.downloadUrl;
    const duration = Math.floor((fileResult.duration || 0) / 1_000_000_000); // Nanosegundos para segundos
    const fileSize = fileResult.size || 0;

    console.log('⬇️ [LiveKit Webhook] Downloading file from:', downloadUrl);
    console.log('⏱️ [LiveKit Webhook] Duration:', duration, 'seconds');
    console.log('📊 [LiveKit Webhook] Size:', fileSize, 'bytes');

    // Fazer download do arquivo do LiveKit
    const downloadResponse = await fetch(downloadUrl);
    if (!downloadResponse.ok) {
      console.error('❌ [LiveKit Webhook] Failed to download file');
      throw new Error('Failed to download recording from LiveKit');
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    console.log('✅ [LiveKit Webhook] File downloaded, size:', fileBuffer.byteLength);

    // Criar nome do arquivo
    const fileName = `recording_${egressInfo.egressId}_${Date.now()}.mp4`;
    const filePath = `recordings/${fileName}`;

    // Upload para Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('⬆️ [LiveKit Webhook] Uploading to Supabase Storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meeting-recordings')
      .upload(filePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ [LiveKit Webhook] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ [LiveKit Webhook] File uploaded to Supabase Storage');

    // Obter URL pública (ou gerar signed URL se bucket for privado)
    const { data: publicUrlData } = supabase.storage
      .from('meeting-recordings')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log('🔗 [LiveKit Webhook] Public URL:', publicUrl);

    // Atualizar registro no database
    const { error: updateError } = await supabase
      .from('meeting_recordings')
      .update({
        file_url: publicUrl,
        duration_seconds: duration,
        file_size: fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq('livekit_recording_id', egressInfo.egressId);

    if (updateError) {
      console.error('❌ [LiveKit Webhook] Database update error:', updateError);
      throw updateError;
    }

    console.log('✅ [LiveKit Webhook] Database updated successfully');
    console.log('🎉 [LiveKit Webhook] Recording processing complete');

    return new Response(JSON.stringify({ 
      message: 'Recording processed successfully',
      file_url: publicUrl,
      duration_seconds: duration,
      file_size: fileSize,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [LiveKit Webhook] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
