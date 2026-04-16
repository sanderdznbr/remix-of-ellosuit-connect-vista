import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Palette, Image as ImageIcon, Check, ChevronRight, ChevronLeft, Upload, Edit3, LayoutGrid, FileText, Eye } from 'lucide-react';
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

interface Props {
  open: boolean;
  onClose: () => void;
  trendData: TrendData | null;
  onConfirm: (trendData: TrendData, styleId: string, useBrandColors: boolean) => void;
}

type WizardStep = 'review' | 'brand' | 'style' | 'confirm';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'review', label: 'Revisar' },
  { key: 'brand', label: 'Marca' },
  { key: 'style', label: 'Estilo' },
  { key: 'confirm', label: 'Criar' },
];

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
  
  // Logo upload
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDarkUrl, setLogoDarkUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setStep('review');
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

    const finalTrend: TrendData = {
      ...trendData,
      topic: editedTopic,
      cardText: editedCardText,
      cardTexts: editedCardTexts,
      caption: editedCaption,
    };

    onConfirm(finalTrend, selectedStyle, useBrandColors);
    setCreating(false);
  };

  if (!open || !trendData) return null;

  const isCarousel = trendData.format === 'carrossel';
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const canProceed = () => {
    if (step === 'review') return true;
    if (step === 'brand') return true;
    if (step === 'style') return !!selectedStyle;
    return true;
  };

  const goNext = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const goBack = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}
          className="relative w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.08] flex flex-col"
          style={{ backgroundColor: '#0d0d15' }}>

          {/* Header with progress */}
          <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))' }}>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Criar a partir da Trend</h2>
                  <p className="text-[10px] text-white/20">{isCarousel ? 'Carrossel' : 'Estático'} · {isCarousel ? `${editedCardTexts.length} slides` : '1 card'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-white/25 hover:text-white/50 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full h-1 rounded-full transition-all duration-500"
                    style={{ backgroundColor: i <= stepIndex ? '#8B5CF6' : 'rgba(255,255,255,0.06)' }} />
                  <span className="text-[9px] font-medium transition-colors"
                    style={{ color: i <= stepIndex ? '#c4b5fd' : 'rgba(255,255,255,0.15)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              {/* STEP 1: Review content */}
              {step === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  
                  {/* Topic */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1.5 block">Tema</label>
                    <textarea value={editedTopic} onChange={e => setEditedTopic(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl text-xs text-white/80 border border-white/[0.08] focus:border-purple-500/30 outline-none transition-colors resize-none leading-relaxed"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  </div>

                  {/* Card texts */}
                  {isCarousel && editedCardTexts.length > 0 ? (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1.5">
                        <LayoutGrid className="w-3 h-3" /> Textos dos slides
                      </label>
                      <div className="space-y-1.5">
                        {editedCardTexts.map((ct, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-purple-400/40 font-mono w-4 text-right shrink-0">{idx + 1}</span>
                            <input value={ct} onChange={e => updateSlideText(idx, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-[11px] text-white/70 border border-white/[0.06] focus:border-purple-500/30 outline-none transition-colors"
                              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Texto da arte
                      </label>
                      <input value={editedCardText} onChange={e => setEditedCardText(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs text-white/70 border border-white/[0.08] focus:border-purple-500/30 outline-none transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1.5 block">Legenda do Instagram</label>
                    <textarea value={editedCaption} onChange={e => setEditedCaption(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl text-[11px] text-white/60 border border-white/[0.08] focus:border-purple-500/30 outline-none transition-colors resize-none leading-relaxed"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  </div>

                  {/* News image preview if available */}
                  {(trendData as any).imageUrl && (
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1.5 block">Foto sugerida</label>
                      <div className="rounded-xl overflow-hidden border border-white/[0.06] h-32">
                        <img src={(trendData as any).imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: Brand */}
              {step === 'brand' && (
                <motion.div key="brand" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5">

                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3 block">Logomarca</label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-xl border border-white/[0.08] overflow-hidden flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                          </div>
                          <button onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-purple-600 text-white cursor-pointer hover:bg-purple-500 transition-colors">
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}
                          className="w-16 h-16 rounded-xl border-2 border-dashed border-white/[0.1] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-purple-500/30 transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
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
                        <p className="text-[10px] text-white/20">PNG ou SVG recomendado</p>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>

                  {/* Brand colors toggle */}
                  <div className="rounded-xl border border-white/[0.06] p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
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

              {/* STEP 3: Style */}
              {step === 'style' && (
                <motion.div key="style" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3 block">Selecione o estilo</label>
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
                            style={{ borderColor: isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.06)' }}>
                            {preview ? (
                              <img src={preview} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.08)' }}>
                                <ImageIcon className="w-5 h-5 text-white/15" />
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

              {/* STEP 4: Confirm */}
              {step === 'confirm' && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))' }}>
                      <Eye className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Tudo pronto!</h3>
                    <p className="text-xs text-white/30">Confira o resumo e crie seu conteúdo</p>
                  </div>

                  {/* Summary cards */}
                  <div className="space-y-2">
                    <div className="rounded-xl border border-white/[0.06] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Tema</p>
                      <p className="text-xs text-white/60 line-clamp-2">{editedTopic.split(': ')[0]}</p>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl border border-white/[0.06] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Formato</p>
                        <p className="text-xs text-white/60">{isCarousel ? `Carrossel (${editedCardTexts.length} slides)` : 'Post estático'}</p>
                      </div>
                      <div className="flex-1 rounded-xl border border-white/[0.06] p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Estilo</p>
                        <p className="text-xs text-white/60 truncate">{styles.find(s => s.id === selectedStyle)?.name || '—'}</p>
                      </div>
                    </div>

                    {logoUrl && (
                      <div className="rounded-xl border border-white/[0.06] p-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                        <div>
                          <p className="text-[10px] text-white/25 uppercase tracking-wider">Marca</p>
                          <p className="text-xs text-white/60">Logo + {useBrandColors ? 'cores da marca' : 'sem cores'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex items-center justify-between"
            style={{ backgroundColor: '#0d0d15' }}>
            {stepIndex > 0 ? (
              <button onClick={goBack}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            ) : (
              <div />
            )}

            {step === 'confirm' ? (
              <button onClick={handleConfirm} disabled={!selectedStyle || creating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Criar conteúdo
              </button>
            ) : (
              <button onClick={goNext} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-medium text-white transition-all cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: '#8B5CF6' }}>
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
