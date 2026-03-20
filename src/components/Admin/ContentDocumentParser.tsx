import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Check, Play, Settings, Image, Palette, X, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';

interface ParsedCard {
  cardNumber: number;
  text: string;
  imageDirection?: string;
}

interface ParsedPost {
  id: number;
  type: 'carrossel' | 'estatico';
  title: string;
  cards: ParsedCard[];
  caption: string;
  hashtags: string;
}

type PostStatus = 'idle' | 'generating' | 'done' | 'error';

interface GenerationConfig {
  logoUrl: string;
  logoDarkUrl: string;
  logoPosition: string;
  marketplaceStyleId: string | null;
  postFormat: 'square' | 'story' | 'portrait';
  brandName: string;
}

function LogoUploader({ value, onChange, companyId, label }: { value: string; onChange: (url: string) => void; companyId: string | null; label: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${companyId}/logo-${label}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      onChange(publicUrl);
      toast.success(`Logo ${label} enviada!`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar logo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {value ? (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={value} alt={`Logo ${label}`} className="h-8 object-contain flex-1" onError={e => (e.currentTarget.style.display = 'none')} />
          <button onClick={() => inputRef.current?.click()} className="text-[10px] text-purple-400 hover:text-purple-300 whitespace-nowrap cursor-pointer">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Trocar'}
          </button>
          <button onClick={() => onChange('')} className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !companyId}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)' }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Enviando...' : `Enviar logo ${label}`}
        </button>
      )}
    </div>
  );
}

