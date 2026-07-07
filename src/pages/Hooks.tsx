import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Copy, Check, Search, Zap } from 'lucide-react';
import { toast } from 'sonner';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { routeFromTab } from '@/utils/dashboard-routes';

interface Hook {
  text: string;
  category: 'curiosidade' | 'autoridade' | 'urgência' | 'storytelling' | 'pergunta' | 'polêmica';
}

const HOOKS: Hook[] = [
  { text: 'Ninguém vai te contar isso, mas...', category: 'curiosidade' },
  { text: 'O segredo que [nicho] esconde de você', category: 'curiosidade' },
  { text: '3 coisas que aprendi depois de [X anos / experiência]', category: 'autoridade' },
  { text: 'Faça isso antes que seja tarde demais', category: 'urgência' },
  { text: 'Eu errei feio fazendo isso — não cometa o mesmo erro', category: 'storytelling' },
  { text: 'Pare de fazer [X] se você quer [resultado]', category: 'polêmica' },
  { text: 'Você sabia que [dado surpreendente]?', category: 'pergunta' },
  { text: 'Em 30 segundos eu vou te mostrar como [resultado]', category: 'curiosidade' },
  { text: 'A maioria faz errado. Veja o jeito certo:', category: 'polêmica' },
  { text: 'Se eu pudesse começar de novo, faria isso primeiro', category: 'storytelling' },
  { text: 'Esse é o post mais importante que você vai ler hoje', category: 'urgência' },
  { text: 'Como [resultado X] sem [obstáculo Y]', category: 'autoridade' },
  { text: 'O que ninguém te conta sobre [tema]', category: 'curiosidade' },
  { text: 'Por que [opinião contrária ao senso comum]', category: 'polêmica' },
  { text: 'Isso mudou completamente meu [resultado]', category: 'storytelling' },
  { text: 'Você está perdendo dinheiro se não souber disso', category: 'urgência' },
  { text: 'A pergunta que todo [persona] deveria se fazer', category: 'pergunta' },
  { text: '5 sinais de que você precisa mudar [algo]', category: 'autoridade' },
  { text: 'Eu testei [X] por 30 dias. Eis o resultado:', category: 'storytelling' },
  { text: 'Você comete esses erros sem perceber?', category: 'pergunta' },
  { text: 'Antes de [ação], leia isso', category: 'urgência' },
  { text: 'O motivo real pelo qual você ainda não [resultado]', category: 'curiosidade' },
  { text: 'Pare de gastar tempo com [X]. Faça isso:', category: 'polêmica' },
  { text: 'O método de 1 minuto para [resultado]', category: 'autoridade' },
  { text: 'O que [profissão / ícone] faria no seu lugar', category: 'storytelling' },
  { text: 'Se você [situação], esse post é pra você', category: 'pergunta' },
  { text: 'A verdade incômoda sobre [tema]', category: 'polêmica' },
  { text: 'Última chance de [oportunidade]', category: 'urgência' },
  { text: 'Como dobrar [resultado] em [tempo curto]', category: 'autoridade' },
  { text: 'O que mudou tudo pra mim nos últimos [tempo]', category: 'storytelling' },
];

const CATEGORIES = ['todos', 'curiosidade', 'autoridade', 'urgência', 'storytelling', 'pergunta', 'polêmica'] as const;

const CAT_COLORS: Record<string, string> = {
  curiosidade: '#8B5CF6',
  autoridade: '#38BDF8',
  urgência: '#EF4444',
  storytelling: '#F59E0B',
  pergunta: '#10B981',
  polêmica: '#EC4899',
};

const Hooks: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('todos');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return HOOKS.filter((h) =>
      (cat === 'todos' || h.category === cat) &&
      (query.trim() === '' || h.text.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query, cat]);

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success('Copiado');
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  };

  const useInChat = (text: string) => {
    navigate(`/criar?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <div className="flex h-screen w-full text-white" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="hidden md:block">
        <DashboardSidebar activeTab="hooks" onTabChange={(t) => navigate(routeFromTab(t))} onSearch={() => {}} />
      </div>
      <div className="flex-1 overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] backdrop-blur" style={{ backgroundColor: 'rgba(10,10,15,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white"><Home className="w-4 h-4" /></button>
          <Zap className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-semibold">Banco de hooks</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-sm text-white/50 mb-4">Frases prontas pra abrir posts e prender a atenção. Clique para copiar ou enviar direto pro Chat IA.</p>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar hook..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/40"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap capitalize transition-colors"
              style={{
                borderColor: cat === c ? (CAT_COLORS[c] || '#8B5CF6') : 'rgba(255,255,255,0.08)',
                color: cat === c ? (CAT_COLORS[c] || '#8B5CF6') : 'rgba(255,255,255,0.6)',
                backgroundColor: cat === c ? `${CAT_COLORS[c] || '#8B5CF6'}15` : 'transparent',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.map((h, idx) => (
            <div key={idx} className="group p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-colors" style={{ backgroundColor: '#0f0f15' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm text-white/90 leading-relaxed flex-1">{h.text}</p>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${CAT_COLORS[h.category]}20`, color: CAT_COLORS[h.category] }}>
                  {h.category}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(h.text, idx)} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70">
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} Copiar
                </button>
                <button onClick={() => useInChat(h.text)} className="flex-1 text-xs py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300">
                  Usar no chat
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-sm text-white/40 py-12">Nenhum hook encontrado.</p>}
        </div>
      </main>
      </div>
    </div>
  );
};

export default Hooks;
