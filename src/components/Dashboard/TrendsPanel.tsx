import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Sparkles, RefreshCw, Settings2, Save, Loader2, ArrowRight, Calendar, ChevronRight, ChevronLeft, Instagram, Globe, Package, MessageSquare, Target, Pen, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface TrendConfig {
  id?: string;
  niche: string;
  target_audience: string;
  keywords: string;
  language: string;
  country: string;
  company_description: string;
  instagram_url: string;
  facebook_url: string;
  products_services: string;
  brand_tone: string;
  content_goals: string[];
}

interface DailyTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  trend_date: string;
  relevance_score: number;
  used: boolean;
}

interface TrendsPanelProps {
  onCreateFromTrend?: (topic: string) => void;
}

const EMPTY_CONFIG: TrendConfig = {
  niche: '', target_audience: '', keywords: '', language: 'pt-BR', country: 'BR',
  company_description: '', instagram_url: '', facebook_url: '', products_services: '',
  brand_tone: 'profissional', content_goals: [],
};

const TONE_OPTIONS = [
  { value: 'profissional', label: 'Profissional', emoji: '💼' },
  { value: 'descontraido', label: 'Descontraído', emoji: '😄' },
  { value: 'educativo', label: 'Educativo', emoji: '📚' },
  { value: 'inspiracional', label: 'Inspiracional', emoji: '✨' },
  { value: 'tecnico', label: 'Técnico', emoji: '⚙️' },
  { value: 'divertido', label: 'Divertido', emoji: '🎉' },
];

const GOAL_OPTIONS = [
  { value: 'vendas', label: 'Gerar Vendas' },
  { value: 'autoridade', label: 'Construir Autoridade' },
  { value: 'engajamento', label: 'Aumentar Engajamento' },
  { value: 'educacao', label: 'Educar Audiência' },
  { value: 'branding', label: 'Fortalecer Marca' },
  { value: 'leads', label: 'Captar Leads' },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  trend: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  educativo: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  engajamento: { bg: 'rgba(236,72,153,0.12)', text: '#f472b6' },
  autoridade: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  dica: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  case: { bg: 'rgba(6,182,212,0.12)', text: '#22d3ee' },
  vendas: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
};

const STEPS = [
  { key: 'intro', title: 'Sobre seu negócio', icon: MessageSquare, desc: 'Conte sobre sua empresa' },
  { key: 'niche', title: 'Nicho & Público', icon: Target, desc: 'Defina seu mercado' },
  { key: 'social', title: 'Redes Sociais', icon: Instagram, desc: 'Seus perfis online' },
  { key: 'goals', title: 'Objetivos', icon: Sparkles, desc: 'O que quer alcançar' },
];

