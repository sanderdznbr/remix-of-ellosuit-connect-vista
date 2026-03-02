import { useState, useCallback, useRef, useEffect } from 'react';

const STEP_VOICE_MESSAGES: Record<number, string> = {
  0: 'Escreva qual será o tema da sua postagem no campo abaixo. Pode ser um assunto, uma notícia, ou qualquer ideia que você queira transformar em carrossel.',
  1: 'Agora escolha quantos slides você quer no seu carrossel. Deslize o controle para definir a quantidade.',
  2: 'Aqui estão as imagens encontradas na web sobre o seu tema. Toque nas fotos que você quer usar no carrossel.',
  3: 'Se o post precisa mostrar algum rosto específico, você pode subir fotos aqui. Caso contrário, pode pular.',
  4: 'Se o post envolve algum produto específico, envie fotos dele para que a inteligência artificial adapte o conteúdo. Se não tiver, pode pular.',
  5: 'Caso o post tenha relação com alguma marca, anexe logos ou referências visuais aqui. Se não tiver, pode pular.',
  6: 'Escolha as cores do seu carrossel. Você pode selecionar uma paleta pronta ou personalizar cada cor.',
  7: 'Agora selecione a fonte que será usada nos textos do carrossel.',
  8: 'Por último, configure a marca que aparecerá no cabeçalho dos cards. Você também pode adicionar sua logomarca.',
};

export function useCarouselVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenSteps = useRef<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speakStep = useCallback(async (step: number) => {
    if (!voiceEnabled) return;
    if (spokenSteps.current.has(step)) return;

    const text = STEP_VOICE_MESSAGES[step];
    if (!text) return;

    stopSpeaking();
    spokenSteps.current.add(step);
    setIsSpeaking(true);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/carousel-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        let errorMessage = `Voice guide failed (${response.status})`;
        try {
          const data = await response.json();
          if (typeof data?.error === 'string') {
            errorMessage = data.error;
          }
        } catch {
          // ignore parse errors
        }

        if (response.status === 429 || /quota|cota|credits?/i.test(errorMessage)) {
          setVoiceEnabled(false);
          console.warn('Voice guide disabled: ElevenLabs quota exceeded.');
        } else {
          console.warn('Voice guide failed:', errorMessage);
        }

        setIsSpeaking(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play().catch(() => {
        setIsSpeaking(false);
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Voice guide error:', err);
      }
      setIsSpeaking(false);
    }
  }, [voiceEnabled, stopSpeaking]);

  const resetSpoken = useCallback(() => {
    spokenSteps.current.clear();
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  return { speakStep, stopSpeaking, isSpeaking, voiceEnabled, setVoiceEnabled, resetSpoken };
}
