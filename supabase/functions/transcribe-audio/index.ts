
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { audioUrl, fileName } = await req.json();

    if (!audioUrl || !fileName) {
      throw new Error('audioUrl and fileName are required');
    }

    console.log('🔍 Starting transcription for:', fileName);

    // Download audio file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('meeting-recordings')
      .download(fileName);

    if (downloadError) {
      console.error('❌ Error downloading file:', downloadError);
      throw downloadError;
    }

    console.log('📥 File downloaded, size:', fileData.size);

    // Prepare form data for OpenAI API
    const formData = new FormData();
    formData.append('file', fileData, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese
    formData.append('response_format', 'text');

    // Call OpenAI Whisper API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('❌ OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${error}`);
    }

    const transcript = await openaiResponse.text();
    console.log('✅ Transcription completed:', transcript.substring(0, 100) + '...');

    // Generate summary using OpenAI GPT
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em resumir transcrições de reuniões. 
            Crie um resumo conciso e organizado da transcrição, destacando:
            - Pontos principais discutidos
            - Decisões tomadas
            - Próximos passos ou ações
            - Participantes mencionados
            
            Formate o resumo de forma clara e profissional.`
          },
          {
            role: 'user',
            content: `Por favor, resuma esta transcrição de reunião:\n\n${transcript}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    let summary = '';
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      summary = summaryData.choices[0]?.message?.content || '';
      console.log('📋 Summary generated:', summary.substring(0, 100) + '...');
    } else {
      console.error('❌ Error generating summary:', await summaryResponse.text());
    }

    // Create final transcript with summary
    const finalTranscript = summary 
      ? `## Resumo da Reunião\n\n${summary}\n\n## Transcrição Completa\n\n${transcript}`
      : transcript;

    return new Response(
      JSON.stringify({
        success: true,
        transcript: finalTranscript,
        originalTranscript: transcript,
        summary: summary
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error) {
    console.error('💥 Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
