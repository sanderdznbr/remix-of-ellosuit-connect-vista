// Realtime Transcription

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Convert PCM16 to WAV
const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 48000): Uint8Array => {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);
  
  const wavFile = new Uint8Array(44 + pcmData.length);
  wavFile.set(new Uint8Array(wavHeader), 0);
  wavFile.set(pcmData, 44);
  
  return wavFile;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, roomId } = await req.json();

    if (!audio || typeof audio !== 'string') {
      return new Response(JSON.stringify({ error: 'No audio data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 PCM audio
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (bytes.length < 1000) {
      return new Response(JSON.stringify({ text: '', filtered: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert to WAV
    const wavData = pcmToWav(bytes);

    // Transcribe with Whisper
    const formData = new FormData();
    const blob = new Blob([wavData], { type: 'audio/wav' });
    formData.append('file', blob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.3');
    formData.append('prompt', 'Transcreva exatamente o que foi dito em português brasileiro. Ignore ruídos de fundo.');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `Whisper API error: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const text = result.text?.trim() || '';
    const noSpeechProb = result.segments?.[0]?.no_speech_prob || 0;
    const avgLogprob = result.segments?.[0]?.avg_logprob || 0;

    // Filter noise
    if (noSpeechProb > 0.8 || text.length < 5 || avgLogprob < -1.5) {
      return new Response(JSON.stringify({ text: '', filtered: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter noise patterns
    const noisePatterns = [
      /^[,.!?;:\s]+$/,
      /^(uh+|um+|ah+|eh+|hm+|mhm+|mmm+|hmm+)$/i,
      /^(\w)\1{8,}$/,
      /^[^a-zA-ZÀ-ÿ]+$/,
      /^\[.*\]$/,
    ];
    
    for (const pattern of noisePatterns) {
      if (pattern.test(text)) {
        return new Response(JSON.stringify({ text: '', filtered: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('✅ Transcription:', text.substring(0, 80));

    return new Response(JSON.stringify({
      text,
      is_final: true,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
