import React, { useState, useRef, useEffect, useCallback } from 'react';
import '@/styles/carousel-loader.css';
import '@/styles/cube-loader.css';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Animated percentage counter
const AnimatedCounter = ({ target }: { target: number }) => {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{display}%</>;
};
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
// toast disabled on carousel page
import { 
  ArrowLeft, Sparkles, Download, Plus, Trash2, Image as ImageIcon, 
  Search, Edit3, Loader2, X, Upload, Wand2, Type, Palette, Globe, Paperclip, SlidersHorizontal,
  Save, History, Clock, RotateCcw, ChevronLeft, ChevronRight, Check, ExternalLink, FileText, Copy, Lock, Menu, Home
} from 'lucide-react';
import html2canvas from 'html2canvas';
import StepTopic from './wizard/StepTopic';
import StepCardCount from './wizard/StepCardCount';
import StepWebImages from './wizard/StepWebImages';
import StepFaceRef from './wizard/StepFaceRef';
import StepProduct, { ProductAnalysis } from './wizard/StepProduct';
import StepBrandRef from './wizard/StepBrandRef';
import StepColors from './wizard/StepColors';
import StepFonts from './wizard/StepFonts';
import StepBranding from './wizard/StepBranding';
import StepStyle, { STYLE_PRESETS, StylePreset, LogoPosition } from './wizard/StepStyle';
import CarouselEditorSidebar from './editor/CarouselEditorSidebar';
import SocialPublishDialog from './SocialPublishDialog';
// CarouselTour removed
import GeneratingAnimation from './GeneratingAnimation';
import WelcomeScreen from './WelcomeScreen';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { ReferenceImage, FamousPerson, ImageSettings, DEFAULT_IMAGE_SETTINGS, FLOW_COLOR } from './wizard/types';
import { useCarouselVoice } from '@/hooks/useCarouselVoice';

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
  const { id: routeCarouselId } = useParams<{ id?: string }>();
  const { isMobile: isMobileView } = useIsMobile();
  const toast = useCallback((_opts: any) => { /* toasts disabled on carousel page */ }, []);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const isGuest = !user;
  const isCardLocked = (index: number) => isGuest && index > 0 && !!carouselData;

  // Welcome screen state
  const [showWelcome, setShowWelcome] = useState(true);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const WIZARD_STEPS = ['Tema', 'Quantidade', 'Fotos', 'Rosto', 'Produto', 'Marca', 'Cores', 'Fontes', 'Marca Final'];
  const { speakStep, stopSpeaking, isSpeaking, voiceEnabled, setVoiceEnabled } = useCarouselVoice();

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
  
  // Product state
  const [productImages, setProductImages] = useState<{ url: string; thumb: string; file: File }[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis | null>(null);
  const [analyzingProduct, setAnalyzingProduct] = useState(false);

  // Step 3: Image settings
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);

  // Step 4: Style
  const [showHeader, setShowHeader] = useState(true);
  const [brandName, setBrandName] = useState('');
  const [userName, setUserName] = useState('');
  const [dateLabel, setDateLabel] = useState(() => {
    const d = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${months[d.getMonth()]} ${d.getFullYear()} ®`;
  });
  // Ellosuit color palettes for random selection
  const RANDOM_PALETTES = [
    { bg: '#0A0A1A', accent: '#3000E3', text: '#FFFFFF' },
    { bg: '#FFFFFF', accent: '#3000E3', text: '#0A0A1A' },
    { bg: '#3000E3', accent: '#FFFFFF', text: '#FFFFFF' },
    { bg: '#0A1628', accent: '#3B82F6', text: '#F1F5F9' },
    { bg: '#042F2E', accent: '#2DD4BF', text: '#F0FDFA' },
    { bg: '#000000', accent: '#FFFFFF', text: '#FFFFFF' },
    { bg: '#F3F4F6', accent: '#3000E3', text: '#111827' },
    { bg: '#0F0F1A', accent: '#E84D1A', text: '#FFFFFF' },
  ];
  const [initialPalette] = useState(() => RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)]);
  const [bgColor, setBgColor] = useState(initialPalette.bg);
  const [accentColor, setAccentColor] = useState(initialPalette.accent);
  const [textColor, setTextColor] = useState(initialPalette.text);
  const [selectedFont, setSelectedFont] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [transitionToGenerate, setTransitionToGenerate] = useState(false);
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
  const [showCaptionPanel, setShowCaptionPanel] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('ellosuit-editorial');
  const [regenMenuOpen, setRegenMenuOpen] = useState<number | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  // CarouselTour removed
  const [editorRefImage, setEditorRefImage] = useState<string | null>(null);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);

  const handleEditorRefImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setEditorRefImage(url);
  };

  // Web search state
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [skipWebSearch, setSkipWebSearch] = useState(false);
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

  // Load carousel from route param /carousel/:id
  useEffect(() => {
    if (!routeCarouselId || !user) return;
    const loadFromRoute = async () => {
      try {
        const { data } = await supabase.from('generated_carousels').select('*').eq('id', routeCarouselId).single();
        if (data) {
          loadCarousel(data);
          setShowWelcome(false);
        }
      } catch (err) { console.error('Failed to load carousel from URL:', err); }
    };
    loadFromRoute();
  }, [routeCarouselId, user]);

  // Update URL when carousel ID changes
  useEffect(() => {
    if (currentCarouselId) {
      window.history.replaceState({}, '', `/carousel/${currentCarouselId}`);
    } else if (window.location.pathname.startsWith('/carousel/')) {
      window.history.replaceState({}, '', '/');
    }
  }, [currentCarouselId]);

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
    // Default: always use nano-banana (best quality). Gemini is fallback only.
    const resolvedModel = imageSettings.model === 'auto'
      ? 'nano-banana'
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
    const { data, error } = await supabase.functions.invoke('generate-carousel-image', {
      body: {
        prompt: opts.prompt,
        imageSize: '3:4',
        topic: opts.prompt,
        faceReferenceUrls: opts.faceReferenceUrls,
        styleReferenceUrls: opts.styleReferenceUrls,
        imageModel: resolvedModel,
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

  // ===== GENERATE CAPTION =====
  const generateCaption = async () => {
    if (generatingCaption) return;
    setGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-caption',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: carouselData?.cards?.length || 7,
        },
      });
      if (!error && data?.caption) {
        setPostCaption(data.caption);
      } else {
        const fallback = `${carouselData?.title || topic}\n\n📌 Salve esse post para consultar depois!\n\n#${topic.split(' ').slice(0, 3).map(w => w.replace(/[^a-zA-ZÀ-ú0-9]/g, '')).filter(Boolean).join(' #')}`;
        setPostCaption(fallback);
      }
    } catch {
      toast({ title: 'Erro ao gerar legenda', variant: 'destructive' });
    } finally {
      setGeneratingCaption(false);
    }
  };

  // ===== CAPTURE COVER FROM RENDERED CARD (with retry + fallback) =====
  const captureCoverImage = async (carouselId: string, companyId: string) => {
    try {
      // Poll for the card ref to become available (up to 8 seconds)
      let el: HTMLElement | null = null;
      for (let attempt = 0; attempt < 16; attempt++) {
        await new Promise(r => setTimeout(r, 500));
        el = cardRefs.current[0];
        if (el) break;
      }
      if (!el) {
        console.warn('Cover capture: card ref not found after retries, using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }
      // Wait for all images inside the element to load
      const imgs = el.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img => 
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      ));
      // Extra settle time for fonts/layout
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(el, {
        width: CARD_W,
        height: CARD_H,
        scale: 0.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: bgColor || '#0A0A1A',
        logging: false,
        imageTimeout: 10000,
      });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (!blob) {
        console.warn('Cover capture: blob creation failed, using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }
      const fileName = `${companyId}/${carouselId}.jpg`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) {
        console.warn('Cover upload failed:', uploadError.message, '- using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        // Add cache-buster to ensure fresh URL
        const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        await supabase.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', carouselId);
      }
    } catch (err) {
      console.error('Cover capture error, trying server fallback:', err);
      await serverFallbackCover(carouselId).catch(() => {});
    }
  };

  const serverFallbackCover = async (carouselId: string) => {
    try {
      await supabase.functions.invoke('generate-cover-thumbnail', {
        body: { carousel_id: carouselId },
      });
    } catch (err) {
      console.error('Server cover fallback also failed:', err);
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
      const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
      if (currentCarouselId) {
        await supabase.from('generated_carousels').update({ title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length }).eq('id', currentCarouselId);
        // Capture real rendered card as cover in background
        captureCoverImage(currentCarouselId, companyData.company_id).catch(() => {});
        toast({ title: 'Carrossel atualizado!' });
      } else {
        const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length }).select('id').single();
        setCurrentCarouselId(inserted?.id || null);
        // Capture real rendered card as cover in background
        if (inserted?.id) captureCoverImage(inserted.id, companyData.company_id).catch(() => {});
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
      if (sc.activePresetId) setActivePresetId(sc.activePresetId);
      if (sc.logoUrl !== undefined) setLogoUrl(sc.logoUrl);
      if (sc.logoPosition) setLogoPosition(sc.logoPosition);
      if (sc.showHeader !== undefined) setShowHeader(sc.showHeader);
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

    // Check credit balance before generating (only for logged-in users)
    if (user) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (cu) {
            const { data: balance } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).single();
            const creditsNeeded = cardCount; // 1 credit per card
            if (balance && balance.balance < creditsNeeded) {
              toast({
                title: 'Créditos insuficientes',
                description: `Você precisa de ${creditsNeeded} créditos mas tem ${Math.floor(balance.balance)}. Adquira mais créditos.`,
                variant: 'destructive',
              });
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Credit check failed:', err);
        toast({ title: 'Erro ao verificar créditos', description: 'Tente novamente.', variant: 'destructive' });
        return;
      }
    }

    setGenerating(true);
    // Clear previous carousel data to prevent reusing old images
    setCarouselData(null);
    setCurrentCarouselId(null);
    // Small delay to let the transition animation settle before showing generating overlay
    setTimeout(() => setTransitionToGenerate(false), 500);
    try {
      const imageCardIndices: number[] = [0];
      const contentIndices = Array.from({ length: cardCount - 2 }, (_, i) => i + 1);
      const shuffled = contentIndices.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(imageCardCount - 1, shuffled.length); i++) imageCardIndices.push(shuffled[i]);

      const productContext = productAnalysis?.confirmed ? {
        productType: productAnalysis.type,
        productDescription: productAnalysis.description,
        productImageUrls: productImages.map(p => p.url),
      } : undefined;

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount,
          imageCardIndices: imageCardIndices.sort((a, b) => a - b),
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(productContext ? { productContext } : {}),
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

      // Filter out placeholder/broken image URLs AND images that likely contain text overlays
      const isValidImageUrl = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lower = url.toLowerCase();
        if (lower.includes('placeholder') || lower.includes('1x1') || lower.includes('spacer')) return false;
        if (lower.includes('data:image/svg') || lower.includes('data:image/gif')) return false;
        if (lower.endsWith('.svg') || lower.endsWith('.gif')) return false;
        if (lower.includes('blank.') || lower.includes('empty.') || lower.includes('pixel.')) return false;
        if (lower.includes('logo') && (lower.includes('icon') || lower.includes('favicon'))) return false;
        if (!lower.startsWith('http') && !lower.startsWith('data:image')) return false;
        // Filter out images that are likely infographics/slides with text
        if (lower.includes('slide') || lower.includes('infographic') || lower.includes('screenshot')) return false;
        return true;
      };

      // Only use user-selected images (max 3 to avoid too many web photos with text)
      const webImagePool = selectedImages.filter(isValidImageUrl).slice(0, 3);
      console.log('Valid selected image pool (capped at 3):', webImagePool.length);

      // Determine if we have face/brand references attached
      const updatedCards = [...cards];
      const faceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);

      // Extract the clean topic from web search to always include in AI prompts
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();

      // IMPROVED STRATEGY: Use AI for ALL image cards. Only use user-selected web photos 
      // for a limited number of content cards. This ensures every card has a quality image.
      let webImageIndex = 0;
      const imagePromises: { index: number; promise: Promise<string | null> }[] = [];
      let totalImages = 0;
      let realImagesUsed = 0;
      let aiImagesQueued = 0;
      const usedImageUrls = new Set<string>();

      // Standard negative prompt for all AI images
      const baseNegativePrompt = 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';

      for (let i = 0; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        if (card.needsImage || card.type === 'cover' || card.type === 'cta' || imageCardIndices.includes(i)) {
          totalImages++;

          const isCoverOrCta = card.type === 'cover' || card.type === 'cta';

          // Try to use a user-selected web image (only for non-cover content cards, limited pool)
          if (!isCoverOrCta && webImagePool.length > webImageIndex) {
            let selectedUrl = webImagePool[webImageIndex];
            webImageIndex++;
            while (usedImageUrls.has(selectedUrl) && webImageIndex < webImagePool.length) {
              selectedUrl = webImagePool[webImageIndex];
              webImageIndex++;
            }
            if (!usedImageUrls.has(selectedUrl)) {
              usedImageUrls.add(selectedUrl);
              updatedCards[i] = { ...updatedCards[i], imageUrl: selectedUrl, isAiImage: false };
              realImagesUsed++;
              continue; // skip AI generation for this card
            }
          }

          // ALL other cards: generate via AI (covers, ctas, and content cards without web images)
          aiImagesQueued++;
          const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
          let imgPrompt = `${cleanTopic}: ${cardDesc}`;
          
          // Enhance prompt with product context
          if (productAnalysis?.confirmed) {
            const productPromptMap: Record<string, string> = {
              clothing: `Show the clothing/fashion item described as "${productAnalysis.description}" worn by a model in a professional setting. Recreate the garment faithfully.`,
              object: `Show the product "${productAnalysis.description}" in a professional mockup, lifestyle context, or being held/used naturally.`,
              food: `Show the food/beverage "${productAnalysis.description}" in professional food-styling, appetizing composition with beautiful plating.`,
              unknown: `Feature the product "${productAnalysis.description}" prominently in the scene.`,
            };
            imgPrompt += '. ' + (productPromptMap[productAnalysis.type] || productPromptMap.unknown);
          }
          
          const finalNegative = [baseNegativePrompt, imageSettings.negativePrompt].filter(Boolean).join(', ');
          
          // Use product images as style references if available
          const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];
          const allStyleRefs = [...styleRefUrls, ...productRefUrls];
          
          imagePromises.push({
            index: i,
            promise: (async () => {
              try {
                return await generateImage({
                  prompt: buildImagePrompt(imgPrompt) + '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.',
                  faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
                  styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
                  negativePrompt: finalNegative,
                });
              } catch (err) { console.error('Image gen error for card', i, err); }
              return null;
            })(),
          });
        }
      }

      if (imagePromises.length > 0) {
        let completed = 0;
        const totalAi = imagePromises.length;
        setImageGenProgress(`🎨 0/${totalAi} imagens geradas...`);
        const trackedPromises = imagePromises.map((p) =>
          p.promise.then((url) => {
            completed++;
            setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
            if (url) updatedCards[p.index] = { ...updatedCards[p.index], imageUrl: url, isAiImage: true };
            return url;
          })
        );
        await Promise.all(trackedPromises);
      } else {
        setImageGenProgress(`📸 ${realImagesUsed} fotos reais aplicadas!`);
      }

      const finalData = { ...data.data, cards: updatedCards };
      setCarouselData(finalData);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      // Tour removed
      toast({ title: 'Carrossel completo!', description: `${cards.length} cards com ${totalImages} imagens gerados` });

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            // Consume credits (1 per card generated)
            try {
              await supabase.rpc('consume_ai_credits', {
                p_company_id: companyData.company_id,
                p_agent_id: companyData.company_id, // using company_id as placeholder
                p_amount: finalData.cards.length,
                p_description: `Carrossel: ${finalData.title || topic} (${finalData.cards.length} cards)`,
              });
            } catch (creditErr) { console.warn('Credit consumption failed:', creditErr); }

            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
            const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length }).select('id').single();
            if (inserted) {
              setCurrentCarouselId(inserted.id);
              setTimeout(() => captureCoverImage(inserted.id, companyData.company_id).catch(() => {}), 2000);
            }
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

      // 2. Regenerate image using AI with face/style references (like user photos)
      let newImageUrl = card.imageUrl;
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();
      const imgPrompt = `${cleanTopic}: ${newImagePrompt || newBody.slice(0, 100)}`;
      const faceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      try {
        const generatedUrl = await generateImage({
          prompt: buildImagePrompt(imgPrompt) + '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.',
          faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
          styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
          negativePrompt: imageSettings.negativePrompt || undefined,
        });
        if (generatedUrl) {
          newImageUrl = generatedUrl;
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
      // Wait for fonts and images to be fully loaded before capturing
      await document.fonts.ready;
      // Small delay to ensure hidden export divs are fully rendered
      await new Promise(r => setTimeout(r, 500));

      for (let i = 0; i < carouselData.cards.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          width: CARD_W,
          height: CARD_H,
          scale: 1,
          useCORS: true,
          allowTaint: false,
          backgroundColor: bgColor || '#0A0A1A',
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Ensure all images in cloned doc have crossOrigin set
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          },
        });
        const link = document.createElement('a');
        link.download = `carousel-card-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(r => setTimeout(r, 400));
      }
      toast({ title: 'Download completo!' });
    } catch (err) {
      console.error('Export error:', err);
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

  // ==================== BETA TEST 2 LAYOUT ====================
  // Completely different UX/UI: clean, light, split-horizontal, bold centered typography
  const renderBetaTest2Card = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W;
    const fs = card.fontScale ?? 1.0;
    const ps = card.paddingScale ?? 1.0;
    const bg = bgColor;
    const computeLuminance = (hex: string) => {
      const c = hex.replace('#', '');
      if (c.length < 6) return 0;
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;
      const toL = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
    };
    const isDarkBg = computeLuminance(bg) < 0.35;
    const mainTxt = isDarkBg ? '#FFFFFF' : textColor;
    const subTxt = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const topText = card.bodyTop || card.body || card.title || '';
    const bottomText = card.bodyBottom || '';
    const hasImage = !!card.imageUrl;

    const renderB2Logo = () => {
      if (!logoUrl) return null;
      const size = 56 * s;
      const margin = 24 * s;
      const posStyle: React.CSSProperties = {
        position: 'absolute', width: size, height: size, objectFit: 'contain', zIndex: 15,
        ...(logoPosition.includes('top') ? { top: margin } : { bottom: margin }),
        ...(logoPosition.includes('left') ? { left: margin } : { right: margin }),
        ...(isDarkBg ? { filter: 'brightness(0) invert(1)' } : {}),
      };
      return <img src={logoUrl} alt="" style={posStyle} />;
    };

    // COVER — Bold centered with accent stripe
    if (card.type === 'cover') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg }}>
          {card.imageUrl && <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {card.imageUrl && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${bg}DD 0%, ${bg}99 40%, ${bg}DD 100%)` }} />}
          {/* Top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${8 * s}px`, backgroundColor: accentColor }} />
          {/* Center content */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: `${60 * s * ps}px ${64 * s * ps}px`, textAlign: 'center', zIndex: 10 }}>
            {/* Number badge */}
            <div style={{ width: `${80 * s}px`, height: `${80 * s}px`, borderRadius: '50%', backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: `${40 * s}px`, overflow: 'hidden' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: `${52 * s}px`, height: `${52 * s}px`, objectFit: 'contain', ...(computeLuminance(accentColor) > 0.35 ? {} : { filter: 'brightness(0) invert(1)' }) }} />
              ) : (
                <span style={{ fontFamily: sans, fontSize: `${36 * s * fs}px`, fontWeight: 900, color: computeLuminance(accentColor) > 0.35 ? '#000' : '#FFF' }}>★</span>
              )}
            </div>
            <h1 style={{ fontFamily: serif, fontSize: `${82 * s * fs}px`, fontWeight: 900, lineHeight: 1.05, color: mainTxt, textTransform: 'uppercase', letterSpacing: `${2 * s}px`, marginBottom: `${20 * s}px` }}>
              {renderAccentText(card.title || '', accentColor, mainTxt, 82, s)}
            </h1>
            {card.subtitle && <p style={{ fontFamily: sans, fontSize: `${26 * s * fs}px`, fontWeight: 500, color: accentColor, letterSpacing: `${4 * s}px`, textTransform: 'uppercase', lineHeight: 1.5, maxWidth: `${800 * s}px` }}>{card.subtitle}</p>}
            {/* Bottom line accent */}
            <div style={{ width: `${120 * s}px`, height: `${4 * s}px`, backgroundColor: accentColor, borderRadius: `${2 * s}px`, marginTop: `${40 * s}px` }} />
          </div>
          {/* Brand at bottom */}
          {showHeader && !logoUrl && (
            <div style={{ position: 'absolute', bottom: `${32 * s}px`, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
              <span style={{ fontFamily: sans, fontSize: `${18 * s * fs}px`, fontWeight: 600, color: subTxt, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>{brandName}{userName ? ` · @${userName}` : ''}</span>
            </div>
          )}
          {renderB2Logo()}
        </div>
      );
    }

    // CTA — Minimal centered with large accent button
    if (card.type === 'cta') {
      const accentLum = computeLuminance(accentColor);
      const btnTxt = accentLum > 0.35 ? '#1A1A1A' : '#FFFFFF';
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg }}>
          {card.imageUrl && (<><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, background: `${bg}CC` }} /></>)}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${8 * s}px`, backgroundColor: accentColor }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: `${80 * s * ps}px ${64 * s * ps}px`, textAlign: 'center', zIndex: 10 }}>
            <h2 style={{ fontFamily: serif, fontSize: `${64 * s * fs}px`, fontWeight: 900, lineHeight: 1.1, color: mainTxt, textTransform: 'uppercase', marginBottom: `${20 * s}px` }}>{card.title}</h2>
            {card.body && <p style={{ fontFamily: sans, fontSize: `${28 * s * fs}px`, fontWeight: 400, lineHeight: 1.6, color: subTxt, maxWidth: `${750 * s}px`, marginBottom: `${48 * s}px` }}>{card.body}</p>}
            <div style={{ padding: `${24 * s}px ${72 * s}px`, backgroundColor: accentColor, borderRadius: `${50 * s}px`, display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontFamily: sans, fontSize: `${24 * s * fs}px`, fontWeight: 800, color: btnTxt, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>SAIBA MAIS →</span>
            </div>
            {userName && <p style={{ fontFamily: sans, fontSize: `${18 * s * fs}px`, fontWeight: 600, color: subTxt, marginTop: `${40 * s}px`, letterSpacing: `${3 * s}px`, textTransform: 'uppercase' }}>@{userName}</p>}
          </div>
          {renderB2Logo()}
        </div>
      );
    }

    // CONTENT — Split horizontal: image on top half, text on bottom half
    if (hasImage) {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg }}>
          {/* Top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${6 * s}px`, backgroundColor: accentColor, zIndex: 20 }} />
          {/* Image takes top 50% */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'hidden' }}>
            <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {/* Card number badge */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `${56 * s}px`, height: `${56 * s}px`, borderRadius: '50%', backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15, boxShadow: `0 ${4 * s}px ${20 * s}px rgba(0,0,0,0.3)` }}>
            <span style={{ fontFamily: sans, fontSize: `${24 * s * fs}px`, fontWeight: 900, color: computeLuminance(accentColor) > 0.35 ? '#000' : '#FFF' }}>{index}</span>
          </div>
          {/* Text takes bottom 50% */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, bottom: 0, padding: `${48 * s * ps}px ${56 * s * ps}px ${40 * s * ps}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: `${20 * s}px` }}>
            <p style={{ fontFamily: serif, fontSize: `${40 * s * fs}px`, fontWeight: 700, lineHeight: 1.25, color: mainTxt, textAlign: 'center' }}>{renderAccentText(topText, accentColor, mainTxt, 40, s)}</p>
            {bottomText && <p style={{ fontFamily: sans, fontSize: `${28 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: subTxt, textAlign: 'center' }}>{bottomText}</p>}
          </div>
          {renderB2Logo()}
        </div>
      );
    }

    // CONTENT — No image: centered text with decorative elements
    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${6 * s}px`, backgroundColor: accentColor, zIndex: 20 }} />
        {/* Large decorative number */}
        <div style={{ position: 'absolute', top: `${40 * s}px`, right: `${40 * s}px`, fontFamily: serif, fontSize: `${200 * s}px`, fontWeight: 900, color: accentColor, opacity: 0.08, lineHeight: 1, zIndex: 1 }}>{index}</div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${80 * s * ps}px ${64 * s * ps}px`, gap: `${32 * s}px`, zIndex: 5 }}>
          {/* Accent dot + number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: `${16 * s}px` }}>
            <div style={{ width: `${12 * s}px`, height: `${12 * s}px`, borderRadius: '50%', backgroundColor: accentColor }} />
            <span style={{ fontFamily: sans, fontSize: `${18 * s * fs}px`, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>Ponto {index}</span>
          </div>
          <p style={{ fontFamily: serif, fontSize: `${52 * s * fs}px`, fontWeight: 700, lineHeight: 1.2, color: mainTxt }}>{renderAccentText(topText, accentColor, mainTxt, 52, s)}</p>
          {bottomText && (
            <>
              <div style={{ width: `${60 * s}px`, height: `${3 * s}px`, backgroundColor: accentColor, borderRadius: `${2 * s}px` }} />
              <p style={{ fontFamily: sans, fontSize: `${34 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: subTxt }}>{bottomText}</p>
            </>
          )}
        </div>
        {showHeader && !logoUrl && (
          <div style={{ position: 'absolute', bottom: `${28 * s}px`, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: `${16 * s * fs}px`, fontWeight: 500, color: subTxt, letterSpacing: `${2 * s}px`, textTransform: 'uppercase' }}>{brandName}</span>
          </div>
        )}
        {renderB2Logo()}
      </div>
    );
  };

  // ===== BETA TEST 3 — Magazine editorial with sidebar accent strip =====
  const renderBetaTest3Card = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W;
    const fs = card.fontScale ?? 1.0;
    const ps = card.paddingScale ?? 1.0;
    const bg = bgColor;
    const computeLuminance = (hex: string) => {
      const c = hex.replace('#', '');
      if (c.length < 6) return 0;
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;
      const toL = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
    };
    const isDarkBg = computeLuminance(bg) < 0.35;
    const mainTxt = isDarkBg ? '#FFFFFF' : textColor;
    const subTxt = isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
    const topText = card.bodyTop || card.body || card.title || '';
    const bottomText = card.bodyBottom || '';
    const hasImage = !!card.imageUrl;
    const sideW = 64;

    const renderB3Logo = () => {
      if (!logoUrl) return null;
      const size = 44 * s;
      return <img src={logoUrl} alt="" style={{ width: size, height: size, objectFit: 'contain', ...(isDarkBg ? { filter: 'brightness(0) invert(1)' } : {}) }} />;
    };

    if (card.type === 'cover') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg, display: 'flex' }}>
          <div style={{ width: `${sideW * s}px`, minHeight: '100%', backgroundColor: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: `${40 * s}px 0` }}>
            {renderB3Logo() || <div style={{ width: `${36 * s}px`, height: `${36 * s}px`, borderRadius: '50%', border: `${3 * s}px solid ${computeLuminance(accentColor) > 0.35 ? '#000' : '#FFF'}` }} />}
            <span style={{ fontFamily: sans, fontSize: `${14 * s}px`, fontWeight: 700, color: computeLuminance(accentColor) > 0.35 ? '#000' : '#FFF', writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: `${4 * s}px`, textTransform: 'uppercase' }}>EDITORIAL</span>
            <span style={{ fontFamily: sans, fontSize: `${12 * s}px`, fontWeight: 600, color: computeLuminance(accentColor) > 0.35 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', writingMode: 'vertical-rl' }}>01</span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {card.imageUrl && <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: card.imageUrl ? `linear-gradient(135deg, ${bg}EE 0%, ${bg}88 50%, ${bg}CC 100%)` : 'none' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `${60 * s * ps}px ${56 * s * ps}px` }}>
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: `${8 * s}px ${20 * s}px`, backgroundColor: accentColor, borderRadius: `${4 * s}px`, marginBottom: `${24 * s}px` }}>
                <span style={{ fontFamily: sans, fontSize: `${14 * s * fs}px`, fontWeight: 800, color: computeLuminance(accentColor) > 0.35 ? '#000' : '#FFF', textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>DESTAQUE</span>
              </div>
              <h1 style={{ fontFamily: serif, fontSize: `${76 * s * fs}px`, fontWeight: 700, lineHeight: 1.05, color: mainTxt, marginBottom: `${16 * s}px` }}>
                {renderAccentText(card.title || '', accentColor, mainTxt, 76, s)}
              </h1>
              {card.subtitle && <p style={{ fontFamily: sans, fontSize: `${24 * s * fs}px`, fontWeight: 400, color: subTxt, lineHeight: 1.5, maxWidth: `${700 * s}px` }}>{card.subtitle}</p>}
              <div style={{ width: `${80 * s}px`, height: `${3 * s}px`, backgroundColor: accentColor, marginTop: `${32 * s}px` }} />
            </div>
          </div>
        </div>
      );
    }

    if (card.type === 'cta') {
      const accentLum = computeLuminance(accentColor);
      const btnTxt = accentLum > 0.35 ? '#1A1A1A' : '#FFFFFF';
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg, display: 'flex' }}>
          <div style={{ width: `${sideW * s}px`, minHeight: '100%', backgroundColor: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${40 * s}px 0` }}>
            {renderB3Logo() || <div style={{ width: `${36 * s}px`, height: `${36 * s}px`, borderRadius: '50%', border: `${3 * s}px solid ${accentLum > 0.35 ? '#000' : '#FFF'}` }} />}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: `${80 * s * ps}px ${56 * s * ps}px` }}>
            <h2 style={{ fontFamily: serif, fontSize: `${56 * s * fs}px`, fontWeight: 700, lineHeight: 1.1, color: mainTxt, marginBottom: `${16 * s}px` }}>{card.title}</h2>
            {card.body && <p style={{ fontFamily: sans, fontSize: `${26 * s * fs}px`, fontWeight: 400, lineHeight: 1.6, color: subTxt, marginBottom: `${40 * s}px`, maxWidth: `${700 * s}px` }}>{card.body}</p>}
            <div style={{ padding: `${18 * s}px ${48 * s}px`, backgroundColor: accentColor, borderRadius: `${6 * s}px`, display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ fontFamily: sans, fontSize: `${20 * s * fs}px`, fontWeight: 800, color: btnTxt, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>SAIBA MAIS →</span>
            </div>
            {userName && <p style={{ fontFamily: sans, fontSize: `${16 * s * fs}px`, fontWeight: 600, color: subTxt, marginTop: `${32 * s}px`, letterSpacing: `${2 * s}px`, textTransform: 'uppercase' }}>@{userName}</p>}
          </div>
        </div>
      );
    }

    if (hasImage) {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg, display: 'flex' }}>
          <div style={{ width: `${sideW * s}px`, minHeight: '100%', backgroundColor: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: sans, fontSize: `${48 * s * fs}px`, fontWeight: 900, color: computeLuminance(accentColor) > 0.35 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>{String(index).padStart(2, '0')}</span>
          </div>
          <div style={{ width: '40%', position: 'relative', overflow: 'hidden' }}>
            <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${48 * s * ps}px ${40 * s * ps}px`, gap: `${20 * s}px` }}>
            <p style={{ fontFamily: serif, fontSize: `${38 * s * fs}px`, fontWeight: 700, lineHeight: 1.2, color: mainTxt }}>{renderAccentText(topText, accentColor, mainTxt, 38, s)}</p>
            {bottomText && (
              <>
                <div style={{ width: `${40 * s}px`, height: `${2 * s}px`, backgroundColor: accentColor }} />
                <p style={{ fontFamily: sans, fontSize: `${24 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: subTxt }}>{bottomText}</p>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: bg, display: 'flex' }}>
        <div style={{ width: `${sideW * s}px`, minHeight: '100%', backgroundColor: accentColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: sans, fontSize: `${48 * s * fs}px`, fontWeight: 900, color: computeLuminance(accentColor) > 0.35 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>{String(index).padStart(2, '0')}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `${64 * s * ps}px ${56 * s * ps}px`, gap: `${28 * s}px`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: `${20 * s}px`, right: `${20 * s}px`, fontFamily: serif, fontSize: `${240 * s}px`, fontWeight: 900, color: accentColor, opacity: 0.05, lineHeight: 1 }}>{index}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${12 * s}px` }}>
            <div style={{ width: `${32 * s}px`, height: `${3 * s}px`, backgroundColor: accentColor }} />
            <span style={{ fontFamily: sans, fontSize: `${14 * s * fs}px`, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>Ponto {index}</span>
          </div>
          <p style={{ fontFamily: serif, fontSize: `${48 * s * fs}px`, fontWeight: 700, lineHeight: 1.15, color: mainTxt }}>{renderAccentText(topText, accentColor, mainTxt, 48, s)}</p>
          {bottomText && <p style={{ fontFamily: sans, fontSize: `${30 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: subTxt }}>{bottomText}</p>}
          {showHeader && !logoUrl && brandName && (
            <div style={{ position: 'absolute', bottom: `${24 * s}px`, left: `${56 * s}px` }}>
              <span style={{ fontFamily: sans, fontSize: `${14 * s * fs}px`, fontWeight: 500, color: subTxt, letterSpacing: `${2 * s}px`, textTransform: 'uppercase' }}>{brandName}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    const isBetaTest2 = activePresetId === 'beta-test2';
    const isBetaTest3 = activePresetId === 'beta-test3';
    if (isBetaTest2) return renderBetaTest2Card(card, index, isExport);
    if (isBetaTest3) return renderBetaTest3Card(card, index, isExport);

    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    const s = isExport ? 1 : PREVIEW_W / CARD_W;
    const fs = card.fontScale ?? 1.0;
    const ps = card.paddingScale ?? 1.0;
    const layout = card.layout || 'dark';
    const isLight = layout === 'light';
    const isAccent = layout === 'accent';
    const bg = isAccent ? accentColor : bgColor;
    
    // Ensure text contrast: compute luminance of the effective background
    const computeLuminance = (hexColor: string) => {
      const hex = hexColor.replace('#', '');
      if (hex.length < 6) return 0; // fallback: treat as dark
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
    const bgLuminance = computeLuminance(bg);
    const isDarkBg = bgLuminance < 0.35;
    
    // ALWAYS ensure readable text: auto-detect for ALL layouts based on actual bg luminance
    const mainTxt = isLight ? (isDarkBg ? '#FFFFFF' : '#1A1A1A') : isAccent ? (isDarkBg ? '#FFFFFF' : '#1A1A1A') : (isDarkBg ? '#FFFFFF' : '#1A1A1A');
    const secondaryTxt = isLight ? (isDarkBg ? 'rgba(255,255,255,0.75)' : '#666') : isAccent ? (isDarkBg ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)') : (isDarkBg ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)');
    const accentTxt = isAccent ? (isDarkBg ? '#FFFFFF' : '#1A1A1A') : accentColor;
    const headerTxt = isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

    const renderHeader = () => {
      if (!showHeader) return null;
      // When a logo is uploaded, hide the text header (brandName, date, etc.)
      if (logoUrl) return null;
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${28 * s * ps}px ${48 * s * ps}px`, fontFamily: sans, fontSize: `${20 * s * fs}px`, fontWeight: 500, color: headerTxt, letterSpacing: `${0.5 * s}px`, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <span>{brandName}</span>
          <span>{userName ? `@${userName}` : ''}</span>
          <span>{dateLabel}</span>
        </div>
      );
    };

    const renderLogo = () => {
      if (!logoUrl) return null;
      const size = 72 * s;
      const margin = 18 * s;
      const posStyle: React.CSSProperties = {
        position: 'absolute',
        width: size,
        height: size,
        objectFit: 'contain',
        zIndex: 15,
        ...(logoPosition.includes('top') ? { top: margin } : { bottom: margin }),
        ...(logoPosition.includes('left') ? { left: margin } : { right: margin }),
        // Auto-whiten colorful logos on dark backgrounds
        ...(isDarkBg ? { filter: 'brightness(0) invert(1)' } : {}),
      };
      return <img src={logoUrl} alt="" style={posStyle} />;
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
          {renderLogo()}
        </div>
      );
    }

    if (card.type === 'cta') {
      // CTA: if there's an image with dark overlay, force white text regardless of bg
      const ctaHasImage = !!card.imageUrl;
      const ctaTxt = ctaHasImage ? '#FFFFFF' : mainTxt;
      const ctaSecondaryTxt = ctaHasImage ? 'rgba(255,255,255,0.75)' : secondaryTxt;
      // CTA button text: ensure contrast against accentColor
      const accentLum = computeLuminance(accentColor);
      const ctaBtnTxt = accentLum > 0.35 ? '#1A1A1A' : '#FFFFFF';
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
          {ctaHasImage && (<><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /><div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)` }} /></>)}
          {!ctaHasImage && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${accentColor}33 0%, transparent 70%)` }} />}
          {renderHeader()}
          <div style={{ position: 'absolute', inset: `${80 * s * ps}px ${48 * s * ps}px ${60 * s * ps}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 10 }}>
            {/* Decorative line */}
            <div style={{ width: `${60 * s}px`, height: `${4 * s}px`, backgroundColor: accentColor, borderRadius: `${4 * s}px`, marginBottom: `${40 * s}px` }} />
            <h2 style={{ fontFamily: serif, fontSize: `${72 * s * fs}px`, fontWeight: 900, lineHeight: 1.05, color: ctaTxt, marginBottom: `${24 * s}px`, textTransform: 'uppercase', letterSpacing: `-${1 * s}px` }}>{card.title}</h2>
            {card.body && <p style={{ fontFamily: serif, fontSize: `${32 * s * fs}px`, fontWeight: 400, lineHeight: 1.6, color: ctaTxt, opacity: 0.75, maxWidth: `${850 * s}px`, marginBottom: `${40 * s}px` }}>{card.body}</p>}
            {/* CTA button-like element */}
            <div style={{ padding: `${20 * s}px ${56 * s}px`, backgroundColor: accentColor, borderRadius: `${12 * s}px`, display: 'inline-flex', alignItems: 'center', gap: `${12 * s}px` }}>
              <p style={{ fontFamily: sans, fontSize: `${24 * s * fs}px`, fontWeight: 800, color: ctaBtnTxt, textTransform: 'uppercase', letterSpacing: `${2.5 * s}px` }}>SAIBA MAIS →</p>
            </div>
            {userName && <p style={{ fontFamily: sans, fontSize: `${20 * s * fs}px`, fontWeight: 600, color: ctaTxt, opacity: 0.5, marginTop: `${36 * s}px`, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>@{userName}</p>}
          </div>
          {renderLogo()}
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
          {renderLogo()}
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
        {renderLogo()}
      </div>
    );
  };

  // ==================== UI ====================
  const canProceed = wizardStep === 0 ? topic.trim().length > 0 : true;

  // Voice guide: speak on step change (only after welcome is dismissed)
  useEffect(() => {
    // Don't speak when loading an already-generated carousel
    if (!showWelcome && !carouselData) {
      speakStep(wizardStep);
    }
  }, [wizardStep, speakStep, showWelcome, carouselData]);

  return (
    <div className="h-screen flex flex-col overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* ===== WELCOME / DASHBOARD SCREEN ===== */}
      <AnimatePresence>
        {showWelcome && !user && (
          <WelcomeScreen onStart={(initialTopic?: string, shouldEnhance?: boolean) => {
            if (initialTopic) setTopic(initialTopic);
            setShowWelcome(false);
            if (shouldEnhance && initialTopic) {
              setTimeout(() => enhancePrompt(), 300);
            }
          }} />
        )}
        {showWelcome && user && (
          <motion.div
            key="dashboard"
            className="fixed inset-0 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DashboardLayout
              onStartCarousel={(topic?: string) => {
                if (topic) {
                  setTopic(topic);
                  setShowWelcome(false);
                  setTimeout(() => enhancePrompt(), 300);
                } else {
                  setShowWelcome(false);
                }
              }}
              onLoadCarousel={async (item: any) => {
                try {
                  const { data } = await supabase.from('generated_carousels').select('*').eq('id', item.id).single();
                  if (data) {
                    loadCarousel(data);
                    setShowWelcome(false);
                  }
                } catch (err) { console.error(err); }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only render content after welcome is dismissed to prevent flicker */}
      {!showWelcome && <>
      {/* Header removed — Save/Export moved to action buttons area */}

      {/* Normal header for editor mode */}
      {carouselData && !generatingAllImages && editingCard !== null && null}

      <div className={carouselData && editingCard === null ? '' : 'flex-1 flex flex-col'} style={carouselData && editingCard === null ? { flex: 1, display: 'flex', flexDirection: 'column' } : undefined}>
        {/* ========== WIZARD - DARK THEME ========== */}
        {!carouselData && !generating && !generatingAllImages && (
          <div className="flex-1 flex flex-col w-full relative overflow-x-hidden overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
            {/* Subtle ambient glow accents */}
            <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(120,80,220,0.8) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-150px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(160,100,255,0.6) 0%, transparent 70%)' }} />

            {/* Menu button to open sidebar drawer */}
            {user && (
              <button
                onClick={() => setSidebarDrawerOpen(true)}
                className="absolute top-4 left-4 z-20 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-white/60" />
              </button>
            )}

            {/* Sidebar drawer overlay */}
            {sidebarDrawerOpen && (
              <div className="fixed inset-0 z-[80] flex">
                <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarDrawerOpen(false)} />
                <div className="relative w-[280px] h-full animate-in slide-in-from-left duration-200">
                  <DashboardSidebar
                    activeTab=""
                    onTabChange={(tab) => {
                      setSidebarDrawerOpen(false);
                      setShowWelcome(true);
                    }}
                    onSearch={() => {
                      setSidebarDrawerOpen(false);
                      setShowWelcome(true);
                    }}
                  />
                  <button onClick={() => setSidebarDrawerOpen(false)} className="absolute top-3 right-3 p-1 text-white/40 hover:text-white cursor-pointer z-10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Two-column layout: left (steps + inputs + nav), right (cube) */}
            <div className="flex-1 flex flex-row relative z-10 w-full overflow-x-hidden">
              {/* LEFT column: centered content */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-8 overflow-y-auto">
                <div className="w-full max-w-[520px] space-y-6">
                  {/* Progress dots + voice toggle */}
                  <div className="flex items-center justify-center gap-2">
                    {WIZARD_STEPS.map((_, i) => (
                      <button key={i} onClick={() => i <= wizardStep && setWizardStep(i)}
                        className="transition-all"
                        style={{
                          width: i === wizardStep ? 24 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: i === wizardStep ? '#9B6BFF' : i < wizardStep ? 'rgba(155,107,255,0.5)' : 'rgba(255,255,255,0.08)',
                          cursor: i <= wizardStep ? 'pointer' : 'default',
                        }}
                      />
                    ))}
                    {/* Voice button moved to bottom-right corner */}
                  </div>

                   {/* Step content with entrance animation */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={wizardStep}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                    {wizardStep === 0 && (
                      <StepTopic topic={topic} setTopic={setTopic} keywords={keywords} setKeywords={setKeywords}
                        cardCount={cardCount} setCardCount={setCardCount} imageCardCount={imageCardCount} setImageCardCount={setImageCardCount}
                        enhancingPrompt={enhancingPrompt} onEnhance={enhancePrompt}
                        searchingWeb={searchingWeb} onSearchWeb={handleSearchWeb} webSearchResult={webSearchResult}
                        skipWebSearch={skipWebSearch} onToggleSkipWebSearch={() => { setSkipWebSearch(!skipWebSearch); if (!skipWebSearch) setWebSearchResult(null); }} />
                    )}
                    {wizardStep === 1 && (
                      <StepCardCount cardCount={cardCount} setCardCount={setCardCount} />
                    )}
                    {wizardStep === 2 && (
                      <StepWebImages referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        webImages={webSearchResult?.images} onSkip={() => setWizardStep(3)} />
                    )}
                    {wizardStep === 3 && (
                      <StepFaceRef referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        famousList={famousList} setFamousList={setFamousList}
                        famousImages={famousImages} setFamousImages={setFamousImages} />
                    )}
                    {wizardStep === 4 && (
                      <StepProduct productImages={productImages} setProductImages={setProductImages}
                        productAnalysis={productAnalysis} setProductAnalysis={setProductAnalysis}
                        analyzingProduct={analyzingProduct} setAnalyzingProduct={setAnalyzingProduct} />
                    )}
                    {wizardStep === 5 && (
                      <StepBrandRef referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        brandAssets={brandAssets}
                        onSuggestColors={(palette) => {
                          setBgColor(palette.bg);
                          setAccentColor(palette.accent);
                          setTextColor(palette.text || '#FFFFFF');
                          // Auto-skip colors step since user accepted brand colors
                          setTimeout(() => setWizardStep(7), 400);
                        }} />
                    )}
                    {wizardStep === 6 && (
                      <StepColors bgColor={bgColor} setBgColor={setBgColor}
                        accentColor={accentColor} setAccentColor={setAccentColor}
                        textColor={textColor} setTextColor={setTextColor} />
                    )}
                    {wizardStep === 7 && (
                      <StepFonts selectedFont={selectedFont} setSelectedFont={setSelectedFont} />
                    )}
                    {wizardStep === 8 && (
                      <StepBranding brandName={brandName} setBrandName={setBrandName}
                        userName={userName} setUserName={setUserName}
                        dateLabel={dateLabel} setDateLabel={setDateLabel}
                        showHeader={showHeader} setShowHeader={setShowHeader}
                        logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                        logoPosition={logoPosition} setLogoPosition={setLogoPosition} />
                    )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button onClick={() => { if (wizardStep === 0) { setShowWelcome(true); setWizardStep(0); } else setWizardStep(wizardStep - 1); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white/30 hover:text-white/60 transition-all">
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </button>

                    {wizardStep < WIZARD_STEPS.length - 1 ? (
                      <div className="flex items-center gap-2">
                        {/* Skip button for face, product and brand steps */}
                        {(wizardStep === 3 || wizardStep === 4 || wizardStep === 5) && (
                          <button onClick={() => setWizardStep(wizardStep + 1)}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all">
                            Pular
                          </button>
                        )}
                        <button onClick={async () => {
                            if (wizardStep === 0 && !webSearchResult && !skipWebSearch && topic.trim()) {
                              await handleSearchWeb();
                            }
                            if (wizardStep === 1) {
                              setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                            }
                            setWizardStep(wizardStep + 1);
                          }} disabled={!canProceed || searchingWeb}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
                          style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}>
                          {searchingWeb ? <><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando...</> : <>Continuar <ChevronRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => {
                          setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                          setTransitionToGenerate(true);
                          setTimeout(() => generateContent(), 1200);
                        }} disabled={generating || transitionToGenerate || !topic.trim()}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
                        style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}>
                        <Sparkles className="h-4 w-4" /> Gerar Carrossel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Carousel loader animation with step percentage */}
              <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="carousel-loader-wrapper" style={{ width: '240px', height: '240px' }}>
                  <div className="carousel-loader-spinner" />
                  <span className="text-white/60 text-3xl font-light z-[1]">
                    <AnimatedCounter target={
                      wizardStep === 0
                        ? (webSearchResult ? 10 : 0)
                        : wizardStep === 1 ? 18
                        : wizardStep === 2 ? 30
                        : wizardStep === 3 ? 42
                        : wizardStep === 4 ? 52
                        : wizardStep === 5 ? 62
                        : wizardStep === 6 ? 75
                        : wizardStep === 7 ? 88
                        : 99
                    } />
                  </span>
                </div>
              </div>

              {/* Fullscreen transition overlay */}
              <AnimatePresence>
                {transitionToGenerate && (
                  <motion.div
                    className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <motion.div
                      className="carousel-loader-wrapper"
                      style={{ width: '280px', height: '280px' }}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    >
                      <div className="carousel-loader-spinner" />
                      <span className="text-white/60 text-3xl font-light z-[1]">
                        <AnimatedCounter target={100} />
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice toggle — bottom-right corner */}
              <button onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeaking) stopSpeaking(); }}
                className={`fixed bottom-6 right-6 z-50 p-2.5 rounded-full transition-all shadow-lg backdrop-blur-sm ${
                  voiceEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.06] text-white/15 hover:text-white/30'
                }`}
                title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {voiceEnabled ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Generating state - fullscreen split animation */}
        {(generating || generatingAllImages) && !transitionToGenerate && (
          <GeneratingAnimation
            imageGenProgress={imageGenProgress}
            topic={topic}
            cardCount={cardCount}
            bgColor={bgColor}
            accentColor={accentColor}
            textColor={textColor}
            selectedFont={['Playfair Display','Merriweather','Lora','DM Serif Display','Cormorant Garamond','Montserrat','Poppins','Bebas Neue','Oswald','Raleway','Inter','Space Grotesk','Sora','Outfit','Clash Display','Crimson Text'][selectedFont] || 'Playfair Display'}
            brandName={brandName}
            logoUrl={logoUrl}
            skipWebSearch={skipWebSearch}
          />
        )}

        {/* ===== INSTAGRAM MOCKUP PREVIEW ===== */}
        {carouselData && editingCard === null && (
          <div className="flex-1 flex flex-col items-center justify-start py-8 px-4 relative overflow-y-auto overflow-x-hidden" style={{ backgroundColor: '#0A0A0A' }}>
            {/* Home button */}
            {user && (
              <button
                onClick={() => setShowWelcome(true)}
                className="absolute top-4 left-4 z-20 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Home className="w-5 h-5 text-white/60" />
              </button>
            )}
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
                <div className="relative overflow-hidden" style={{ aspectRatio: `${CARD_W}/${CARD_H}`, backgroundColor: '#000' }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any)._touchStartX = touch.clientX;
                  }}
                  onTouchEnd={(e) => {
                    const startX = (e.currentTarget as any)._touchStartX;
                    if (startX == null) return;
                    const endX = e.changedTouches[0].clientX;
                    const diff = startX - endX;
                    if (Math.abs(diff) > 40) {
                      if (diff > 0 && activeCardIndex < carouselData.cards.length - 1 && !isCardLocked(activeCardIndex + 1)) {
                        setActiveCardIndex(activeCardIndex + 1);
                      } else if (diff < 0 && activeCardIndex > 0) {
                        setActiveCardIndex(activeCardIndex - 1);
                      }
                    }
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                    <div style={{
                      width: PREVIEW_W,
                      height: PREVIEW_H,
                      transform: `scale(${369 / PREVIEW_W})`,
                      transformOrigin: 'top left',
                    }}>
                      {renderCardPreview(carouselData.cards[activeCardIndex], activeCardIndex, false)}
                    </div>
                    {/* Guest lock overlay */}
                    {isCardLocked(activeCardIndex) && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                        <Lock className="w-8 h-8 mb-3" style={{ color: '#8B5CF6' }} />
                        <p className="text-white font-semibold text-sm mb-1">Card bloqueado</p>
                        <p className="text-white/50 text-xs mb-4 text-center px-6">Cadastre-se para desbloquear todos os cards</p>
                        <button onClick={() => navigate('/checkout')}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                          Cadastrar e Desbloquear
                        </button>
                      </div>
                    )}
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
                    <button onClick={() => { if (isCardLocked(activeCardIndex + 1)) return; setActiveCardIndex(activeCardIndex + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      {isCardLocked(activeCardIndex + 1) ? <Lock className="h-3 w-3 text-white/60" /> : <ChevronRight className="h-3.5 w-3.5 text-white" />}
                    </button>
                  )}
                </div>

                {/* Instagram dots + actions */}
                <div style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                  {/* Dots */}
                  <div className="flex items-center justify-center gap-1 py-2.5">
                    {carouselData.cards.map((_, i) => (
                      <button key={i} onClick={() => { if (!isCardLocked(i)) setActiveCardIndex(i); }}
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
                    <p className="text-white text-[11px]"><span className="font-semibold">{userName || 'seuuser'}</span> <span className="text-white/60">{carouselData.title || topic}</span></p>
                  </div>
                  {/* Bottom bar */}
                  <div className="flex justify-center pb-2">
                    <div className="w-32 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Inline Style Panel — desktop only, next to the phone */}
            <AnimatePresence>
              {showStylePanel && !isMobileView && (
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
                      showHeader={showHeader} setShowHeader={setShowHeader}
                      logoUrl={logoUrl} setLogoUrl={setLogoUrl} logoPosition={logoPosition} setLogoPosition={setLogoPosition}
                      globalFontScale={Math.round((carouselData?.cards?.[0]?.fontScale ?? 1) * 100)}
                      onChangeGlobalFontScale={(v) => updateAllCards({ fontScale: v / 100 })}
                      onApplyPreset={(preset) => setActivePresetId(preset.id)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Style Panel — bottom sheet */}
            <AnimatePresence>
              {showStylePanel && isMobileView && (
                <>
                  <motion.div
                    key="style-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-[50]"
                    onClick={() => setShowStylePanel(false)}
                  />
                  <motion.div
                    key="style-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-[51] rounded-t-2xl flex flex-col"
                    style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '88dvh' }}
                  >
                    {/* Drag handle */}
                    <div className="flex justify-center py-2.5 shrink-0">
                      <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5" style={{ color: '#8B5CF6' }} />
                        <h3 className="font-bold text-white text-base">Estilo</h3>
                      </div>
                      <button onClick={() => setShowStylePanel(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1 px-4 pb-10" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                      <StepStyle bgColor={bgColor} setBgColor={setBgColor} accentColor={accentColor} setAccentColor={setAccentColor}
                        textColor={textColor} setTextColor={setTextColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                        brandName={brandName} setBrandName={setBrandName} userName={userName} setUserName={setUserName}
                        dateLabel={dateLabel} setDateLabel={setDateLabel}
                        showHeader={showHeader} setShowHeader={setShowHeader}
                        logoUrl={logoUrl} setLogoUrl={setLogoUrl} logoPosition={logoPosition} setLogoPosition={setLogoPosition}
                        globalFontScale={Math.round((carouselData?.cards?.[0]?.fontScale ?? 1) * 100)}
                        onChangeGlobalFontScale={(v) => updateAllCards({ fontScale: v / 100 })}
                        onApplyPreset={(preset) => setActivePresetId(preset.id)} />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Caption panel — bottom sheet on mobile, side panel on desktop */}
            <AnimatePresence>
              {showCaptionPanel && (
                <>
                  {/* Desktop side panel */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="hidden md:block flex-shrink-0 overflow-hidden"
                  >
                    <div className="w-[340px] h-full max-h-[80vh] overflow-y-auto rounded-2xl p-5" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-400" />
                          <h3 className="text-sm font-semibold text-white">Legenda da Publicação</h3>
                        </div>
                        <button onClick={() => setShowCaptionPanel(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <X className="h-4 w-4 text-white/50" />
                        </button>
                      </div>
                      <textarea
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder={generatingCaption ? 'Gerando legenda...' : 'Escreva ou gere uma legenda para o post...'}
                        rows={12}
                        className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm px-3 py-3 rounded-xl resize-none outline-none mb-3"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      />
                      <p className="text-[10px] text-white/30 mb-3">{postCaption.length}/2200 caracteres</p>
                      <div className="flex gap-2">
                        <button onClick={generateCaption} disabled={generatingCaption}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: 'rgba(173,95,255,0.9)', border: '1px solid rgba(139,92,246,0.15)' }}>
                          {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {generatingCaption ? 'Gerando...' : 'Gerar com IA'}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(postCaption); toast({ title: 'Legenda copiada!' }); }}
                          disabled={!postCaption}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-all disabled:opacity-30"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Mobile bottom sheet */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="md:hidden fixed bottom-0 left-0 right-0 z-[51] rounded-t-2xl overflow-hidden"
                    style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '75dvh' }}
                  >
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-white">Legenda</h3>
                      </div>
                      <button onClick={() => setShowCaptionPanel(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-white/50" />
                      </button>
                    </div>
                    <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(75dvh - 60px)' }}>
                      <textarea
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder={generatingCaption ? 'Gerando legenda...' : 'Escreva ou gere uma legenda...'}
                        rows={8}
                        className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm px-3 py-3 rounded-xl resize-none outline-none mt-3 mb-2"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      />
                      <p className="text-[10px] text-white/30 mb-3">{postCaption.length}/2200 caracteres</p>
                      <div className="flex gap-2">
                        <button onClick={generateCaption} disabled={generatingCaption}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={{ backgroundColor: 'rgba(139,92,246,0.12)', color: 'rgba(173,95,255,0.9)', border: '1px solid rgba(139,92,246,0.15)' }}>
                          {generatingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {generatingCaption ? 'Gerando...' : 'Gerar com IA'}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(postCaption); toast({ title: 'Legenda copiada!' }); }}
                          disabled={!postCaption}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-all disabled:opacity-30"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            </div>{/* end center area flex */}

            {/* Guest CTA banner */}
            {isGuest && (
              <div className="flex items-center justify-center gap-3 mt-4 w-full relative z-10 px-4">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl w-full max-w-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Lock className="h-4 w-4 shrink-0" style={{ color: '#8B5CF6' }} />
                  <p className="text-xs text-white/60 flex-1">Cadastre-se para desbloquear todos os cards, salvar e exportar seus carrosséis.</p>
                  <button onClick={() => navigate('/checkout')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)' }}>
                    Cadastrar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons below */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 w-full relative z-10 flex-wrap">
              <button onClick={saveCarousel} disabled={savingCarousel || isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                {savingCarousel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isGuest ? <Lock className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {isGuest ? 'Bloqueado' : currentCarouselId ? 'Atualizar' : 'Salvar'}
              </button>
              <button data-tour="btn-export" onClick={isGuest ? () => navigate('/checkout') : exportAllCards} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white border transition-all disabled:opacity-50"
                style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' }}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isGuest ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {isGuest ? 'Cadastre-se' : 'Exportar'}
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button data-tour="btn-add" onClick={addCard} disabled={isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Card
              </button>
              <button data-tour="btn-style" onClick={() => setShowStylePanel(!showStylePanel)} disabled={isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' }}>
                <Palette className="h-3.5 w-3.5" /> Estilo
              </button>
              <button onClick={() => { setShowCaptionPanel(!showCaptionPanel); if (!postCaption && !showCaptionPanel) generateCaption(); }} disabled={isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: showCaptionPanel ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)' }}>
                <FileText className="h-3.5 w-3.5" /> Legenda
              </button>
              <button onClick={() => { setCarouselData(null); setCurrentCarouselId(null); setWizardStep(0); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                Novo
              </button>
            </div>

            {/* Card strip - horizontal thumbnails */}
            <div data-tour="card-strip" className="w-full max-w-5xl mt-6 relative z-10 overflow-x-hidden">
              <div className="flex gap-3 pb-4 px-4 justify-center flex-wrap">
                {carouselData.cards.map((card, i) => {
                  const thumbW = 120;
                  const thumbH = thumbW * (CARD_H / CARD_W);
                  return (
                  <div key={i} className="snap-center flex-shrink-0 relative group cursor-pointer" style={{ width: thumbW + 4 }}
                    onClick={() => { if (isCardLocked(i)) return; setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(card.imagePrompt || card.title || ''); }}>
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
                    {/* Lock overlay for guest thumbnails */}
                    {isCardLocked(i) && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
                        <Lock className="w-4 h-4" style={{ color: 'rgba(139,92,246,0.7)' }} />
                      </div>
                    )}
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
                className="flex flex-col items-center p-2 md:p-4 shrink-0 md:flex-1 md:overflow-auto relative"
                style={{ backgroundColor: '#0a0a0f' }}
              >
                {/* Glow effect */}
                <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
                
              {/* Card preview - compact on mobile, swipeable */}
                <div
                  className="flex items-center justify-center w-full flex-1 touch-pan-y"
                  style={{ minHeight: 0 }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any)._swipeStartX = touch.clientX;
                    (e.currentTarget as any)._swipeStartY = touch.clientY;
                    (e.currentTarget as any)._swiped = false;
                  }}
                  onTouchMove={(e) => {
                    const el = e.currentTarget as any;
                    if (el._swiped) return;
                    const diffX = e.touches[0].clientX - (el._swipeStartX || 0);
                    const diffY = e.touches[0].clientY - (el._swipeStartY || 0);
                    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                      el._swiped = true;
                      if (diffX > 0 && validIndex > 0) {
                        const prev = validIndex - 1;
                        setEditingCard(prev); setActiveCardIndex(prev);
                        setAiImagePrompt(carouselData.cards[prev]?.imagePrompt || carouselData.cards[prev]?.title || '');
                      } else if (diffX < 0 && validIndex < carouselData.cards.length - 1) {
                        const next = validIndex + 1;
                        setEditingCard(next); setActiveCardIndex(next);
                        setAiImagePrompt(carouselData.cards[next]?.imagePrompt || carouselData.cards[next]?.title || '');
                      }
                    }
                  }}
                >
                  <div className="relative w-full flex items-center justify-center" style={{ maxWidth: '90vw' }}>
                    <div style={{
                      transform: `scale(${Math.min((typeof window !== 'undefined' ? (window.innerWidth < 768 ? window.innerWidth * 0.6 : window.innerWidth * 0.45) : 300) / PREVIEW_W, 1.4)})`,
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
                <div className="flex items-center justify-center gap-2 md:gap-3 py-2 md:py-3 shrink-0 w-full">
                  <button
                    onClick={() => { const prev = Math.max(0, validIndex - 1); setEditingCard(prev); setActiveCardIndex(prev); setAiImagePrompt(carouselData.cards[prev]?.imagePrompt || carouselData.cards[prev]?.title || ''); }}
                    disabled={validIndex === 0}
                    className="p-2 md:p-2.5 rounded-full border shadow-md disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-white/10"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-white/70" />
                  </button>
                  <div className="flex items-center gap-1 md:gap-1.5">
                    {carouselData.cards.map((_, i) => (
                      <button key={i} onClick={() => { setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(carouselData.cards[i]?.imagePrompt || carouselData.cards[i]?.title || ''); }}
                        className="rounded-full transition-all"
                        style={{
                          width: i === validIndex ? 8 : 5,
                          height: i === validIndex ? 8 : 5,
                          backgroundColor: i === validIndex ? '#8B5CF6' : 'rgba(255,255,255,0.2)',
                          transform: i === validIndex ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                    <span className="text-[10px] md:text-xs font-medium ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{validIndex + 1}/{carouselData.cards.length}</span>
                  </div>
                  <button
                    onClick={() => { const next = Math.min(carouselData.cards.length - 1, validIndex + 1); setEditingCard(next); setActiveCardIndex(next); setAiImagePrompt(carouselData.cards[next]?.imagePrompt || carouselData.cards[next]?.title || ''); }}
                    disabled={validIndex === carouselData.cards.length - 1}
                    className="p-2 md:p-2.5 rounded-full border shadow-md disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-white/10"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white/70" />
                  </button>
                </div>
              </motion.div>

              {/* Right sidebar - dark themed, slides in */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="md:w-[380px] flex-1 md:flex-none shrink-0 overflow-y-auto"
                style={{ backgroundColor: '#111118', borderLeft: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
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

      {/* Tour removed */}
      </>}
    </div>
  );
};

export default CarouselGenerator;
