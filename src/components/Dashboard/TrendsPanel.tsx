import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Sparkles, RefreshCw, Settings2, Save, Loader2, Zap, ArrowRight, Calendar } from 'lucide-react';
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

const CATEGORY_COLORS: Record<string, string> = {
  trend: '#f59e0b',
  educativo: '#3b82f6',
  engajamento: '#ec4899',
  autoridade: '#8b5cf6',
  dica: '#10b981',
  case: '#06b6d4',
};

const TrendsPanel: React.FC<TrendsPanelProps> = ({ onCreateFromTrend }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<TrendConfig>({
    niche: '', target_audience: '', keywords: '', language: 'pt-BR', country: 'BR',
  });
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

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

      if (cfg) {
        setConfig({
          id: cfg.id,
          niche: cfg.niche || '',
          target_audience: cfg.target_audience || '',
          keywords: cfg.keywords || '',
          language: cfg.language || 'pt-BR',
          country: cfg.country || 'BR',
        });
      } else {
        setShowConfig(true);
      }

      setTrends((trs as any[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveConfig = async () => {
    if (!user || !companyId) return;
    if (!config.niche.trim()) {
      toast.error('Informe seu nicho/setor');
      return;
    }
    setSavingConfig(true);
    try {
      if (config.id) {
        await supabase.from('trend_configs').update({
          niche: config.niche,
          target_audience: config.target_audience,
          keywords: config.keywords,
          language: config.language,
          country: config.country,
        }).eq('id', config.id);
      } else {
        const { data } = await supabase.from('trend_configs').insert({
          company_id: companyId,
          user_id: user.id,
          niche: config.niche,
          target_audience: config.target_audience,
          keywords: config.keywords,
          language: config.language,
          country: config.country,
        }).select().single();
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
      }
      toast.success('Configuração salva!');
      setShowConfig(false);
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSavingConfig(false);
    }
  };

  const generateTrends = async () => {
    if (!config.niche.trim()) {
      setShowConfig(true);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trends</h1>
            <p className="text-xs text-white/40">Ideias de conteúdo baseadas em tendências</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Configurar nicho"
          >
            <Settings2 className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={generateTrends}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? 'Gerando...' : 'Gerar Trends'}
          </button>
        </div>
      </div>

      {/* Config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl border border-white/[0.08] p-5" style={{ backgroundColor: '#111116' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                Configuração do Nicho
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nicho / Setor *</label>
                  <input
                    value={config.niche}
                    onChange={e => setConfig(p => ({ ...p, niche: e.target.value }))}
                    placeholder="Ex: Odontologia, Marketing Digital, Fitness"
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 border border-white/[0.08] focus:border-amber-500/50 outline-none transition-colors"
                    style={{ backgroundColor: '#0a0a0f' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Público-alvo</label>
                  <input
                    value={config.target_audience}
                    onChange={e => setConfig(p => ({ ...p, target_audience: e.target.value }))}
                    placeholder="Ex: Mulheres 25-40 anos, empreendedores"
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 border border-white/[0.08] focus:border-amber-500/50 outline-none transition-colors"
                    style={{ backgroundColor: '#0a0a0f' }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-white/40 mb-1 block">Palavras-chave</label>
                  <input
                    value={config.keywords}
                    onChange={e => setConfig(p => ({ ...p, keywords: e.target.value }))}
                    placeholder="Ex: lentes de contato, implantes, clareamento"
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 border border-white/[0.08] focus:border-amber-500/50 outline-none transition-colors"
                    style={{ backgroundColor: '#0a0a0f' }}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500/20 hover:bg-amber-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trends list */}
      {trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #f59e0b20, #ef444420)' }}>
            <Sparkles className="w-8 h-8 text-amber-400/60" />
          </div>
          <h3 className="text-lg font-semibold text-white/70 mb-2">Nenhuma trend ainda</h3>
          <p className="text-sm text-white/30 max-w-sm mb-6">
            {config.niche
              ? 'Clique em "Gerar Trends" para buscar ideias de conteúdo personalizadas para o seu nicho.'
              : 'Configure seu nicho primeiro e depois gere suas trends diárias.'}
          </p>
          <button
            onClick={config.niche ? generateTrends : () => setShowConfig(true)}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {config.niche ? 'Gerar Trends Agora' : 'Configurar Nicho'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trends.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-white/25" />
              <span className="text-xs text-white/25">
                {new Date(trends[0].trend_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
          {trends.map((trend, i) => {
            const catColor = CATEGORY_COLORS[trend.category] || '#6b7280';
            return (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-white/[0.06] hover:border-white/[0.12] p-4 transition-all cursor-default"
                style={{ backgroundColor: '#111116' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ color: catColor, backgroundColor: catColor + '15' }}
                      >
                        {trend.category}
                      </span>
                      <span className="text-[10px] text-white/20">
                        Score: {trend.relevance_score}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{trend.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{trend.description}</p>
                  </div>
                  <button
                    onClick={() => handleCreate(trend)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer opacity-60 group-hover:opacity-100"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Criar Post
                    <ArrowRight className="w-3 h-3" />
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
