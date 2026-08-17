import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import {
  Search, Sparkles, CreditCard, Coins, Image as ImageIcon, User, Layers,
  Send, MessageCircle, ExternalLink, X, ChevronDown, LifeBuoy, Zap,
  BookOpen, Palette, Wand2, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import supportAgentImg from '@/assets/support-agent.jpg';
import { isNativeIOS } from '@/lib/platform';

const WHATSAPP_NUMBER = '5541987942674';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20ellocontent`;
const AGENT_NAME = 'Marina';

/* ─────────────────────────── FAQ DATA (2026) ─────────────────────────── */

interface FaqItem { q: string; a: React.ReactNode; }
interface FaqCategory { id: string; icon: any; title: string; description: string; color: string; items: FaqItem[]; }

const CATEGORIES: FaqCategory[] = [
  {
    id: 'creditos',
    icon: Coins,
    title: 'Créditos & consumo',
    description: 'Quanto cada geração custa e como o saldo funciona.',
    color: '#A78BFA',
    items: [
      {
        q: 'Quantos créditos cada modo consome?',
        a: (
          <ul className="space-y-1.5">
            <li>• <b>Simples</b> — 1 crédito por card</li>
            <li>• <b>Avançado (Pro)</b> — 2 créditos por card</li>
            <li>• <b>Extreme</b> — 2 créditos por card</li>
            <li>• <b>Tweet / Tweet 2</b> — 1 crédito por card</li>
            <li>• <b>Rosto (upload facial)</b> — +4 créditos no card</li>
            <li>• <b>Pesquisa Web</b> — +1 crédito fixo por geração</li>
          </ul>
        ),
      },
      { q: 'Meus créditos expiram?', a: 'Créditos do plano são renovados todo mês (não acumulam). Créditos extras comprados avulsos duram 30 dias caso a assinatura fique inativa — enquanto o plano estiver ativo, não expiram.' },
      { q: 'Consigo comprar créditos extras?', a: 'Sim. A qualquer momento, dentro de "Perfil → Créditos". Pagamento via cartão ou PIX.' },
    ],
  },
  {
    id: 'planos',
    icon: CreditCard,
    title: 'Planos & pagamentos',
    description: 'Assinaturas, upgrades e formas de pagamento.',
    color: '#F472B6',
    items: [
      {
        q: 'Quais são os planos disponíveis em 2026?',
        a: (
          <ul className="space-y-1.5">
            <li>• <b>Starter</b> — 50 créditos/mês</li>
            <li>• <b>Pro</b> — 100 créditos/mês</li>
            <li>• <b>Growth</b> — 200 créditos/mês</li>
          </ul>
        ),
      },
      { q: 'Como faço upgrade?', a: 'Em "Perfil → Assinatura". Você paga só a diferença proporcional ao ciclo atual, mantém a data de renovação e seus créditos antigos são preservados.' },
      { q: 'Posso pagar com PIX?', a: 'Assinaturas mensais são apenas no cartão. PIX está disponível em planos anuais e na compra de créditos extras.' },
      { q: 'O que acontece se meu pagamento falhar?', a: 'A conta entra em modo bloqueado até a regularização. Seus projetos e créditos ficam preservados — nada é apagado.' },
    ],
  },
  {
    id: 'geracao',
    icon: Wand2,
    title: 'Geração & qualidade',
    description: 'Como conseguir os melhores resultados.',
    color: '#34D399',
    items: [
      { q: 'Qual a diferença entre os modos?', a: 'Simples é rápido e barato para posts do dia a dia. Avançado (Pro) oferece controle fino de estilo, tipografia e composição. Extreme é o modo mais criativo, usado para replicar referências visuais complexas.' },
      { q: 'Como usar rosto em posts?', a: 'Envie 1 foto nítida do rosto em "Personalização". A IA detecta gênero/biotipo automaticamente e prioriza fidelidade facial. Custa +4 créditos por card.' },
      { q: 'Consigo usar minha marca (logo e cores)?', a: 'Sim. Cadastre logo, cores e fontes em "Perfil → Marca". A IA aplica automaticamente respeitando a área segura do logo.' },
      { q: 'Por que às vezes o resultado vem diferente?', a: 'A IA generativa tem variação natural. Use o modo Avançado para maior controle, ou regenere com a assistente Laura no editor para ajustes específicos.' },
    ],
  },
  {
    id: 'editor',
    icon: Palette,
    title: 'Editor & exportação',
    description: 'Refinar, corrigir e baixar seus posts.',
    color: '#60A5FA',
    items: [
      { q: 'Como edito texto depois de gerado?', a: 'No editor, clique no ícone de lápis sobre o card. Você pode trocar textos, cores e reordenar slides sem gastar créditos.' },
      { q: 'Consigo corrigir uma parte da imagem?', a: 'Sim. Use a ferramenta de correção (inpainting) — selecione a área e descreva o ajuste. Roda no Gemini 3 Pro.' },
      { q: 'Em que formatos posso exportar?', a: 'PNG, JPG, WEBP e ZIP com todos os slides. No mobile, o download vai direto pra galeria.' },
      { q: 'Posso publicar direto no Instagram?', a: 'Sim. Conecte sua conta em "Publicações" e envie post único, carrossel ou stories direto do estúdio.' },
    ],
  },
  {
    id: 'marketplace',
    icon: Layers,
    title: 'Marketplace de estilos',
    description: 'Comprar, vender e usar estilos.',
    color: '#FBBF24',
    items: [
      { q: 'Como funciona o marketplace?', a: 'Estilos são templates visuais criados pela comunidade. Custam R$ 9,90 ou 50 créditos (PIX/cartão). Estilos gratuitos ficam disponíveis instantaneamente.' },
      { q: 'Posso criar meu próprio estilo?', a: 'Sim. Em "Projetos", selecione 3+ posts seus e clique em "Criar estilo". A IA analisa e gera um template privado.' },
    ],
  },
  {
    id: 'conta',
    icon: ShieldCheck,
    title: 'Conta & segurança',
    description: 'Login, dados e privacidade.',
    color: '#F87171',
    items: [
      { q: 'Como redefino minha senha?', a: 'Em "Login → Esqueci a senha". Você recebe um email com link seguro (válido por 1 hora).' },
      { q: 'Meus posts são privados?', a: 'Sim. Tudo que você gera é privado por padrão. Publicar na comunidade é opcional e exige confirmação.' },
      { q: 'Consigo cancelar quando quiser?', a: 'Sim. Sem multa, sem burocracia. Em "Perfil → Assinatura → Cancelar". Você mantém o acesso até o fim do ciclo pago.' },
    ],
  },
];

const QUICK = [
  'Quanto custa 1 carrossel de 5 cards?',
  'Como usar rosto nos posts?',
  'Diferença entre Pro e Extreme?',
  'Meus créditos expiram?',
  'Como publicar no Instagram?',
];

/* ─────────────────────────── CHAT WIDGET ─────────────────────────── */

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

const ChatWidget: React.FC<{ open: boolean; onClose: () => void; seed?: string | null }> = ({ open, onClose, seed }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setTyping(true);
      const t = setTimeout(() => {
        setMessages([{ role: 'assistant', content: `Oi! Sou a ${AGENT_NAME}, do suporte do ellocontent. Como posso te ajudar?` }]);
        setTyping(false);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);
  useEffect(() => { if (open && seed) setInput(seed); }, [open, seed]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const all = [...messages, userMsg];
    setMessages(all);
    setInput('');
    setLoading(true);
    setTyping(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: { messages: all, conversation_id: conversationId },
      });
      if (error) throw error;
      if (data?.conversation_id) setConversationId(data.conversation_id);
      setTyping(false);
      const parts = String(data?.reply || 'Deu um errinho aqui, tenta de novo.').split('|||').map((s: string) => s.trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        await new Promise(r => setTimeout(r, 400 + Math.min(parts[i].length * 12, 1200)));
        setMessages(prev => [...prev, { role: 'assistant', content: parts[i] }]);
      }
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Deu um erro por aqui. Tenta de novo em alguns segundos 🙏' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-2rem)] z-50 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.08)',
          }}
        >
          <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'linear-gradient(135deg, #16161f 0%, #0d0d14 100%)' }}>
            <div className="relative">
              <img src={supportAgentImg} alt={AGENT_NAME} className="w-10 h-10 rounded-full object-cover ring-1 ring-purple-500/30" loading="lazy" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2" style={{ boxShadow: '0 0 0 2px #16161f' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">{AGENT_NAME}</p>
              <p className="text-[11px] text-emerald-400/80">Online agora · responde em segundos</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="h-[380px] overflow-y-auto px-4 py-4 space-y-1">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isFirst = i === 0 || messages[i - 1].role !== msg.role;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}>
                  {!isUser && isFirst && <img src={supportAgentImg} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" loading="lazy" />}
                  {!isUser && !isFirst && <div className="w-6 shrink-0" />}
                  <div className={`max-w-[76%] px-3.5 py-2 text-[13px] leading-relaxed rounded-2xl ${isUser ? 'rounded-br-md text-white' : 'rounded-bl-md text-white/90'}`}
                    style={{ backgroundColor: isUser ? '#7C3AED' : 'rgba(255,255,255,0.055)' }}>
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}
            {typing && (
              <div className="flex items-end gap-2 mt-3">
                <img src={supportAgentImg} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ backgroundColor: 'rgba(255,255,255,0.055)' }}>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2" style={{ backgroundColor: '#0a0a10' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escreva sua mensagem..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/40 transition-colors"
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-20 shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-center gap-1.5 text-[11px] text-white/40 hover:text-emerald-400 transition-colors"
            style={{ backgroundColor: '#08080d' }}>
            <MessageCircle className="w-3 h-3" /> Prefere falar no WhatsApp? <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─────────────────────────── PAGE ─────────────────────────── */

const Ajuda: React.FC = () => {
  const nativeIOS = isNativeIOS();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('creditos');
  const [openItem, setOpenItem] = useState<string | null>(null);

  const askInChat = (q: string) => { setChatSeed(q); setChatOpen(true); };

  const availableCategories = useMemo(() => {
    if (!nativeIOS) return CATEGORIES;
    return CATEGORIES
      .filter(category => category.id !== 'planos' && category.id !== 'marketplace')
      .map(category => category.id !== 'creditos' ? category : {
        ...category,
        items: category.items
          .filter(item => item.q !== 'Consigo comprar créditos extras?')
          .map(item => item.q === 'Meus créditos expiram?'
            ? { ...item, a: 'O saldo e eventuais renovações aparecem automaticamente na sua conta.' }
            : item),
      });
  }, [nativeIOS]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories
      .map(c => ({ ...c, items: c.items.filter(i => i.q.toLowerCase().includes(q) || (typeof i.a === 'string' && i.a.toLowerCase().includes(q))) }))
      .filter(c => c.items.length > 0);
  }, [availableCategories, query]);

  const active = filtered.find(c => c.id === activeCategory) || filtered[0];

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full overflow-x-hidden text-white" style={{ backgroundColor: '#08080d' }}>
        {/* HERO */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: 'radial-gradient(60% 80% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium mb-6"
              style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#C4B5FD', border: '1px solid rgba(124,58,237,0.25)' }}>
              <LifeBuoy className="w-3 h-3" /> Suporte ellocontent · 2026
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              Como podemos <span style={{ background: 'linear-gradient(135deg, #A78BFA, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>te ajudar?</span>
            </h1>
            <p className="text-white/50 text-base max-w-lg mx-auto mb-8">
              Respostas rápidas sobre créditos, geração e o editor. Ou fale com a Marina em segundos.
            </p>

            {/* SEARCH */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar em toda a central..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 outline-none focus:border-purple-500/40 transition-colors"
              />
            </div>

            {/* QUICK QUESTIONS */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {QUICK.filter(q => !nativeIOS || (!q.includes('Pro') && !q.includes('expiram'))).map((q, i) => (
                <button key={i} onClick={() => askInChat(q)}
                  className="px-3.5 py-1.5 rounded-full text-[11px] text-white/60 hover:text-white border border-white/[0.06] hover:border-purple-500/30 transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CATEGORY TABS + FAQ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
          <div className="grid min-w-0 lg:grid-cols-[240px,1fr] gap-8">
            {/* Sidebar categories */}
            <aside className="min-w-0 lg:sticky lg:top-6 self-start">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3 px-2">Categorias</p>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 lg:mx-0 px-4 lg:px-0 pb-2 lg:pb-0">
                {filtered.map(c => {
                  const Icon = c.icon;
                  const isActive = active?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCategory(c.id); setOpenItem(null); }}
                      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all shrink-0 lg:shrink lg:w-full"
                      style={{
                        backgroundColor: isActive ? `${c.color}12` : 'transparent',
                        border: `1px solid ${isActive ? c.color + '30' : 'transparent'}`,
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? c.color : undefined }} />
                      <span className="font-medium whitespace-nowrap lg:whitespace-normal">{c.title}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full hidden lg:inline"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
                        {c.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Content */}
            <div className="min-w-0">
              {active ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>{active.title}</h2>
                    <p className="text-sm text-white/45">{active.description}</p>
                  </div>

                  <div className="space-y-2">
                    {active.items.map((item, i) => {
                      const id = `${active.id}-${i}`;
                      const isOpen = openItem === id;
                      return (
                        <motion.div key={id} layout
                          className="rounded-2xl border overflow-hidden"
                          style={{
                            backgroundColor: isOpen ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)',
                            borderColor: isOpen ? `${active.color}30` : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <button onClick={() => setOpenItem(isOpen ? null : id)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left">
                            <span className="flex-1 text-sm font-medium text-white/90">{item.q}</span>
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-white/40" />
                            </motion.div>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="px-5 pb-5 pt-1 text-sm text-white/60 leading-relaxed">{item.a}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-white/40">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nada encontrado para "<span className="text-white/70">{query}</span>"</p>
                  <button onClick={() => askInChat(query)} className="mt-4 text-xs text-purple-300 hover:text-purple-200 underline">
                    Perguntar à Marina
                  </button>
                </div>
              )}

              {/* Bottom CTA */}
              <div className="mt-10 grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setChatOpen(true)}
                  className="group text-left rounded-2xl border border-white/[0.06] p-5 hover:border-purple-500/30 transition-all"
                  style={{ backgroundColor: 'rgba(124,58,237,0.05)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A78BFA' }}>Chat com IA</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Falar com a Marina</p>
                  <p className="text-xs text-white/45">Resposta em segundos, 24h por dia.</p>
                </button>

                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                  className="group text-left rounded-2xl border border-white/[0.06] p-5 hover:border-emerald-500/30 transition-all"
                  style={{ backgroundColor: 'rgba(34,197,94,0.04)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">WhatsApp</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Falar com humano</p>
                  <p className="text-xs text-white/45">Seg a sex, 9h às 18h (BRT).</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat button */}
      <motion.button
        onClick={() => setChatOpen(!chatOpen)}
        aria-label={chatOpen ? 'Fechar chat com a Marina' : 'Abrir chat com a Marina'}
        aria-expanded={chatOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 10px 40px rgba(124,58,237,0.45)' }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {chatOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="relative w-full h-full">
              <img src={supportAgentImg} alt={AGENT_NAME} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 0 2px #6D28D9' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <ChatWidget open={chatOpen} onClose={() => { setChatOpen(false); setChatSeed(null); }} seed={chatSeed} />
    </DashboardLayout>
  );
};

export default Ajuda;
