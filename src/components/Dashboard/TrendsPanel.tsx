import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Sparkles, RefreshCw, Settings2, Loader2, Calendar, ChevronRight, ChevronLeft, Instagram, Globe, Target, Pen, Check, Upload, X, Palette, Image, MessageSquare, ChevronDown, Clock, LayoutGrid, FileText, Copy } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { extractColorsFromImage } from '@/utils/extractColorsFromImage';
import TrendCreateDialog from './TrendCreateDialog';

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
  logo_url: string;
  logo_dark_url: string;
  brand_colors: string[];
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
  metadata?: {
    news_hook?: string;
    format?: string;
    card_text?: string;
    card_texts?: string[];
    caption?: string;
    image_url?: string;
  };
}

export interface TrendData {
  topic: string;
  format: string;
  cardText: string;
  cardTexts: string[];
  caption: string;
  styleId?: string;
  useBrandColors?: boolean;
  logoUrl?: string;
  logoDarkUrl?: string;
  brandColors?: string[];
  imageUrl?: string;
  imageSearchQuery?: string;
}

interface TrendsPanelProps {
  onCreateFromTrend?: (topic: string, trendData?: TrendData) => void;
}

const EMPTY_CONFIG: TrendConfig = {
  niche: '', target_audience: '', keywords: '', language: 'pt-BR', country: 'BR',
  company_description: '', instagram_url: '', facebook_url: '', products_services: '',
  brand_tone: 'profissional', content_goals: [], logo_url: '', logo_dark_url: '', brand_colors: [],
};

const NICHE_OPTIONS = [
  'Odontologia', 'Medicina / Saúde', 'Estética / Beleza', 'Fitness / Academia',
  'Marketing Digital', 'Tecnologia / SaaS', 'Gastronomia / Restaurante', 'Moda / Fashion',
  'Imobiliário', 'Advocacia / Jurídico', 'Educação / Cursos', 'E-commerce',
  'Arquitetura / Design', 'Fotografia / Audiovisual', 'Coaching / Desenvolvimento Pessoal',
  'Pet / Veterinário', 'Contabilidade / Finanças', 'Automotivo', 'Agronegócio',
  'Turismo / Hotelaria',
];

const TONE_OPTIONS = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'descontraido', label: 'Descontraído' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'inspiracional', label: 'Inspiracional' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'divertido', label: 'Divertido' },
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
  { key: 'intro', title: 'Sobre seu negócio', icon: MessageSquare, desc: 'Descreva o que sua empresa faz' },
  { key: 'niche', title: 'Nicho & Público', icon: Target, desc: 'Seu setor e público-alvo' },
  { key: 'brand', title: 'Identidade Visual', icon: Palette, desc: 'Logomarca e cores da marca' },
  { key: 'social', title: 'Redes & Tom', icon: Instagram, desc: 'Perfis e tom de comunicação' },
  { key: 'goals', title: 'Objetivos', icon: Sparkles, desc: 'O que quer alcançar' },
];

