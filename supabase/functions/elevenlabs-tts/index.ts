import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert numbers to pt-BR words for TTS pronunciation
const unidades = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove',
  'dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
const dezenas = ['','','vinte','trinta','quarenta','cinquenta'];
const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

const meses = ['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function numberToWords(n: number): string {
  if (n < 20) return unidades[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[u]}`;
}

function numberToWordsFem(n: number): string {
  if (n === 1) return 'uma';
  if (n === 2) return 'duas';
  return numberToWords(n);
}

function yearToWords(y: number): string {
  if (y === 2000) return 'dois mil';
  if (y > 2000 && y < 2100) {
    const remainder = y - 2000;
    return `dois mil e ${numberToWords(remainder)}`;
  }
  const mil = Math.floor(y / 1000);
  const rest = y % 1000;
  let result = numberToWords(mil) + ' mil';
  if (rest === 0) return result;
  if (rest === 100) return result + ' e cem';
  if (rest < 100) return result + ' e ' + numberToWords(rest);
  const c = Math.floor(rest / 100);
  const r = rest % 100;
  if (r === 0) {
    return rest === 100 ? result + ' e cem' : result + ' e ' + centenas[c];
  }
  return result + ' ' + centenas[c] + ' e ' + numberToWords(r);
}

function dateToPortuguese(text: string): string {
  // Match DD/MM/YYYY or DD/MM/YY
  return text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, (_match, d, m, y) => {
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12) return _match;
    const dayWord = day === 1 ? 'primeiro' : numberToWords(day);
    return `${dayWord} de ${meses[month]} de ${yearToWords(year)}`;
  });
}

function timeToPortuguese(text: string): string {
  return text.replace(/(\d{1,2})[h:](\d{2})/g, (_match, h, m) => {
    const hour = parseInt(h, 10);
    const min = parseInt(m, 10);
    let result = numberToWordsFem(hour) + (hour === 1 ? ' hora' : ' horas');
    if (min > 0) {
      result += ' e ' + numberToWords(min) + (min === 1 ? ' minuto' : ' minutos');
    }
    return result;
  });
}

function preprocessForTTS(text: string): string {
  let result = dateToPortuguese(text);
  result = timeToPortuguese(result);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Ello voice by default - custom Ellosuit voice
    const selectedVoice = voiceId || "RGymW84CSmfVugnA5tvA";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: preprocessForTTS(text.slice(0, 5000)),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errText);
      
      // Parse error for user-friendly message
      let errorMessage = "TTS generation failed";
      try {
        const errData = JSON.parse(errText);
        if (errData?.detail?.status === "quota_exceeded") {
          errorMessage = `Cota de caracteres ElevenLabs esgotada. Restam ${errData.detail.message?.match(/(\d+) credits remaining/)?.[1] || '0'} créditos.`;
        } else {
          errorMessage = errData?.detail?.message || errData?.detail || errorMessage;
        }
      } catch {}
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: response.status === 401 ? 401 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
