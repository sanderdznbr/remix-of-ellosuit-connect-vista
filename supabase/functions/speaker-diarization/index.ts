import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl } = await req.json();
    
    if (!audioUrl) {
      throw new Error('URL do áudio não fornecida');
    }

    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      throw new Error('ASSEMBLYAI_API_KEY não configurada');
    }

    console.log('🎤 Iniciando speaker diarization com AssemblyAI...');

    // Step 1: Submit audio for transcription with speaker diarization
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        speakers_expected: null, // Let AssemblyAI detect automatically
        language_code: 'pt', // Portuguese
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('❌ Erro AssemblyAI:', errorText);
      throw new Error(`AssemblyAI API error: ${errorText}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log('✅ Transcrição enviada. ID:', transcriptId);

    // Step 2: Poll for completion
    let transcriptResult;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': assemblyAIKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Erro ao verificar status da transcrição');
      }

      transcriptResult = await statusResponse.json();
      console.log(`📊 Status: ${transcriptResult.status}`);

      if (transcriptResult.status === 'completed') {
        console.log('✅ Transcrição completa!');
        break;
      } else if (transcriptResult.status === 'error') {
        throw new Error(`Erro na transcrição: ${transcriptResult.error}`);
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout: transcrição demorou muito tempo');
    }

    // Step 3: Process and return speaker-labeled transcript
    const speakerMap = new Map<string, number>();
    let speakerCounter = 1;

    const labeledTranscript = transcriptResult.words?.map((word: any) => {
      if (!word.speaker) return null;

      // Map AssemblyAI speaker IDs to sequential numbers
      if (!speakerMap.has(word.speaker)) {
        speakerMap.set(word.speaker, speakerCounter++);
      }

      return {
        text: word.text,
        speaker: `Pessoa ${speakerMap.get(word.speaker)}`,
        start: word.start,
        end: word.end,
        confidence: word.confidence,
      };
    }).filter(Boolean) || [];

    // Group words by speaker and time windows (5 second windows)
    const segments: any[] = [];
    let currentSegment: any = null;

    labeledTranscript.forEach((word: any) => {
      if (!currentSegment || 
          currentSegment.speaker !== word.speaker || 
          word.start - currentSegment.end > 5000) {
        // New segment
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          speaker: word.speaker,
          text: word.text,
          start: word.start,
          end: word.end,
        };
      } else {
        // Continue current segment
        currentSegment.text += ' ' + word.text;
        currentSegment.end = word.end;
      }
    });

    if (currentSegment) {
      segments.push(currentSegment);
    }

    console.log(`✅ Processado ${segments.length} segmentos com ${speakerMap.size} speakers`);

    return new Response(
      JSON.stringify({
        success: true,
        speakerCount: speakerMap.size,
        segments,
        fullText: transcriptResult.text,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