const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/15 border border-white/[0.08] focus:border-purple-500/40 outline-none transition-colors resize-none";
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.03)' };

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
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);
  const [customNiche, setCustomNiche] = useState(false);
  const [newColor, setNewColor] = useState('#8B5CF6');
  const [uploadingLogo, setUploadingLogo] = useState<'light' | 'dark' | null>(null);
  const [autoDaily, setAutoDaily] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'older'>('today');
  const [olderPage, setOlderPage] = useState(0);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [dialogTrend, setDialogTrend] = useState<TrendData | null>(null);
  const nicheRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nicheRef.current && !nicheRef.current.contains(e.target as Node)) {
        setNicheDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: cu, error: companyError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (companyError) throw companyError;
      if (!cu) return;
      setCompanyId(cu.company_id);

      const [{ data: cfg, error: configError }, { data: trs, error: trendsError }] = await Promise.all([
        supabase.from('trend_configs').select('*').eq('company_id', cu.company_id).maybeSingle(),
        supabase.from('daily_trends').select('*').eq('company_id', cu.company_id).order('trend_date', { ascending: false }).order('relevance_score', { ascending: false }).limit(200),
      ]);

      if (configError) throw configError;
      if (trendsError) throw trendsError;

      if (cfg && cfg.niche) {
        setConfig({
          id: cfg.id, niche: cfg.niche || '', target_audience: cfg.target_audience || '',
          keywords: cfg.keywords || '', language: cfg.language || 'pt-BR', country: cfg.country || 'BR',
          company_description: (cfg as any).company_description || '',
          instagram_url: (cfg as any).instagram_url || '', facebook_url: (cfg as any).facebook_url || '',
          products_services: (cfg as any).products_services || '',
          brand_tone: (cfg as any).brand_tone || 'profissional',
          content_goals: (cfg as any).content_goals || [],
          logo_url: (cfg as any).logo_url || '', logo_dark_url: (cfg as any).logo_dark_url || '',
          brand_colors: (cfg as any).brand_colors || [],
        });
        setAutoDaily((cfg as any).auto_daily ?? false);
        setHasConfig(true);
        if (!NICHE_OPTIONS.includes(cfg.niche)) setCustomNiche(true);
      } else {
        setHasConfig(false);
        setShowSetup(false);
      }
      setTrends((trs as any[]) || []);
    } catch (e: any) {
      console.error('Fetch trends error:', e);
      toast.error('Erro ao carregar trends: ' + (e?.message || 'desconhecido'));
      setTrends([]);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uploadLogo = async (file: File, type: 'light' | 'dark') => {
    if (!user || !companyId) return;
    setUploadingLogo(type);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/trend-${type}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      setConfig(p => ({ ...p, [type === 'light' ? 'logo_url' : 'logo_dark_url']: publicUrl }));
      try {
        const colors = await extractColorsFromImage(publicUrl, 6);
        if (colors.length > 0) {
          setConfig(p => {
            const merged = [...new Set([...p.brand_colors, ...colors])].slice(0, 6);
            return { ...p, brand_colors: merged };
          });
          toast.success(`${colors.length} cor(es) extraída(s) da logo`);
        }
      } catch { /* ignore */ }
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err?.message || ''));
    } finally {
      setUploadingLogo(null);
    }
  };

  const addColor = () => {
    if (config.brand_colors.length >= 6) return;
    if (!config.brand_colors.includes(newColor)) {
      setConfig(p => ({ ...p, brand_colors: [...p.brand_colors, newColor] }));
    }
  };

  const removeColor = (color: string) => {
    setConfig(p => ({ ...p, brand_colors: p.brand_colors.filter(c => c !== color) }));
  };

  const saveConfig = async (andGenerate = false) => {
    if (!user || !companyId) return;
    if (!config.niche.trim()) { toast.error('Selecione ou informe seu nicho'); return; }
    setSavingConfig(true);
    try {
      const payload: any = {
        niche: config.niche, target_audience: config.target_audience,
        keywords: config.keywords, language: config.language, country: config.country,
        company_description: config.company_description, instagram_url: config.instagram_url,
        facebook_url: config.facebook_url, products_services: config.products_services,
        brand_tone: config.brand_tone, content_goals: config.content_goals,
        logo_url: config.logo_url, logo_dark_url: config.logo_dark_url,
        brand_colors: config.brand_colors,
      };
      if (config.id) {
        const { error } = await supabase.from('trend_configs').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('trend_configs').insert({
          company_id: companyId, user_id: user.id, ...payload,
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
    } finally { setSavingConfig(false); }
  };

  const generateTrends = async () => {
    if (!config.niche.trim()) { setShowSetup(true); toast.error('Configure seu nicho primeiro'); return; }
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-trends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: '{}',
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro');
      toast.success(`${result.count} trends geradas! (1 crédito consumido)`);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Erro ao gerar trends'); } finally { setGenerating(false); }
  };

  const handleCreate = (trend: DailyTrend) => {
    const trendData: TrendData = {
      topic: trend.title + ': ' + trend.description,
      format: trend.metadata?.format || 'estatico',
      cardText: trend.metadata?.card_text || '',
      cardTexts: trend.metadata?.card_texts || [],
      caption: trend.metadata?.caption || '',
    };
    setDialogTrend(trendData);
  };

  const handleDialogConfirm = (td: TrendData, styleId: string, useBrandColors: boolean) => {
    setDialogTrend(null);
    if (onCreateFromTrend) {
      // Pass style and brand info along with trend data
      const enrichedTrend: TrendData = {
        ...td,
        styleId,
        useBrandColors,
        logoUrl: config.logo_url || '',
        logoDarkUrl: config.logo_dark_url || '',
        brandColors: useBrandColors ? config.brand_colors : [],
      } as any;
      onCreateFromTrend(td.topic, enrichedTrend);
    }
  };

  const copyCaption = (caption: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(caption);
    toast.success('Legenda copiada!');
  };

  const toggleGoal = (goal: string) => {
    setConfig(prev => ({
      ...prev,
      content_goals: prev.content_goals.includes(goal)
        ? prev.content_goals.filter(g => g !== goal)
        : [...prev.content_goals, goal],
    }));
  };

  const toggleAutoDaily = async (checked: boolean) => {
    if (!config.id) return;
    setTogglingAuto(true);
    try {
      const { error } = await supabase.from('trend_configs').update({ auto_daily: checked } as any).eq('id', config.id);
      if (error) throw error;
      setAutoDaily(checked);
      toast.success(checked ? 'Atualização automática ativada' : 'Desativada');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || ''));
    } finally {
      setTogglingAuto(false);
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];
  const { todayTrends, olderTrends } = useMemo(() => {
    const todayList = trends.filter(t => t.trend_date === todayDate);
    const olderList = trends.filter(t => t.trend_date !== todayDate);
    return { todayTrends: todayList, olderTrends: olderList };
  }, [trends, todayDate]);

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

  // === WELCOME SCREEN ===
  if (!hasConfig && !showSetup) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
            <TrendingUp className="w-8 h-8" style={{ color: '#a78bfa' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Trends</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Receba diariamente ideias de conteúdo personalizadas para o seu negócio, baseadas em tendências reais do seu mercado.
          </p>
          <button onClick={() => { setShowSetup(true); setSetupStep(0); }} className="px-8 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 cursor-pointer" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
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
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex-1">
                <div className="h-1 rounded-full transition-all duration-500" style={{ backgroundColor: i <= setupStep ? '#8B5CF6' : 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>

          <motion.div key={setupStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
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

            <div className="space-y-4 ml-12">
              {setupStep === 0 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Conte sobre sua empresa *</label>
                    <textarea value={config.company_description} onChange={e => setConfig(p => ({ ...p, company_description: e.target.value }))}
                      placeholder="Ex: Somos uma clínica odontológica especializada em estética dental..."
                      rows={4} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Produtos / Serviços</label>
                    <input value={config.products_services} onChange={e => setConfig(p => ({ ...p, products_services: e.target.value }))}
                      placeholder="Ex: Lentes de contato dental, clareamento, implantes" className={inputCls} style={inputStyle} />
                  </div>
                </>
              )}

              {setupStep === 1 && (
                <>
                  <div ref={nicheRef} className="relative">
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Nicho / Setor *</label>
                    {customNiche ? (
                      <div className="flex gap-2">
                        <input value={config.niche} onChange={e => setConfig(p => ({ ...p, niche: e.target.value }))}
                          placeholder="Digite seu nicho personalizado" className={inputCls + ' flex-1'} style={inputStyle} autoFocus />
                        <button onClick={() => { setCustomNiche(false); setConfig(p => ({ ...p, niche: '' })); }}
                          className="px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/50 border border-white/[0.08] transition-colors cursor-pointer" style={inputStyle}>
                          Voltar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setNicheDropdownOpen(!nicheDropdownOpen)}
                          className={inputCls + ' flex items-center justify-between cursor-pointer text-left'}
                          style={inputStyle}>
                          <span className={config.niche ? 'text-white' : 'text-white/15'}>
                            {config.niche || 'Selecione seu nicho'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${nicheDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {nicheDropdownOpen && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl max-h-60 overflow-y-auto" style={{ backgroundColor: '#141418' }}>
                            {NICHE_OPTIONS.map(n => (
                              <button key={n} onClick={() => { setConfig(p => ({ ...p, niche: n })); setNicheDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${config.niche === n ? 'text-purple-400 bg-purple-500/10' : 'text-white/60 hover:text-white hover:bg-white/[0.04]'}`}>
                                {n}
                              </button>
                            ))}
                            <button onClick={() => { setCustomNiche(true); setNicheDropdownOpen(false); setConfig(p => ({ ...p, niche: '' })); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-white/40 hover:text-white hover:bg-white/[0.04] border-t border-white/[0.06] cursor-pointer">
                              Outro (digitar manualmente)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Público-alvo</label>
                    <input value={config.target_audience} onChange={e => setConfig(p => ({ ...p, target_audience: e.target.value }))}
                      placeholder="Ex: Mulheres 25-45 anos, classe A/B" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Palavras-chave</label>
                    <input value={config.keywords} onChange={e => setConfig(p => ({ ...p, keywords: e.target.value }))}
                      placeholder="Ex: lentes de contato, sorriso perfeito, harmonização" className={inputCls} style={inputStyle} />
                  </div>
                </>
              )}

              {setupStep === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block font-medium">Logo (clara)</label>
                      <div className="relative rounded-xl border border-white/[0.08] overflow-hidden aspect-[3/2] flex items-center justify-center cursor-pointer hover:border-purple-500/30 transition-colors" style={inputStyle}>
                        {config.logo_url ? (
                          <>
                            <img src={config.logo_url} alt="Logo" className="max-h-full max-w-full object-contain p-3" />
                            <button onClick={() => setConfig(p => ({ ...p, logo_url: '' }))}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center gap-1.5 cursor-pointer p-4 w-full h-full justify-center">
                            {uploadingLogo === 'light' ? <Loader2 className="w-5 h-5 text-white/20 animate-spin" /> : <Upload className="w-5 h-5 text-white/15" />}
                            <span className="text-[10px] text-white/20">Enviar logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0], 'light'); }} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block font-medium">Logo (escura)</label>
                      <div className="relative rounded-xl border border-white/[0.08] overflow-hidden aspect-[3/2] flex items-center justify-center cursor-pointer hover:border-purple-500/30 transition-colors bg-white/90">
                        {config.logo_dark_url ? (
                          <>
                            <img src={config.logo_dark_url} alt="Logo escura" className="max-h-full max-w-full object-contain p-3" />
                            <button onClick={() => setConfig(p => ({ ...p, logo_dark_url: '' }))}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center gap-1.5 cursor-pointer p-4 w-full h-full justify-center">
                            {uploadingLogo === 'dark' ? <Loader2 className="w-5 h-5 text-black/20 animate-spin" /> : <Upload className="w-5 h-5 text-black/15" />}
                            <span className="text-[10px] text-black/30">Enviar logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0], 'dark'); }} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-medium">Cores da marca</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {config.brand_colors.map(c => (
                        <button key={c} onClick={() => removeColor(c)}
                          className="w-9 h-9 rounded-lg border-2 border-white/10 hover:border-red-400/50 transition-colors relative group cursor-pointer"
                          style={{ backgroundColor: c }} title={`Remover ${c}`}>
                          <X className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 group-hover:opacity-100 drop-shadow-md" />
                        </button>
                      ))}
                      {config.brand_colors.length < 6 && (
                        <div className="flex items-center gap-1">
                          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                            className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent" />
                          <button onClick={addColor}
                            className="text-[10px] text-white/30 hover:text-white/60 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer">
                            Adicionar
                          </button>
                        </div>
                      )}
                    </div>
                    {config.brand_colors.length === 0 && (
                      <p className="text-[10px] text-white/15 mt-1.5">Opcional — selecione até 6 cores</p>
                    )}
                  </div>
                </>
              )}

              {setupStep === 3 && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </label>
                    <input value={config.instagram_url} onChange={e => setConfig(p => ({ ...p, instagram_url: e.target.value }))}
                      placeholder="@seuinstagram" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Facebook / Site
                    </label>
                    <input value={config.facebook_url} onChange={e => setConfig(p => ({ ...p, facebook_url: e.target.value }))}
                      placeholder="https://facebook.com/suapagina ou site" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block font-medium">Tom de comunicação</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TONE_OPTIONS.map(t => (
                        <button key={t.value} onClick={() => setConfig(p => ({ ...p, brand_tone: t.value }))}
                          className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                          style={{
                            backgroundColor: config.brand_tone === t.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                            borderColor: config.brand_tone === t.value ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                            color: config.brand_tone === t.value ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                          }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {setupStep === 4 && (
                <div>
                  <label className="text-xs text-white/50 mb-2 block font-medium">O que você quer alcançar com seu conteúdo?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map(g => {
                      const active = config.content_goals.includes(g.value);
                      return (
                        <button key={g.value} onClick={() => toggleGoal(g.value)}
                          className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer border"
                          style={{
                            backgroundColor: active ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                            borderColor: active ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                            color: active ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                          }}>
                          <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors"
                            style={{ backgroundColor: active ? '#8B5CF6' : 'transparent', border: active ? 'none' : '1.5px solid rgba(255,255,255,0.15)' }}>
                            {active && <Check className="w-3 h-3 text-white" />}
                          </div>
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-8 ml-12">
              <button onClick={() => setupStep > 0 ? setSetupStep(s => s - 1) : (hasConfig && setShowSetup(false))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
                {setupStep > 0 ? 'Voltar' : (hasConfig ? 'Cancelar' : '')}
              </button>
              {setupStep < STEPS.length - 1 ? (
                <button onClick={() => setSetupStep(s => s + 1)} disabled={!canAdvance}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-30"
                  style={{ backgroundColor: '#8B5CF6' }}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => saveConfig(true)} disabled={savingConfig || !config.niche.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer disabled:opacity-30"
                  style={{ backgroundColor: '#8B5CF6' }}>
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

  const ITEMS_PER_PAGE = 9;
  const displayedToday = todayTrends.slice(0, ITEMS_PER_PAGE);
  const olderPages = Math.ceil(olderTrends.length / ITEMS_PER_PAGE);
  const displayedOlder = olderTrends.slice(olderPage * ITEMS_PER_PAGE, (olderPage + 1) * ITEMS_PER_PAGE);

  const getFormatBadge = (trend: DailyTrend) => {
    const format = trend.metadata?.format;
    if (format === 'carrossel') return { label: 'Carrossel', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' };
    if (format === 'estatico') return { label: 'Estático', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' };
    return null;
  };

  const renderCard = (trend: DailyTrend, i: number) => {
    const catStyle = CATEGORY_STYLES[trend.category] || { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' };
    const isNewsHook = trend.source === 'expert_news_ai';
    const formatBadge = getFormatBadge(trend);
    const isExpanded = expandedCard === trend.id;
    const cardText = trend.metadata?.card_text;
    const cardTexts = trend.metadata?.card_texts;
    const isCarousel = trend.metadata?.format === 'carrossel';
    const caption = trend.metadata?.caption;
    const imageUrl = trend.metadata?.image_url;

    return (
      <motion.div key={trend.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03, duration: 0.35 }}
        className="group rounded-2xl border border-white/[0.06] hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden flex flex-col"
        style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
        
        {/* News thumbnail */}
        {imageUrl && (
          <div className="w-full h-32 overflow-hidden relative">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d15] via-transparent to-transparent" />
          </div>
        )}

        {/* Top accent bar (only when no image) */}
        {!imageUrl && <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${catStyle.text}40, transparent)` }} />}
        
        <div className="p-5 flex-1 flex flex-col">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
              style={{ color: catStyle.text, backgroundColor: catStyle.bg }}>
              {trend.category}
            </span>
            {isNewsHook && (
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ color: '#fbbf24', backgroundColor: 'rgba(245,158,11,0.08)' }}>
                News
              </span>
            )}
            {formatBadge && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-1"
                style={{ color: formatBadge.color, backgroundColor: formatBadge.bg }}>
                <LayoutGrid className="w-2.5 h-2.5" />
                {formatBadge.label}
              </span>
            )}
          </div>

          <h3 className="text-[14px] font-semibold text-white/90 mb-2 leading-snug">{trend.title}</h3>
          <p className="text-xs text-white/35 leading-relaxed line-clamp-2 mb-3">{trend.description}</p>

          {/* Card text preview */}
          {isCarousel && cardTexts && cardTexts.length > 0 ? (
            <div className="rounded-lg px-3 py-2 mb-3 border border-white/[0.04]" style={{ backgroundColor: 'rgba(139,92,246,0.04)' }}>
              <p className="text-[10px] text-white/20 mb-1.5 uppercase tracking-wider font-medium">Slides ({cardTexts.length})</p>
              <div className="space-y-1">
                {cardTexts.map((ct, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-[9px] text-purple-400/40 font-mono mt-px shrink-0">{idx + 1}.</span>
                    <p className="text-[11px] text-white/55 leading-snug">{ct}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : cardText ? (
            <div className="rounded-lg px-3 py-2 mb-3 border border-white/[0.04]" style={{ backgroundColor: 'rgba(139,92,246,0.04)' }}>
              <p className="text-[10px] text-white/20 mb-1 uppercase tracking-wider font-medium">Texto da arte</p>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{cardText}</p>
            </div>
          ) : null}

          {/* Caption preview */}
          {caption && (
            <div className="rounded-lg px-3 py-2 mb-3 border border-white/[0.04]" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium">Legenda</p>
                <button onClick={(e) => copyCaption(caption, e)}
                  className="text-white/20 hover:text-white/50 transition-colors cursor-pointer p-0.5" title="Copiar legenda">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className={`text-[11px] text-white/45 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{caption}</p>
              {caption.length > 100 && (
                <button onClick={(e) => { e.stopPropagation(); setExpandedCard(isExpanded ? null : trend.id); }}
                  className="text-[10px] text-purple-400/60 hover:text-purple-400 mt-1 cursor-pointer">
                  {isExpanded ? 'ver menos' : 'ver mais'}
                </button>
              )}
            </div>
          )}

          {/* Action */}
          <div className="mt-auto pt-2">
            <button onClick={() => handleCreate(trend)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-500/5"
              style={{ color: '#c4b5fd' }}>
              <Sparkles className="w-3 h-3" />
              Criar conteúdo
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // === TRENDS DASHBOARD ===
  return (
    <div className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Trends</h1>
          <p className="text-[11px] text-white/25 mt-0.5">
            {config.niche} · {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Discrete auto-daily indicator */}
          <div className="flex items-center gap-1.5 mr-1">
            <Switch checked={autoDaily} onCheckedChange={toggleAutoDaily} disabled={togglingAuto} className="scale-75" />
            <span className="text-[10px] text-white/20">Auto</span>
          </div>
          <button onClick={() => { setShowSetup(true); setSetupStep(0); }}
            className="p-2 rounded-xl text-white/20 hover:text-white/40 hover:bg-white/[0.03] transition-colors cursor-pointer" title="Configurar">
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={generateTrends} disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white transition-all cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#8B5CF6' }}>
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {generating ? 'Gerando...' : 'Buscar ideias'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-5 border-b border-white/[0.06] pb-px">
        <button onClick={() => setActiveTab('today')}
          className="text-xs font-medium pb-2.5 transition-all cursor-pointer border-b-2"
          style={{
            borderColor: activeTab === 'today' ? '#8B5CF6' : 'transparent',
            color: activeTab === 'today' ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
          }}>
          Hoje ({todayTrends.length})
        </button>
        <button onClick={() => { setActiveTab('older'); setOlderPage(0); }}
          className="text-xs font-medium pb-2.5 transition-all cursor-pointer border-b-2"
          style={{
            borderColor: activeTab === 'older' ? '#8B5CF6' : 'transparent',
            color: activeTab === 'older' ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
          }}>
          Anteriores ({olderTrends.length})
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'today' ? (
        <>
          {todayTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(139,92,246,0.08)' }}>
                <Sparkles className="w-6 h-6" style={{ color: 'rgba(167,139,250,0.4)' }} />
              </div>
              <h3 className="text-sm font-medium text-white/60 mb-1.5">Sem ideias para hoje</h3>
              <p className="text-xs text-white/25 max-w-xs mb-5">Clique em "Buscar ideias" para gerar sugestões baseadas nas notícias de hoje.</p>
              <button onClick={generateTrends} disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#8B5CF6' }}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Gerando...' : 'Buscar ideias'}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {displayedToday.map((trend, i) => renderCard(trend, i))}
            </div>
          )}

          {todayTrends.length > ITEMS_PER_PAGE && (
            <p className="text-xs text-white/15 text-center mt-4">
              +{todayTrends.length - ITEMS_PER_PAGE} ideias em "Anteriores"
            </p>
          )}
        </>
      ) : (
        <>
          {olderTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-xs text-white/25">Nenhuma ideia anterior.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {displayedOlder.map((trend, i) => renderCard(trend, i))}
              </div>

              {olderPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => setOlderPage(p => Math.max(0, p - 1))} disabled={olderPage === 0}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-white/25">{olderPage + 1} / {olderPages}</span>
                  <button onClick={() => setOlderPage(p => Math.min(olderPages - 1, p + 1))} disabled={olderPage >= olderPages - 1}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <TrendCreateDialog
        open={!!dialogTrend}
        onClose={() => setDialogTrend(null)}
        trendData={dialogTrend}
        onConfirm={handleDialogConfirm}
      />
    </div>
  );
};

export default TrendsPanel;
