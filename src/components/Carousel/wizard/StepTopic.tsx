import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Sparkles } from 'lucide-react';
import { FLOW_COLOR } from './types';

interface Props {
  topic: string;
  setTopic: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  cardCount: number;
  setCardCount: (v: number) => void;
  imageCardCount: number;
  setImageCardCount: (v: number) => void;
  enhancingPrompt: boolean;
  onEnhance: () => void;
}

const StepTopic: React.FC<Props> = ({
  topic, setTopic, keywords, setKeywords,
  cardCount, setCardCount, imageCardCount, setImageCardCount,
  enhancingPrompt, onEnhance,
}) => {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
          <Sparkles className="h-4 w-4" /> Etapa 1 — Tema & Conteúdo
        </div>
        <p className="text-sm text-muted-foreground">Descreva o assunto do carrossel e palavras-chave</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-foreground">Tópico do Carrossel *</label>
          <Button variant="outline" size="sm" onClick={onEnhance} disabled={enhancingPrompt || !topic.trim()}
            className="gap-1.5 rounded-xl text-xs h-7 px-3" style={{ borderColor: FLOW_COLOR + '44', color: FLOW_COLOR }}>
            {enhancingPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Melhorar com IA
          </Button>
        </div>
        <Textarea value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Como a Ellosuit pode ajudar empresas a escalar vendas e atendimento com IA"
          className="rounded-2xl min-h-[100px] resize-none text-base" />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Palavras-chave (opcional)</label>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
          placeholder="proteína, saúde, marketing (separadas por vírgula)" className="rounded-2xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Total de cards</label>
          <div className="flex items-center gap-3">
            {[5, 7, 9, 12].map(n => (
              <button key={n} onClick={() => { setCardCount(n); if (imageCardCount > n - 1) setImageCardCount(Math.max(1, n - 2)); }}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border ${cardCount === n ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
                style={cardCount === n ? { backgroundColor: FLOW_COLOR } : {}}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Cards com imagem</label>
          <div className="flex items-center gap-3">
            {[2, 3, 4, 5, 6].filter(n => n <= cardCount - 1).map(n => (
              <button key={n} onClick={() => setImageCardCount(n)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border ${imageCardCount === n ? 'text-white shadow-md border-transparent' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
                style={imageCardCount === n ? { backgroundColor: FLOW_COLOR } : {}}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTopic;
