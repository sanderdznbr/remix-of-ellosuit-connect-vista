import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHubColor, DEFAULT_COLOR } from '@/hooks/useHubColor';
import { motion, AnimatePresence } from 'framer-motion';

// Route mapping for AI intent detection
const ROUTE_MAP: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ['whatsapp', 'crm', 'conversa', 'mensagem', 'chat'], path: '/dashboard/crm-whatsapp', label: 'CRM WhatsApp' },
  { keywords: ['disparo', 'massa', 'broadcast'], path: '/dashboard/disparos', label: 'Disparos em Massa' },
  { keywords: ['chatbot', 'bot', 'fluxo automatizado'], path: '/dashboard/chatbot', label: 'ChatBot Builder' },
  { keywords: ['email', 'campanha', 'newsletter'], path: '/dashboard/email', label: 'Email Marketing' },
  { keywords: ['template', 'modelo email'], path: '/dashboard/email-templates', label: 'Templates de Email' },
  { keywords: ['agente', 'ia', 'inteligência artificial', 'bot ia'], path: '/dashboard/bot-ia', label: 'Agentes de IA' },
  { keywords: ['automação', 'automatizar', 'automacoes'], path: '/dashboard/automacoes', label: 'Automações' },
  { keywords: ['api', 'integração', 'webhook'], path: '/dashboard/api-whatsapp', label: 'API WhatsApp' },
  { keywords: ['agenda', 'calendário', 'compromisso', 'evento'], path: '/dashboard/agenda', label: 'Minha Agenda' },
  { keywords: ['agendamento', 'agenda online', 'booking'], path: '/dashboard/agenda-aberta', label: 'Agenda Online' },
  { keywords: ['tarefa', 'task', 'todo', 'fazer'], path: '/dashboard/tasks', label: 'Tarefas' },
  { keywords: ['fluxo', 'kanban', 'board'], path: '/dashboard/fluxos', label: 'Fluxos' },
  { keywords: ['reunião', 'videoconferência', 'call', 'video'], path: '/dashboard/reunioes', label: 'Videoconferência' },
  { keywords: ['gravação', 'transcrição'], path: '/dashboard/reunioes/gravacoes', label: 'Gravações' },
  { keywords: ['rastrear', 'rastreamento', 'tracking', 'documento'], path: '/dashboard/rastreamento', label: 'Rastrear Conteúdo' },
  { keywords: ['encurtar', 'link', 'url', 'encurtador'], path: '/dashboard/encurtador', label: 'Encurtador' },
  { keywords: ['lead', 'funil', 'captura'], path: '/dashboard/leads', label: 'Captura de Leads' },
  { keywords: ['cliente', 'contato', 'cadastro', 'fornecedor'], path: '/dashboard/cadastros', label: 'Cadastros' },
  { keywords: ['arquivo', 'drive', 'documento', 'pasta'], path: '/dashboard/drive', label: 'Arquivos' },
  { keywords: ['equipe', 'colaborador', 'time', 'funcionário'], path: '/dashboard/equipe', label: 'Equipe' },
  { keywords: ['hábito', 'rotina'], path: '/dashboard/habitos', label: 'Hábitos' },
  { keywords: ['contrato', 'acordo'], path: '/dashboard/contratos', label: 'Contratos' },
  { keywords: ['proposta', 'orçamento', 'ordem de serviço'], path: '/dashboard/propostas', label: 'Ordem de Serviço' },
  { keywords: ['recibo', 'pagamento'], path: '/dashboard/recibos', label: 'Recibos' },
  { keywords: ['analytics', 'análise', 'métrica', 'relatório', 'dados'], path: '/dashboard/analytics', label: 'Analytics' },
  { keywords: ['configuração', 'preferência', 'setting'], path: '/dashboard/configuracoes', label: 'Configurações' },
  { keywords: ['perfil', 'conta', 'meu perfil'], path: '/dashboard/perfil', label: 'Meu Perfil' },
  { keywords: ['assinatura', 'plano', 'pagamento'], path: '/dashboard/assinatura', label: 'Assinatura' },
];

function detectIntent(input: string): { path: string; label: string } | null {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch: { path: string; label: string; score: number } | null = null;

  for (const route of ROUTE_MAP) {
    for (const keyword of route.keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        const score = normalizedKeyword.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { path: route.path, label: route.label, score };
        }
      }
    }
  }

  return bestMatch ? { path: bestMatch.path, label: bestMatch.label } : null;
}

const SUGGESTIONS = [
  'Abrir meu CRM WhatsApp',
  'Ver minha agenda',
  'Criar uma tarefa',
  'Enviar email marketing',
  'Ver analytics',
  'Gerenciar cadastros',
];

const AIAssistantHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { color: hubColor } = useHubColor();
  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);
  const [detectedRoute, setDetectedRoute] = useState<{ path: string; label: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgColor = hubColor || DEFAULT_COLOR;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuário';
  const firstName = userName.split(' ')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Live detection as user types
  useEffect(() => {
    if (input.trim().length > 2) {
      const result = detectIntent(input);
      setDetectedRoute(result);
      setShowError(false);
    } else {
      setDetectedRoute(null);
      setShowError(false);
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const result = detectIntent(input);
    if (result) {
      navigate(result.path);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    const result = detectIntent(text);
    if (result) {
      setTimeout(() => navigate(result.path), 400);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 transition-colors duration-500"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-2xl text-center">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="text-white/70 text-lg md:text-xl mb-10"
        >
          O que gostaria de fazer hoje?
        </motion.p>

        {/* Input */}
        <motion.form
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="relative"
        >
          <div className="relative flex items-center bg-white/15 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl shadow-black/10 overflow-hidden transition-all duration-300 focus-within:bg-white/20 focus-within:border-white/40 focus-within:shadow-3xl">
            <Sparkles className="absolute left-5 h-5 w-5 text-white/50" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Digite o que deseja fazer..."
              className="flex-1 bg-transparent text-white placeholder:text-white/40 text-lg px-5 pl-14 py-5 outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="mr-3 p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200 active:scale-90"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Live detection hint */}
          <AnimatePresence>
            {detectedRoute && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 mt-3 text-sm text-white/70"
              >
                Pressione Enter para ir a{' '}
                <span className="font-semibold text-white">{detectedRoute.label}</span>
              </motion.div>
            )}
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 mt-3 text-sm text-white/70"
              >
                Não encontrei essa função. Tente algo como{' '}
                <span className="font-semibold text-white">"abrir whatsapp"</span> ou{' '}
                <span className="font-semibold text-white">"ver agenda"</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-2"
        >
          {SUGGESTIONS.map((text, i) => (
            <motion.button
              key={text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1 + i * 0.08 }}
              onClick={() => handleSuggestion(text)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/25 active:scale-95"
            >
              {text}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AIAssistantHome;
