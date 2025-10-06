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

    const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramKey) {
      throw new Error('DEEPGRAM_API_KEY não configurada');
    }

    console.log('🎤 Iniciando speaker diarization com Deepgram...');
    console.log('📍 Audio URL:', audioUrl);

    // Use Deepgram's diarization feature
    const deepgramUrl = new URL('https://api.deepgram.com/v1/listen');
    deepgramUrl.searchParams.append('model', 'nova-2');
    deepgramUrl.searchParams.append('language', 'pt-BR');
    deepgramUrl.searchParams.append('diarize', 'true');
    deepgramUrl.searchParams.append('punctuate', 'true');
    deepgramUrl.searchParams.append('utterances', 'true');

    const response = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro Deepgram:', errorText);
      throw new Error(`Deepgram API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Transcrição Deepgram completa!');

    // Process Deepgram utterances (already grouped by speaker)
    const utterances = result.results?.utterances || [];
    const segments: any[] = [];
    const speakerMap = new Map<number, number>();
    let speakerCounter = 1;

    utterances.forEach((utterance: any) => {
      const speakerId = utterance.speaker;
      
      // Map Deepgram speaker IDs to sequential numbers
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, speakerCounter++);
      }

      segments.push({
        speaker: `Pessoa ${speakerMap.get(speakerId)}`,
        text: utterance.transcript,
        start: utterance.start * 1000, // Convert to milliseconds
        end: utterance.end * 1000,
        confidence: utterance.confidence,
      });
    });

    const fullText = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    console.log(`✅ Processado ${segments.length} segmentos com ${speakerMap.size} speakers detectados`);
    
    // Log speaker distribution for debugging
    const speakerCounts = new Map<string, number>();
    segments.forEach(seg => {
      speakerCounts.set(seg.speaker, (speakerCounts.get(seg.speaker) || 0) + 1);
    });
    console.log('📊 Distribuição de speakers:', Object.fromEntries(speakerCounts));

    return new Response(
      JSON.stringify({
        success: true,
        speakerCount: speakerMap.size,
        segments,
        fullText,
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