export default function ContentDocumentParser() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [posts, setPosts] = useState<ParsedPost[]>([]);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Generation
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    logoUrl: '',
    logoDarkUrl: '',
    logoPosition: 'bottom-center',
    marketplaceStyleId: null,
    postFormat: 'square',
    brandName: '',
  });
  const [styles, setStyles] = useState<any[]>([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [postStatuses, setPostStatuses] = useState<Record<number, PostStatus>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [currentGenerating, setCurrentGenerating] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Load company_id
  useEffect(() => {
    if (!user) return;
    supabase.from('company_users').select('company_id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setCompanyId(data.company_id); });
  }, [user]);

  // Load marketplace styles
  const loadStyles = async () => {
    setStylesLoading(true);
    const { data } = await supabase.from('marketplace_styles').select('id, name, preview_images, is_active')
      .eq('is_active', true).order('sort_order', { ascending: true });
    setStyles(data || []);
    setStylesLoading(false);
  };

  useEffect(() => { loadStyles(); }, []);

  // Load saved logos from brand_assets
  useEffect(() => {
    if (!companyId) return;
    supabase.from('brand_assets').select('file_url, category')
      .eq('company_id', companyId).eq('category', 'logo').limit(2)
      .then(({ data }) => {
        if (data?.length) {
          setConfig(prev => ({
            ...prev,
            logoUrl: data[0]?.file_url || '',
            logoDarkUrl: data[1]?.file_url || '',
          }));
        }
      });
  }, [companyId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setPosts([]); setPostStatuses({}); }
  };

  const parseDocument = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContent = result.value;
      if (!textContent || textContent.length < 50) { toast.error('Documento vazio ou com pouco conteúdo'); return; }

      const response = await supabase.functions.invoke('parse-content-document', { body: { textContent } });
      if (response.error) throw new Error(response.error.message || 'Erro ao parsear documento');

      const { posts: parsedPosts, totalPosts } = response.data;
      setPosts(parsedPosts || []);
      setPostStatuses({});
      toast.success(`${totalPosts} posts identificados no documento!`);
      setShowConfig(true);
    } catch (err: any) {
      console.error('Parse error:', err);
      toast.error(err.message || 'Erro ao processar documento');
    } finally {
      setParsing(false);
    }
  };

  const generateSinglePost = async (post: ParsedPost): Promise<boolean> => {
    if (!user || !companyId) { toast.error('Usuário não autenticado'); return false; }

    setPostStatuses(prev => ({ ...prev, [post.id]: 'generating' }));
    setCurrentGenerating(post.id);

    try {
      // Build topic from card texts
      const cardTexts = post.cards.map(c => c.text).join('\n');
      const topic = `${post.title}\n\n${cardTexts}`;
      const cardCount = post.type === 'carrossel' ? post.cards.length : 1;

      const styleConfig = {
        bgColor: '#1a1a2e',
        accentColor: '#7B50DC',
        textColor: '#ffffff',
        selectedFont: 0,
        brandName: config.brandName,
        userName: '',
        dateLabel: '',
        logoUrl: config.logoUrl,
        logoDarkUrl: config.logoDarkUrl,
        logoPosition: config.logoPosition,
        showHeader: false,
        contentMode: post.type === 'carrossel' ? 'carousel' : 'single-post',
        manualPostText: post.type === 'estatico' ? post.cards[0]?.text : undefined,
      };

      // Get marketplace style config if selected — map preview_images → _previewImages for cloud function
      let marketplaceConfig = null;
      if (config.marketplaceStyleId) {
        const { data: msData } = await supabase.from('marketplace_styles').select('*')
          .eq('id', config.marketplaceStyleId).single();
        if (msData) {
          marketplaceConfig = {
            ...msData,
            _previewImages: msData.preview_images || [],
          };
        }
      }

      const { data: jobData, error: jobError } = await supabase.from('carousel_generation_jobs').insert({
        user_id: user.id,
        company_id: companyId,
        topic: topic.trim(),
        keywords: post.hashtags || '',
        card_count: cardCount,
        image_card_count: cardCount,
        style_config: styleConfig as any,
        marketplace_style_id: config.marketplaceStyleId || null,
        marketplace_style_config: marketplaceConfig as any,
        brand_name: config.brandName,
        logo_url: config.logoUrl,
        logo_dark_url: config.logoDarkUrl,
        logo_position: config.logoPosition,
        show_header: false,
        image_settings: {} as any,
        reference_images: [] as any,
        face_ref_urls: [] as any,
        post_format: config.postFormat,
      } as any).select('id').single();

      if (jobError || !jobData?.id) {
        console.error('Job creation failed:', jobError);
        throw new Error('Falha ao criar job de geração');
      }

      // Trigger cloud generation
      supabase.functions.invoke('generate-carousel-cloud', {
        body: { jobId: jobData.id },
      }).catch(err => console.warn('Cloud invoke fire-and-forget:', err));

      // Poll for completion
      const maxPolls = 120;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: job } = await supabase.from('carousel_generation_jobs')
          .select('status, error_message, carousel_id, progress_message')
          .eq('id', jobData.id).single();

        if (!job) continue;
        if (job.status === 'completed') {
          setPostStatuses(prev => ({ ...prev, [post.id]: 'done' }));
          return true;
        }
        if (job.status === 'failed') {
          throw new Error(job.error_message || 'Geração falhou');
        }
      }

      throw new Error('Timeout na geração');
    } catch (err: any) {
      console.error(`Error generating post ${post.id}:`, err);
      setPostStatuses(prev => ({ ...prev, [post.id]: 'error' }));
      toast.error(`Erro no post "${post.title}": ${err.message}`);
      return false;
    }
  };

  const generateAllPosts = async () => {
    if (posts.length === 0) return;
    setGeneratingAll(true);

    for (const post of posts) {
      if (postStatuses[post.id] === 'done') continue;
      const success = await generateSinglePost(post);
      if (!success) {
        // Continue to next post even on error
        await new Promise(r => setTimeout(r, 2000));
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setGeneratingAll(false);
    setCurrentGenerating(null);
    const doneCount = Object.values(postStatuses).filter(s => s === 'done').length;
    toast.success(`Geração concluída! ${doneCount}/${posts.length} posts gerados.`);
  };

  const copyPostContent = (post: ParsedPost) => {
    const lines: string[] = [];
    lines.push(`📌 ${post.title}`);
    lines.push(`Tipo: ${post.type === 'carrossel' ? 'Carrossel' : 'Estático'}`);
    lines.push(`Cards: ${post.cards.length}`);
    lines.push('');
    post.cards.forEach(c => {
      lines.push(`--- Card ${c.cardNumber} ---`);
      lines.push(c.text);
      if (c.imageDirection) lines.push(`🖼️ ${c.imageDirection}`);
      lines.push('');
    });
    lines.push('📝 Legenda:');
    lines.push(post.caption);
    lines.push('');
    lines.push(post.hashtags);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId(post.id);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusIcon = (status: PostStatus) => {
    switch (status) {
      case 'generating': return <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />;
      case 'done': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-white/20" />;
    }
  };

  const selectedStyle = styles.find(s => s.id === config.marketplaceStyleId);
  const doneCount = Object.values(postStatuses).filter(s => s === 'done').length;

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-400" />
        Parser de Documento de Conteúdo
      </h3>

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all hover:bg-white/[0.04]"
        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)' }}
      >
        <Upload className="w-8 h-8 text-white/20" />
        <div className="text-center">
          <p className="text-white/60 text-sm">{file ? file.name : 'Arraste ou clique para enviar'}</p>
          <p className="text-white/25 text-[11px] mt-1">Aceita .docx com posts formatados</p>
        </div>
        <input ref={fileRef} type="file" accept=".docx" onChange={handleFile} className="hidden" />
      </div>

      {file && (
        <button
          onClick={parseDocument}
          disabled={parsing}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7B50DC' }}
        >
          {parsing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analisando documento...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Identificar Posts ({file.name})</>
          )}
        </button>
      )}

      {/* ═══ CONFIGURATION PANEL ═══ */}
      {posts.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/80 font-medium cursor-pointer transition-all hover:bg-white/[0.04]"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Configurações de Geração
            </span>
            {showConfig ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>

          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl p-4 space-y-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  
                  {/* Brand Name */}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Nome da marca</label>
                    <input
                      value={config.brandName}
                      onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))}
                      placeholder="Ex: SIM Incorporadora"
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  {/* Logo Uploads */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Logo (clara)</label>
                      <LogoUploader
                        value={config.logoUrl}
                        onChange={url => setConfig(prev => ({ ...prev, logoUrl: url }))}
                        companyId={companyId}
                        label="clara"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Logo (escura)</label>
                      <LogoUploader
                        value={config.logoDarkUrl}
                        onChange={url => setConfig(prev => ({ ...prev, logoDarkUrl: url }))}
                        companyId={companyId}
                        label="escura"
                      />
                    </div>
                  </div>

                  {/* Post Format */}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Formato</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'square', label: '1:1 Quadrado' },
                        { value: 'portrait', label: '4:5 Retrato' },
                        { value: 'story', label: '9:16 Stories' },
                      ] as const).map(f => (
                        <button
                          key={f.value}
                          onClick={() => setConfig(prev => ({ ...prev, postFormat: f.value }))}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            config.postFormat === f.value ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/60'
                          }`}
                          style={config.postFormat !== f.value ? { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' } : undefined}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Position */}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Posição da logo</label>
                    <select
                      value={config.logoPosition}
                      onChange={e => setConfig(prev => ({ ...prev, logoPosition: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none cursor-pointer"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="top-left" className="bg-[#111]">Topo Esquerda</option>
                      <option value="top-center" className="bg-[#111]">Topo Centro</option>
                      <option value="top-right" className="bg-[#111]">Topo Direita</option>
                      <option value="bottom-left" className="bg-[#111]">Base Esquerda</option>
                      <option value="bottom-center" className="bg-[#111]">Base Centro</option>
                      <option value="bottom-right" className="bg-[#111]">Base Direita</option>
                    </select>
                  </div>

                  {/* Marketplace Style */}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Estilo do Marketplace</label>
                    {stylesLoading ? (
                      <div className="flex items-center gap-2 text-white/30 text-xs py-2"><Loader2 className="w-3 h-3 animate-spin" />Carregando estilos...</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                        {/* No style option */}
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, marketplaceStyleId: null }))}
                          className={`rounded-lg p-2 text-center text-[10px] transition-all cursor-pointer ${
                            !config.marketplaceStyleId ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'hover:bg-white/[0.04]'
                          }`}
                          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div className="w-full aspect-square rounded bg-white/[0.05] flex items-center justify-center mb-1">
                            <X className="w-4 h-4 text-white/20" />
                          </div>
                          <span className="text-white/40">Nenhum</span>
                        </button>
                        {styles.map(style => {
                          const preview = (style.preview_images as any)?.[0];
                          return (
                            <button
                              key={style.id}
                              onClick={() => setConfig(prev => ({ ...prev, marketplaceStyleId: style.id }))}
                              className={`rounded-lg p-1.5 text-center text-[10px] transition-all cursor-pointer ${
                                config.marketplaceStyleId === style.id ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'hover:bg-white/[0.04]'
                              }`}
                              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              {preview ? (
                                <img src={preview} alt={style.name} className="w-full aspect-square rounded object-cover mb-1" />
                              ) : (
                                <div className="w-full aspect-square rounded bg-white/[0.05] flex items-center justify-center mb-1">
                                  <Palette className="w-4 h-4 text-white/20" />
                                </div>
                              )}
                              <span className="text-white/50 truncate block">{style.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ GENERATE ALL BUTTON ═══ */}
          <button
            onClick={generateAllPosts}
            disabled={generatingAll || posts.length === 0}
            className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7B50DC, #5B30BC)' }}
          >
            {generatingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando {currentGenerating !== null ? `post ${currentGenerating} de ${posts.length}` : '...'}
                {doneCount > 0 && <span className="text-white/60 ml-1">({doneCount}/{posts.length} prontos)</span>}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Gerar Todos os Posts ({posts.length})
                {selectedStyle && <span className="text-white/50 ml-1">• {selectedStyle.name}</span>}
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══ POST LIST ═══ */}
      {posts.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs">{posts.length} post(s) identificados</p>
            {doneCount > 0 && (
              <p className="text-green-400/60 text-xs">{doneCount}/{posts.length} gerados</p>
            )}
          </div>

          {posts.map(post => {
            const status = postStatuses[post.id] || 'idle';
            return (
              <div
                key={post.id}
                className={`rounded-xl overflow-hidden transition-all ${status === 'done' ? 'opacity-60' : ''}`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: status === 'generating'
                    ? '1px solid rgba(123,80,220,0.4)'
                    : status === 'done'
                      ? '1px solid rgba(34,197,94,0.2)'
                      : status === 'error'
                        ? '1px solid rgba(239,68,68,0.2)'
                        : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {statusIcon(status)}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                      style={{
                        backgroundColor: post.type === 'carrossel' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: post.type === 'carrossel' ? '#60a5fa' : '#34d399',
                      }}
                    >
                      {post.type === 'carrossel' ? 'CARROSSEL' : 'ESTÁTICO'}
                    </span>
                    <p className="text-white/80 text-sm truncate">{post.title}</p>
                    <span className="text-white/25 text-[11px] shrink-0">{post.cards.length} card(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {status === 'idle' && !generatingAll && (
                      <button
                        onClick={(e) => { e.stopPropagation(); generateSinglePost(post); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 transition-colors cursor-pointer"
                        title="Gerar este post"
                      >
                        Gerar
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyPostContent(post); }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {expandedPost === post.id ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {expandedPost === post.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="pt-3 space-y-2">
                          {post.cards.map(card => (
                            <div key={card.cardNumber} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                              <p className="text-[10px] text-white/30 font-medium mb-1">CARD {card.cardNumber}</p>
                              <p className="text-white/70 text-sm">{card.text}</p>
                              {card.imageDirection && <p className="text-white/30 text-[11px] mt-1.5 italic">🖼️ {card.imageDirection}</p>}
                            </div>
                          ))}
                        </div>
                        {post.caption && (
                          <div>
                            <p className="text-[10px] text-white/30 font-medium mb-1">LEGENDA</p>
                            <p className="text-white/50 text-xs leading-relaxed">{post.caption}</p>
                          </div>
                        )}
                        {post.hashtags && <p className="text-purple-400/60 text-[11px]">{post.hashtags}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
