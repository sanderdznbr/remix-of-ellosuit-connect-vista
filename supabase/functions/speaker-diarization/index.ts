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
    console.log('📍 Audio URL:', audioUrl);

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
        speakers_expected: 2, // Expect at least 2 speakers to be more sensitive
        language_code: 'pt', // Portuguese
        speech_threshold: 0.3, // Lower threshold for better detection
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('❌ Erro AssemblyAI:', errorText);
      throw new Error(`AssemblyAI API error: ${errorText}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log('✅ Transcrição enviada. ID:', transcriptId);
    console.log('⚙️ Configuração: speakers_expected=2, speech_threshold=0.3');

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
      console.log(`📊 Status: ${transcriptResult.status} | Audio Duration: ${transcriptResult.audio_duration}s`);

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
    console.log('🔍 Palavras retornadas:', transcriptResult.words?.length || 0);
    console.log('🔍 Utterances retornadas:', transcriptResult.utterances?.length || 0);
    
    // Log unique speakers from words
    const speakersInWords = new Set(
      transcriptResult.words
        ?.filter((w: any) => w.speaker)
        .map((w: any) => w.speaker) || []
    );
    console.log('👥 Speakers únicos nas palavras:', Array.from(speakersInWords));
    
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

    // Group words by speaker and time windows (2 second windows for better phrase separation)
    const segments: any[] = [];
    let currentSegment: any = null;

    labeledTranscript.forEach((word: any) => {
      if (!currentSegment || 
          currentSegment.speaker !== word.speaker || 
          word.start - currentSegment.end > 2000) { // 2 seconds for better phrase detection
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

    // Verify actual unique speakers in final segments
    const actualUniqueSpeakers = new Set(segments.map(seg => seg.speaker));
    
    console.log(`✅ Processado ${segments.length} segmentos com ${actualUniqueSpeakers.size} speakers únicos detectados`);
    console.log('👥 Speakers únicos nos segmentos finais:', Array.from(actualUniqueSpeakers));
    
    // Log speaker distribution for debugging
    const speakerCounts = new Map<string, number>();
    segments.forEach(seg => {
      speakerCounts.set(seg.speaker, (speakerCounts.get(seg.speaker) || 0) + 1);
    });
    console.log('📊 Distribuição de speakers:', Object.fromEntries(speakerCounts));

    return new Response(
      JSON.stringify({
        success: true,
        speakerCount: actualUniqueSpeakers.size, // Use the actual count from segments
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
