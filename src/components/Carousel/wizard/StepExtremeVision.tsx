import React, { useState } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';

export interface ExtremeField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'photo_upload' | 'color';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface ExtremeAnalysis {
  summary: string;
  fields: ExtremeField[];
  suggestedTopic: string;
  suggestedStyle: string;
}

interface Props {
  onAnalysisComplete: (analysis: ExtremeAnalysis, vision: string) => void;
}

const StepExtremeVision: React.FC<Props> = ({ onAnalysisComplete }) => {
  const [vision, setVision] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!vision.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extreme-wizard-analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ vision: vision.trim() }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status}`);
      }

      const analysis: ExtremeAnalysis = await res.json();
      onAnalysisComplete(analysis, vision.trim());
    } catch (err: any) {
      console.error('Extreme analysis error:', err);
      setError(err.message || 'Erro ao analisar sua visão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-2xl font-bold text-white">Descreva sua visão</h2>
        </div>
        <p className="text-sm text-white/40">
          Conte em detalhes como você imagina essa postagem visualmente. A IA vai personalizar as próximas etapas com base na sua descrição.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder="Ex: Quero uma pessoa segurando um celular com o print do meu aplicativo, fundo urbano com luzes neon, texto grande embaixo com o nome do app..."
          className="w-full h-40 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors resize-none"
          disabled={isAnalyzing}
        />

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249,115,22,0.06)' }}>
          <Sparkles className="w-3.5 h-3.5 text-orange-400/60 shrink-0" />
          <span className="text-[11px] text-white/30">
            Quanto mais detalhes, melhor! Mencione: cenário, pessoas, objetos, cores, estilo, texto desejado...
          </span>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!vision.trim() || isAnalyzing}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: vision.trim() && !isAnalyzing
              ? 'linear-gradient(135deg, #f97316, #ea580c)'
              : 'rgba(255,255,255,0.04)',
            color: vision.trim() && !isAnalyzing ? 'white' : 'rgba(255,255,255,0.3)',
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando sua visão...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Analisar e personalizar wizard
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StepExtremeVision;
