import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Palette, Image as ImageIcon, Check, ChevronRight, ChevronLeft, Upload, Edit3, LayoutGrid, FileText, Eye, Camera, Plus, Trash2, MessageSquare, Search, ThumbsUp, ThumbsDown, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { TrendData } from './TrendsPanel';

interface MarketplaceStyle {
  id: string;
  name: string;
  preview_images: any;
  category?: string;
}

interface ContextSuggestion {
  label: string;
  placeholder: string;
  icon: 'camera' | 'details' | 'logo';
}

interface Props {
  open: boolean;
  onClose: () => void;
  trendData: TrendData | null;
  onConfirm: (trendData: TrendData, styleId: string, useBrandColors: boolean) => void;
}

type WizardStep = 'review' | 'photo' | 'context' | 'brand' | 'style' | 'confirm';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'review', label: 'Revisar' },
  { key: 'photo', label: 'Foto' },
  { key: 'context', label: 'Contexto' },
  { key: 'brand', label: 'Marca' },
  { key: 'style', label: 'Estilo' },
  { key: 'confirm', label: 'Criar' },
];

/** Analyzes topic to suggest what media/details to ask for */
const getContextSuggestions = (topic: string, category: string): { title: string; subtitle: string; suggestions: ContextSuggestion[] } => {
  const lower = topic.toLowerCase();

  if (lower.includes('caso de sucesso') || lower.includes('case') || lower.includes('resultado') || lower.includes('como ajudamos') || lower.includes('cliente')) {
    return {
      title: 'Detalhes do case',
      subtitle: 'Adicione fotos do trabalho e informações do cliente',
      suggestions: [
        { label: 'Foto do trabalho / resultado', placeholder: 'Ex: screenshot, foto do produto, antes e depois', icon: 'camera' },
        { label: 'Detalhes do cliente e resultado', placeholder: 'Nome do cliente, qual foi o problema, resultado alcançado...', icon: 'details' },
      ],
    };
  }

  if (lower.includes('landing') || lower.includes('site') || lower.includes('website') || lower.includes('app') || lower.includes('software') || lower.includes('plataforma') || lower.includes('sistema')) {
    return {
      title: 'Mostre seu trabalho',
      subtitle: 'Envie screenshots ou prints do projeto',
      suggestions: [
        { label: 'Screenshot do projeto', placeholder: 'Print da tela, landing page, interface', icon: 'camera' },
        { label: 'Contexto adicional', placeholder: 'Tecnologias usadas, funcionalidades, resultados...', icon: 'details' },
      ],
    };
  }

  if (lower.includes('produto') || lower.includes('lançamento') || lower.includes('oferta') || lower.includes('desconto') || lower.includes('promo')) {
    return {
      title: 'Foto do produto',
      subtitle: 'Envie a foto do produto ou serviço em destaque',
      suggestions: [
        { label: 'Foto do produto', placeholder: 'Foto profissional ou mockup do produto', icon: 'camera' },
        { label: 'Detalhes da oferta', placeholder: 'Preço, benefícios, diferenciais...', icon: 'details' },
      ],
    };
  }

  if (lower.includes('antes e depois') || lower.includes('transformação') || lower.includes('reforma') || lower.includes('evolução')) {
    return {
      title: 'Antes e depois',
      subtitle: 'Envie as fotos de comparação',
      suggestions: [
        { label: 'Foto "Antes"', placeholder: 'Estado inicial, antes da transformação', icon: 'camera' },
        { label: 'Foto "Depois"', placeholder: 'Resultado final', icon: 'camera' },
        { label: 'Contexto', placeholder: 'O que foi feito, quanto tempo levou...', icon: 'details' },
      ],
    };
  }

  if (lower.includes('dica') || lower.includes('tutorial') || lower.includes('passo') || lower.includes('como fazer') || lower.includes('educativo')) {
    return {
      title: 'Material de apoio',
      subtitle: 'Envie imagens que ilustrem o conteúdo (opcional)',
      suggestions: [
        { label: 'Imagem ilustrativa', placeholder: 'Gráfico, print de tela, infográfico', icon: 'camera' },
        { label: 'Detalhes extras', placeholder: 'Dados, estatísticas ou experiência pessoal...', icon: 'details' },
      ],
    };
  }

  if (lower.includes('depoimento') || lower.includes('feedback') || lower.includes('avaliação') || lower.includes('prova social')) {
    return {
      title: 'Prova social',
      subtitle: 'Envie print do depoimento ou foto do cliente',
      suggestions: [
        { label: 'Print do depoimento', placeholder: 'Screenshot do WhatsApp, Google, Instagram', icon: 'camera' },
        { label: 'Detalhes do cliente', placeholder: 'Nome, empresa, resultado alcançado...', icon: 'details' },
      ],
    };
  }

  // Default: generic context
  return {
    title: 'Personalize o conteúdo',
    subtitle: 'Adicione fotos ou detalhes para enriquecer o post (opcional)',
    suggestions: [
      { label: 'Foto ou imagem de apoio', placeholder: 'Envie uma foto real do seu negócio, trabalho ou produto', icon: 'camera' },
      { label: 'Detalhes adicionais', placeholder: 'Informações que a IA deve considerar na criação...', icon: 'details' },
    ],
  };
};

