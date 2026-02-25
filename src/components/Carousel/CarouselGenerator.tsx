import React, { useState, useRef, useEffect } from 'react';
import '@/styles/carousel-loader.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Sparkles, Download, Plus, Trash2, Image as ImageIcon, 
  Search, Edit3, Loader2, X, Upload, Wand2, Type, Palette, Globe, Paperclip, SlidersHorizontal,
  Save, History, Clock, RotateCcw, ChevronLeft, ChevronRight, Check, ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import StepTopic from './wizard/StepTopic';
import StepReferences from './wizard/StepReferences';
import StepImageSettings from './wizard/StepImageSettings';
import StepStyle, { STYLE_PRESETS, StylePreset } from './wizard/StepStyle';
import CarouselEditorSidebar from './editor/CarouselEditorSidebar';
import SocialPublishDialog from './SocialPublishDialog';
import { ReferenceImage, FamousPerson, ImageSettings, DEFAULT_IMAGE_SETTINGS, FLOW_COLOR } from './wizard/types';

const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_W = 300;
const PREVIEW_H = PREVIEW_W * (CARD_H / CARD_W);

const FONT_OPTIONS = [
  { label: 'Playfair Display', value: "'Playfair Display', 'Georgia', serif", google: 'Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700' },
  { label: 'Merriweather', value: "'Merriweather', 'Georgia', serif", google: 'Merriweather:wght@400;700;900' },
  { label: 'Lora', value: "'Lora', 'Georgia', serif", google: 'Lora:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'DM Serif Display', value: "'DM Serif Display', 'Georgia', serif", google: 'DM+Serif+Display:ital@0;1' },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', 'Georgia', serif", google: 'Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'Montserrat', value: "'Montserrat', 'Helvetica Neue', sans-serif", google: 'Montserrat:wght@400;500;600;700;800;900' },
  { label: 'Poppins', value: "'Poppins', 'Helvetica Neue', sans-serif", google: 'Poppins:wght@400;500;600;700;800;900' },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Impact', sans-serif", google: 'Bebas+Neue' },
  { label: 'Oswald', value: "'Oswald', 'Impact', sans-serif", google: 'Oswald:wght@400;500;600;700' },
  { label: 'Raleway', value: "'Raleway', 'Helvetica Neue', sans-serif", google: 'Raleway:wght@400;500;600;700;800;900' },
  // New fonts
  { label: 'Inter', value: "'Inter', 'Helvetica Neue', sans-serif", google: 'Inter:wght@400;500;600;700;800;900' },
  { label: 'Space Grotesk', value: "'Space Grotesk', 'Helvetica Neue', sans-serif", google: 'Space+Grotesk:wght@400;500;600;700' },
  { label: 'Sora', value: "'Sora', 'Helvetica Neue', sans-serif", google: 'Sora:wght@400;500;600;700;800' },
  { label: 'Outfit', value: "'Outfit', 'Helvetica Neue', sans-serif", google: 'Outfit:wght@400;500;600;700;800;900' },
  { label: 'Clash Display', value: "'Clash Display', 'Impact', sans-serif", google: 'Archivo+Black' },
  { label: 'Crimson Text', value: "'Crimson Text', 'Georgia', serif", google: 'Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', 'Georgia', serif", google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { label: 'Source Serif Pro', value: "'Source Serif Pro', 'Georgia', serif", google: 'Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,700' },
  { label: 'Archivo Black', value: "'Archivo Black', 'Impact', sans-serif", google: 'Archivo+Black' },
  { label: 'Anton', value: "'Anton', 'Impact', sans-serif", google: 'Anton' },
];

interface CarouselCard {
  type: 'cover' | 'content' | 'cta';
  title?: string;
  subtitle?: string;
  body?: string;
  bodyTop?: string;
  bodyBottom?: string;
  imageUrl?: string;
  imagePrompt?: string;
  searchTerms?: string[];
  needsImage?: boolean;
  isAiImage?: boolean;
  layout?: 'dark' | 'light' | 'accent';
  fontScale?: number;
  paddingScale?: number;
}

interface CarouselData {
  title: string;
  cards: CarouselCard[];
}

interface PexelsImage {
  id: number;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
}

const CarouselGenerator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const WIZARD_STEPS = ['Tema', 'Referências', 'Imagem', 'Estilo'];

  // Step 1: Topic
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [cardCount, setCardCount] = useState(7);
  const [imageCardCount, setImageCardCount] = useState(4);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);

  // Step 2: References
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [famousList, setFamousList] = useState<FamousPerson[]>([]);
  const [famousImages, setFamousImages] = useState<{ username: string; images: any[] }[]>([]);
  const [brandAssets, setBrandAssets] = useState<{ id: string; name: string; file_url: string; category: string }[]>([]);

  // Step 3: Image settings
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);

  // Step 4: Style
  const [showHeader, setShowHeader] = useState(true);
  const [brandName, setBrandName] = useState('Powered by ellosuit');
  const [userName, setUserName] = useState('');
  const [dateLabel, setDateLabel] = useState(() => {
    const d = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[d.getMonth()]} ${d.getFullYear()} ®`;
  });
  const [bgColor, setBgColor] = useState('#0F0F1A');
  const [accentColor, setAccentColor] = useState('#E84D1A');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [selectedFont, setSelectedFont] = useState(0);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [carouselData, setCarouselData] = useState<CarouselData | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState('');
  const [searchingImages, setSearchingImages] = useState(false);
  const [pexelsImages, setPexelsImages] = useState<PexelsImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState<number | null>(null);
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [regeneratingCard, setRegeneratingCard] = useState<number | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [regenMenuOpen, setRegenMenuOpen] = useState<number | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [editorRefImage, setEditorRefImage] = useState<string | null>(null);

  const handleEditorRefImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setEditorRefImage(url);
  };

  // Web search state
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<{ summary: string; citations: string[]; content?: any; images?: string[] } | null>(null);

  const handleSearchWeb = async () => {
    if (!topic.trim()) return;
    setSearchingWeb(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-news', {
        body: { topic: topic.trim(), language: 'pt-BR' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro na pesquisa');
      
      const content = data.content;
      setWebSearchResult({
        summary: content.summary || 'Conteúdo encontrado com sucesso',
        citations: data.citations || [],
        content,
        images: data.images || [],
      });

      // Auto-fill topic with richer content
      if (content.title) {
        setTopic(content.title + (content.subtitle ? '\n\n' + content.subtitle : ''));
      }

      // Auto-fill keywords from image search terms
      if (content.image_search_terms?.length > 0) {
        setKeywords(content.image_search_terms.join(', '));
      }

      toast({ title: '🌐 Pesquisa concluída!', description: `${data.citations?.length || 0} fontes encontradas. O conteúdo será usado na geração.` });
    } catch (err: any) {
      console.error('Web search error:', err);
      toast({ title: 'Erro na pesquisa', description: err.message, variant: 'destructive' });
    } finally {
      setSearchingWeb(false);
    }
  };

  const [savingCarousel, setSavingCarousel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [carouselHistory, setCarouselHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);

  const currentFont = FONT_OPTIONS[selectedFont];
  const serif = currentFont.value;
  const sans = "'Inter', 'Helvetica Neue', sans-serif";
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${FONT_OPTIONS.map(f => f.google).join('&family=')}&family=Inter:wght@400;500;600;700;800&display=swap`;

  useEffect(() => {
    const fetchBrandAssets = async () => {
      if (!user?.id) return;
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
      if (!cu) return;
      const { data } = await supabase.from('brand_assets').select('id, name, file_url, category').eq('company_id', cu.company_id).eq('file_type', 'image').order('created_at', { ascending: false });
      if (data) setBrandAssets(data);
    };
    fetchBrandAssets();
  }, [user?.id]);

  // Auto-load history on mount
  useEffect(() => {
    loadHistory();
  }, [user?.id]);

  // Handle Facebook OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && searchParams.get('fb_callback') === '1') {
      const state = localStorage.getItem('fb_oauth_state');
      if (state) {
        const { companyId, userId, redirectUri } = JSON.parse(state);
        supabase.functions.invoke('facebook-auth', {
          body: { action: 'exchange_code', code, redirectUri, userId, companyId },
        }).then(({ data, error }) => {
          if (error || !data?.success) {
            toast({ title: 'Erro ao conectar Facebook', description: error?.message || 'Tente novamente', variant: 'destructive' });
          } else {
            toast({ title: '✅ Contas conectadas!', description: `${data.connections} contas vinculadas (${data.pages?.join(', ')})` });
          }
          localStorage.removeItem('fb_oauth_state');
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        });
      }
    }
  }, [searchParams]);

  // ===== BUILD IMAGE PROMPT with settings =====
  const buildImagePrompt = (basePrompt: string): string => {
    const parts: string[] = [];
    
    // Image type
    const typeMap: Record<string, string> = {
      'photo': 'Professional photorealistic photograph',
      'cinematic': 'Cinematic film still, movie-quality',
      'illustration': 'High-quality digital illustration, artistic',
      'print': 'Screenshot/print of a digital interface, UI design',
      '3d-render': 'Professional 3D render, octane render quality',
    };
    parts.push(typeMap[imageSettings.imageType] || 'Professional photograph');

    // Main description
    parts.push(basePrompt);

    // Body position
    if (imageSettings.bodyPosition) {
      const posMap: Record<string, string> = {
        'standing': 'person standing upright',
        'sitting': 'person sitting',
        'walking': 'person walking confidently',
        'leaning': 'person leaning casually',
        'arms-crossed': 'person with arms crossed confidently',
        'presenting': 'person presenting/gesturing',
        'pointing': 'person pointing forward',
      };
      parts.push(posMap[imageSettings.bodyPosition] || '');
    }

    // Hand object
    if (imageSettings.handObject) {
      const handMap: Record<string, string> = {
        'smartphone': `holding a smartphone${imageSettings.phoneScreen ? ` showing ${imageSettings.phoneScreen} on the screen` : ''}`,
        'laptop': 'holding/using a laptop',
        'tablet': 'holding a tablet',
        'coffee': 'holding a coffee cup',
        'pen': 'holding a pen/stylus',
        'microphone': 'holding a microphone',
        'product': 'holding a product box',
        'document': 'holding a document/paper',
      };
      parts.push(handMap[imageSettings.handObject] || '');
    }

    // Lighting
    const lightMap: Record<string, string> = {
      'cinematic': 'cinematic lighting with dramatic shadows',
      'natural': 'natural daylight, warm tones',
      'studio': 'studio lighting, clean and professional',
      'dramatic': 'dramatic high-contrast lighting, deep shadows',
      'soft': 'soft diffused lighting, gentle shadows',
      'neon': 'neon lighting, cyberpunk atmosphere, colorful glow',
    };
    parts.push(lightMap[imageSettings.lightingStyle] || 'cinematic lighting');

    // Camera angle
    const angleMap: Record<string, string> = {
      'front': 'front view',
      'side': 'side profile view',
      'low-angle': 'low angle shot looking up',
      'high-angle': 'high angle shot looking down',
      'close-up': 'close-up portrait',
      'full-body': 'full body shot',
    };
    parts.push(angleMap[imageSettings.cameraAngle] || '');

    // Fidelity
    if (imageSettings.fidelity === 'high') {
      parts.push('Extremely faithful to reference images. Reproduce exact features, colors, and details.');
    } else if (imageSettings.fidelity === 'creative') {
      parts.push('Creative artistic interpretation inspired by the references. Take artistic liberties.');
    }

    parts.push('4:5 portrait aspect ratio, 1080x1350px, ultra high resolution');

    return parts.filter(Boolean).join('. ');
  };

  // ===== GENERATE IMAGE (routes to Gemini or Higgsfield) =====
  const generateImage = async (opts: {
    prompt: string;
    faceReferenceUrls?: string[];
    styleReferenceUrls?: string[];
    negativePrompt?: string;
  }): Promise<string | null> => {
    const resolvedModel = imageSettings.model === 'auto'
      ? ((opts.faceReferenceUrls?.length ?? 0) > 0 ? 'nano-banana' : 'gemini')
      : imageSettings.model;

    // === HIGGSFIELD PATH ===
    if (resolvedModel === 'higgsfield') {
      const { data, error } = await supabase.functions.invoke('higgsfield-generate', {
        body: {
          action: 'generate-and-wait',
          prompt: opts.prompt,
          model_id: imageSettings.higgsFieldModel || 'higgsfield-ai/soul/standard',
          aspect_ratio: '3:4',
          resolution: '720p',
          max_wait_seconds: 120,
        },
      });
      if (error) throw error;
      if (data?.success && data?.imageUrl) return data.imageUrl;
      if (data?.error) throw new Error(data.error);
      return null;
    }

    // === GEMINI / NANO BANANA PATH ===
    const { data, error } = await supabase.functions.invoke('generate-carousel', {
      body: {
        action: 'generate-ai-image',
        prompt: opts.prompt,
        imageSize: '3:4',
        topic: opts.prompt,
        faceReferenceUrls: opts.faceReferenceUrls,
        styleReferenceUrls: opts.styleReferenceUrls,
        imageModel: imageSettings.model,
        negativePrompt: opts.negativePrompt,
        fidelity: imageSettings.fidelity,
      },
    });
    if (error) throw error;
    if (data?.success && data?.imageUrl) return data.imageUrl;
    return null;
  };

  // ===== ENHANCE PROMPT =====
  const enhancePrompt = async () => {
    if (!topic.trim()) { toast({ title: 'Insira um tópico primeiro', variant: 'destructive' }); return; }
    setEnhancingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'enhance-prompt', prompt: topic.trim(), topic: topic.trim() },
      });
      if (error) throw error;
      if (data?.enhancedPrompt) { setTopic(data.enhancedPrompt); toast({ title: 'Prompt melhorado com IA!' }); }
    } catch (err) {
      toast({ title: 'Erro ao melhorar prompt', variant: 'destructive' });
    } finally {
      setEnhancingPrompt(false);
    }
  };

  // ===== SAVE / LOAD =====
  const saveCarousel = async () => {
    if (!carouselData) return;
    setSavingCarousel(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');
      const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
      if (!companyData) throw new Error('Empresa não encontrada');
      const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings };
      if (currentCarouselId) {
        await supabase.from('generated_carousels').update({ title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length }).eq('id', currentCarouselId);
        toast({ title: 'Carrossel atualizado!' });
      } else {
        const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length }).select('id').single();
        setCurrentCarouselId(inserted?.id || null);
        toast({ title: 'Carrossel salvo!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSavingCarousel(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
      if (!companyData) return;
      const { data } = await supabase.from('generated_carousels').select('*').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(50);
      setCarouselHistory(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const loadCarousel = (item: any) => {
    setCarouselData(item.carousel_data);
    setTopic(item.topic);
    setKeywords((item.keywords || []).join(', '));
    setCurrentCarouselId(item.id);
    if (item.style_config) {
      const sc = item.style_config;
      if (sc.bgColor) setBgColor(sc.bgColor);
      if (sc.accentColor) setAccentColor(sc.accentColor);
      if (sc.textColor) setTextColor(sc.textColor);
      if (sc.selectedFont !== undefined) setSelectedFont(sc.selectedFont);
      if (sc.brandName) setBrandName(sc.brandName);
      if (sc.userName) setUserName(sc.userName);
      if (sc.dateLabel) setDateLabel(sc.dateLabel);
      if (sc.imageSettings) setImageSettings(sc.imageSettings);
    }
    setShowHistory(false);
    setActiveCardIndex(0);
    toast({ title: 'Carrossel carregado!' });
  };

  const deleteCarousel = async (id: string) => {
    await supabase.from('generated_carousels').delete().eq('id', id);
    setCarouselHistory(prev => prev.filter(c => c.id !== id));
    if (currentCarouselId === id) setCurrentCarouselId(null);
    toast({ title: 'Carrossel removido' });
  };

  // ===== GENERATE =====
  const generateContent = async () => {
    if (!topic.trim()) { toast({ title: 'Insira um tópico', variant: 'destructive' }); return; }
    setGenerating(true);
    try {
      const imageCardIndices: number[] = [0];
      const contentIndices = Array.from({ length: cardCount - 2 }, (_, i) => i + 1);
      const shuffled = contentIndices.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(imageCardCount - 1, shuffled.length); i++) imageCardIndices.push(shuffled[i]);

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount,
          imageCardIndices: imageCardIndices.sort((a, b) => a - b),
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar');

      const cards: CarouselCard[] = data.data.cards.map((c: any, i: number) => {
        if (c.type === 'cover') return { ...c, layout: 'dark' as const };
        if (c.type === 'cta') return { ...c, layout: 'accent' as const };
        const layouts: CarouselCard['layout'][] = ['dark', 'dark', 'light', 'accent', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setActiveCardIndex(0);
      setGeneratingAllImages(true);
      setImageGenProgress('🔍 Buscando referências na web...');

      // ONLY use images the user explicitly selected in the References step (category 'general')
      const selectedImages = referenceImages.filter(r => r.category === 'general').map(r => r.url);
      console.log('User-selected images:', selectedImages.length);

      // Filter out placeholder/broken image URLs
      const isValidImageUrl = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lower = url.toLowerCase();
        if (lower.includes('placeholder') || lower.includes('1x1') || lower.includes('spacer')) return false;
        if (lower.includes('data:image/svg') || lower.includes('data:image/gif')) return false;
        if (lower.endsWith('.svg') || lower.endsWith('.gif')) return false;
        if (lower.includes('blank.') || lower.includes('empty.') || lower.includes('pixel.')) return false;
        if (lower.includes('logo') && (lower.includes('icon') || lower.includes('favicon'))) return false;
        if (!lower.startsWith('http') && !lower.startsWith('data:image')) return false;
        return true;
      };

      const webImagePool = selectedImages.filter(isValidImageUrl);
      console.log('Valid selected image pool:', webImagePool.length);

      // Determine if we have face/brand references attached
      const updatedCards = [...cards];
      const faceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const hasFaceOrBrandRefs = faceRefUrls.length > 0 || styleRefUrls.length > 0;

      // Extract the clean topic from web search to always include in AI prompts
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();

      // STRATEGY: Use real web photos first, only use AI when face/brand refs are attached
      let webImageIndex = 0;
      const imagePromises: { index: number; promise: Promise<string | null> }[] = [];
      let totalImages = 0;
      let realImagesUsed = 0;
      let aiImagesQueued = 0;

      for (let i = 0; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        if (card.needsImage || card.type === 'cover' || imageCardIndices.includes(i)) {
          totalImages++;

          const isCover = card.type === 'cover';

          // COVER cards ALWAYS use AI generation (never Pexels/web)
          if (isCover || hasFaceOrBrandRefs) {
            aiImagesQueued++;
            const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
            // ALWAYS prefix with clean topic so AI knows the subject (e.g. "CS2: ...")
      const imgPrompt = `${cleanTopic}: ${cardDesc}`;
            const coverNegative = isCover ? 'no text, no words, no letters, no typography, no writing, no captions, no watermarks' : '';
            const finalNegative = [coverNegative, imageSettings.negativePrompt].filter(Boolean).join(', ') || undefined;
            imagePromises.push({
              index: i,
              promise: (async () => {
                try {
                  return await generateImage({
                    prompt: buildImagePrompt(imgPrompt) + (isCover ? '. NO TEXT OR WORDS IN THE IMAGE.' : ''),
                    faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
                    styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
                    negativePrompt: finalNegative,
                  });
                } catch (err) { console.error('Image gen error for card', i, err); }
                return null;
              })(),
            });
          } else if (webImagePool.length > webImageIndex) {
            // Content cards: use user-selected image
            updatedCards[i] = { ...updatedCards[i], imageUrl: webImagePool[webImageIndex], isAiImage: false };
            webImageIndex++;
            realImagesUsed++;
          } else {
            // No selected images left — search Brave for a unique image for this card
            const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
            const searchQuery = `${cleanTopic} ${cardDesc}`.slice(0, 80);
            imagePromises.push({
              index: i,
              promise: (async () => {
                try {
                  // Search Brave for this specific card
                  const { data: searchData } = await supabase.functions.invoke('generate-carousel', {
                    body: { action: 'web-search', query: searchQuery },
                  });
                  const foundImages = (searchData?.images || [])
                    .map((img: any) => img.url)
                    .filter((url: string) => isValidImageUrl(url));
                  if (foundImages.length > 0) {
                    // Pick a random one to avoid repetition
                    const randomIdx = Math.floor(Math.random() * Math.min(foundImages.length, 5));
                    return foundImages[randomIdx];
                  }
                  // Brave found nothing — fall back to AI generation
                  return await generateImage({
                    prompt: buildImagePrompt(`${cleanTopic}: ${cardDesc}`),
                    negativePrompt: imageSettings.negativePrompt || undefined,
                  });
                } catch (err) {
                  console.error('Image search/gen error for card', i, err);
                  return null;
                }
              })(),
            });
            aiImagesQueued++;
          }
        }
      }

      if (imagePromises.length > 0) {
        setImageGenProgress(`🎨 ${realImagesUsed} fotos reais + ${aiImagesQueued} imagens IA...`);
        const imageResults = await Promise.all(imagePromises.map(p => p.promise));
        imagePromises.forEach((p, idx) => {
          const url = imageResults[idx];
          if (url) updatedCards[p.index] = { ...updatedCards[p.index], imageUrl: url, isAiImage: true };
        });
      } else {
        setImageGenProgress(`📸 ${realImagesUsed} fotos reais aplicadas!`);
      }

      const finalData = { ...data.data, cards: updatedCards };
      setCarouselData(finalData);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      toast({ title: 'Carrossel completo!', description: `${cards.length} cards com ${totalImages} imagens gerados` });

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings };
            const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length }).select('id').single();
            if (inserted) setCurrentCarouselId(inserted.id);
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const [imageSearchPage, setImageSearchPage] = useState(1);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);

  const searchImages = async (kws?: string[], page = 1, append = false) => {
    if (append) setLoadingMoreImages(true); else setSearchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', { body: { action: 'search-images', topic: topic.trim(), keywords: kws || keywords.split(',').map(k => k.trim()).filter(Boolean), perPage: 12, page } });
      if (error) throw error;
      if (data?.images) {
        if (append) setPexelsImages(prev => [...prev, ...data.images]);
        else setPexelsImages(data.images);
        setImageSearchPage(page);
      }
    } catch (err) { console.error(err); }
    finally { setSearchingImages(false); setLoadingMoreImages(false); }
  };

  const setCardImage = (cardIndex: number, imageUrl: string) => {
    if (!carouselData) return;
    const newCards = [...carouselData.cards];
    newCards[cardIndex] = { ...newCards[cardIndex], imageUrl };
    setCarouselData({ ...carouselData, cards: newCards });
    setShowImagePicker(null);
  };

  const generateAiImage = async (cardIndex: number) => {
    const promptText = aiImagePrompt.trim() || carouselData?.cards[cardIndex]?.imagePrompt || carouselData?.cards[cardIndex]?.title || topic;
    if (!promptText) { toast({ title: 'Insira um prompt', variant: 'destructive' }); return; }
    setGeneratingAiImage(true);
    try {
      const faceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const styleRefUrls = [
        ...referenceImages.filter(r => r.category === 'style').map(r => r.url),
        ...(editorRefImage ? [editorRefImage] : []),
      ];
      const imageUrl = await generateImage({
        prompt: buildImagePrompt(promptText),
        faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
        styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
        negativePrompt: imageSettings.negativePrompt || undefined,
      });
      if (!imageUrl) throw new Error('Não foi possível gerar a imagem');
      setCardImage(cardIndex, imageUrl);
      setAiImagePrompt('');
      toast({ title: 'Imagem gerada!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const updateCard = (index: number, updates: Partial<CarouselCard>) => {
    if (!carouselData) return;
    const newCards = [...carouselData.cards];
    newCards[index] = { ...newCards[index], ...updates };
    setCarouselData({ ...carouselData, cards: newCards });
  };

  const updateAllCards = (updates: Partial<CarouselCard>) => {
    if (!carouselData) return;
    const newCards = carouselData.cards.map(c => ({ ...c, ...updates }));
    setCarouselData({ ...carouselData, cards: newCards });
  };

  const addCard = () => {
    if (!carouselData) return;
    const newCard: CarouselCard = { type: 'content', bodyTop: 'Texto principal aqui...', bodyBottom: 'Texto complementar...', layout: 'dark' };
    const cards = [...carouselData.cards];
    cards.splice(cards.length - 1, 0, newCard);
    setCarouselData({ ...carouselData, cards });
  };

  const removeCard = (index: number) => {
    if (!carouselData || carouselData.cards.length <= 2) return;
    const cards = carouselData.cards.filter((_, i) => i !== index);
    setCarouselData({ ...carouselData, cards });
    if (activeCardIndex >= cards.length) setActiveCardIndex(cards.length - 1);
  };

  const regenerateCard = async (cardIndex: number) => {
    if (!carouselData) return;
    const card = carouselData.cards[cardIndex];
    setRegeneratingCard(cardIndex);
    try {
      // 1. Regenerate text content for this card
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: 3, // Generate minimal (cover + 1 content + cta)
          imageCardIndices: [1],
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          regenerateCardIndex: cardIndex, // hint to backend
        },
      });
      
      let newBody = card.bodyTop || card.body || '';
      let newBottomText = card.bodyBottom || '';
      let newImagePrompt = card.imagePrompt || '';
      
      if (!error && data?.success && data?.data?.cards) {
        // Pick a content card from the result
        const contentCards = data.data.cards.filter((c: any) => c.type === 'content');
        if (contentCards.length > 0) {
          const src = contentCards[0];
          newBody = src.bodyTop || src.body || newBody;
          newBottomText = src.bodyBottom || newBottomText;
          newImagePrompt = src.imagePrompt || src.title || newImagePrompt;
        }
      }

      // 2. Regenerate image
      let newImageUrl = card.imageUrl;
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();
      const imgPrompt = `${cleanTopic}: ${newImagePrompt || newBody.slice(0, 100)}`;
      try {
        const { data: imgData, error: imgError } = await supabase.functions.invoke('generate-carousel', {
          body: { action: 'web-search', query: imgPrompt.slice(0, 80) },
        });
        if (!imgError && imgData?.images?.length > 0) {
          // Pick a random image from results
          const randomIdx = Math.floor(Math.random() * Math.min(imgData.images.length, 5));
          newImageUrl = imgData.images[randomIdx]?.url || newImageUrl;
        }
      } catch { /* keep old image */ }

      // 3. Update card
      const newCards = [...carouselData.cards];
      newCards[cardIndex] = {
        ...newCards[cardIndex],
        bodyTop: newBody,
        bodyBottom: newBottomText,
        imagePrompt: newImagePrompt,
        imageUrl: newImageUrl,
        isAiImage: false,
      };
      setCarouselData({ ...carouselData, cards: newCards });
      toast({ title: '✨ Card regenerado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao regenerar', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingCard(null);
    }
  };

  const handleFileUpload = (cardIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setCardImage(cardIndex, e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const exportAllCards = async () => {
    if (!carouselData) return;
    setExporting(true);
    try {
      for (let i = 0; i < carouselData.cards.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { width: CARD_W, height: CARD_H, scale: 1, useCORS: true, allowTaint: true, backgroundColor: null });
        const link = document.createElement('a');
        link.download = `carousel-card-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(r => setTimeout(r, 300));
      }
      toast({ title: 'Download completo!' });
    } catch (err) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // ==================== RENDER HELPERS ====================
  const renderAccentText = (text: string, color: string, baseColor: string, fontSize: number, s: number) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) return <span key={i} style={{ color }}>{part.slice(2, -2)}</span>;
          return <span key={i} style={{ color: baseColor }}>{part}</span>;
        })}
      </span>
    );
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W;
    const fs = card.fontScale ?? 1.0;
    const ps = card.paddingScale ?? 1.0;
    const layout = card.layout || 'dark';
    const isLight = layout === 'light';
    const isAccent = layout === 'accent';
    const bg = isAccent ? accentColor : isLight ? '#F8F4EF' : bgColor;
    const mainTxt = isAccent ? '#FFFFFF' : isLight ? '#1A1A1A' : textColor;
    const secondaryTxt = isAccent ? 'rgba(255,255,255,0.75)' : isLight ? '#666' : 'rgba(255,255,255,0.75)';
    const accentTxt = isAccent ? '#FFFFFF' : accentColor;
    const headerTxt = isLight ? '#999' : 'rgba(255,255,255,0.5)';

    const renderHeader = () => {
      if (!showHeader) return null;
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${28 * s * ps}px ${48 * s * ps}px`, fontFamily: sans, fontSize: `${20 * s * fs}px`, fontWeight: 500, color: headerTxt, letterSpacing: `${0.5 * s}px`, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <span>{brandName}</span>
          <span>{userName ? `@${userName}` : ''}</span>
          <span>{dateLabel}</span>
        </div>
      );
    };

    if (card.type === 'cover') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 0, backgroundColor: bg }}>
          {card.imageUrl && <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: card.imageUrl ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.25) 100%)' : `linear-gradient(180deg, ${bgColor} 0%, ${accentColor}44 100%)` }} />
          <div style={{ position: 'absolute', bottom: `${40 * s * ps}px`, left: `${48 * s * ps}px`, right: `${48 * s * ps}px`, zIndex: 10, textAlign: 'center' }}>
            <h1 style={{ fontFamily: serif, fontSize: `${96 * s * fs}px`, fontWeight: 900, lineHeight: 1.0, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: `-${1 * s}px`, textShadow: '0 4px 40px rgba(0,0,0,0.7)' }}>
              {renderAccentText(card.title || '', accentColor, '#FFFFFF', 76, s)}
            </h1>
            {card.subtitle && <p style={{ fontFamily: sans, fontSize: `${22 * s * fs}px`, fontWeight: 600, color: '#FFFFFF', opacity: 0.85, marginTop: `${16 * s}px`, lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>→ {card.subtitle}</p>}
          </div>
        </div>
      );
    }

    if (card.type === 'cta') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
          {card.imageUrl && (<><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)' }} /></>)}
          {renderHeader()}
          <div style={{ position: 'absolute', inset: `${100 * s * ps}px ${48 * s * ps}px ${60 * s * ps}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10 }}>
            <div style={{ width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: '50%', backgroundColor: isAccent ? 'rgba(255,255,255,0.15)' : accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${36 * s}px`, color: '#FFF', fontFamily: sans, marginBottom: `${40 * s}px` }}>✦</div>
            <h2 style={{ fontFamily: serif, fontSize: `${68 * s * fs}px`, fontWeight: 900, lineHeight: 1.05, color: mainTxt, marginBottom: `${30 * s}px` }}>{card.title}</h2>
            {card.body && <p style={{ fontFamily: serif, fontSize: `${34 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: mainTxt, fontStyle: 'italic', opacity: 0.8, maxWidth: `${900 * s}px` }}>"{card.body}"</p>}
            {userName && <div style={{ marginTop: `${50 * s}px`, padding: `${16 * s}px ${36 * s}px`, border: `${2.5 * s}px solid ${mainTxt}`, borderRadius: `${50 * s}px` }}><p style={{ fontFamily: sans, fontSize: `${22 * s * fs}px`, fontWeight: 700, color: mainTxt, textTransform: 'uppercase', letterSpacing: `${2 * s}px` }}>@{userName}</p></div>}
          </div>
        </div>
      );
    }

    // CONTENT CARDS
    const hasImage = !!card.imageUrl;
    const topText = card.bodyTop || card.body || card.title || '';
    const bottomText = card.bodyBottom || '';

    if (!hasImage && isAccent) {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
          {renderHeader()}
           <div style={{ position: 'absolute', top: `${80 * s * ps}px`, left: `${56 * s * ps}px`, right: `${56 * s * ps}px`, bottom: `${48 * s * ps}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', zIndex: 5, paddingTop: `${30 * s * ps}px`, gap: `${24 * s}px` }}>
            <p style={{ fontFamily: serif, fontSize: `${58 * s * fs}px`, fontWeight: 700, lineHeight: 1.2, color: mainTxt }}>{renderAccentText(topText, accentTxt, mainTxt, 58, s)}</p>
            {bottomText && <p style={{ fontFamily: serif, fontSize: `${38 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: secondaryTxt, marginTop: 'auto', textDecoration: 'underline', textDecorationColor: `${secondaryTxt}55`, textUnderlineOffset: `${6 * s}px` }}>{bottomText}</p>}
          </div>
        </div>
      );
    }

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
        {renderHeader()}
        <div style={{ position: 'absolute', top: `${80 * s * ps}px`, left: `${56 * s * ps}px`, right: `${56 * s * ps}px`, bottom: `${48 * s * ps}px`, display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden', gap: `${24 * s}px` }}>
          {/* Top text area */}
          <div style={{ flex: hasImage ? '0 0 auto' : '1', display: hasImage ? undefined : 'flex', flexDirection: hasImage ? undefined : 'column', justifyContent: hasImage ? undefined : 'center', overflow: 'hidden', maxHeight: hasImage ? '35%' : undefined }}>
            <p style={{ fontFamily: serif, fontSize: `${(hasImage ? 42 : 56) * s * fs}px`, fontWeight: 700, lineHeight: 1.22, color: mainTxt, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: hasImage ? 4 : 10, WebkitBoxOrient: 'vertical' as any }}>{renderAccentText(topText, accentTxt, mainTxt, (hasImage ? 42 : 56) * fs, s)}</p>
          </div>
          {/* Image area with margin/gap */}
          {hasImage && <div style={{ flex: '1 1 auto', minHeight: 0, borderRadius: `${20 * s}px`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; if (el.parentElement) el.parentElement.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
          {/* Bottom text */}
          {bottomText && <div style={{ flex: '0 0 auto', overflow: 'hidden', maxHeight: hasImage ? '16%' : undefined }}><p style={{ fontFamily: serif, fontSize: `${(hasImage ? 32 : 42) * s * fs}px`, fontWeight: 500, lineHeight: 1.35, color: hasImage ? mainTxt : secondaryTxt, opacity: 0.85, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: hasImage ? 2 : 5, WebkitBoxOrient: 'vertical' as any }}>{renderAccentText(bottomText, accentTxt, hasImage ? mainTxt : secondaryTxt, (hasImage ? 32 : 42) * fs, s)}</p></div>}
        </div>
      </div>
    );
  };

  // ==================== UI ====================
  const canProceed = wizardStep === 0 ? (topic.trim().length > 0 && webSearchResult !== null) : true;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0A0A' }}>
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* ===== DARK HEADER when carousel is generated ===== */}
      {carouselData && !generatingAllImages && editingCard === null && (
        <div className="sticky top-0 z-30" style={{ backgroundColor: 'transparent', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
            <button onClick={() => { setCarouselData(null); setCurrentCarouselId(null); }} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate text-white">{carouselData.title || topic || 'Carrossel'}</h1>
              <p className="text-xs text-white/40">{carouselData.cards.length} cards</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
              <button onClick={saveCarousel} disabled={savingCarousel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                {savingCarousel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{currentCarouselId ? 'Atualizar' : 'Salvar'}</span>
              </button>
              <button onClick={exportAllCards} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white border transition-all disabled:opacity-50"
                style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' }}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button onClick={() => setShowPublishDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Publicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Normal header for editor mode */}
      {carouselData && !generatingAllImages && editingCard !== null && null}

      <div className={carouselData && editingCard === null ? '' : 'flex-1 flex flex-col'} style={carouselData && editingCard === null ? { flex: 1, display: 'flex', flexDirection: 'column' } : undefined}>
        {/* ========== WIZARD - DARK THEME ========== */}
        {!carouselData && !generating && !generatingAllImages && (
          <div className="flex-1 flex flex-col w-full relative overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>
            {/* Subtle ambient glow accents */}
            <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(120,80,220,0.8) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-150px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(160,100,255,0.6) 0%, transparent 70%)' }} />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[2px] pointer-events-none opacity-[0.03]" style={{ background: 'linear-gradient(90deg, transparent, rgba(140,90,240,0.5), transparent)' }} />

            {/* Header */}
            <div className="px-8 pt-6 pb-4 w-full relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
                    <ArrowLeft className="h-5 w-5 text-white/40" />
                  </button>
                  <div>
                    <h1 className="text-lg font-semibold text-white tracking-tight">Criar Carrossel</h1>
                    <p className="text-xs text-white/25 mt-0.5">Gere posts editoriais com IA</p>
                  </div>
                </div>

                {/* Step indicator inline */}
                <div className="flex items-center gap-1">
                  {WIZARD_STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                      <button onClick={() => i <= wizardStep && setWizardStep(i)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          i === wizardStep
                            ? 'bg-white text-black'
                            : i < wizardStep
                              ? 'bg-white/[0.08] text-white/60'
                              : 'bg-white/[0.03] text-white/20'
                        }`}
                        style={{ cursor: i <= wizardStep ? 'pointer' : 'default' }}>
                        {i < wizardStep ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                      {i < WIZARD_STEPS.length - 1 && (
                        <div className={`w-4 h-px ${i < wizardStep ? 'bg-white/20' : 'bg-white/[0.06]'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Content — fixed min-height to prevent layout shifts */}
            <div className="w-full px-8 flex-1 overflow-y-auto pb-6 relative z-10" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 200px)' }}>
              {wizardStep === 0 && (
                <StepTopic topic={topic} setTopic={setTopic} keywords={keywords} setKeywords={setKeywords}
                  cardCount={cardCount} setCardCount={setCardCount} imageCardCount={imageCardCount} setImageCardCount={setImageCardCount}
                  enhancingPrompt={enhancingPrompt} onEnhance={enhancePrompt}
                  searchingWeb={searchingWeb} onSearchWeb={handleSearchWeb} webSearchResult={webSearchResult} />
              )}
              {wizardStep === 1 && (
                <StepReferences referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                  famousList={famousList} setFamousList={setFamousList}
                  famousImages={famousImages} setFamousImages={setFamousImages}
                  brandAssets={brandAssets}
                  webImages={webSearchResult?.images} />
              )}
              {wizardStep === 2 && (
                <StepImageSettings settings={imageSettings} onChange={setImageSettings} />
              )}
              {wizardStep === 3 && (
                <StepStyle bgColor={bgColor} setBgColor={setBgColor} accentColor={accentColor} setAccentColor={setAccentColor}
                  textColor={textColor} setTextColor={setTextColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                  brandName={brandName} setBrandName={setBrandName} userName={userName} setUserName={setUserName}
                  dateLabel={dateLabel} setDateLabel={setDateLabel}
                  showHeader={showHeader} setShowHeader={setShowHeader} />
              )}
            </div>

            {/* Bottom nav bar — fixed */}
            <div className="flex items-center justify-between px-8 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
                disabled={wizardStep === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white/30 hover:text-white/60 transition-all disabled:opacity-0">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>

              {wizardStep === 0 && !webSearchResult && topic.trim() ? (
                <button onClick={handleSearchWeb} disabled={searchingWeb}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-white text-black transition-all hover:bg-white/90 disabled:opacity-50">
                  {searchingWeb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  {searchingWeb ? 'Pesquisando...' : 'Pesquisar na Web'}
                </button>
              ) : wizardStep < WIZARD_STEPS.length - 1 ? (
                <button onClick={() => setWizardStep(wizardStep + 1)} disabled={!canProceed}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold bg-white text-black transition-all hover:bg-white/90 disabled:opacity-30">
                  Próximo <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={generateContent} disabled={generating || !topic.trim()}
                  className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold bg-white text-black transition-all hover:bg-white/90 disabled:opacity-30">
                  <Sparkles className="h-4 w-4" /> Gerar Carrossel
                </button>
              )}
            </div>

            {/* Saved carousels */}
            {carouselHistory.length > 0 && (
              <div className="px-8 mt-8 pb-8">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-white/15" />
                  <h2 className="text-xs font-medium text-white/25 tracking-wider uppercase">Seus Carrosséis</h2>
                </div>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-white/20"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {carouselHistory.map((item) => {
                      const coverImage = item.carousel_data?.cards?.[0]?.imageUrl;
                      const coverBg = item.style_config?.bgColor || '#1a1a2e';
                      const coverTitle = item.carousel_data?.cards?.[0]?.topText || item.title;
                      return (
                        <button key={item.id} onClick={() => loadCarousel(item)}
                          className="group relative rounded-xl overflow-hidden text-left transition-all hover:-translate-y-0.5"
                          style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#141414' }}>
                          <div className="aspect-[4/5] overflow-hidden relative" style={{ backgroundColor: coverBg }}>
                            {coverImage ? (
                              <img src={coverImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-3">
                                <p className="text-white/30 text-xs font-medium text-center line-clamp-4">{coverTitle}</p>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <button onClick={(e) => { e.stopPropagation(); deleteCarousel(item.id); }}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 hover:bg-red-600 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-medium text-white/60 truncate">{item.title}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/20 mt-1">
                              <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                              <span>• {item.card_count} cards</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generating state - fullscreen black */}
        {(generating || generatingAllImages) && (
          <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
            <div className="carousel-loader-wrapper">
              {'Generating'.split('').map((letter, i) => (
                <span key={i} className="carousel-loader-letter" style={{ animationDelay: `${i * 0.1}s` }}>{letter}</span>
              ))}
              <div className="carousel-loader-spinner" />
            </div>
          </div>
        )}

        {/* ===== INSTAGRAM MOCKUP PREVIEW ===== */}
        {carouselData && editingCard === null && (
          <div className="flex-1 flex flex-col items-center justify-start py-8 px-4 relative overflow-hidden overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
            {/* Subtle background glow effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)' }} />

            {/* Center area: phone + inline style panel */}
            <div className="flex flex-row items-start justify-center gap-8 flex-1 relative z-10">

            {/* Instagram Phone Mockup */}
            <motion.div
              className="relative flex-shrink-0"
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ width: 375, maxWidth: '95vw' }}
            >
              {/* Phone frame */}
              <div className="rounded-[3rem] overflow-hidden" style={{
                border: '3px solid rgba(255,255,255,0.1)',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                boxShadow: '0 0 80px rgba(139,92,246,0.15), 0 0 2px rgba(255,255,255,0.1) inset',
              }}>
                {/* Notch */}
                <div className="flex justify-center pt-3 pb-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                  <div className="w-28 h-6 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Instagram header */}
                <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ backgroundColor: 'rgba(0,0,0,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">{userName || brandName || 'ellosuit'}</p>
                    <p className="text-white/40 text-[10px]">Patrocinado</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                  </div>
                </div>

            {/* Carousel viewport */}
                <div className="relative overflow-hidden" style={{ aspectRatio: `${CARD_W}/${CARD_H}`, backgroundColor: '#000' }}>
                  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                    <div style={{
                      width: PREVIEW_W,
                      height: PREVIEW_H,
                      transform: `scale(${369 / PREVIEW_W})`,
                      transformOrigin: 'top left',
                    }}>
                      {renderCardPreview(carouselData.cards[activeCardIndex], activeCardIndex, false)}
                    </div>
                  </div>
                  {/* Swipe indicators */}
                  {activeCardIndex > 0 && (
                    <button onClick={() => setActiveCardIndex(activeCardIndex - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      <ChevronLeft className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                  {activeCardIndex < carouselData.cards.length - 1 && (
                    <button onClick={() => setActiveCardIndex(activeCardIndex + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      <ChevronRight className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                </div>

                {/* Instagram dots + actions */}
                <div style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                  {/* Dots */}
                  <div className="flex items-center justify-center gap-1 py-2.5">
                    {carouselData.cards.map((_, i) => (
                      <button key={i} onClick={() => setActiveCardIndex(i)}
                        className="transition-all"
                        style={{
                          width: i === activeCardIndex ? 8 : 5,
                          height: i === activeCardIndex ? 8 : 5,
                          borderRadius: '50%',
                          backgroundColor: i === activeCardIndex ? '#8B5CF6' : 'rgba(255,255,255,0.2)',
                        }} />
                    ))}
                  </div>
                  {/* IG actions row */}
                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-white/60 text-lg">♡</span>
                      <span className="text-white/60 text-lg">💬</span>
                      <span className="text-white/60 text-lg">↗</span>
                    </div>
                    <span className="text-white/60 text-lg">☆</span>
                  </div>
                  {/* Likes */}
                  <div className="px-4 pb-4">
                    <p className="text-white text-[11px]"><span className="font-semibold">{userName || 'ellosuit'}</span> <span className="text-white/60">{carouselData.title || topic}</span></p>
                  </div>
                  {/* Bottom bar */}
                  <div className="flex justify-center pb-2">
                    <div className="w-32 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Inline Style Panel — appears next to the phone */}
            <AnimatePresence>
              {showStylePanel && (
                <motion.div
                  key="style-inline"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 340 }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="flex-shrink-0 overflow-hidden"
                >
                  <div className="w-[340px] h-full max-h-[80vh] overflow-y-auto rounded-2xl p-5" style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5" style={{ color: '#8B5CF6' }} />
                        <h3 className="font-bold text-white text-base">Estilo</h3>
                      </div>
                      <button onClick={() => setShowStylePanel(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    <StepStyle bgColor={bgColor} setBgColor={setBgColor} accentColor={accentColor} setAccentColor={setAccentColor}
                      textColor={textColor} setTextColor={setTextColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                      brandName={brandName} setBrandName={setBrandName} userName={userName} setUserName={setUserName}
                      dateLabel={dateLabel} setDateLabel={setDateLabel}
                      showHeader={showHeader} setShowHeader={setShowHeader} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            </div>{/* end center area flex */}

            {/* Action buttons below */}
            <div className="flex items-center justify-center gap-3 mt-6 w-full relative z-10">
              <button onClick={addCard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Card
              </button>
              <button onClick={() => setShowStylePanel(!showStylePanel)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all"
                style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' }}>
                <Palette className="h-3.5 w-3.5" /> Estilo
              </button>
              <button onClick={() => { setCarouselData(null); setCurrentCarouselId(null); setWizardStep(0); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                Novo
              </button>
            </div>

            {/* Card strip - horizontal thumbnails */}
            <div className="w-full max-w-5xl mt-6 relative z-10">
              <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory px-4 justify-center">
                {carouselData.cards.map((card, i) => {
                  const thumbW = 120;
                  const thumbH = thumbW * (CARD_H / CARD_W);
                  return (
                  <div key={i} className="snap-center flex-shrink-0 relative group cursor-pointer" style={{ width: thumbW + 4 }}
                    onClick={() => setActiveCardIndex(i)}>
                    <div className="rounded-xl overflow-hidden transition-all" style={{
                      border: i === activeCardIndex ? '2px solid #8B5CF6' : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: i === activeCardIndex ? '0 0 20px rgba(139,92,246,0.3)' : 'none',
                      opacity: i === activeCardIndex ? 1 : 0.6,
                      transform: i === activeCardIndex ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      <div style={{ width: thumbW, height: thumbH, overflow: 'hidden', borderRadius: 10 }}>
                        <div style={{ transform: `scale(${thumbW / PREVIEW_W})`, transformOrigin: 'top left', width: PREVIEW_W, height: PREVIEW_H }}>
                          {renderCardPreview(card, i, false)}
                        </div>
                      </div>
                    </div>
                    {/* Hover actions */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(card.imagePrompt || card.title || ''); }}
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <Edit3 className="h-3.5 w-3.5 text-white" />
                      </button>
                      {/* Regenerate dropdown */}
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setRegenMenuOpen(regenMenuOpen === i ? null : i); }}
                          disabled={regeneratingCard === i}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                          {regeneratingCard === i ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-white" />}
                        </button>
                        {regenMenuOpen === i && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-xl overflow-hidden shadow-2xl z-50"
                            style={{ backgroundColor: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button onClick={(e) => { e.stopPropagation(); setRegenMenuOpen(null); regenerateCard(i); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                              <Wand2 className="h-3.5 w-3.5 text-purple-400" /> Gerar com IA
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setRegenMenuOpen(null); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (ev) => { const file = (ev.target as HTMLInputElement).files?.[0]; if (file) handleFileUpload(i, file); }; input.click(); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                              <Upload className="h-3.5 w-3.5 text-blue-400" /> Carregar imagem
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setRegenMenuOpen(null); setShowImagePicker(i); setActiveCardIndex(i); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/80 hover:bg-white/[0.06] transition-colors text-left">
                              <Search className="h-3.5 w-3.5 text-green-400" /> Buscar no Google
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-center text-[10px] mt-1.5 font-medium" style={{ color: i === activeCardIndex ? '#8B5CF6' : 'rgba(255,255,255,0.3)' }}>{i + 1}</p>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== FULL-SCREEN EDITOR WITH SIDEBAR ===== */}
      <AnimatePresence>
      {carouselData && editingCard !== null && (() => {
        const validIndex = editingCard ?? 0;
        const ec = carouselData.cards[validIndex];
        if (!ec) return null;

        return (
          <motion.div
            key="editor-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: '#0a0a0f' }}
          >
            {/* Editor top bar - dark */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.9)' }}>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingCard(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-white/70" />
                </button>
                <h2 className="font-bold text-white text-sm sm:text-base">Editando Card {validIndex + 1}</h2>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={saveCarousel} disabled={savingCarousel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                  {savingCarousel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{currentCarouselId ? 'Atualizar' : 'Salvar'}</span>
                </button>
                <button onClick={exportAllCards} disabled={exporting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Left: preview with card navigation */}
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                className="flex flex-col items-center p-4 shrink-0 md:flex-1 md:overflow-auto"
                style={{ backgroundColor: '#0a0a0f' }}
              >
                {/* Glow effect */}
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
                
                {/* Card preview */}
                <div className="flex items-center justify-center w-full flex-1" style={{ minHeight: 0 }}>
                  <div className="relative w-full flex items-center justify-center" style={{ maxWidth: '90vw' }}>
                    <div style={{
                      transform: `scale(${Math.min((typeof window !== 'undefined' ? window.innerWidth * 0.45 : 300) / PREVIEW_W, 1.4)})`,
                      transformOrigin: 'top center',
                      width: PREVIEW_W,
                      height: PREVIEW_H,
                      margin: '0 auto',
                    }}>
                      {renderCardPreview(ec, validIndex)}
                    </div>
                  </div>
                </div>
                {/* Bottom navigation bar */}
                <div className="flex items-center justify-center gap-3 py-3 shrink-0 w-full">
                  <button
                    onClick={() => { const prev = Math.max(0, validIndex - 1); setEditingCard(prev); setActiveCardIndex(prev); setAiImagePrompt(carouselData.cards[prev]?.imagePrompt || carouselData.cards[prev]?.title || ''); }}
                    disabled={validIndex === 0}
                    className="p-2.5 rounded-full border shadow-md disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-white/10"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronLeft className="h-5 w-5 text-white/70" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {carouselData.cards.map((_, i) => (
                      <button key={i} onClick={() => { setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(carouselData.cards[i]?.imagePrompt || carouselData.cards[i]?.title || ''); }}
                        className="rounded-full transition-all"
                        style={{
                          width: i === validIndex ? 10 : 7,
                          height: i === validIndex ? 10 : 7,
                          backgroundColor: i === validIndex ? '#8B5CF6' : 'rgba(255,255,255,0.2)',
                          transform: i === validIndex ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                    <span className="text-xs font-medium ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{validIndex + 1}/{carouselData.cards.length}</span>
                  </div>
                  <button
                    onClick={() => { const next = Math.min(carouselData.cards.length - 1, validIndex + 1); setEditingCard(next); setActiveCardIndex(next); setAiImagePrompt(carouselData.cards[next]?.imagePrompt || carouselData.cards[next]?.title || ''); }}
                    disabled={validIndex === carouselData.cards.length - 1}
                    className="p-2.5 rounded-full border shadow-md disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-white/10"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronRight className="h-5 w-5 text-white/70" />
                  </button>
                </div>
              </motion.div>

              {/* Right sidebar - dark themed, slides in */}
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="md:w-[380px] shrink-0"
                style={{ backgroundColor: '#111118', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >
                <CarouselEditorSidebar
                  card={ec}
                  cardIndex={validIndex}
                  totalCards={carouselData.cards.length}
                  bgColor={bgColor}
                  accentColor={accentColor}
                  textColor={textColor}
                  onUpdateCard={updateCard}
                  onUpdateAllCards={updateAllCards}
                  onClose={() => setEditingCard(null)}
                  onUploadImage={handleFileUpload}
                  onOpenImagePicker={(i) => { setShowImagePicker(i); }}
                  onGenerateAiImage={generateAiImage}
                  generatingAiImage={generatingAiImage}
                  aiImagePrompt={aiImagePrompt}
                  setAiImagePrompt={setAiImagePrompt}
                  onChangeBgColor={setBgColor}
                  onChangeAccentColor={setAccentColor}
                  onChangeTextColor={setTextColor}
                  fontOptions={FONT_OPTIONS}
                  selectedFont={selectedFont}
                  onChangeFont={setSelectedFont}
                  referenceImageUrl={editorRefImage}
                  onUploadReferenceImage={handleEditorRefImageUpload}
                  onRemoveReferenceImage={() => setEditorRefImage(null)}
                />
              </motion.div>
            </div>
          </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* Image Picker Modal */}
      {showImagePicker !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowImagePicker(null)}>
          <div className="bg-background rounded-3xl shadow-2xl max-w-lg w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Imagem — Card {showImagePicker + 1}</h3>
              <button onClick={() => setShowImagePicker(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: accentColor + '66' }}>
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-5 w-5" style={{ color: accentColor }} />
                <p className="text-sm font-bold text-foreground">Gerar com IA</p>
              </div>
              <div className="flex gap-2">
                <Input value={aiImagePrompt} onChange={(e) => setAiImagePrompt(e.target.value)} placeholder="Descreva a imagem..." className="rounded-xl flex-1" />
                <Button onClick={() => generateAiImage(showImagePicker)} disabled={generatingAiImage} className="gap-2 rounded-xl px-5" style={{ backgroundColor: accentColor }}>
                  {generatingAiImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar
                </Button>
              </div>
              {generatingAiImage && <p className="text-xs text-muted-foreground text-center mt-2 animate-pulse">⏳ Gerando... até 60s</p>}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Search className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Pexels</p></div>
              {!pexelsImages.length && !searchingImages && <Button variant="outline" onClick={() => searchImages()} className="w-full gap-2 rounded-xl"><Search className="h-4 w-4" /> Buscar</Button>}
              {searchingImages && !loadingMoreImages && <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</div>}
              {pexelsImages.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto rounded-xl">
                    {pexelsImages.map((img) => (
                      <button key={img.id} onClick={() => setCardImage(showImagePicker, img.url)} className="rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
                        <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground">Fotos por Pexels</p>
                    <Button variant="outline" size="sm" onClick={() => searchImages(undefined, imageSearchPage + 1, true)} disabled={loadingMoreImages} className="gap-1 rounded-xl text-xs">
                      {loadingMoreImages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Buscar mais
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden export */}
      {carouselData && (
        <div className="fixed -left-[9999px] top-0" aria-hidden>
          {carouselData.cards.map((card, i) => (
            <div key={`export-${i}`}>{renderCardPreview(card, i, true)}</div>
          ))}
        </div>
      )}

      {/* Social Publish Dialog */}
      <SocialPublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        imageUrls={carouselData?.cards.map(c => c.imageUrl).filter(Boolean) as string[] || []}
        topic={topic}
      />
    </div>
  );
};

export default CarouselGenerator;