const TrendsPanel: React.FC<TrendsPanelProps> = ({ onCreateFromTrend }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<TrendConfig>(EMPTY_CONFIG);
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!cu) return;
      setCompanyId(cu.company_id);

      const [{ data: cfg }, { data: trs }] = await Promise.all([
        supabase.from('trend_configs').select('*').eq('company_id', cu.company_id).maybeSingle(),
        supabase.from('daily_trends').select('*').eq('company_id', cu.company_id).order('relevance_score', { ascending: false }).limit(20),
      ]);

      if (cfg && cfg.niche) {
        setConfig({
          id: cfg.id,
          niche: cfg.niche || '',
          target_audience: cfg.target_audience || '',
          keywords: cfg.keywords || '',
          language: cfg.language || 'pt-BR',
          country: cfg.country || 'BR',
          company_description: (cfg as any).company_description || '',
          instagram_url: (cfg as any).instagram_url || '',
          facebook_url: (cfg as any).facebook_url || '',
          products_services: (cfg as any).products_services || '',
          brand_tone: (cfg as any).brand_tone || 'profissional',
          content_goals: (cfg as any).content_goals || [],
        });
        setHasConfig(true);
      } else {
        setHasConfig(false);
        setShowSetup(false);
      }

      setTrends((trs as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveConfig = async (andGenerate = false) => {
    if (!user || !companyId) return;
    if (!config.niche.trim()) {
      toast.error('Informe seu nicho/setor');
      return;
    }
    setSavingConfig(true);
    try {
      const payload: any = {
        niche: config.niche,
        target_audience: config.target_audience,
        keywords: config.keywords,
        language: config.language,
        country: config.country,
        company_description: config.company_description,
        instagram_url: config.instagram_url,
        facebook_url: config.facebook_url,
        products_services: config.products_services,
        brand_tone: config.brand_tone,
        content_goals: config.content_goals,
      };

      if (config.id) {
        const { error } = await supabase.from('trend_configs').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('trend_configs').insert({
          company_id: companyId,
          user_id: user.id,
          ...payload,
        }).select().single();
        if (error) throw error;
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
      }
      setHasConfig(true);
      setShowSetup(false);
      toast.success('Configuração salva!');
      if (andGenerate) generateTrends();
    } catch (err: any) {
      console.error('Save config error:', err);
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSavingConfig(false);
    }
  };

  const generateTrends = async () => {
    if (!config.niche.trim()) {
      setShowSetup(true);
      toast.error('Configure seu nicho primeiro');
      return;
    }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-trends`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: '{}',
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro');
      toast.success(`${result.count} trends geradas!`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar trends');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = (trend: DailyTrend) => {
    if (onCreateFromTrend) {
      onCreateFromTrend(trend.title + ': ' + trend.description);
    }
  };

  const toggleGoal = (goal: string) => {
    setConfig(prev => ({
      ...prev,
      content_goals: prev.content_goals.includes(goal)
        ? prev.content_goals.filter(g => g !== goal)
        : [...prev.content_goals, goal],
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8B5CF6', animation: `page-dot-pulse 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  // === WELCOME SCREEN (no config yet, setup not started) ===
  if (!hasConfig && !showSetup) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
            <TrendingUp className="w-8 h-8" style={{ color: '#a78bfa' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Trends</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Receba diariamente ideias de conteúdo personalizadas para o seu negócio, baseadas em tendências reais do seu mercado.
          </p>
          <button
            onClick={() => { setShowSetup(true); setSetupStep(0); }}
            className="px-8 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            Começar configuração
          </button>
        </motion.div>
      </div>
    );
  }

  // === ONBOARDING SETUP ===
  if (showSetup) {
    const step = STEPS[setupStep];
    const canAdvance = setupStep === 0
      ? config.company_description.trim().length > 0
      : setupStep === 1
        ? config.niche.trim().length > 0
        : true;

    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex-1 flex items-center gap-1">
                <div
                  className="h-1 rounded-full flex-1 transition-all duration-500"
                  style={{
                    backgroundColor: i <= setupStep ? '#8B5CF6' : 'rgba(255,255,255,0.06)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <motion.div
            key={setupStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                <step.icon className="w-4.5 h-4.5" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-0.5">Passo {setupStep + 1} de {STEPS.length}</p>
                <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              </div>
            </div>
            <p className="text-sm text-white/40 mb-6 ml-12">{step.desc}</p>

            {/* Step content */}
            <div className="space-y-4 ml-12">
              {setupStep === 0 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Conte sobre sua empresa *</label>
                    <textarea
                      value={config.company_description}
                      onChange={e => setConfig(p => ({ ...p, company_description: e.target.value }))}
                      placeholder="Ex: Somos uma clínica odontológica especializada em estética dental, oferecendo lentes de contato, clareamento e implantes. Atendemos pacientes que buscam um sorriso perfeito com tecnologia de ponta..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors resize-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Produtos / Serviços</label>
                    <input
                      value={config.products_services}
                      onChange={e => setConfig(p => ({ ...p, products_services: e.target.value }))}
                      placeholder="Ex: Lentes de contato dental, clareamento, implantes, próteses"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                </>
              )}

              {setupStep === 1 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Nicho / Setor *</label>
                    <input
                      value={config.niche}
                      onChange={e => setConfig(p => ({ ...p, niche: e.target.value }))}
                      placeholder="Ex: Odontologia Estética, Marketing Digital, Fitness"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Público-alvo</label>
                    <input
                      value={config.target_audience}
                      onChange={e => setConfig(p => ({ ...p, target_audience: e.target.value }))}
                      placeholder="Ex: Mulheres 25-45 anos, classe A/B, preocupadas com estética"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Palavras-chave</label>
                    <input
                      value={config.keywords}
                      onChange={e => setConfig(p => ({ ...p, keywords: e.target.value }))}
                      placeholder="Ex: lentes de contato, sorriso perfeito, harmonização"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                </>
              )}

              {setupStep === 2 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </label>
                    <input
                      value={config.instagram_url}
                      onChange={e => setConfig(p => ({ ...p, instagram_url: e.target.value }))}
                      placeholder="@seuinstagram"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Facebook / Site
                    </label>
                    <input
                      value={config.facebook_url}
                      onChange={e => setConfig(p => ({ ...p, facebook_url: e.target.value }))}
                      placeholder="https://facebook.com/suapagina ou site"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Tom de comunicação</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TONE_OPTIONS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setConfig(p => ({ ...p, brand_tone: t.value }))}
                          className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                          style={{
                            backgroundColor: config.brand_tone === t.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                            borderColor: config.brand_tone === t.value ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                            color: config.brand_tone === t.value ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {setupStep === 3 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-medium">O que você quer alcançar com seu conteúdo?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GOAL_OPTIONS.map(g => {
                        const active = config.content_goals.includes(g.value);
                        return (
                          <button
                            key={g.value}
                            onClick={() => toggleGoal(g.value)}
                            className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                            style={{
                              backgroundColor: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                              borderColor: active ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                              color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors"
                              style={{
                                backgroundColor: active ? '#8B5CF6' : 'transparent',
                                border: active ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                              }}
                            >
                              {active && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 ml-12">
              <button
                onClick={() => setupStep > 0 ? setSetupStep(s => s - 1) : (hasConfig && setShowSetup(false))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                {setupStep > 0 ? 'Voltar' : (hasConfig ? 'Cancelar' : '')}
              </button>
              {setupStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setSetupStep(s => s + 1)}
                  disabled={!canAdvance}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-30"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  Continuar
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => saveConfig(true)}
                  disabled={savingConfig || !config.niche.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-30"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Salvar e Gerar Trends
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // === TRENDS DASHBOARD ===
  return (
    <div className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trends</h1>
            <p className="text-xs text-white/30">Ideias de conteúdo para <span className="text-white/50">{config.niche}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowSetup(true); setSetupStep(0); }}
            className="p-2.5 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Reconfigurar"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={generateTrends}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? 'Gerando...' : 'Atualizar Trends'}
          </button>
        </div>
      </div>

      {/* Trends list */}
      {trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
            <Sparkles className="w-8 h-8" style={{ color: 'rgba(167,139,250,0.5)' }} />
          </div>
          <h3 className="text-lg font-semibold text-white/70 mb-2">Pronto para gerar suas trends!</h3>
          <p className="text-sm text-white/30 max-w-sm mb-6">
            Seu nicho está configurado. Clique abaixo para buscar ideias de conteúdo personalizadas.
          </p>
          <button
            onClick={generateTrends}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Gerando...' : 'Gerar Trends Agora'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trends.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-white/20" />
              <span className="text-xs text-white/20">
                {new Date(trends[0].trend_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[10px] text-white/15">•</span>
              <span className="text-xs text-white/20">{trends.length} ideias</span>
            </div>
          )}
          {trends.map((trend, i) => {
            const style = CATEGORY_STYLES[trend.category] || { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' };
            return (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="group rounded-xl border border-white/[0.05] hover:border-white/[0.1] p-4 transition-all cursor-default"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{ color: style.text, backgroundColor: style.bg }}
                      >
                        {trend.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white/90 mb-1">{trend.title}</h3>
                    <p className="text-xs text-white/35 leading-relaxed">{trend.description}</p>
                  </div>
                  <button
                    onClick={() => handleCreate(trend)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}
                  >
                    <Pen className="w-3 h-3" />
                    Criar Post
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrendsPanel;