const TrendCreateDialog: React.FC<Props> = ({ open, onClose, trendData, onConfirm }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>('review');
  const [styles, setStyles] = useState<MarketplaceStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [useBrandColors, setUseBrandColors] = useState(true);
  const [brandConfig, setBrandConfig] = useState<{ logo_url?: string; logo_dark_url?: string; brand_colors?: string[] } | null>(null);
  const [creating, setCreating] = useState(false);

  // Editable content
  const [editedCardText, setEditedCardText] = useState('');
  const [editedCardTexts, setEditedCardTexts] = useState<string[]>([]);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedTopic, setEditedTopic] = useState('');
  
  // Suggested photo step
  const [useSuggestedPhoto, setUseSuggestedPhoto] = useState<boolean | null>(null);
  
  // Context step - media and details
  const [contextImages, setContextImages] = useState<string[]>([]);
  const [contextDetails, setContextDetails] = useState('');
  const [uploadingContext, setUploadingContext] = useState(false);
  
  // Face photo upload (separate from context)
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [uploadingFace, setUploadingFace] = useState(false);
  const faceFileInputRef = useRef<HTMLInputElement>(null);

  // Logo upload
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);

  const suggestedImageUrl = (trendData as any)?.imageUrl || null;

  // Compute active steps (skip 'photo' if no suggested image)
  const activeSteps = suggestedImageUrl
    ? STEPS
    : STEPS.filter(s => s.key !== 'photo');

  useEffect(() => {
    if (!open || !user) return;
    setStep('review');
    setContextImages([]);
    setContextDetails('');
    setUseSuggestedPhoto(null);
    setFaceImages([]);
    loadData();
  }, [open, user]);

  useEffect(() => {
    if (!trendData) return;
    setEditedCardText(trendData.cardText || '');
    setEditedCardTexts(trendData.cardTexts?.length ? [...trendData.cardTexts] : []);
    setEditedCaption(trendData.caption || '');
    setEditedTopic(trendData.topic || '');
  }, [trendData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user!.id)
        .single();
      if (!cu) return;

      const [stylesRes, configRes] = await Promise.all([
        supabase.from('marketplace_styles').select('id, name, preview_images, category')
          .eq('is_active', true).order('sort_order', { ascending: true }) as any,
        supabase.from('trend_configs').select('logo_url, logo_dark_url, brand_colors')
          .eq('company_id', cu.company_id).single(),
      ]);

      const { data: purchased } = await supabase
        .from('purchased_styles').select('style_id').eq('user_id', user!.id);
      const { data: freeStyles } = await supabase
        .from('marketplace_styles').select('id').eq('is_active', true).eq('is_free', true);
      const { data: isAdmin } = await supabase.rpc('is_adminmaster', { _user_id: user!.id });

      const purchasedIds = new Set((purchased || []).map((p: any) => p.style_id));
      const freeIds = new Set((freeStyles || []).map((f: any) => f.id));
      const available = isAdmin
        ? (stylesRes.data || [])
        : (stylesRes.data || []).filter((s: any) => purchasedIds.has(s.id) || freeIds.has(s.id));

      setStyles(available);
      if (available.length > 0 && !selectedStyle) setSelectedStyle(available[0].id);
      
      const cfg = configRes.data || {};
      setBrandConfig(cfg);
      setLogoUrl((cfg as any).logo_url || '');
      setLogoDarkUrl((cfg as any).logo_dark_url || '');
    } catch (e) {
      console.error('TrendCreateDialog loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = (style: MarketplaceStyle) => {
    const imgs = style.preview_images;
    if (Array.isArray(imgs) && imgs.length > 0) return typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url;
    return null;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/trend-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast.success('Logo carregada!');
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err?.message || ''));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleContextImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingContext(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files).slice(0, 5 - contextImages.length)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/trend-context-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
        newUrls.push(publicUrl);
      }
      setContextImages(prev => [...prev, ...newUrls]);
      if (newUrls.length > 0) toast.success(`${newUrls.length} imagem(ns) adicionada(s)`);
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err?.message || ''));
    } finally {
      setUploadingContext(false);
      if (contextFileInputRef.current) contextFileInputRef.current.value = '';
    }
  };

  const removeContextImage = (index: number) => {
    setContextImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFaceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingFace(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files).slice(0, 3 - faceImages.length)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/trend-face-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
        newUrls.push(publicUrl);
      }
      setFaceImages(prev => [...prev, ...newUrls]);
      if (newUrls.length > 0) toast.success(`Foto de rosto adicionada`);
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err?.message || ''));
    } finally {
      setUploadingFace(false);
      if (faceFileInputRef.current) faceFileInputRef.current.value = '';
    }
  };

  const removeFaceImage = (index: number) => {
    setFaceImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlideText = (index: number, value: string) => {
    setEditedCardTexts(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleConfirm = () => {
    if (!selectedStyle || !trendData) return;
    setCreating(true);

    // If user accepted the suggested photo, add it to context images
    const finalContextImages = [...contextImages];
    if (useSuggestedPhoto && suggestedImageUrl && !finalContextImages.includes(suggestedImageUrl)) {
      finalContextImages.unshift(suggestedImageUrl);
    }

    const finalTrend: TrendData = {
      ...trendData,
      topic: editedTopic,
      cardText: editedCardText,
      cardTexts: editedCardTexts,
      caption: editedCaption,
      contextImages: finalContextImages.length > 0 ? finalContextImages : undefined,
      contextDetails: contextDetails.trim() || undefined,
      faceImages: faceImages.length > 0 ? faceImages : undefined,
    };

    onConfirm(finalTrend, selectedStyle, useBrandColors);
    setCreating(false);
  };

  if (!open || !trendData) return null;

  const isCarousel = trendData.format === 'carrossel';
  const stepIndex = activeSteps.findIndex(s => s.key === step);
  const ctxSuggestions = getContextSuggestions(editedTopic || trendData.topic || '', (trendData as any).category || '');

  const canProceed = () => {
    if (step === 'review') return true;
    if (step === 'photo') return useSuggestedPhoto !== null;
    if (step === 'context') return true;
    if (step === 'brand') return true;
    if (step === 'style') return !!selectedStyle;
    return true;
  };

  const goNext = () => {
    const idx = activeSteps.findIndex(s => s.key === step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1].key);
  };

  const goBack = () => {
    const idx = activeSteps.findIndex(s => s.key === step);
    if (idx > 0) setStep(activeSteps[idx - 1].key);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
          className="relative w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.06] flex flex-col shadow-2xl"
          style={{ backgroundColor: '#0c0c14' }}>

          {/* Header */}
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Criar a partir da Trend</h2>
                  <p className="text-[10px] text-white/25 mt-0.5">{isCarousel ? 'Carrossel' : 'Post único'} · {isCarousel ? `${editedCardTexts.length} slides` : '1 card'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step progress - pill style */}
            <div className="flex items-center gap-1">
              {activeSteps.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full h-[3px] rounded-full transition-all duration-500"
                    style={{ 
                      backgroundColor: i < stepIndex ? '#7C3AED' : i === stepIndex ? '#8B5CF6' : 'rgba(255,255,255,0.04)',
                      boxShadow: i === stepIndex ? '0 0 8px rgba(139,92,246,0.4)' : 'none'
                    }} />
                  <span className="text-[8px] font-semibold uppercase tracking-widest transition-colors"
                    style={{ color: i <= stepIndex ? '#a78bfa' : 'rgba(255,255,255,0.12)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5" style={{ WebkitOverflowScrolling: 'touch' as any }}>
            <AnimatePresence mode="wait">
              {/* STEP 1: Review content */}
              {step === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  
                  {/* Topic */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Tema</label>
                    <textarea value={editedTopic} onChange={e => setEditedTopic(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-3 rounded-xl text-xs text-white/80 border border-white/[0.06] focus:border-purple-500/40 outline-none transition-all resize-none leading-relaxed"
                      style={{ backgroundColor: 'rgba(255,255,255,0.025)' }} />
                  </div>

                  {/* Card texts */}
                  {isCarousel && editedCardTexts.length > 0 ? (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <LayoutGrid className="w-3 h-3" /> Textos dos slides
                      </label>
                      <div className="space-y-1.5">
                        {editedCardTexts.map((ct, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-purple-400/40 font-mono w-4 text-right shrink-0">{idx + 1}</span>
                            <input value={ct} onChange={e => updateSlideText(idx, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-[11px] text-white/70 border border-white/[0.05] focus:border-purple-500/30 outline-none transition-colors"
                              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Texto da arte
                      </label>
                      <input value={editedCardText} onChange={e => setEditedCardText(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl text-xs text-white/70 border border-white/[0.06] focus:border-purple-500/30 outline-none transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.025)' }} />
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 block">Legenda do Instagram</label>
                    <textarea value={editedCaption} onChange={e => setEditedCaption(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-3 rounded-xl text-[11px] text-white/50 border border-white/[0.06] focus:border-purple-500/30 outline-none transition-colors resize-none leading-relaxed"
                      style={{ backgroundColor: 'rgba(255,255,255,0.025)' }} />
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Suggested Photo */}
              {step === 'photo' && suggestedImageUrl && (
                <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5">

                  {/* Header */}
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))' }}>
                      <Search className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Encontramos essa foto</h3>
                    <p className="text-[11px] text-white/30 leading-relaxed max-w-xs mx-auto">
                      Relacionada ao assunto da trend. Deseja usar como referência visual no post?
                    </p>
                  </div>

                  {/* Image preview */}
                  <div className="rounded-2xl overflow-hidden border border-white/[0.06] shadow-lg">
                    <img src={suggestedImageUrl} alt="Foto sugerida" className="w-full h-48 object-cover" />
                  </div>

                  {/* Yes / No buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setUseSuggestedPhoto(true)}
                      className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all border-2 cursor-pointer"
                      style={{
                        backgroundColor: useSuggestedPhoto === true ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)',
                        borderColor: useSuggestedPhoto === true ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.06)',
                        color: useSuggestedPhoto === true ? '#4ade80' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Sim, usar
                    </button>
                    <button
                      onClick={() => setUseSuggestedPhoto(false)}
                      className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-semibold transition-all border-2 cursor-pointer"
                      style={{
                        backgroundColor: useSuggestedPhoto === false ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: useSuggestedPhoto === false ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)',
                        color: useSuggestedPhoto === false ? '#f87171' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Não, pular
                    </button>
                  </div>

                  {useSuggestedPhoto === true && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-green-400/50 text-center">
                      ✓ A foto será usada como referência visual na geração
                    </motion.p>
                  )}
                  {useSuggestedPhoto === false && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-white/20 text-center">
                      A IA irá gerar imagens do zero baseadas no tema
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Smart Context (adaptive per content) */}
              {step === 'context' && (
                <motion.div key="context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5">

                  {/* Smart header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.08))' }}>
                      <Camera className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{ctxSuggestions.title}</h3>
                      <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{ctxSuggestions.subtitle}</p>
                    </div>
                  </div>

                  {/* Image upload area */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                      <Camera className="w-3 h-3" />
                      {ctxSuggestions.suggestions.find(s => s.icon === 'camera')?.label || 'Fotos de apoio'}
                    </label>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {contextImages.map((url, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-white/[0.06] aspect-square group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeContextImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                      
                      {contextImages.length < 5 && (
                        <button onClick={() => contextFileInputRef.current?.click()} disabled={uploadingContext}
                          className="rounded-xl border-2 border-dashed border-white/[0.06] aspect-square flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-cyan-500/30 transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                          {uploadingContext ? (
                            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                          ) : (
                            <>
                              <Plus className="w-5 h-5 text-white/15" />
                              <span className="text-[8px] text-white/15 font-medium">Adicionar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input ref={contextFileInputRef} type="file" accept="image/*" multiple onChange={handleContextImageUpload} className="hidden" />
                  </div>

                  {/* Face photo upload - dedicated section */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                      <UserRound className="w-3 h-3" />
                      Foto de rosto (para aparecer no post)
                    </label>
                    <p className="text-[10px] text-white/20 mb-2">
                      Envie uma foto do seu rosto para a IA criar o post com a sua imagem
                    </p>
                    
                    <div className="flex gap-2">
                      {faceImages.map((url, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-purple-500/20 w-16 h-16 group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeFaceImage(idx)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </button>
                        </div>
                      ))}
                      
                      {faceImages.length < 3 && (
                        <button onClick={() => faceFileInputRef.current?.click()} disabled={uploadingFace}
                          className="rounded-xl border-2 border-dashed border-purple-500/15 w-16 h-16 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-purple-500/30 transition-colors"
                          style={{ backgroundColor: 'rgba(139,92,246,0.04)' }}>
                          {uploadingFace ? (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400/30" />
                          ) : (
                            <>
                              <UserRound className="w-4 h-4 text-purple-400/25" />
                              <span className="text-[7px] text-purple-400/25 font-medium">Rosto</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input ref={faceFileInputRef} type="file" accept="image/*" onChange={handleFaceImageUpload} className="hidden" />
                  </div>

                  {/* Context details textarea */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />
                      {ctxSuggestions.suggestions.find(s => s.icon === 'details')?.label || 'Detalhes adicionais'}
                    </label>
                    <textarea
                      value={contextDetails}
                      onChange={e => setContextDetails(e.target.value)}
                      placeholder={ctxSuggestions.suggestions.find(s => s.icon === 'details')?.placeholder || 'Informações extras...'}
                      rows={3}
                      className="w-full px-3.5 py-3 rounded-xl text-xs text-white/70 border border-white/[0.06] focus:border-cyan-500/30 outline-none transition-colors resize-none leading-relaxed placeholder:text-white/12"
                      style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                    />
                  </div>

                  <p className="text-[10px] text-white/12 text-center">
                    Etapa opcional — pule se preferir que a IA crie tudo automaticamente
                  </p>
                </motion.div>
              )}

              {/* STEP 4: Brand */}
              {step === 'brand' && (
                <motion.div key="brand" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5">

                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3 block">Logomarca</label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-xl border border-white/[0.06] overflow-hidden flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}>
                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                          </div>
                          <button onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-purple-600 text-white cursor-pointer hover:bg-purple-500 transition-colors">
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-purple-500/30 transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                          {uploadingLogo ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-white/15" />
                              <span className="text-[8px] text-white/15">Upload</span>
                            </>
                          )}
                        </button>
                      )}
                      <div>
                        <p className="text-xs text-white/50 font-medium">{logoUrl ? 'Logo configurada' : 'Sem logo'}</p>
                        <p className="text-[10px] text-white/15">PNG ou SVG recomendado</p>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>

                  {/* Brand colors toggle */}
                  <div className="rounded-xl border border-white/[0.04] p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-white/25" />
                        <span className="text-xs text-white/50">Usar cores da marca</span>
                      </div>
                      <Switch checked={useBrandColors} onCheckedChange={setUseBrandColors} className="scale-75" />
                    </div>

                    {useBrandColors && brandConfig?.brand_colors && brandConfig.brand_colors.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {brandConfig.brand_colors.slice(0, 6).map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Style */}
              {step === 'style' && (
                <motion.div key="style" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3 block">Selecione o estilo</label>
                  {loading ? (
                    <div className="flex items-center gap-2 py-12 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                      <span className="text-xs text-white/20">Carregando estilos...</span>
                    </div>
                  ) : styles.length === 0 ? (
                    <p className="text-xs text-white/20 text-center py-10">Nenhum estilo disponível. Adquira estilos no Marketplace.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                      {styles.map(style => {
                        const preview = getPreviewUrl(style);
                        const isSelected = selectedStyle === style.id;
                        return (
                          <button key={style.id} onClick={() => setSelectedStyle(style.id)}
                            className="relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group aspect-square"
                            style={{ borderColor: isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.04)' }}>
                            {preview ? (
                              <img src={preview} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.06)' }}>
                                <ImageIcon className="w-5 h-5 text-white/10" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-[9px] text-white/70 font-medium truncate">{style.name}</p>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#8B5CF6' }}>
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 6: Confirm */}
              {step === 'confirm' && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  
                  <div className="text-center py-3">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))' }}>
                      <Eye className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Tudo pronto!</h3>
                    <p className="text-[11px] text-white/25">Confira o resumo e crie seu conteúdo</p>
                  </div>

                  {/* Summary cards */}
                  <div className="space-y-2">
                    <div className="rounded-xl border border-white/[0.04] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                      <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Tema</p>
                      <p className="text-xs text-white/60 line-clamp-2">{editedTopic.split(': ')[0]}</p>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl border border-white/[0.04] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                        <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Formato</p>
                        <p className="text-xs text-white/60">{isCarousel ? `Carrossel (${editedCardTexts.length} slides)` : 'Post estático'}</p>
                      </div>
                      <div className="flex-1 rounded-xl border border-white/[0.04] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                        <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Estilo</p>
                        <p className="text-xs text-white/60 truncate">{styles.find(s => s.id === selectedStyle)?.name || '—'}</p>
                      </div>
                    </div>

                    {/* Photo decision summary */}
                    {suggestedImageUrl && useSuggestedPhoto !== null && (
                      <div className="rounded-xl border border-white/[0.04] p-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                        {useSuggestedPhoto ? (
                          <>
                            <img src={suggestedImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/[0.06]" />
                            <div>
                              <p className="text-[10px] text-white/20 uppercase tracking-wider">Foto sugerida</p>
                              <p className="text-xs text-green-400/70">Incluída como referência</p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p className="text-[10px] text-white/20 uppercase tracking-wider">Foto sugerida</p>
                            <p className="text-xs text-white/30">Não utilizada</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Context summary */}
                    {(contextImages.length > 0 || contextDetails) && (
                      <div className="rounded-xl border border-white/[0.04] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                        <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Contexto</p>
                        {contextImages.length > 0 && (
                          <div className="flex gap-1.5 mb-2">
                            {contextImages.map((url, i) => (
                              <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/[0.04]" />
                            ))}
                          </div>
                        )}
                        {contextDetails && <p className="text-[11px] text-white/35 line-clamp-2">{contextDetails}</p>}
                      </div>
                    )}

                    {/* Face summary */}
                    {faceImages.length > 0 && (
                      <div className="rounded-xl border border-purple-500/10 p-3" style={{ backgroundColor: 'rgba(139,92,246,0.04)' }}>
                        <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Rosto</p>
                        <div className="flex gap-1.5">
                          {faceImages.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-10 h-10 rounded-full object-cover border border-purple-500/20" />
                          ))}
                        </div>
                      </div>
                    )}

                    {logoUrl && (
                      <div className="rounded-xl border border-white/[0.04] p-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
                        <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                        <div>
                          <p className="text-[10px] text-white/20 uppercase tracking-wider">Marca</p>
                          <p className="text-xs text-white/50">Logo + {useBrandColors ? 'cores da marca' : 'sem cores'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-white/[0.04] flex items-center justify-between"
            style={{ backgroundColor: '#0a0a12' }}>
            {stepIndex > 0 ? (
              <button onClick={goBack}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-white/25 hover:text-white/40 transition-colors cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            ) : (
              <div />
            )}

            {step === 'confirm' ? (
              <button onClick={handleConfirm} disabled={!selectedStyle || creating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Criar conteúdo
              </button>
            ) : (
              <button onClick={goNext} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-20"
                style={{ backgroundColor: canProceed() ? '#7C3AED' : 'rgba(255,255,255,0.04)' }}>
                Continuar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TrendCreateDialog;
