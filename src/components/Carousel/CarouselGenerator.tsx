import React, { useState, useRef, useEffect, useCallback } from 'react';
import '@/styles/carousel-loader.css';
import { extractColorsFromImage } from '@/utils/extractColorsFromImage';
import '@/styles/cube-loader.css';
import ellocontentProfile from '@/assets/ellocontent-profile.jpg';
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
  Save, History, Clock, RotateCcw, ChevronLeft, ChevronRight, Check, ExternalLink, FileText, Copy, Lock, Menu, Home, User, MoreHorizontal, Image, UserCheck, Pencil, Folder, Smartphone
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast as sonnerToast } from 'sonner';
import StepTopic from './wizard/StepTopic';
import StepCardCount from './wizard/StepCardCount';
import StepWebImages from './wizard/StepWebImages';
import StepFaceRef from './wizard/StepFaceRef';
import StepProduct, { ProductAnalysis, ProductSize, PRODUCT_SIZE_OPTIONS } from './wizard/StepProduct';
import GalleryPicker from './wizard/GalleryPicker';
import StepBrandRef from './wizard/StepBrandRef';
import StepColors from './wizard/StepColors';
import StepFonts from './wizard/StepFonts';
import StepStyleSelect from './wizard/StepStyleSelect';
import StepBranding from './wizard/StepBranding';
import StepSpeed from './wizard/StepSpeed';
import StepVisualStyle, { VisualCategory, PeopleMode } from './wizard/StepVisualStyle';
import StepCardTexts from './wizard/StepCardTexts';
import StepMode from './wizard/StepMode';
import StepStyle, { STYLE_PRESETS, StylePreset, LogoPosition } from './wizard/StepStyle';
import CarouselEditorSidebar from './editor/CarouselEditorSidebar';
import SocialPublishDialog from './SocialPublishDialog';
// CarouselTour removed
import GeneratingAnimation from './GeneratingAnimation';
import WelcomeScreen from './WelcomeScreen';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { ReferenceImage, FamousPerson, FacePerson, ImageSettings, DEFAULT_IMAGE_SETTINGS, FLOW_COLOR } from './wizard/types';
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
  generatedPrompt?: string;
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
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showGuestPaywall, setShowGuestPaywall] = useState(false);

  // Welcome screen state
  const [showWelcome, setShowWelcome] = useState(true);
  const showWelcomeRef = useRef(true);
  // Keep ref in sync
  useEffect(() => { showWelcomeRef.current = showWelcome; }, [showWelcome]);
  const [loadingCarousel, setLoadingCarousel] = useState(false);
  
  // Content mode: carousel vs single-post
  const [contentMode, setContentMode] = useState<'carousel' | 'single-post'>('carousel');
  const [manualPostText, setManualPostText] = useState('');
  const [manualCardTexts, setManualCardTexts] = useState<{ title?: string; body?: string }[]>([]);

  // Wizard mode: simple vs advanced
  const [wizardMode, setWizardMode] = useState<'simple' | 'advanced'>('simple');
  const [continuousMode, setContinuousMode] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  // WIZARD_STEPS computed below after all state declarations
  const { speakStep, stopSpeaking, isSpeaking, voiceEnabled, setVoiceEnabled } = useCarouselVoice();

  // Step 1: Topic
  const [topic, setTopic] = useState('');
  const [originalTopic, setOriginalTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [cardCount, setCardCount] = useState(5);
  const [imageCardCount, setImageCardCount] = useState(4);
  const [faceCardCount, setFaceCardCount] = useState<number | null>(null); // null = all image cards get faces
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [mentionedPrompts, setMentionedPrompts] = useState<{ id: string; title: string; avatar_url: string | null; content: string }[]>([]);

  // Step 2: References
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [famousList, setFamousList] = useState<FamousPerson[]>([]);
  const [famousImages, setFamousImages] = useState<{ username: string; images: any[] }[]>([]);
  const [brandAssets, setBrandAssets] = useState<{ id: string; name: string; file_url: string; category: string }[]>([]);
  const [faceGender, setFaceGender] = useState<'male' | 'female' | 'auto'>('auto');
  const [wearsGlasses, setWearsGlasses] = useState(false);
  const [facePersons, setFacePersons] = useState<FacePerson[]>([]);
  const [allPeopleOnCover, setAllPeopleOnCover] = useState(true);

  // Visual style (when no face is attached)
  const [visualCategory, setVisualCategory] = useState<VisualCategory | null>(null);
  const [peopleMode, setPeopleMode] = useState<PeopleMode>('none');
  const [randomFaceCount, setRandomFaceCount] = useState<number | null>(null);
  const [visualSearchQuery, setVisualSearchQuery] = useState('');
  
  // Product state
  const [productImages, setProductImages] = useState<{ url: string; thumb: string; file: File }[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis | null>(null);
  const [analyzingProduct, setAnalyzingProduct] = useState(false);
  const [productSize, setProductSize] = useState<ProductSize>('medium');

  // Compute wizard steps after all state is declared
  const hasFacePhotos = facePersons.some(p => p.photos.length > 0);
  const SIMPLE_STEPS = ['Modo', 'Tema', 'Estilo', 'Formato', 'Rosto', ...(hasFacePhotos ? [] : ['Visual']), 'Logo', 'Velocidade'];
  const ADVANCED_STEPS = ['Modo', 'Tema', 'Estilo', 'Formato', 'Fotos', 'Rosto', ...(hasFacePhotos ? [] : ['Visual']), 'Produto', 'Marca', 'Cores', 'Fontes', 'Roteiro', 'Logo', 'Velocidade'];
  const WIZARD_STEPS = wizardMode === 'simple' ? SIMPLE_STEPS : ADVANCED_STEPS;

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
  const [brandSuggestedPalette, setBrandSuggestedPalette] = useState<{ bg: string; accent: string; text: string } | null>(null);
  const [selectedFont, setSelectedFont] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');
  const [logoBrandColors, setLogoBrandColors] = useState<string[]>([]);

  // Auto-extract colors from logo when it changes
  useEffect(() => {
    if (!logoUrl) { setLogoBrandColors([]); return; }
    extractColorsFromImage(logoUrl, 4).then(colors => {
      console.log('Logo brand colors extracted:', colors);
      setLogoBrandColors(colors);
    }).catch(() => setLogoBrandColors([]));
  }, [logoUrl]);

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
  const [regeneratingFace, setRegeneratingFace] = useState<number | null>(null);
   const [modifyMenuCard, setModifyMenuCard] = useState<number | null>(null);
   const [faceUploadMode, setFaceUploadMode] = useState(false);
   const [tempFaceFiles, setTempFaceFiles] = useState<string[]>([]);
   const [viewPromptCard, setViewPromptCard] = useState<number | null>(null);
   const [faceGalleryOpen, setFaceGalleryOpen] = useState(false);
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
  const [activeMarketplaceStyle, setActiveMarketplaceStyle] = useState<any>(null);
  const [isLoadedFullBleed, setIsLoadedFullBleed] = useState(false);
  const [loadedMarketplaceStyleId, setLoadedMarketplaceStyleId] = useState<string | null>(null);
  const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showCarouselFromCover, setShowCarouselFromCover] = useState(false);
  const [carouselFromCoverCount, setCarouselFromCoverCount] = useState(8);
  const [coverModalTab, setCoverModalTab] = useState<'config' | 'texts'>('config');
  const [coverCardTexts, setCoverCardTexts] = useState<{ title?: string; body?: string }[]>([]);
  const [fillingCoverTexts, setFillingCoverTexts] = useState(false);
  const [generatingStories, setGeneratingStories] = useState(false);
  const [storiesImageUrl, setStoriesImageUrl] = useState<string | null>(null);
  const [showStoriesPreview, setShowStoriesPreview] = useState(false);
  const [showAddCardMenu, setShowAddCardMenu] = useState(false);
  const [addCardModal, setAddCardModal] = useState<{ open: boolean; cardType: 'composed' | 'solid'; step: 'type' | 'text-mode' | 'manual' | 'auto-preview'; autoText: { title: string; body: string } | null; manualText: { title: string; body: string }; generatingAutoText: boolean }>({ open: false, cardType: 'composed', step: 'type', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false });
  const [cloudJobId, setCloudJobId] = useState<string | null>(null);
  const cloudJobIdRef = useRef<string | null>(null);
  const carouselDataRef = useRef<CarouselData | null>(null);
  const skipCloudRef = useRef(false);
  const generatingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { cloudJobIdRef.current = cloudJobId; }, [cloudJobId]);
  useEffect(() => { generatingRef.current = generating; }, [generating]);
  useEffect(() => { carouselDataRef.current = carouselData; }, [carouselData]);

  // === BEFOREUNLOAD: If user closes while generating, trigger cloud fallback ===
  useEffect(() => {
    const handleBeforeUnload = () => {
      const jobId = cloudJobIdRef.current;
      if (!jobId || !generatingRef.current) return;
      // Fire-and-forget: trigger cloud generation for this job
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-carousel-cloud`;
      const body = JSON.stringify({ jobId });
      // Use sendBeacon for reliability during page unload
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, keepalive: true }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
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
      
      const content = data.content || {};
      setWebSearchResult({
        summary: content?.summary || 'Conteúdo encontrado com sucesso',
        citations: data.citations || [],
        content,
        images: data.images || [],
      });

      // Auto-fill keywords from image search terms (do NOT overwrite the user's topic)
      if (content?.image_search_terms?.length > 0) {
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

  // Full reset for starting a brand-new carousel
  const resetWizardState = useCallback(() => {
    setWizardStep(0);
    setContentMode('carousel');
    setManualPostText('');
    setManualCardTexts([]);
    setWizardMode('simple');
    setKeywords('');
    setCardCount(5);
    setImageCardCount(4);
    setFaceCardCount(null);
    setEnhancingPrompt(false);
    setMentionedPrompts([]);
    setReferenceImages([]);
    setFamousList([]);
    setFamousImages([]);
    setProductImages([]);
    setProductAnalysis(null);
    setAnalyzingProduct(false);
    setImageSettings(DEFAULT_IMAGE_SETTINGS);
    setCarouselData(null);
    setActiveCardIndex(0);
    setEditingCard(null);
    setRegeneratingCard(null);
    setShowStylePanel(false);
    setShowCaptionPanel(false);
    setPostCaption('');
    setGeneratingCaption(false);
    setShowRefPanel(false);
    setEditorRefImage(null);
    setSidebarDrawerOpen(false);
    setActiveMarketplaceStyle(null);
    setIsLoadedFullBleed(false);
    setLoadedMarketplaceStyleId(null);
    setSearchingWeb(false);
    setSkipWebSearch(false);
    setWebSearchResult(null);
    setCurrentCarouselId(null);
    setPexelsImages([]);
    setShowImagePicker(null);
    setGeneratingAiImage(false);
    setAiImagePrompt('');
    setGenerating(false);
    setTransitionToGenerate(false);
    setGeneratingAllImages(false);
    setImageGenProgress('');
  }, []);

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
    if (!routeCarouselId || !user || showWelcome) return;
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

  // Update URL when carousel ID changes — only when not on the welcome/dashboard screen
  useEffect(() => {
    if (showWelcome) {
      // When returning to dashboard, reset URL to root
      if (window.location.pathname.startsWith('/carousel/')) {
        window.history.replaceState({}, '', '/');
      }
      return;
    }
    if (currentCarouselId) {
      window.history.replaceState({}, '', `/carousel/${currentCarouselId}`);
    } else if (window.location.pathname.startsWith('/carousel/')) {
      window.history.replaceState({}, '', '/');
    }
  }, [currentCarouselId, showWelcome]);

  // ===== CLOUD JOB REALTIME SUBSCRIPTION =====
  useEffect(() => {
    if (!cloudJobId) return;
    const channel = supabase
      .channel(`job-${cloudJobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'carousel_generation_jobs',
        filter: `id=eq.${cloudJobId}`,
      }, (payload: any) => {
        const job = payload.new;
        if (!job) return;
        
        // Update progress
        if (job.progress_message) setImageGenProgress(job.progress_message);
        if (job.progress_current !== undefined && job.progress_total) {
          setImageGenProgress(`🎨 ${job.progress_current}/${job.progress_total} imagens geradas...`);
        }

        // Update carousel data as images come in
        if (job.carousel_data && job.status === 'generating_images') {
          setCarouselData(job.carousel_data);
        }
        
        // Job completed — if we're on the welcome/dashboard, just clear the job and let recents refresh
        if (job.status === 'completed') {
          setCloudJobId(null);
          // Only take over the screen if the user is actively in a generation session (not on dashboard)
          if (generatingRef.current && !showWelcomeRef.current) {
            setGenerating(false);
            setGeneratingAllImages(false);
            setImageGenProgress('');
            if (job.carousel_data) setCarouselData(job.carousel_data);
            if (job.carousel_id) setCurrentCarouselId(job.carousel_id);
            toast({ title: 'Carrossel gerado com sucesso!' });
          } else {
            // Background completion — just log it; the recents list will pick it up
            console.log('Cloud job completed in background:', job.carousel_id);
          }
        }
        
        // Job failed — do NOT auto-retry (local generation already ran)
        if (job.status === 'failed') {
          console.warn('Cloud job failed:', job.error_message);
          setCloudJobId(null);
          // Local generation is the primary path — cloud is only a fallback for browser close
          // If local is still running, it will finish on its own
          if (!generatingRef.current) {
            console.log('Cloud fallback failed but local generation already completed.');
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cloudJobId]);

  // ===== CHECK FOR PENDING CLOUD JOBS ON MOUNT =====
  // Cloud jobs run in BACKGROUND only — they should NEVER hijack the welcome/dashboard screen.
  // When a pending cloud job is found, we subscribe to its updates and let it finish silently.
  // The result will appear in the "Recentes" list on the dashboard when completed.
  useEffect(() => {
    if (!user) return;
    const checkPendingJobs = async () => {
      try {
        const { data } = await supabase
          .from('carousel_generation_jobs')
          .select('id, status, progress_message, carousel_data, updated_at')
          .eq('user_id', user.id)
          .in('status', ['pending', 'generating_text', 'generating_images'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (data?.[0]) {
          const updatedAt = new Date(data[0].updated_at).getTime();
          const now = Date.now();
          const stuckThresholdMs = 5 * 60 * 1000; // 5 minutes
          if (now - updatedAt > stuckThresholdMs) {
            // Job is stuck — mark it as failed silently
            await supabase
              .from('carousel_generation_jobs')
              .update({ status: 'failed', error_message: 'A geração expirou.', completed_at: new Date().toISOString() })
              .eq('id', data[0].id);
            console.log('Stale cloud job marked as failed:', data[0].id);
            return;
          }
          // Subscribe to updates in background — do NOT change showWelcome or generating state
          // The realtime subscription (cloudJobId effect) will handle completion
          // and the result will show up in the recents list
          setCloudJobId(data[0].id);
          console.log('Background cloud job detected, subscribing:', data[0].id);
        }
      } catch (err) {
        console.error('Error checking pending cloud jobs:', err);
      }
    };
    checkPendingJobs();
  }, [user]);

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

  // Helper: build generation_config to persist prompt + wizard settings
  const buildGenerationConfig = useCallback(() => ({
    topic,
    keywords,
    cardCount,
    imageCardCount,
    contentMode,
    manualPostText,
    referenceImages,
    facePersons,
    allPeopleOnCover,
    faceGender,
    wearsGlasses,
    imageSettings,
    bgColor,
    accentColor,
    textColor,
    selectedFont,
    brandName,
    userName,
    dateLabel,
    activePresetId,
    logoUrl,
    logoPosition,
    showHeader,
    marketplaceStyleId: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null,
    marketplaceStyleName: activeMarketplaceStyle?.name || null,
  }), [topic, keywords, cardCount, imageCardCount, contentMode, manualPostText, referenceImages, facePersons, allPeopleOnCover, faceGender, wearsGlasses, imageSettings, bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, activePresetId, logoUrl, logoPosition, showHeader, activeMarketplaceStyle, loadedMarketplaceStyleId]);

  // ===== AUTO-SAVE: debounced save when carouselData changes =====
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>('');
  
  useEffect(() => {
    if (!carouselData || !user || generating || generatingAllImages || isGuest) return;
    
    const dataHash = JSON.stringify({ cards: carouselData.cards.map(c => ({ ...c })), title: carouselData.title });
    if (dataHash === lastSavedDataRef.current) return;
    
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
        if (!companyData) return;
        
        const isFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed || !!loadedMarketplaceStyleId;
        const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, referenceImages: referenceImages.length > 0 ? referenceImages : undefined, faceGender, wearsGlasses, facePersons: facePersons.length > 0 ? facePersons : undefined, allPeopleOnCover };
        
        if (currentCarouselId) {
          await supabase.from('generated_carousels').update({ 
            title: carouselData.title || topic, topic, 
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), 
            carousel_data: carouselData as any, style_config: styleConfig as any, 
            card_count: carouselData.cards.length,
            marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null,
            generation_config: buildGenerationConfig(),
          } as any).eq('id', currentCarouselId);
        } else {
          const { data: inserted } = await supabase.from('generated_carousels').insert({ 
            company_id: companyData.company_id, user_id: userData.user.id, 
            title: carouselData.title || topic, topic, 
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), 
            carousel_data: carouselData as any, style_config: styleConfig as any, 
            card_count: carouselData.cards.length,
            marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null,
            generation_config: buildGenerationConfig(),
          } as any).select('id').single();
          if (inserted) {
            setCurrentCarouselId(inserted.id);
            captureCoverImage(inserted.id, companyData.company_id, carouselData).catch(() => {});
          }
        }
        
        lastSavedDataRef.current = dataHash;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save error:', err);
        setAutoSaveStatus('idle');
      }
    }, 3000); // 3s debounce
    
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [carouselData, bgColor, accentColor, textColor, selectedFont, brandName, userName, logoUrl, logoPosition, showHeader, activeMarketplaceStyle, isLoadedFullBleed, loadedMarketplaceStyleId]);

  // Export dialog is now a centered modal, no outside-click handler needed

  // ===== BUILD IMAGE PROMPT with settings =====
  const buildImagePrompt = (basePrompt: string): string => {
    const parts: string[] = [];

    // If marketplace style has imageGeneration config, use its prompt_style as the foundation
    const styleImageGen = activeMarketplaceStyle?.imageGeneration;
    if (styleImageGen?.prompt_style) {
      parts.push(styleImageGen.prompt_style);
      if (styleImageGen.prompt_prefix) {
        parts.push(styleImageGen.prompt_prefix);
      }
      parts.push(`CONTENT FOR THIS CARD: ${basePrompt}`);
    } else {
      // Default: use image type
      const typeMap: Record<string, string> = {
        'photo': 'Professional photorealistic photograph',
        'cinematic': 'Cinematic film still, movie-quality',
        'illustration': 'High-quality digital illustration, artistic',
        'print': 'Screenshot/print of a digital interface, UI design',
        '3d-render': 'Professional 3D render, octane render quality',
      };
      parts.push(typeMap[imageSettings.imageType] || 'Professional photograph');
      parts.push(basePrompt);
    }

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

    // Face attributes (gender + glasses) + STRONG FIDELITY
    const hasFaceRefs = referenceImages.some(r => r.category === 'face');
    const activeFacePersons = facePersons.filter(p => p.photos.length > 0);
    if (hasFaceRefs && activeFacePersons.length > 0) {
      if (activeFacePersons.length === 1) {
        const p = activeFacePersons[0];
        parts.push('FACE REFERENCE FIDELITY (CRITICAL): The face in this image MUST be an EXACT match to the uploaded face reference photos. Preserve the EXACT same facial structure, nose shape, eye shape, eyebrow shape, jawline, skin tone, skin texture, lip shape, and all distinctive features. The person must be immediately recognizable as the SAME individual from the reference photos. Do NOT change or stylize facial features. Do NOT use a different person. This is the #1 priority.');
        if (p.gender === 'male') parts.push('The person in the image MUST be MALE with a masculine body and build.');
        else if (p.gender === 'female') parts.push('The person in the image MUST be FEMALE with a feminine body and build.');
        if (p.wearsGlasses) parts.push('The person MUST be wearing glasses/eyeglasses. This is mandatory.');
      } else {
        parts.push(`MULTIPLE PEOPLE (CRITICAL): This image MUST contain exactly ${activeFacePersons.length} distinct people. Each person MUST match their respective face reference photos EXACTLY. Preserve facial structure, nose shape, eye shape, jawline, skin tone, and all distinctive features for EACH person.`);
        activeFacePersons.forEach((p, idx) => {
          const label = p.label || `Pessoa ${idx + 1}`;
          let desc = `${label}:`;
          if (p.gender === 'male') desc += ' MALE with masculine build.';
          else if (p.gender === 'female') desc += ' FEMALE with feminine build.';
          if (p.wearsGlasses) desc += ' MUST wear glasses.';
          parts.push(desc);
        });
      }
    } else if (hasFaceRefs) {
      // Fallback for legacy data without facePersons
      parts.push('FACE REFERENCE FIDELITY (CRITICAL): The face in this image MUST be an EXACT match to the uploaded face reference photos. Preserve the EXACT same facial structure, nose shape, eye shape, eyebrow shape, jawline, skin tone, skin texture, lip shape, and all distinctive features. The person must be immediately recognizable as the SAME individual from the reference photos. Do NOT change or stylize facial features. Do NOT use a different person. This is the #1 priority.');
      if (faceGender === 'male') parts.push('The person in the image MUST be MALE with a masculine body and build.');
      else if (faceGender === 'female') parts.push('The person in the image MUST be FEMALE with a feminine body and build.');
      if (wearsGlasses) parts.push('The person MUST be wearing glasses/eyeglasses. This is mandatory.');
    } else if (!hasFaceRefs && peopleMode === 'none') {
      // Explicit NO PEOPLE instruction
      parts.push('CRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. The image must contain ONLY visual elements, objects, graphics, text overlays, and abstract/decorative elements. NO HUMANS whatsoever.');
    } else if (!hasFaceRefs && peopleMode !== 'none') {
      // Random person mode
      const genderMap: Record<string, string> = {
        'random-female': 'The person MUST be FEMALE with a feminine body and build.',
        'random-male': 'The person MUST be MALE with a masculine body and build.',
        'random-auto': 'The AI can choose an appropriate gender for the person.',
      };
      parts.push(`Include a person/model in this image. ${genderMap[peopleMode] || ''} Use a photorealistic, professional-looking person that fits the editorial context. The person should look confident and natural.`);
    }

    // Brand colors — inject when NO marketplace style is active, OR when admin user has brand override
    const isAdminBrandOverride = user?.email === 'admin@gmail.com';
    if (logoBrandColors.length > 0 && (!activeMarketplaceStyle?.imageGeneration?.prompt_style || isAdminBrandOverride)) {
      parts.push(`PALETA DE CORES DA MARCA (OBRIGATÓRIO): Use predominantemente estas cores: ${logoBrandColors.join(', ')}. Essas cores DEVEM dominar a composição, fundos, elementos decorativos, tipografia e acentos visuais. NÃO ignore estas cores. MANTENHA o estilo editorial e layout do template, mas SUBSTITUA a paleta de cores original pelas cores da marca.`);
    }

    parts.push('4:5 portrait aspect ratio, 1080x1350px, ultra high resolution');

    return parts.filter(Boolean).join('. ');
  };

  // ===== GENERATE IMAGE (routes to Gemini or Higgsfield) =====
  const generateImage = async (opts: {
    prompt: string;
    faceReferenceUrls?: string[];
    styleReferenceUrls?: string[];
    referenceImageUrls?: string[];
    negativePrompt?: string;
    facePersonsMetadata?: { label: string; gender: string; wearsGlasses: boolean; photoCount: number }[];
  }): Promise<string | null> => {
    // Use the model selected by the user (gemini = fast, nano-banana = quality)
    const resolvedModel = imageSettings.model === 'auto'
      ? 'gemini'
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
    const styleImageGen = activeMarketplaceStyle?.imageGeneration;
    
    // Add timeout to prevent infinite loading (90s max per image)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Image generation timeout (90s)')), 90000)
    );
    
    const invokePromise = supabase.functions.invoke('generate-carousel-image', {
      body: {
        prompt: opts.prompt,
        imageSize: '3:4',
        topic: opts.prompt,
        faceReferenceUrls: opts.faceReferenceUrls,
        styleReferenceUrls: opts.styleReferenceUrls,
        referenceImageUrls: opts.referenceImageUrls,
        imageModel: resolvedModel,
        negativePrompt: opts.negativePrompt,
        fidelity: styleImageGen?.fidelity || imageSettings.fidelity,
        faceGender: faceGender,
        facePersonsMetadata: opts.facePersonsMetadata,
        ...(styleImageGen?.prompt_style ? { stylePrompt: styleImageGen.prompt_style + (activeMarketplaceStyle?._strictInstructions ? `\n\nINSTRUÇÕES RÍGIDAS DO ESTILO (PRIORIDADE MÁXIMA - SIGA À RISCA):\n${activeMarketplaceStyle._strictInstructions}` : '') } : {}),
        ...(logoBrandColors.length > 0 && (!isFullBleedMarketplace || user?.email === 'admin@gmail.com') ? { brandColors: logoBrandColors } : {}),
      },
    });
    
    const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
    if (error) throw error;
    if (data?.code === 'CONTENT_BLOCKED' || data?.error?.includes('filtros de segurança')) {
      throw new Error('⚠️ Suas fotos foram bloqueadas pelos filtros de segurança da IA. Por favor, envie imagens apropriadas e tente novamente.');
    }
    if (data?.success && data?.imageUrl) return data.imageUrl;
    if (data?.error) throw new Error(data.error);
    return null;
  };

  // ===== ENHANCE PROMPT =====
  const enhancePrompt = async (inputTopic?: string) => {
    const baseTopic = (inputTopic ?? topic).trim();
    if (!baseTopic) { toast({ title: 'Insira um tópico primeiro', variant: 'destructive' }); return; }
    setEnhancingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'enhance-prompt', prompt: baseTopic, topic: baseTopic },
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

  // ===== SAVE COVER FROM AI-GENERATED IMAGE (no html2canvas) =====
  const captureCoverImage = async (carouselId: string, companyId: string, explicitData?: CarouselData | null) => {
    try {
      // Use explicit data (passed directly) or fall back to state
      const dataSource = explicitData || carouselData;
      const firstCardImage = dataSource?.cards?.[0]?.imageUrl;
      
      if (!firstCardImage) {
        console.warn('Cover: no AI image on first card, using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }

      let blob: Blob | null = null;

      if (firstCardImage.startsWith('data:')) {
        const res = await fetch(firstCardImage);
        blob = await res.blob();
      } else if (firstCardImage.startsWith('http')) {
        try {
          const res = await fetch(firstCardImage);
          if (res.ok) blob = await res.blob();
        } catch {
          console.warn('Cover: failed to fetch remote image');
        }
      }

      if (!blob) {
        console.warn('Cover: could not get image blob, using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }

      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const fileName = `${companyId}/${carouselId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, blob, { contentType: blob.type, upsert: true });
      if (uploadError) {
        console.warn('Cover upload failed:', uploadError.message, '- using server fallback');
        await serverFallbackCover(carouselId);
        return;
      }
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
      if (urlData?.publicUrl) {
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
      const isFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed || !!loadedMarketplaceStyleId;
      const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, referenceImages: referenceImages.length > 0 ? referenceImages : undefined, faceGender, wearsGlasses, facePersons: facePersons.length > 0 ? facePersons : undefined, allPeopleOnCover };
      if (currentCarouselId) {
        await supabase.from('generated_carousels').update({ title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null, generation_config: buildGenerationConfig() } as any).eq('id', currentCarouselId);
        // Capture real rendered card as cover in background
        captureCoverImage(currentCarouselId, companyData.company_id).catch(() => {});
        toast({ title: 'Carrossel atualizado!' });
      } else {
        const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null, generation_config: buildGenerationConfig() } as any).select('id').single();
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
      const { data } = await supabase.from('generated_carousels').select('id, title, topic, keywords, created_at, card_count, style_config, cover_url, marketplace_style_id').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(50);
      setCarouselHistory(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const loadCarousel = async (item: any) => {
    setCarouselData(item.carousel_data);
    setTopic(item.topic);
    setKeywords((item.keywords || []).join(', '));
    setCurrentCarouselId(item.id);
    // Detect full-bleed: trust explicit marketplace_style_id or persisted isFullBleed flag
    const hasMarketplaceStyle = !!item.marketplace_style_id || !!item.style_config?.isFullBleed;
    setIsLoadedFullBleed(hasMarketplaceStyle);
    setLoadedMarketplaceStyleId(item.marketplace_style_id || null);
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
      // Restore reference images (face, style, product refs)
      if (sc.referenceImages?.length) setReferenceImages(sc.referenceImages);
      if (sc.faceGender) setFaceGender(sc.faceGender);
      if (sc.wearsGlasses !== undefined) setWearsGlasses(sc.wearsGlasses);
      if (sc.facePersons?.length) setFacePersons(sc.facePersons);
      if (sc.allPeopleOnCover !== undefined) setAllPeopleOnCover(sc.allPeopleOnCover);
    }
    setShowHistory(false);
    setActiveCardIndex(0);
    
    // Restore marketplace style from DB if this carousel used one
    if (item.marketplace_style_id) {
      try {
        const { data: styleData } = await supabase
          .from('marketplace_styles')
          .select('id, name, preview_images, style_config, strict_instructions')
          .eq('id', item.marketplace_style_id)
          .single();
        if (styleData?.style_config) {
          const config = styleData.style_config as any;
          config.id = styleData.id;
          config._previewImages = styleData.preview_images;
          config._strictInstructions = (styleData as any).strict_instructions || null;
          setActiveMarketplaceStyle(config);
        } else {
          setActiveMarketplaceStyle(null);
        }
      } catch {
        setActiveMarketplaceStyle(null);
      }
    } else {
      setActiveMarketplaceStyle(null);
    }
    toast({ title: 'Carrossel carregado!' });
  };

  const deleteCarousel = async (id: string) => {
    await supabase.from('generated_carousels').delete().eq('id', id);
    setCarouselHistory(prev => prev.filter(c => c.id !== id));
    if (currentCarouselId === id) setCurrentCarouselId(null);
    toast({ title: 'Carrossel removido' });
  };

  // Helper: create a cloud job for fallback
  const createCloudJob = async (mode: 'single-post' | 'carousel'): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
      if (!cu) return null;

      const productContext = productAnalysis?.confirmed ? JSON.stringify({
        productType: productAnalysis.type,
        productDescription: productAnalysis.description,
        productImageUrls: productImages.map(p => p.url),
        productSize,
        productSizeLabel: PRODUCT_SIZE_OPTIONS.find(o => o.value === productSize)?.desc || '',
      }) : null;

      let marketplaceConfig = activeMarketplaceStyle ? { ...activeMarketplaceStyle } : null;
      if (marketplaceConfig?._previewImages?.length) {
        const origin = window.location.origin;
        marketplaceConfig._previewImages = (marketplaceConfig._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
      }

      const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, contentMode: mode, manualPostText: mode === 'single-post' ? manualPostText : undefined };

      const { data: jobData, error: jobError } = await supabase.from('carousel_generation_jobs').insert({
        user_id: userData.user.id,
        company_id: cu.company_id,
        topic: topic.trim(),
        keywords: keywords,
        card_count: mode === 'single-post' ? 1 : cardCount,
        style_config: styleConfig as any,
        marketplace_style_id: activeMarketplaceStyle?.id || null,
        marketplace_style_config: marketplaceConfig as any,
        brand_name: brandName,
        user_name: userName,
        date_label: dateLabel,
        logo_url: logoUrl,
        logo_position: logoPosition,
        show_header: showHeader,
        image_settings: { ...imageSettings, faceGender, wearsGlasses, brandColors: logoBrandColors.length > 0 ? logoBrandColors : undefined, facePersonsMetadata: facePersons.filter(p => p.photos.length > 0).length > 1 ? facePersons.filter(p => p.photos.length > 0).map(p => ({ label: p.label, gender: p.gender, wearsGlasses: p.wearsGlasses, photoCount: p.photos.length })) : undefined, allPeopleOnCover } as any,
        reference_images: referenceImages as any,
        face_ref_urls: (() => { const active = facePersons.filter(p => p.photos.length > 0); return active.length > 0 ? active.flatMap(p => p.photos.map(ph => ph.url)) : referenceImages.filter(r => r.category === 'face').map(r => r.url); })() as any,
        product_context: productContext,
        web_search_content: webSearchResult?.content ? JSON.stringify(webSearchResult.content) : null,
        web_search_citations: webSearchResult?.citations as any,
        negative_prompt: imageSettings.negativePrompt || null,
      } as any).select('id').single();

      if (jobError || !jobData?.id) {
        console.warn('Failed to create cloud job:', jobError);
        return null;
      }
      return jobData.id;
    } catch (err) {
      console.warn('Cloud job creation failed:', err);
      return null;
    }
  };

  // Helper: mark cloud job as completed
  const completeCloudJob = async (jobId: string, carouselId?: string) => {
    try {
      await supabase.from('carousel_generation_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        carousel_id: carouselId || null,
        progress_message: 'Concluído localmente',
      } as any).eq('id', jobId);
    } catch (err) { console.warn('Failed to complete cloud job:', err); }
  };

  // Helper: mark cloud job as failed
  const failCloudJob = async (jobId: string, errorMsg: string) => {
    try {
      await supabase.from('carousel_generation_jobs').update({
        status: 'failed',
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      } as any).eq('id', jobId);
    } catch (err) { console.warn('Failed to update cloud job:', err); }
  };

  // ===== GENERATE SINGLE POST (1080x1350) =====
  const generateSinglePost = async () => {
    setGenerating(true);
    setCarouselData(null);
    setCurrentCarouselId(null);
    setTimeout(() => setTransitionToGenerate(false), 500);

    // Create cloud job for fallback
    const jobId = await createCloudJob('single-post');
    if (jobId) setCloudJobId(jobId);

    try {
      setGeneratingAllImages(true);
      setImageGenProgress('🎨 Gerando post único...');

      const activeFP = facePersons.filter(p => p.photos.length > 0);
      const faceRefUrls = activeFP.length > 0 ? activeFP.flatMap(p => p.photos.map(ph => ph.url)) : referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const singlePostFaceMeta = activeFP.length > 1 ? activeFP.map(p => ({ label: p.label, gender: p.gender, wearsGlasses: p.wearsGlasses, photoCount: p.photos.length })) : undefined;
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const productRefUrls = productImages.map(p => p.url);
      const marketplaceRefUrls: string[] = [];
      if (activeMarketplaceStyle?._previewImages?.length) {
        const origin = window.location.origin;
        const allPreviews = (activeMarketplaceStyle._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
        // Send ALL preview images for maximum style fidelity
        marketplaceRefUrls.push(...allPreviews);
      }

      const allStyleRefs = [...styleRefUrls, ...marketplaceRefUrls];

      // Build a rich prompt for single post with manual text
      const promptParts: string[] = [];
      promptParts.push('IDIOMA OBRIGATÓRIO: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO correto e fluente. Verifique a ortografia e gramática. NÃO use espanhol, inglês ou qualquer outro idioma. NÃO invente palavras.');
      if (manualPostText.trim()) {
        promptParts.push(`TEXTO EXATO PARA A IMAGEM (use APENAS este texto, sem adicionar nada): "${manualPostText.trim()}"`);
        promptParts.push('REGRA ABSOLUTA: Renderize APENAS o texto exato fornecido acima na imagem. NÃO adicione subtítulos, tópicos, bullet points, listas, descrições extras ou qualquer outro texto. O texto acima é o ÚNICO conteúdo textual permitido na imagem. Renderize com tipografia editorial elegante.');
        promptParts.push(`CONTEXTO VISUAL (para guiar o estilo visual, NÃO adicione este texto na imagem): ${topic.trim()}`);
      } else {
        promptParts.push(`TEMA: "${topic.trim()}"`);
        promptParts.push('REGRA DE TEXTO: Crie um título CURTO e IMPACTANTE (máximo 8 palavras) baseado no tema. Pode adicionar um subtítulo curto (máximo 12 palavras). NÃO escreva parágrafos, descrições longas, explicações ou blocos de texto extensos. O post deve ser majoritariamente VISUAL com texto mínimo e editorial.');
      }
      promptParts.push('POST ÚNICO para Instagram (1080x1350). UMA ÚNICA composição editorial completa — como uma CAPA de revista ou de carrossel. NÃO divida a imagem em múltiplos quadros, slides ou seções. Apenas UMA imagem unificada e impactante.');
      promptParts.push('LIMITE DE TEXTO (CRÍTICO): A imagem deve ter NO MÁXIMO 3 blocos de texto curtos: 1) Um TÍTULO principal (máximo 8 palavras, impactante e grande), 2) Um SUBTÍTULO opcional (máximo 15 palavras, menor), 3) Um CTA opcional curto (ex: "Saiba mais", máximo 4 palavras). NÃO adicione parágrafos longos, descrições extensas, bullet points, listas ou blocos de texto explicativo. A imagem deve ser VISUAL e LIMPA, com o texto servindo como destaque editorial, NÃO como artigo. Menos é mais.');
      promptParts.push('COMPOSIÇÃO OBRIGATÓRIA: Full bleed total, a imagem DEVE preencher 100% do espaço de ponta a ponta. ZERO bordas, ZERO barras, ZERO margens brancas ou coloridas no topo, base, esquerda ou direita. NENHUM espaço vazio nas bordas.');

      // Product context — CRITICAL for product fidelity
      if (productAnalysis?.confirmed && productRefUrls.length > 0) {
        const sizeLabel = PRODUCT_SIZE_OPTIONS.find(o => o.value === productSize)?.desc || '';
        const sizeInstruction = `IMPORTANT: This product is physically ${productSize} (${sizeLabel}). Render it at its REAL-WORLD proportional size relative to people, hands, and surroundings. Do NOT make it larger or smaller than reality.`;
        const productPromptMap: Record<string, string> = {
          clothing: `PRODUTO (OBRIGATÓRIO): A imagem DEVE apresentar EXATAMENTE o produto "${productAnalysis.description}" mostrado na foto de referência do produto. ${sizeInstruction} Você pode variar ângulo, modelo e cenário, mas o PRODUTO deve ser o mesmo e reconhecível.`,
          object: `PRODUTO (OBRIGATÓRIO): A imagem DEVE apresentar EXATAMENTE o produto "${productAnalysis.description}" mostrado na foto de referência. ${sizeInstruction} Mostre o produto real — pode mudar ângulo, contexto e composição, mas o OBJETO deve ser o MESMO da referência.`,
          food: `PRODUTO (OBRIGATÓRIO): A imagem DEVE apresentar EXATAMENTE o alimento/bebida "${productAnalysis.description}" mostrado na foto de referência. ${sizeInstruction} Crie composições food-styling variadas mas com o MESMO produto.`,
          unknown: `PRODUTO (OBRIGATÓRIO): A imagem DEVE apresentar EXATAMENTE o produto "${productAnalysis.description}" mostrado na foto de referência. ${sizeInstruction} Mantenha o produto reconhecível e fiel à referência.`,
        };
        promptParts.push(productPromptMap[productAnalysis.type] || productPromptMap.unknown);
        promptParts.push('PRIORIDADE #1: O produto da foto de referência DEVE aparecer na imagem gerada. NÃO substitua por outro produto diferente.');
      } else if (productRefUrls.length > 0) {
        promptParts.push('PRODUTO: Use a foto de referência do produto como base. O produto DEVE aparecer fielmente na imagem gerada.');
      }

      if (brandName) {
        const posMap: Record<string, string> = {
          'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito',
          'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito',
        };
        const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
        promptParts.push(`MARCA: Inclua "${brandName}" como texto pequeno no ${posLabel} da imagem.`);
      }
      if (logoBrandColors.length > 0) {
        promptParts.push(`PALETA DE CORES DA MARCA: Use predominantemente estas cores: ${logoBrandColors.join(', ')}.`);
      }

      const finalPrompt = buildImagePrompt(promptParts.join('\n'));
      const negPrompt = activeMarketplaceStyle?.imageGeneration?.negative_prompt || 'Do NOT copy exact faces or identities from reference images';

      // Pass product images as referenceImageUrls (general refs) so the edge function
      // triggers the face+product combined logic, and style refs stay separate
      const imageUrl = await generateImage({
        prompt: finalPrompt,
        faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
        styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
        referenceImageUrls: productRefUrls.length > 0 ? productRefUrls : undefined,
        negativePrompt: negPrompt,
        facePersonsMetadata: singlePostFaceMeta,
      });

      if (!imageUrl) throw new Error('Não foi possível gerar a imagem do post');

      const singleCard: CarouselCard = {
        type: 'cover',
        title: topic.trim(),
        subtitle: manualPostText.trim() || undefined,
        imageUrl,
        isAiImage: true,
        layout: 'dark',
      };

      const finalData: CarouselData = { title: topic.trim(), cards: [singleCard] };
      setCarouselData(finalData);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      toast({ title: 'Post gerado com sucesso!' });

      // Guest paywall: show the result for 6 seconds, then overlay paywall
      if (isGuest) {
        setTimeout(() => setShowGuestPaywall(true), 6000);
      }

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try {
              await supabase.rpc('consume_ai_credits', { p_company_id: companyData.company_id, p_agent_id: null, p_amount: 1, p_description: `Post único: ${topic}` });
            } catch { /* ignore */ }
            const isFullBleed = true;
            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, contentMode: 'single-post', manualPostText };
            const { data: inserted, error: insertErr } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title, topic, keywords: [], carousel_data: finalData as any, style_config: styleConfig as any, card_count: 1, marketplace_style_id: activeMarketplaceStyle?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
            if (insertErr) {
              console.error('Single post save failed:', insertErr);
            }
            if (inserted) {
              setCurrentCarouselId(inserted.id);
              captureCoverImage(inserted.id, companyData.company_id, finalData).catch((e) => console.error('Cover capture failed:', e));
              // Mark cloud job as completed
              if (jobId) completeCloudJob(jobId, inserted.id);
            }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
      // Clear cloud job on success
      if (jobId) { setCloudJobId(null); if (!currentCarouselId) completeCloudJob(jobId); }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar o post', variant: 'destructive' });
      // Don't mark job as failed — leave it pending so cloud can pick it up if browser closes
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      setCloudJobId(null);
    }
  };

  // ===== GENERATE (CLOUD-BASED) =====
  // Strip mention tags from topic: (@Title) → Title
  const cleanMentionsFromTopic = (raw: string) => raw.replace(/\(@([^)]+)\)/g, '$1');

  const generateContent = async () => {
    if (!topic.trim()) { sonnerToast.error('Insira um tópico para gerar'); setTransitionToGenerate(false); return; }

    // === SINGLE POST MODE ===
    if (contentMode === 'single-post') {
      return generateSinglePost();
    }

    // Check credit balance before generating (only for logged-in users)
    let companyId: string | null = null;
    let userId: string | null = null;
    if (user) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
          const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (cu) {
            companyId = cu.company_id;
            const { data: balance } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).single();
            const creditsNeeded = cardCount;
            if (balance && balance.balance < creditsNeeded) {
              sonnerToast.error(`Créditos insuficientes: você precisa de ${creditsNeeded} mas tem ${Math.floor(balance.balance)}.`);
              setTransitionToGenerate(false); return;
            }
          }
        }
      } catch (err) {
        console.warn('Credit check failed:', err);
        sonnerToast.error('Erro ao verificar créditos. Tente novamente.');
        setTransitionToGenerate(false); return;
      }
    }

    setGenerating(true);
    setCarouselData(null);
    setCurrentCarouselId(null);
    setTimeout(() => setTransitionToGenerate(false), 500);

    // === HYBRID: Create cloud job for fallback (if user closes browser, cloud continues) ===
    let localJobId: string | null = null;
    if (userId && companyId && !skipCloudRef.current) {
      localJobId = await createCloudJob('carousel');
      if (localJobId) setCloudJobId(localJobId);
    }
    skipCloudRef.current = false;

    // === CLIENT-SIDE GENERATION (primary, with cloud fallback) ===
    try {
      const imageCardIndices: number[] = [0];
      const hasFaceRefsForGen = referenceImages.some(r => r.category === 'face') || facePersons.some(p => p.photos.length > 0);
      // When faces are provided, ALL cards should get AI images to preserve face fidelity
      const effectiveImageCardCount = hasFaceRefsForGen ? cardCount : imageCardCount;
      const contentIndices = Array.from({ length: cardCount - 2 }, (_, i) => i + 1);
      const shuffled = contentIndices.sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(effectiveImageCardCount - 1, shuffled.length); i++) imageCardIndices.push(shuffled[i]);
      // Determine which cards get face refs (faceCardCount controls this)
      const faceCardIndices = new Set<number>();
      if (hasFaceRefsForGen) {
        const effectiveFaceCount = faceCardCount != null ? Math.min(faceCardCount, cardCount) : cardCount;
        // Always include cover (0) and distribute face cards evenly
        faceCardIndices.add(0);
        if (effectiveFaceCount >= cardCount) {
          for (let fi = 0; fi < cardCount; fi++) faceCardIndices.add(fi);
        } else {
          const remaining = effectiveFaceCount - 1;
          const middleIndices = Array.from({ length: cardCount - 1 }, (_, fi) => fi + 1);
          const step = middleIndices.length / remaining;
          for (let fi = 0; fi < remaining && fi < middleIndices.length; fi++) {
            faceCardIndices.add(middleIndices[Math.min(Math.floor(fi * step), middleIndices.length - 1)]);
          }
        }
      }

      // Determine which cards get random people (when no face refs but peopleMode !== 'none')
      const randomPeopleCardIndices = new Set<number>();
      if (!hasFaceRefsForGen && peopleMode !== 'none') {
        const effectiveRandomCount = randomFaceCount != null ? Math.min(randomFaceCount, cardCount) : cardCount;
        randomPeopleCardIndices.add(0); // Cover always gets person
        if (effectiveRandomCount >= cardCount) {
          for (let ri = 0; ri < cardCount; ri++) randomPeopleCardIndices.add(ri);
        } else {
          const remaining = effectiveRandomCount - 1;
          const middleIndices = Array.from({ length: cardCount - 1 }, (_, ri) => ri + 1);
          const step = middleIndices.length / remaining;
          for (let ri = 0; ri < remaining && ri < middleIndices.length; ri++) {
            randomPeopleCardIndices.add(middleIndices[Math.min(Math.floor(ri * step), middleIndices.length - 1)]);
          }
        }
      }

      const productContext = productAnalysis?.confirmed ? {
        productType: productAnalysis.type,
        productDescription: productAnalysis.description,
        productImageUrls: productImages.map(p => p.url),
        productSize,
        productSizeLabel: PRODUCT_SIZE_OPTIONS.find(o => o.value === productSize)?.desc || '',
      } : undefined;

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: cleanMentionsFromTopic(topic.trim()),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount,
          brandName: brandName || undefined,
          userName: userName || undefined,
          ...(mentionedPrompts.length > 0 ? { promptContexts: mentionedPrompts.map(m => ({ title: m.title, content: m.content })) } : {}),
          imageCardIndices: imageCardIndices.sort((a, b) => a - b),
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(productContext ? { productContext } : {}),
          ...(activeMarketplaceStyle ? { marketplaceStyleConfig: activeMarketplaceStyle } : {}),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar');

      // === VALIDATE CARD COUNT: AI sometimes returns fewer cards than requested ===
      const rawCards: any[] = data.data.cards || [];
      if (rawCards.length < cardCount) {
        console.warn(`AI returned ${rawCards.length} cards but ${cardCount} were requested. Padding...`);
        while (rawCards.length < cardCount) {
          const insertIdx = rawCards.length;
          if (insertIdx === cardCount - 1) {
            rawCards.push({
              type: 'cta', title: 'Gostou do conteúdo?', body: 'Salve, compartilhe e siga para mais!',
              ctaLine: brandName || userName || '',
              imagePrompt: `Card final de CTA sobre "${cleanMentionsFromTopic(topic.trim())}" com design editorial.`,
              needsImage: true,
            });
          } else {
            rawCards.splice(insertIdx, 0, {
              type: 'content',
              bodyTop: `Continuação sobre ${cleanMentionsFromTopic(topic.trim()).split('\n')[0]}...`,
              bodyBottom: '',
              imagePrompt: `Composição editorial profissional sobre "${cleanMentionsFromTopic(topic.trim())}", card ${insertIdx + 1} de ${cardCount}.`,
              needsImage: true,
            });
          }
        }
      } else if (rawCards.length > cardCount) {
        rawCards.splice(cardCount);
      }

      const cards: CarouselCard[] = rawCards.map((c: any, i: number) => {
        if (c.type === 'cover') return { ...c, layout: 'dark' as const };
        if (c.type === 'cta') return { ...c, layout: 'accent' as const };
        const layouts: CarouselCard['layout'][] = ['dark', 'dark', 'light', 'accent', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setActiveCardIndex(0);
      setGeneratingAllImages(true);
      setImageGenProgress('🔍 Buscando referências na web...');

      const selectedImages = referenceImages.filter(r => r.category === 'general').map(r => r.url);
      const isValidImageUrl = (url: string) => {
        if (!url || typeof url !== 'string') return false;
        const lower = url.toLowerCase();
        if (lower.includes('placeholder') || lower.includes('1x1') || lower.includes('spacer')) return false;
        if (lower.includes('data:image/svg') || lower.includes('data:image/gif')) return false;
        if (lower.endsWith('.svg') || lower.endsWith('.gif')) return false;
        if (lower.includes('blank.') || lower.includes('empty.') || lower.includes('pixel.')) return false;
        if (lower.includes('logo') && (lower.includes('icon') || lower.includes('favicon'))) return false;
        if (!lower.startsWith('http') && !lower.startsWith('data:image')) return false;
        if (lower.includes('slide') || lower.includes('infographic') || lower.includes('screenshot')) return false;
        return true;
      };

      const updatedCards = [...cards];

      // ========== CONTINUOUS PANORAMIC MODE ==========
      if (continuousMode && cardCount >= 2) {
        setImageGenProgress('🌄 Gerando panorama contínuo...');

        // Build a panoramic prompt with all card texts
        const cleanTopic = cleanMentionsFromTopic(webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim());
        const allCardTexts = cards.map((c, i) => {
          const title = c.title || c.bodyTop || '';
          const body = c.bodyBottom || c.body || '';
          return `Seção ${i + 1}: ${title}${body ? ` — ${body}` : ''}`;
        }).join('\n');

        const panoramaPrompt = [
          `IDIOMA: Todo texto renderizado na imagem DEVE estar em PORTUGUÊS BRASILEIRO.`,
          `COMPOSIÇÃO PANORÂMICA CONTÍNUA: Gere UMA ÚNICA imagem panorâmica ultra-larga (proporção ${cardCount * 4}:5) que será dividida em ${cardCount} fatias verticais iguais.`,
          `CONTINUIDADE VISUAL OBRIGATÓRIA: Elementos visuais, cenários, gradientes e texturas devem fluir de forma contínua de uma ponta a outra — sem cortes, bordas internas ou separadores visíveis entre as seções. A arte deve parecer uma composição única e ininterrupta quando visualizada lado a lado.`,
          `TEMA: "${cleanTopic}"`,
          `CONTEÚDO TEXTUAL POR SEÇÃO (distribua tipografia editorial ao longo da panorâmica, cada texto na sua seção correspondente):`,
          allCardTexts,
          `ESTILO: Design editorial premium, tipografia integrada à composição visual, cores harmoniosas que fluem ao longo de toda a panorâmica.`,
          `PROIBIDO: NÃO crie divisões, separadores, linhas verticais ou bordas entre seções. NÃO copie nomes de marcas das referências. A imagem deve ser totalmente contínua.`,
          brandName ? `MARCA: "${brandName}" discretamente posicionada.` : '',
        ].filter(Boolean).join('\n');

        const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
        const marketplaceRefUrls: string[] = [];
        if (activeMarketplaceStyle?._previewImages?.length) {
          const origin = window.location.origin;
          marketplaceRefUrls.push(...(activeMarketplaceStyle._previewImages as string[]).map((p: string) => p.startsWith('http') ? p : `${origin}${p}`));
        }
        const allStyleRefs = [...styleRefUrls, ...marketplaceRefUrls];
        const allFaceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
        const styleNeg = activeMarketplaceStyle?.imageGeneration?.negative_prompt || '';

        // Generate panoramic image with wider aspect ratio
        const panoramaAspectRatio = cardCount <= 3 ? '16:9' : cardCount <= 5 ? '21:9' : '21:9';
        
        let panoramaUrl: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            setImageGenProgress(`🌄 Gerando panorama contínuo... (tentativa ${attempt + 1})`);
            const styleImageGen = activeMarketplaceStyle?.imageGeneration;
            const resolvedModel = imageSettings.model === 'auto' ? 'gemini' : imageSettings.model;
            
            const { data: imgData, error: imgErr } = await supabase.functions.invoke('generate-carousel-image', {
              body: {
                prompt: buildImagePrompt(panoramaPrompt),
                imageSize: panoramaAspectRatio,
                topic: cleanTopic,
                faceReferenceUrls: allFaceRefUrls.length > 0 ? allFaceRefUrls : undefined,
                styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
                imageModel: resolvedModel === 'higgsfield' ? 'gemini' : resolvedModel,
                negativePrompt: [styleNeg, 'no visible cuts, no separators, no vertical lines dividing sections, no borders between panels'].filter(Boolean).join(', '),
                fidelity: styleImageGen?.fidelity || imageSettings.fidelity,
                ...(styleImageGen?.prompt_style ? { stylePrompt: styleImageGen.prompt_style } : {}),
                panoramic: true,
                panoramicCardCount: cardCount,
              },
            });
            if (imgErr) throw imgErr;
            if (imgData?.success && imgData?.imageUrl) {
              panoramaUrl = imgData.imageUrl;
              break;
            }
          } catch (err) {
            console.warn(`Panorama attempt ${attempt + 1} failed:`, err);
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (panoramaUrl) {
          setImageGenProgress('✂️ Fatiando panorama em slides...');
          
          // Slice panoramic image into N equal vertical strips using canvas
          try {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Failed to load panorama'));
              img.src = panoramaUrl!;
            });

            const sliceWidth = Math.floor(img.width / cardCount);
            const sliceHeight = img.height;

            for (let i = 0; i < cardCount; i++) {
              const canvas = document.createElement('canvas');
              canvas.width = sliceWidth;
              canvas.height = sliceHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, i * sliceWidth, 0, sliceWidth, sliceHeight, 0, 0, sliceWidth, sliceHeight);
                const sliceDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                updatedCards[i] = {
                  ...updatedCards[i],
                  imageUrl: sliceDataUrl,
                  isAiImage: true,
                  generatedPrompt: `[Panorama Contínuo - Fatia ${i + 1}/${cardCount}]\n${panoramaPrompt}`,
                };
              }
            }
            
            toast({ title: '🌄 Panorama contínuo gerado!', description: `${cardCount} slides com arte contínua` });
          } catch (sliceErr) {
            console.error('Panorama slicing failed:', sliceErr);
            toast({ title: 'Erro ao fatiar panorama', variant: 'destructive' });
          }
        } else {
          toast({ title: 'Falha ao gerar panorama contínuo', description: 'Gerando cards individualmente como fallback...', variant: 'destructive' });
          // Fall through to normal generation below
        }

        // If panorama succeeded, skip normal image generation
        if (panoramaUrl && updatedCards.every(c => c.imageUrl)) {
          const finalData = { ...data.data, cards: updatedCards };
          setCarouselData(finalData);
          setGeneratingAllImages(false);
          setImageGenProgress('');

          // Auto-save
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
              if (companyData) {
                try {
                  await supabase.rpc('consume_ai_credits', {
                    p_company_id: companyData.company_id, p_agent_id: null,
                    p_amount: finalData.cards.length,
                    p_description: `Carrossel Contínuo: ${finalData.title || topic} (${finalData.cards.length} cards)`,
                  });
                } catch { /* ignore */ }
                const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, continuousMode: true };
                const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
                if (inserted) {
                  setCurrentCarouselId(inserted.id);
                  setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
                  if (localJobId) completeCloudJob(localJobId, inserted.id);
                }
              }
            }
          } catch (saveErr) { console.error('Auto-save error:', saveErr); }
          if (localJobId) { setCloudJobId(null); }
          setGenerating(false);
          return;
        }
      }

      // ========== NORMAL (NON-CONTINUOUS) IMAGE GENERATION ==========
      const webImagePool = selectedImages.filter(isValidImageUrl).slice(0, 3);
      const allFaceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      const activeFacePersonsForGen = facePersons.filter(p => p.photos.length > 0);
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const cleanTopic = cleanMentionsFromTopic(webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim());

      let webImageIndex = 0;
      const imageFactories: { index: number; factory: () => Promise<string | null>; prompt: string }[] = [];
      let totalImages = 0;
      let realImagesUsed = 0;
      let aiImagesQueued = 0;
      const usedImageUrls = new Set<string>();

      const styleNeg = activeMarketplaceStyle?.imageGeneration?.negative_prompt || '';
      const baseNegativePrompt = styleNeg || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
      const isFullBleedStyle = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;

      for (let i = 0; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        if (isFullBleedStyle || card.needsImage || card.type === 'cover' || card.type === 'cta' || imageCardIndices.includes(i)) {
          totalImages++;
          const isCoverOrCta = card.type === 'cover' || card.type === 'cta';

          if (!isFullBleedStyle && !isCoverOrCta && webImagePool.length > webImageIndex) {
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
              continue;
            }
          }

          aiImagesQueued++;
          const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
          let imgPrompt = `${cleanTopic}: ${cardDesc}`;
          
          const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;
          if (isFullBleedMarketplace) {
            const isCover = card.type === 'cover' || i === 0;
            const isCta = card.type === 'cta' || i === updatedCards.length - 1;
            const cardTextParts: string[] = [];
            cardTextParts.push(`IDIOMA: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO. NÃO use espanhol, NÃO use inglês.`);
            cardTextParts.push(`TEMA DO CARROSSEL: "${cleanTopic}"`);
            cardTextParts.push(`PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas ou qualquer informação pessoal das imagens de referência. Use APENAS o estilo visual (cores, tipografia, layout, elementos decorativos). NÃO COPIE OS ROSTOS OU IDENTIDADES das pessoas nas imagens de referência — use pessoas DIFERENTES com aparências variadas. NUNCA gere grades, mosaicos, grids de posts ou capturas de feeds de redes sociais — cada card deve ser UMA ÚNICA composição editorial. NUNCA use o símbolo "@" antes de nomes de marcas ou plataformas nos textos renderizados.`);
            cardTextParts.push(`SEM BORDAS: A imagem deve ser full bleed, sem barras ou bordas no topo ou na base.`);
            
            if (logoUrl && brandName) {
              const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
              const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
              cardTextParts.push(`LOGOMARCA: Inclua a logomarca/nome "${brandName}" no ${posLabel} da imagem, sobrepondo o conteúdo com leve destaque (fundo semitransparente ou sombra sutil). A logo deve ser pequena e elegante, sem dominar o layout.`);
            } else if (brandName) {
              const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
              const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
              cardTextParts.push(`MARCA: Inclua o nome "${brandName}" como texto pequeno no ${posLabel} da imagem, com estilo sutil e elegante.`);
            }
            
            if (isCover) {
              cardTextParts.push(`ESTE É O CARD DE CAPA (Card 1 de ${updatedCards.length}).`);
              cardTextParts.push(`TÍTULO PARA RENDERIZAR NA IMAGEM: "${card.title || cleanTopic}"`);
              if (card.subtitle) cardTextParts.push(`SUBTÍTULO: "${card.subtitle}"`);
              cardTextParts.push(`Deve ser o card mais impactante, estilo capa de revista, com tipografia grande.`);
            } else if (isCta) {
              cardTextParts.push(`ESTE É O CARD FINAL DE CTA (Card ${i + 1} de ${updatedCards.length}).`);
              if (card.title) cardTextParts.push(`TÍTULO DO CTA: "${card.title}"`);
              if (card.body) cardTextParts.push(`TEXTO DO CTA: "${card.body}"`);
              cardTextParts.push(`Card de encerramento com call-to-action. NÃO é uma capa/hero.`);
            } else {
              cardTextParts.push(`CARD DE CONTEÚDO ${i + 1} de ${updatedCards.length} (NÃO é capa, NÃO é hero).`);
              const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
              if (bodyText) cardTextParts.push(`TEXTO PRINCIPAL PARA RENDERIZAR NA IMAGEM: "${bodyText}"`);
              if (card.bodyBottom) cardTextParts.push(`TEXTO SECUNDÁRIO: "${card.bodyBottom}"`);
              cardTextParts.push(`Deve parecer um slide de conteúdo interno com layout editorial variado — NÃO estilo capa/hero.`);
            }
            imgPrompt = cardTextParts.join('\n');
          }
          
          if (productAnalysis?.confirmed) {
            const sizeLabel = PRODUCT_SIZE_OPTIONS.find(o => o.value === productSize)?.desc || '';
            const sizeInstruction = `IMPORTANT: This product is physically ${productSize} (${sizeLabel}). Render it at its REAL-WORLD proportional size relative to people, hands, and surroundings. Do NOT make it larger or smaller than reality.`;
            const productPromptMap: Record<string, string> = {
              clothing: `Use the uploaded product photo as creative reference for a "${productAnalysis.description}" garment. ${sizeInstruction} You DON'T need to replicate it exactly — feel free to change the angle, show it on a different model, in a new setting, styled differently, or from a creative perspective. Keep the essence and key features of the garment but make each card visually unique.`,
              object: `Use the uploaded product photo as creative reference for "${productAnalysis.description}". ${sizeInstruction} You DON'T need to replicate it exactly — change the angle, show someone holding it, place it in a lifestyle context, create a flat-lay, or show it from a dramatic perspective. Keep the product recognizable but make the composition creative and varied.`,
              food: `Use the uploaded product photo as creative reference for "${productAnalysis.description}". ${sizeInstruction} You DON'T need to replicate it exactly — create different food-styling compositions, change the angle, add complementary ingredients, show close-ups of textures, or place it in different table settings. Keep it appetizing but varied.`,
              unknown: `Use the uploaded product photo as creative reference for "${productAnalysis.description}". ${sizeInstruction} You DON'T need to replicate it exactly — change angles, contexts, compositions. Keep the product recognizable but create visually unique and diverse scenes.`,
            };
            imgPrompt += '. ' + (productPromptMap[productAnalysis.type] || productPromptMap.unknown);
          }
          
          const finalNegative = [baseNegativePrompt, imageSettings.negativePrompt].filter(Boolean).join(', ');
          const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];
          const allStyleRefs = [...styleRefUrls];
          
          const marketplaceRefUrls: string[] = [];
          if (activeMarketplaceStyle?._previewImages?.length) {
            const origin = window.location.origin;
            const allPreviews = (activeMarketplaceStyle._previewImages as string[])
              .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
            marketplaceRefUrls.push(...allPreviews);
          }
          
          let capturedPrompt = buildImagePrompt(imgPrompt) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');
          
          if (!hasFaceRefsForGen && peopleMode !== 'none') {
            const shouldHaveRandomPerson = randomPeopleCardIndices.has(i);
            if (!shouldHaveRandomPerson) {
              capturedPrompt += '\n\nCRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. NO HUMANS.';
            }
          } else if (!hasFaceRefsForGen && peopleMode === 'none') {
            capturedPrompt += '\n\nCRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. NO HUMANS.';
          }
          let cardFaceRefs: string[] | undefined;
          let cardFacePersonsMeta: { label: string; gender: string; wearsGlasses: boolean; photoCount: number }[] | undefined;
          const shouldHaveFace = faceCardIndices.has(i);
          if (!shouldHaveFace) {
            cardFaceRefs = undefined;
            cardFacePersonsMeta = undefined;
          } else if (activeFacePersonsForGen.length > 1 && !allPeopleOnCover) {
            const personForCard = activeFacePersonsForGen[(i - 1) % activeFacePersonsForGen.length];
            cardFaceRefs = personForCard.photos.map(p => p.url);
            cardFacePersonsMeta = undefined;
          } else if (activeFacePersonsForGen.length > 1) {
            cardFaceRefs = activeFacePersonsForGen.flatMap(p => p.photos.map(ph => ph.url));
            cardFacePersonsMeta = activeFacePersonsForGen.map(p => ({
              label: p.label, gender: p.gender, wearsGlasses: p.wearsGlasses, photoCount: p.photos.length,
            }));
          } else {
            cardFaceRefs = allFaceRefUrls.length > 0 ? [...allFaceRefUrls] : undefined;
          }
          const capturedFaceRefs = cardFaceRefs && cardFaceRefs.length > 0 ? cardFaceRefs : undefined;
          const capturedStyleRefs = [...allStyleRefs, ...marketplaceRefUrls].length > 0 ? [...allStyleRefs, ...marketplaceRefUrls] : undefined;
          const capturedProductRefs = productRefUrls.length > 0 ? [...productRefUrls] : undefined;
           const isFullBleedMkt = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;
           const capturedNegative = isFullBleedMkt 
             ? [activeMarketplaceStyle?.imageGeneration?.negative_prompt || '', 'Do NOT copy the exact faces or identities of people from the reference images. Use different people with varied appearances. Only copy the visual design style, layout, typography and color scheme.'].filter(Boolean).join(', ')
             : finalNegative;
          
          imageFactories.push({
            index: i,
            prompt: capturedPrompt,
            factory: () => generateImage({
              prompt: capturedPrompt,
              faceReferenceUrls: capturedFaceRefs,
              styleReferenceUrls: capturedStyleRefs,
              referenceImageUrls: capturedProductRefs,
              negativePrompt: capturedNegative,
              facePersonsMetadata: cardFacePersonsMeta,
            }).catch(err => { console.error('Image gen error for card', i, err); return null; }),
          });
        }
      }

      if (imageFactories.length > 0) {
        let completed = 0;
        const totalAi = imageFactories.length;
        setImageGenProgress(`🎨 0/${totalAi} imagens geradas...`);

        const generateBatch = async (factories: typeof imageFactories, batchSize: number) => {
          for (let i = 0; i < factories.length; i += batchSize) {
            const batch = factories.slice(i, i + batchSize);
            if (i > 0) await new Promise(r => setTimeout(r, 1500));
            await Promise.all(
              batch.map(f =>
                f.factory().then(url => {
                  completed++;
                  setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
                  if (url) updatedCards[f.index] = { ...updatedCards[f.index], imageUrl: url, isAiImage: true, generatedPrompt: f.prompt };
                  return url;
                })
              )
            );
          }
        };

        const coverFactory = imageFactories.find(p => p.index === 0);
        const lastCardIndex = Math.max(...imageFactories.map(f => f.index));
        const lastFactory = imageFactories.find(p => p.index === lastCardIndex && p.index !== 0);
        const middleFactories = imageFactories.filter(p => p.index !== 0 && p.index !== lastCardIndex);

        if (coverFactory) {
          const coverUrl = await coverFactory.factory();
          completed++;
          setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
          if (coverUrl) updatedCards[coverFactory.index] = { ...updatedCards[coverFactory.index], imageUrl: coverUrl, isAiImage: true, generatedPrompt: coverFactory.prompt };
        }

        if (middleFactories.length > 0) {
          await generateBatch(middleFactories, 2);
        }

        if (lastFactory) {
          await new Promise(r => setTimeout(r, 1500));
          const lastUrl = await lastFactory.factory();
          completed++;
          setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
          if (lastUrl) updatedCards[lastFactory.index] = { ...updatedCards[lastFactory.index], imageUrl: lastUrl, isAiImage: true, generatedPrompt: lastFactory.prompt };
        }

        const failedFactories = imageFactories.filter(f => !updatedCards[f.index]?.imageUrl);
        if (failedFactories.length > 0) {
          setImageGenProgress(`🔄 Regenerando ${failedFactories.length} imagens que falharam...`);
          for (const target of failedFactories) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const retryUrl = await target.factory();
              if (retryUrl) updatedCards[target.index] = { ...updatedCards[target.index], imageUrl: retryUrl, isAiImage: true, generatedPrompt: target.prompt };
            } catch { /* next */ }
          }
        }

        const stillFailed = imageFactories.filter(f => !updatedCards[f.index]?.imageUrl);
        if (stillFailed.length > 0) {
          for (const target of stillFailed) {
            await new Promise(r => setTimeout(r, 4000));
            try {
              const retryUrl = await target.factory();
              if (retryUrl) updatedCards[target.index] = { ...updatedCards[target.index], imageUrl: retryUrl, isAiImage: true, generatedPrompt: target.prompt };
            } catch { /* accept */ }
          }
        }
      }

      const finalData = { ...data.data, cards: updatedCards };
      setCarouselData(finalData);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      toast({ title: 'Carrossel completo!', description: `${cards.length} cards com ${totalImages} imagens gerados` });

      // Auto-save for guest (no cloud job)
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try {
              await supabase.rpc('consume_ai_credits', {
                p_company_id: companyData.company_id,
                p_agent_id: null,
                p_amount: finalData.cards.length,
                p_description: `Carrossel: ${finalData.title || topic} (${finalData.cards.length} cards)`,
              });
            } catch { /* ignore */ }

            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
            const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
            if (inserted) {
              setCurrentCarouselId(inserted.id);
              setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
              // Mark cloud job as completed
              if (localJobId) completeCloudJob(localJobId, inserted.id);
            }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
      // Clear cloud job on success
      if (localJobId) { setCloudJobId(null); }
    } catch (err: any) {
      console.error('Generation error:', err);
      sonnerToast.error(err.message || 'Não foi possível gerar o carrossel. Tente novamente.');
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      setCloudJobId(null);
    }
  };


  // ===== FILL COVER MODAL TEXTS WITH AI =====
  const fillCoverTextsWithAI = async () => {
    if (!topic.trim() || fillingCoverTexts) return;
    setFillingCoverTexts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { action: 'generate-outline', topic: topic.trim(), cardCount: carouselFromCoverCount, contentMode: 'carousel' },
      });
      if (error) throw error;
      if (data?.outline) setCoverCardTexts(data.outline);
    } catch (err) { console.error('AI fill error:', err); }
    finally { setFillingCoverTexts(false); }
  };

  // ===== ADD +1 CARD TO EXISTING CAROUSEL =====
  // ===== GENERATE TEXT PREVIEW FOR NEW CARD =====
  const generateAddCardAutoText = async () => {
    setAddCardModal(prev => ({ ...prev, generatingAutoText: true, autoText: null }));
    try {
      const currentData = carouselDataRef.current;
      const existingCardSummaries = currentData?.cards
        ?.map((c, i) => {
          const title = c.title || c.bodyTop || '';
          const body = c.body || c.bodyBottom || '';
          return title || body ? `Card ${i + 1}: ${title} ${body}`.slice(0, 120) : null;
        })
        .filter(Boolean) || [];

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: (currentData?.cards.length || 7) + 1,
          imageCardIndices: [(currentData?.cards.length || 0)],
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(activeMarketplaceStyle ? { marketplaceStyleConfig: activeMarketplaceStyle } : {}),
          regenerateCardIndex: currentData?.cards.length || 0,
          existingCardSummaries,
        },
      });

      if (!error && data?.success && data?.data?.cards) {
        const contentCards = data.data.cards.filter((c: any) => c.type === 'content');
        if (contentCards.length > 0) {
          const src = contentCards[0];
          setAddCardModal(prev => ({
            ...prev,
            autoText: { title: src.bodyTop || src.body || src.title || '', body: src.bodyBottom || '' },
            step: 'auto-preview',
          }));
          return;
        }
      }
      toast({ title: 'Não foi possível gerar texto. Tente novamente.', variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar texto', description: err.message, variant: 'destructive' });
    } finally {
      setAddCardModal(prev => ({ ...prev, generatingAutoText: false }));
    }
  };

  // ===== ADD +1 CARD TO EXISTING CAROUSEL =====
  const addOneMoreCard = async (mode: 'composed' | 'solid' = 'composed', manualText?: { title: string; body: string }) => {
    setShowAddCardMenu(false);
    setAddCardModal(prev => ({ ...prev, open: false }));

    const currentData = carouselDataRef.current;
    if (!currentData) return;

    const newIndex = currentData.cards.length;
    const isTextOnlyCard = mode === 'solid';

    const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || (isLoadedFullBleed && !!loadedMarketplaceStyleId);
    const requiresImage = mode === 'composed' || isFullBleedMarketplace;

    setCarouselData((prev) => {
      if (!prev) return prev;
      const newCard: CarouselCard = {
        type: 'content',
        title: manualText?.title || '',
        body: manualText?.body || '',
        bodyTop: manualText?.title || '',
        bodyBottom: manualText?.body || '',
        layout: 'dark',
        needsImage: requiresImage,
      };
      return { ...prev, cards: [...prev.cards, newCard] };
    });

    setActiveCardIndex(newIndex);

    window.setTimeout(async () => {
      try {
        if (requiresImage) {
          let success = await regenerateCard(newIndex, true, isTextOnlyCard);

          if (!success) {
            await new Promise((r) => setTimeout(r, 900));
            success = await regenerateCard(newIndex, true, isTextOnlyCard);
          }

          if (!success) {
            setCarouselData((prev) => {
              if (!prev || !prev.cards[newIndex]) return prev;
              const cards = [...prev.cards];
              cards.splice(newIndex, 1);
              return { ...prev, cards };
            });
            setActiveCardIndex((prev) => Math.max(0, Math.min(prev, newIndex - 1)));
            toast({
              title: 'Falha ao gerar o novo card',
              description: 'Tente novamente em alguns segundos.',
              variant: 'destructive',
            });
          }
        } else {
          // For solid mode with manual text, just set the text (no regeneration needed)
          if (manualText?.title || manualText?.body) {
            // Already set above, just show success
            toast({ title: 'Card de texto criado!' });
          } else {
            await regenerateCardTextOnly(newIndex);
          }
        }
      } catch (err: any) {
        console.error('Erro ao adicionar novo card:', err);
        setCarouselData((prev) => {
          if (!prev || !prev.cards[newIndex]) return prev;
          const cards = [...prev.cards];
          cards.splice(newIndex, 1);
          return { ...prev, cards };
        });
        setActiveCardIndex((prev) => Math.max(0, Math.min(prev, newIndex - 1)));
        toast({
          title: 'Erro ao criar o novo card',
          description: err?.message || 'Tente novamente em alguns segundos.',
          variant: 'destructive',
        });
      }
    }, 120);
  };

  // ===== REGENERATE CARD TEXT ONLY (no image generation) =====
  const regenerateCardTextOnly = async (cardIndex: number) => {
    const currentData = carouselDataRef.current;
    if (!currentData) return;

    setRegeneratingCard(cardIndex);
    try {
      const existingCardSummaries = currentData.cards
        .map((c, i) => {
          if (i === cardIndex) return null;
          const title = c.title || c.bodyTop || '';
          const body = c.body || c.bodyBottom || '';
          return title || body ? `Card ${i + 1}: ${title} ${body}`.slice(0, 120) : null;
        })
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: currentData.cards.length,
          imageCardIndices: [cardIndex],
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(activeMarketplaceStyle ? { marketplaceStyleConfig: activeMarketplaceStyle } : {}),
          regenerateCardIndex: cardIndex,
          existingCardSummaries,
        },
      });

      let newBody = '';
      let newBottomText = '';
      if (!error && data?.success && data?.data?.cards) {
        const contentCards = data.data.cards.filter((c: any) => c.type === 'content');
        if (contentCards.length > 0) {
          const src = contentCards[0];
          newBody = src.bodyTop || src.body || '';
          newBottomText = src.bodyBottom || '';
        }
      }

      setCarouselData((prev) => {
        if (!prev || !prev.cards[cardIndex]) return prev;
        const newCards = [...prev.cards];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          bodyTop: newBody || 'Texto do card...',
          bodyBottom: newBottomText,
          imageUrl: undefined,
          isAiImage: false,
          needsImage: false,
        };
        return { ...prev, cards: newCards };
      });

      toast({ title: '✨ Card de texto criado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar card', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingCard(null);
    }
  };

  // ===== GENERATE CAROUSEL FROM EXISTING COVER =====
  const generateCarouselFromCover = async (totalCards: number) => {
    if (!carouselData?.cards[0]?.imageUrl) return;
    const coverCard = { ...carouselData.cards[0] };
    setShowCarouselFromCover(false);
    setCoverModalTab('config');
    setContentMode('carousel');
    setCardCount(totalCards);

    // Check credits
    let companyId: string | null = null;
    let userId: string | null = null;
    if (user) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
          const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (cu) {
            companyId = cu.company_id;
            const { data: balance } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).single();
            if (balance && balance.balance < totalCards - 1) {
              toast({ title: 'Créditos insuficientes', description: `Precisa de ${totalCards - 1} créditos mas tem ${Math.floor(balance.balance)}.`, variant: 'destructive' });
              return;
            }
          }
        }
      } catch { /* ignore */ }
    }

    setGenerating(true);
    setCarouselData(null);
    setCurrentCarouselId(null);
    setTimeout(() => setTransitionToGenerate(false), 500);

    try {
      // Generate text content for remaining cards
      // Prepare manual texts for cards (skip index 0 which is the cover)
      const hasManualTexts = coverCardTexts.some(t => (t.title || '').trim() || (t.body || '').trim());
      const coverTitle = coverCard.title || coverCard.bodyTop || '';
      const coverBody = coverCard.body || coverCard.subtitle || '';
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: cleanMentionsFromTopic(topic.trim()),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: totalCards,
          ...(mentionedPrompts.length > 0 ? { promptContexts: mentionedPrompts.map(m => ({ title: m.title, content: m.content })) } : {}),
          imageCardIndices: Array.from({ length: totalCards }, (_, i) => i),
          ...(hasManualTexts ? { manualCardTexts: coverCardTexts } : {}),
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(activeMarketplaceStyle ? { marketplaceStyleConfig: activeMarketplaceStyle } : {}),
          coverAlreadyExists: true,
          existingCoverTitle: coverTitle,
          existingCoverBody: coverBody,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar');

      const cards: CarouselCard[] = data.data.cards.map((c: any, i: number) => {
        if (i === 0) return coverCard; // Keep original cover
        if (c.type === 'cta') return { ...c, layout: 'accent' as const };
        const layouts: CarouselCard['layout'][] = ['dark', 'dark', 'light', 'accent', 'dark'];
        return { ...c, layout: layouts[(i - 1) % layouts.length] };
      });

      setActiveCardIndex(0);
      setGeneratingAllImages(true);
      setImageGenProgress('🎨 Gerando imagens dos cards...');

      // IMPORTANT: Use the cover image itself as face reference to maintain the same person
      // The cover already contains the correct face, so we use it as the primary face ref
      // Only fall back to wizard referenceImages if they match what was used for this cover
      const coverFaceRef = coverCard.imageUrl ? [coverCard.imageUrl] : [];
      const wizardFaceRefs = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      // Prioritize: wizard face refs if available (they were used for the cover), otherwise use cover image itself
      const faceRefUrls = wizardFaceRefs.length > 0 ? [...wizardFaceRefs, ...coverFaceRef] : coverFaceRef;
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();
      const updatedCards = [...cards];
      const isFullBleedStyle = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;
      const styleNeg = activeMarketplaceStyle?.imageGeneration?.negative_prompt || '';
      const baseNegativePrompt = styleNeg || 'no text, no words, no letters, no typography, no writing';

      // Generate images only for cards 1+ (skip cover at index 0)
      const imageFactories: { index: number; factory: () => Promise<string | null> }[] = [];
      for (let i = 1; i < updatedCards.length; i++) {
        const card = updatedCards[i];
        const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
        // Add variation instructions per card to avoid identical compositions
        const variationHints = [
          'close-up portrait composition',
          'medium shot, slightly angled',
          'wide compositional view',
          'dynamic diagonal composition',
          'centered symmetric layout',
          'rule-of-thirds off-center',
          'low angle dramatic perspective',
          'high angle overview',
        ];
        const variation = variationHints[(i - 1) % variationHints.length];
        // Alternate: some cards show the person, others are text-focused without people
        const showPerson = faceRefUrls.length > 0 && (i % 3 !== 0); // Every 3rd content card: no person, text-only
        let imgPrompt = `${cleanTopic}: ${cardDesc}. Composition: ${variation}.`;
        if (!showPerson && faceRefUrls.length > 0) {
          imgPrompt += ' This card should be TEXT-FOCUSED with abstract/editorial background — do NOT include any person or face.';
        }

        if (isFullBleedStyle) {
          const isCta = card.type === 'cta' || i === updatedCards.length - 1;
          const cardTextParts: string[] = [];
          cardTextParts.push(`IDIOMA: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO.`);
          cardTextParts.push(`TEMA: "${cleanTopic}"`);
          cardTextParts.push(`SEM BORDAS: Full bleed.`);
          cardTextParts.push(`COMPOSIÇÃO: ${variation}. Este é o card ${i + 1} de ${updatedCards.length} — deve ser DIFERENTE de todos os outros cards.`);
          if (!showPerson && faceRefUrls.length > 0) {
            cardTextParts.push(`ESTE CARD: layout editorial sem pessoa — fundo abstrato ou texturizado com texto em destaque.`);
          }
          if (isCta) {
            cardTextParts.push(`CARD FINAL DE CTA (${i + 1} de ${updatedCards.length}).`);
            if (card.title) cardTextParts.push(`TÍTULO: "${card.title}"`);
            if (card.body) cardTextParts.push(`TEXTO: "${card.body}"`);
          } else {
            cardTextParts.push(`CARD DE CONTEÚDO ${i + 1} de ${updatedCards.length}.`);
            const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
            if (bodyText) cardTextParts.push(`TEXTO: "${bodyText}"`);
          }
          imgPrompt = cardTextParts.join('\n');
        }

        const finalNegative = [baseNegativePrompt, imageSettings.negativePrompt].filter(Boolean).join(', ');
        const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];
        const marketplaceRefUrls: string[] = [];
        if (activeMarketplaceStyle?._previewImages?.length) {
          const origin = window.location.origin;
          const allPreviews = (activeMarketplaceStyle._previewImages as string[]).map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
          // Send ALL preview images for maximum style fidelity
          marketplaceRefUrls.push(...allPreviews);
        }

        // Use the cover image as style reference to maintain visual consistency
        const coverStyleRef = coverCard.imageUrl ? [coverCard.imageUrl] : [];
        const capturedStyleRefs = [...styleRefUrls, ...marketplaceRefUrls, ...coverStyleRef].length > 0 ? [...styleRefUrls, ...marketplaceRefUrls, ...coverStyleRef] : undefined;

        // For text-only cards, don't send face references
        const cardFaceRefs = showPerson && faceRefUrls.length > 0 ? faceRefUrls : undefined;

        imageFactories.push({
          index: i,
          factory: () => generateImage({
            prompt: buildImagePrompt(imgPrompt) + (isFullBleedStyle ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: cardFaceRefs,
            styleReferenceUrls: capturedStyleRefs,
            referenceImageUrls: productRefUrls.length > 0 ? productRefUrls : undefined,
            negativePrompt: finalNegative + (!showPerson && faceRefUrls.length > 0 ? ', no people, no faces, no portraits' : ''),
          }).catch(err => { console.error('Image gen error for card', i, err); return null; }),
        });
      }

      // Generate images in batches
      let completed = 0;
      const totalAi = imageFactories.length;
      setImageGenProgress(`🎨 0/${totalAi} imagens geradas...`);

      for (let i = 0; i < imageFactories.length; i += 2) {
        const batch = imageFactories.slice(i, i + 2);
        if (i > 0) await new Promise(r => setTimeout(r, 1500));
        await Promise.all(batch.map(f =>
          f.factory().then(url => {
            completed++;
            setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
            if (url) updatedCards[f.index] = { ...updatedCards[f.index], imageUrl: url, isAiImage: true };
          })
        ));
      }

      const finalData = { ...data.data, cards: updatedCards };
      setCarouselData(finalData);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      toast({ title: 'Carrossel gerado!', description: `${totalCards} cards a partir da capa` });

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try { await supabase.rpc('consume_ai_credits', { p_company_id: companyData.company_id, p_agent_id: null, p_amount: totalCards - 1, p_description: `Carrossel da capa: ${topic} (${totalCards} cards)` }); } catch { /* ignore */ }
            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
            const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
            if (inserted) {
              setCurrentCarouselId(inserted.id);
              setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
            }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar', variant: 'destructive' });
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
    }
  };

  // ===== GENERATE STORIES VERSION (9:16, 1080x1920) =====
  const generateStoriesImage = async () => {
    if (!carouselData?.cards[activeCardIndex]?.imageUrl) return;
    const sourceImage = carouselData.cards[activeCardIndex].imageUrl!;
    const card = carouselData.cards[activeCardIndex];
    setGeneratingStories(true);
    setStoriesImageUrl(null);
    try {
      // Use image editing API to adapt the 1:1/4:5 image to 9:16 Stories format
      // We send the original image directly and ask the AI to expand/adapt it
      const cardTitle = card.title || '';
      const cardBody = card.body || card.subtitle || card.bodyTop || '';

      const storiesPrompt = `Transform this Instagram post image into a TALL VERTICAL Instagram STORIES image. The output MUST be in PORTRAIT 9:16 aspect ratio (1080px wide x 1920px tall). The image must be much TALLER than it is wide.

CRITICAL RULES:
1. Generate a PORTRAIT/VERTICAL image — height must be ~1.78x the width. NOT square, NOT landscape.
2. GENERATIVELY EXPAND the background/scene ABOVE and BELOW the original content to fill the tall 9:16 vertical canvas naturally.
3. The output MUST fill the ENTIRE vertical frame — absolutely NO black bars, NO letterboxing, NO empty space anywhere.
4. Keep the person/subject FULLY VISIBLE and centered — heads, faces, and bodies must be 100% inside the frame.
5. Keep ALL text that exists in the original image, REPOSITION it to fit the vertical layout:
   - Place text in the LOWER THIRD with comfortable margins
   - Slightly reduce text size to ~60-70% of original
6. Maintain the EXACT same visual style, colors, typography, and aesthetic.
7. The logo/seal (if present) must remain visible.

${cardTitle ? `Title text in image: "${cardTitle}"` : ''}
${cardBody ? `Body text in image: "${cardBody}"` : ''}

FORBIDDEN:
- NO black bars or empty space at top or bottom
- Do NOT generate a SQUARE image — it MUST be tall vertical portrait
- Do NOT crop any person's head, face, or body
- Do NOT just zoom in or stretch the original
- Do NOT change the people's faces or features
- Do NOT add new text that wasn't in the original`;

      const { data, error } = await supabase.functions.invoke('generate-carousel-image', {
        body: {
          editSourceImage: sourceImage,
          prompt: storiesPrompt,
          faceGender,
          imageSize: '9:16',
          faceReferenceUrls: referenceImages.filter(r => r.category === 'face').map(r => r.url),
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setStoriesImageUrl(data.imageUrl);
        setShowStoriesPreview(true);
        toast({ title: 'Stories gerado!', description: 'Imagem adaptada para formato 9:16' });
      } else {
        throw new Error('Sem imagem retornada');
      }
    } catch (err: any) {
      console.error('Stories gen error:', err);
      toast({ title: 'Erro ao gerar Stories', description: err.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setGeneratingStories(false);
    }
  };

  const downloadStoriesImage = async () => {
    if (!storiesImageUrl) return;
    try {
      let blobUrl: string;
      if (storiesImageUrl.startsWith('data:')) {
        // Convert data URL to blob for reliable download
        const res = await fetch(storiesImageUrl);
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
      } else {
        const res = await fetch(storiesImageUrl);
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
      }
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `stories-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast({ title: 'Download iniciado!' });
    } catch (err) {
      console.error('Stories download error:', err);
      toast({ title: 'Erro no download', variant: 'destructive' });
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
      const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];

      // Include marketplace style references if active or loaded as full-bleed
      const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed;
      const marketplaceRefUrls: string[] = [];
      if (activeMarketplaceStyle?._previewImages?.length) {
        const origin = window.location.origin;
        const allPreviews = (activeMarketplaceStyle._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
        marketplaceRefUrls.push(...allPreviews);
      }

      const allStyleRefs = [...styleRefUrls, ...productRefUrls, ...marketplaceRefUrls];

      let finalPrompt: string;
      let negPrompt: string | undefined;

      if (isFullBleedMarketplace && activeMarketplaceStyle?.imageGeneration?.prompt_style) {
        const card = carouselData?.cards[cardIndex];
        const isCover = card?.type === 'cover' || cardIndex === 0;
        const isCta = card?.type === 'cta' || (carouselData && cardIndex === carouselData.cards.length - 1);
        const parts: string[] = [];
        parts.push(`IDIOMA: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO.`);
        parts.push(`TEMA DO CARROSSEL: "${topic}"`);
        parts.push(`PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas ou qualquer informação pessoal das imagens de referência. NÃO COPIE OS ROSTOS OU IDENTIDADES das pessoas nas referências — use pessoas DIFERENTES. NUNCA gere grades, mosaicos ou grids de posts. NUNCA use "@" antes de nomes de marcas nos textos.`);
        parts.push(`SEM BORDAS: Full bleed, sem barras ou bordas.`);
        if (isCover) {
          parts.push(`CARD DE CAPA. Tipografia grande, impactante.`);
        } else if (isCta) {
          parts.push(`CARD FINAL DE CTA. Encerramento com call-to-action.`);
        } else {
          parts.push(`CARD DE CONTEÚDO interno. Layout editorial variado — NÃO estilo capa/hero.`);
        }
        parts.push(`CONTEÚDO: "${promptText}"`);
        finalPrompt = buildImagePrompt(parts.join('\n'));
        negPrompt = [activeMarketplaceStyle?.imageGeneration?.negative_prompt || '', 'Do NOT copy exact faces or identities from reference images'].filter(Boolean).join(', ') || undefined;
      } else {
        finalPrompt = buildImagePrompt(promptText);
        negPrompt = imageSettings.negativePrompt || undefined;
      }

      const imageUrl = await generateImage({
        prompt: finalPrompt,
        faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
        styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
        negativePrompt: negPrompt,
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
    void addOneMoreCard('composed');
  };

  const removeCard = (index: number) => {
    if (!carouselData || carouselData.cards.length <= 2) return;
    const cards = carouselData.cards.filter((_, i) => i !== index);
    setCarouselData({ ...carouselData, cards });
    if (activeCardIndex >= cards.length) setActiveCardIndex(cards.length - 1);
  };

  const regenerateCard = async (cardIndex: number, forceImageRequired = false, disallowPeople = false): Promise<boolean> => {
    const currentData = carouselDataRef.current;
    if (!currentData) return false;
    const carouselData = currentData;
    const card = carouselData.cards[cardIndex];
    if (!card) return false;
    setRegeneratingCard(cardIndex);
    try {
      // Gather existing card summaries so the AI avoids repeating content
      const existingCardSummaries = carouselData.cards
        .map((c, i) => {
          if (i === cardIndex) return null;
          const title = c.title || c.bodyTop || '';
          const body = c.body || c.bodyBottom || '';
          return title || body ? `Card ${i + 1}: ${title} ${body}`.slice(0, 120) : null;
        })
        .filter(Boolean);

      // 1. Regenerate text content for this card
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-content',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: carouselData.cards.length, // Use actual card count for proper context
          imageCardIndices: [cardIndex],
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(activeMarketplaceStyle ? { marketplaceStyleConfig: activeMarketplaceStyle } : {}),
          regenerateCardIndex: cardIndex, // hint to backend
          existingCardSummaries, // avoid repeating content from other cards
        },
      });
      
      let newBody = card.bodyTop || card.body || '';
      let newBottomText = card.bodyBottom || '';
      let newImagePrompt = card.imagePrompt || '';
      
      if (!error && data?.success && data?.data?.cards) {
        const isCover = card.type === 'cover' || cardIndex === 0;
        const isCta = card.type === 'cta' || cardIndex === carouselData.cards.length - 1;
        
        if (isCover) {
          const coverCard = data.data.cards.find((c: any) => c.type === 'cover');
          if (coverCard) {
            newBody = coverCard.title || newBody;
            newBottomText = coverCard.subtitle || newBottomText;
            newImagePrompt = coverCard.imagePrompt || newImagePrompt;
          }
        } else if (isCta) {
          const ctaCard = data.data.cards.find((c: any) => c.type === 'cta');
          if (ctaCard) {
            newBody = ctaCard.body || ctaCard.title || newBody;
            newBottomText = '';
            newImagePrompt = ctaCard.imagePrompt || newImagePrompt;
          }
        } else {
          const contentCards = data.data.cards.filter((c: any) => c.type === 'content');
          if (contentCards.length > 0) {
            const src = contentCards[0];
            newBody = src.bodyTop || src.body || newBody;
            newBottomText = src.bodyBottom || newBottomText;
            newImagePrompt = src.imagePrompt || src.title || newImagePrompt;
          }
        }
      }

      // 2. Regenerate image using AI with face/style references
      let newImageUrl = card.imageUrl;
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();
      const wizardFaceRefs = referenceImages.filter(r => r.category === 'face').map(r => r.url);
      // For text-only cards, never inject face references
      const allowFaceReferences = !disallowPeople;
      // If no wizard face refs, use the cover image as face reference to maintain the same person
      const coverImageUrl = carouselData.cards[0]?.imageUrl;
      const faceRefUrls = allowFaceReferences
        ? (wizardFaceRefs.length > 0 ? wizardFaceRefs : (coverImageUrl && !coverImageUrl.startsWith('data:') ? [coverImageUrl] : []))
        : [];
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];
      const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || (isLoadedFullBleed && !!loadedMarketplaceStyleId);
      
      let imgPrompt: string;
      let negPrompt: string;
      
      if (isFullBleedMarketplace) {
        // Build full-bleed prompt with card text context (same as initial generation)
        const isCover = card.type === 'cover' || cardIndex === 0;
        const isCta = card.type === 'cta' || cardIndex === carouselData.cards.length - 1;
        const parts: string[] = [];
        parts.push(`IDIOMA: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO. NÃO use espanhol, NÃO use inglês.`);
        parts.push(`TEMA DO CARROSSEL: "${cleanTopic}"`);
        parts.push(`PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas ou qualquer informação pessoal das imagens de referência. Use APENAS o estilo visual (cores, tipografia, layout, elementos decorativos).`);
        parts.push(`SEM BORDAS: A imagem deve ser full bleed, sem barras ou bordas no topo ou na base.`);
        if (disallowPeople) {
          parts.push(`DIREÇÃO VISUAL OBRIGATÓRIA: card tipográfico/editorial SOMENTE com elementos gráficos (formas, textura, gradientes, composição).`);
          parts.push(`NÃO use retrato, pessoa, modelo, rosto, mãos, corpo humano ou silhuetas humanas.`);
        }
        
        // Include logo/brand overlay instructions for full-bleed regeneration
        if (logoUrl && brandName) {
          const posMap: Record<string, string> = {
            'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito',
            'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito',
            'middle-left': 'centro esquerdo', 'middle-right': 'centro direito',
          };
          const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
          parts.push(`LOGOMARCA: Inclua a logomarca/nome "${brandName}" no ${posLabel} da imagem, sobrepondo o conteúdo com leve destaque (fundo semitransparente ou sombra sutil). A logo deve ser pequena e elegante, sem dominar o layout.`);
        } else if (brandName) {
          const posMap: Record<string, string> = {
            'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito',
            'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito',
            'middle-left': 'centro esquerdo', 'middle-right': 'centro direito',
          };
          const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
          parts.push(`MARCA: Inclua o nome "${brandName}" como texto pequeno no ${posLabel} da imagem, com estilo sutil e elegante.`);
        }
        if (isCover) {
          parts.push(`ESTE É O CARD DE CAPA (Card 1 de ${carouselData.cards.length}).`);
          parts.push(`TÍTULO PARA RENDERIZAR NA IMAGEM: "${newBody || card.title || cleanTopic}"`);
          if (card.subtitle) parts.push(`SUBTÍTULO: "${card.subtitle}"`);
          parts.push(`Deve ser o card mais impactante, estilo capa de revista, com tipografia grande.`);
        } else if (isCta) {
          parts.push(`ESTE É O CARD FINAL DE CTA (Card ${cardIndex + 1} de ${carouselData.cards.length}).`);
          if (card.title) parts.push(`TÍTULO DO CTA: "${card.title}"`);
          if (newBody) parts.push(`TEXTO DO CTA: "${newBody}"`);
          parts.push(`Card de encerramento com call-to-action. NÃO é uma capa/hero.`);
        } else {
          parts.push(`CARD DE CONTEÚDO ${cardIndex + 1} de ${carouselData.cards.length} (NÃO é capa, NÃO é hero).`);
          if (newBody) parts.push(`TEXTO PRINCIPAL PARA RENDERIZAR NA IMAGEM: "${newBody}"`);
          if (newBottomText) parts.push(`TEXTO SECUNDÁRIO: "${newBottomText}"`);
          parts.push(`Deve parecer um slide de conteúdo interno com layout editorial variado — NÃO estilo capa/hero.`);
        }
        imgPrompt = parts.join('\n');
        negPrompt = [activeMarketplaceStyle?.imageGeneration?.negative_prompt || '', 'Do NOT copy exact faces or identities from reference images'].filter(Boolean).join(', ');
      } else {
        // For standard styles, build a richer prompt that maintains consistency
        const cardType = card.type === 'cover' ? 'capa editorial' : card.type === 'cta' ? 'card final de chamada para ação' : 'slide de conteúdo informativo';
        imgPrompt = disallowPeople
          ? `Fundo gráfico editorial para ${cardType} sobre "${cleanTopic}". Visual tipográfico/abstrato com formas, textura e luz; sem pessoas, sem retratos e sem silhuetas humanas.`
          : `${cardType} sobre "${cleanTopic}". ${newImagePrompt || newBody.slice(0, 150)}. Manter o mesmo estilo visual, cores e atmosfera dos outros cards do carrossel.`;
        negPrompt = imageSettings.negativePrompt || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
      }
      
      // Use existing card images as additional style references for consistency
      const existingCardImages = carouselData.cards
        .filter((c, idx) => idx !== cardIndex && c.imageUrl && !c.imageUrl.startsWith('data:'))
        .slice(0, 2)
        .map(c => c.imageUrl!);
      
      // Build marketplace style references
      const marketplaceRefUrls: string[] = [];
      if (activeMarketplaceStyle?._previewImages?.length) {
        const origin = window.location.origin;
        const allPreviews = (activeMarketplaceStyle._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
        marketplaceRefUrls.push(...allPreviews);
      }
      
      const allStyleRefs = [...styleRefUrls, ...productRefUrls, ...marketplaceRefUrls, ...existingCardImages];
      
      try {
        // Retry image generation with progressive fallback to avoid blank cards
        const generationAttempts: Array<{
          faceReferenceUrls?: string[];
          styleReferenceUrls?: string[];
          prompt: string;
          negativePrompt?: string;
        }> = [
          {
            prompt: buildImagePrompt(imgPrompt) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            negativePrompt: negPrompt || undefined,
          },
          {
            prompt: buildImagePrompt(imgPrompt) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
            negativePrompt: negPrompt || undefined,
          },
          {
            prompt: buildImagePrompt(`${imgPrompt}. Manter identidade visual do carrossel sem copiar conteúdo textual de referências.`) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: undefined,
            negativePrompt: negPrompt || undefined,
          },
        ];

        for (let attempt = 0; attempt < generationAttempts.length; attempt++) {
          const attemptConfig = generationAttempts[attempt];
          try {
            const generatedUrl = await generateImage(attemptConfig);
            if (generatedUrl) {
              newImageUrl = generatedUrl;
              break;
            }
          } catch (attemptErr) {
            console.warn(`Image generation attempt ${attempt + 1} failed for card ${cardIndex + 1}:`, attemptErr);
          }
          if (attempt < generationAttempts.length - 1) {
            await new Promise(r => setTimeout(r, 1200));
          }
        }
      } catch (imgErr) {
        console.warn('Image regeneration failed:', imgErr);
      }

      // For newly added cards, require image to be generated (avoid blank placeholder card)
      if (forceImageRequired && !newImageUrl) {
        throw new Error('Não consegui gerar a imagem deste novo card automaticamente. Tente novamente em alguns segundos.');
      }

      // 3. Update card
      let updatedData: CarouselData | null = null;
      setCarouselData((prev) => {
        if (!prev || !prev.cards[cardIndex]) return prev;
        const newCards = [...prev.cards];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          bodyTop: newBody,
          bodyBottom: newBottomText,
          imagePrompt: newImagePrompt,
          imageUrl: newImageUrl,
          isAiImage: false,
          needsImage: !!newImageUrl,
        };
        updatedData = { ...prev, cards: newCards };
        return updatedData;
      });

      // If we regenerated the cover card (index 0), update the cover_url in the DB
      if (cardIndex === 0 && currentCarouselId) {
        try {
          // Save updated carousel_data first so the server can read the new image
          await supabase.from('generated_carousels').update({
            carousel_data: updatedData as any,
          }).eq('id', currentCarouselId);
          // Then regenerate the cover thumbnail
          await serverFallbackCover(currentCarouselId);
        } catch (coverErr) {
          console.warn('Failed to update cover after regeneration:', coverErr);
        }
      }

      toast({ title: '✨ Card regenerado!' });
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao regenerar', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setRegeneratingCard(null);
    }
  };

  // ===== REGENERATE FACE ONLY (Image editing via Gemini) =====
  const regenerateFace = async (cardIndex: number, overrideFaceUrls?: string[]) => {
    if (!carouselData) return;
    const card = carouselData.cards[cardIndex];
    if (!card.imageUrl) { toast({ title: 'Este card não possui imagem', variant: 'destructive' }); return; }
    
    const faceRefUrls = overrideFaceUrls && overrideFaceUrls.length > 0 
      ? overrideFaceUrls 
      : referenceImages.filter(r => r.category === 'face').map(r => r.url);
    if (faceRefUrls.length === 0) { toast({ title: 'Nenhuma foto de rosto fornecida', variant: 'destructive' }); return; }
    
    setRegeneratingFace(cardIndex);
    try {
      // Use the Gemini image editing API via edge function to fix only the face
      const genderInstruction = faceGender === 'male' ? 'The person is MALE.' : faceGender === 'female' ? 'The person is FEMALE.' : '';
      const glassesInstruction = wearsGlasses ? 'The person wears glasses.' : '';
      
      const editPrompt = `Replace ONLY the face in this image with the EXACT face from the reference photo(s). Keep EVERYTHING else identical — the body, pose, clothing, background, colors, text, layout, and composition must remain EXACTLY the same. The face must match the reference photos precisely: same facial structure, nose, eyes, eyebrows, jawline, skin tone, and all distinctive features. ${genderInstruction} ${glassesInstruction}`.trim();
      
      const { data, error } = await supabase.functions.invoke('generate-carousel-image', {
        body: {
          prompt: editPrompt,
          editSourceImage: card.imageUrl,
          faceReferenceUrls: faceRefUrls,
          imageModel: 'gemini',
          imageSize: '3:4',
          negativePrompt: 'Do not change the body, pose, clothing, background, text, or any other element. Only replace the face.',
        },
      });
      
      if (error) throw error;
      if (data?.success && data?.imageUrl) {
        const newCards = [...carouselData.cards];
        newCards[cardIndex] = { ...newCards[cardIndex], imageUrl: data.imageUrl };
        setCarouselData({ ...carouselData, cards: newCards });
        toast({ title: '✨ Rosto regenerado!' });
      } else {
        throw new Error('Não foi possível regenerar o rosto');
      }
    } catch (err: any) {
      console.error('Face regeneration error:', err);
      toast({ title: 'Erro ao regenerar rosto', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingFace(null);
    }
  };

  const handleFileUpload = (cardIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setCardImage(cardIndex, e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const exportAllCards = async (format: 'png' | 'jpg' | 'webp' = 'png', asZip = false) => {
    if (!carouselData) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 500));

      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const quality = format === 'png' ? undefined : 0.92;

      if (asZip) {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        for (let i = 0; i < carouselData.cards.length; i++) {
          const el = cardRefs.current[i];
          if (!el) continue;
          const canvas = await html2canvas(el, {
            width: CARD_W, height: CARD_H, scale: 2, useCORS: true, allowTaint: true,
            backgroundColor: bgColor || '#0A0A1A', logging: false, imageTimeout: 30000,
          });
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create blob'));
            }, mimeType, quality);
          });
          zip.file(`card-${i + 1}.${format}`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `carousel-${(carouselData.title || 'export').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        for (let i = 0; i < carouselData.cards.length; i++) {
          const el = cardRefs.current[i];
          if (!el) continue;
          const canvas = await html2canvas(el, {
            width: CARD_W, height: CARD_H, scale: 1, useCORS: true, allowTaint: false,
            backgroundColor: bgColor || '#0A0A1A', logging: false, imageTimeout: 15000,
            onclone: (clonedDoc) => { clonedDoc.querySelectorAll('img').forEach(img => { img.crossOrigin = 'anonymous'; }); },
          });
          const link = document.createElement('a');
          link.download = `carousel-card-${i + 1}.${format}`;
          link.href = canvas.toDataURL(mimeType, quality);
          link.click();
          await new Promise(r => setTimeout(r, 400));
        }
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
        ...(logoPosition.includes('top') ? { top: margin } : logoPosition.includes('bottom') ? { bottom: margin } : { top: '50%', marginTop: -(size / 2) }),
        ...(logoPosition.includes('left') ? { left: margin } : logoPosition.includes('right') ? { right: margin } : { left: '50%', marginLeft: -(size / 2) }),
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

  // Full-bleed render for marketplace styles — AI generates complete image with text baked in
  const renderMarketplaceFullBleedCard = (card: CarouselCard, index: number, isExport = false) => {
    const w = isExport ? CARD_W : PREVIEW_W;
    const h = isExport ? CARD_H : PREVIEW_H;
    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {generatingAllImages ? (
              <>
                <div style={{ width: 24, height: 24, border: '2px solid rgba(155,107,255,0.3)', borderTopColor: 'rgba(155,107,255,0.8)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: `${12 * (isExport ? 1 : PREVIEW_W / CARD_W)}px` }}>Gerando imagem...</span>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: `${12 * (isExport ? 1 : PREVIEW_W / CARD_W)}px`, textAlign: 'center', padding: '0 16px' }}>Imagem não gerada. Clique para regenerar.</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    // Marketplace full-bleed mode: AI generates complete images with text baked in
    const isMarketplaceFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed;
    if (isMarketplaceFullBleed) return renderMarketplaceFullBleedCard(card, index, isExport);

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
        ...(logoPosition.includes('top') ? { top: margin } : logoPosition.includes('bottom') ? { bottom: margin } : { top: '50%', marginTop: -(size / 2) }),
        ...(logoPosition.includes('left') ? { left: margin } : logoPosition.includes('right') ? { right: margin } : { left: '50%', marginLeft: -(size / 2) }),
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

  // Auto-skip Cores/Fontes steps if marketplace full-bleed style is active (advanced mode only)
  const currentStepName = WIZARD_STEPS[wizardStep] || '';

  const canProceed = currentStepName === 'Modo' ? true : currentStepName === 'Tema' ? (topic.trim().length > 0 || manualPostText.trim().length > 0) : currentStepName === 'Estilo' ? !!activeMarketplaceStyle : true;

  // Voice guide: speak on step change (only after welcome is dismissed)
  useEffect(() => {
    // Don't speak when loading an already-generated carousel
    if (!showWelcome && !carouselData && !loadingCarousel) {
      speakStep(wizardStep);
    }
  }, [wizardStep, speakStep, showWelcome, carouselData, loadingCarousel]);


  useEffect(() => {
    if (wizardMode === 'advanced' && isFullBleedMarketplace && (currentStepName === 'Cores' || currentStepName === 'Fontes')) {
      const roteiroIdx = WIZARD_STEPS.indexOf('Roteiro');
      if (roteiroIdx >= 0) setWizardStep(roteiroIdx);
    }
  }, [wizardStep, isFullBleedMarketplace, wizardMode, currentStepName]);

  return (
    <div className="h-screen flex flex-col overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* ===== WELCOME / DASHBOARD SCREEN ===== */}
      <AnimatePresence>
        {showWelcome && !user && (
          <WelcomeScreen onStart={(initialTopic, shouldEnhance, welcomeMentions, mode, postText) => {
            if (initialTopic) { setTopic(initialTopic); setOriginalTopic(initialTopic); }
            if (welcomeMentions?.length) setMentionedPrompts(welcomeMentions);
            // Don't set contentMode from welcome — user chooses at Step 1 (Format)
            if (postText) setManualPostText(postText);
            setShowWelcome(false);
            if (shouldEnhance && initialTopic) {
              setTimeout(() => enhancePrompt(initialTopic), 300);
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
              onStartCarousel={(newTopic?: string) => {
                resetWizardState();
                setShowWelcome(false);
                if (newTopic) {
                  setTopic(newTopic); setOriginalTopic(newTopic);
                }
              }}
              onLoadCarousel={async (item: any) => {
                setLoadingCarousel(true);
                try {
                  // If the caller already has full carousel payload, load directly (faster, avoids extra fetch)
                  if (item?.carousel_data) {
                    loadCarousel(item);
                    setShowWelcome(false);
                    return;
                  }

                  const { data, error } = await supabase
                    .from('generated_carousels')
                    .select('id, topic, keywords, carousel_data, marketplace_style_id, style_config')
                    .eq('id', item.id)
                    .maybeSingle();

                  if (error) throw error;
                  if (!data) {
                    toast({ title: 'Projeto não encontrado', variant: 'destructive' });
                    return;
                  }

                  loadCarousel(data);
                  setShowWelcome(false);
                } catch (err) {
                  console.error('Erro ao carregar projeto recente:', err);
                  toast({ title: 'Erro ao carregar projeto', variant: 'destructive' });
                } finally {
                  setLoadingCarousel(false);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state while fetching carousel data */}
      {loadingCarousel && !showWelcome && (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
          <div className="carousel-loader-wrapper" style={{ width: '200px', height: '200px' }}>
            <div className="carousel-loader-spinner" />
            <span className="text-white/40 text-sm z-[1]">Carregando...</span>
          </div>
        </div>
      )}

      {/* Only render content after welcome is dismissed to prevent flicker */}
      {!showWelcome && !loadingCarousel && <>
      {/* Header removed — Save/Export moved to action buttons area */}

      {/* Normal header for editor mode */}
      {carouselData && !generatingAllImages && editingCard !== null && null}

      <div className={carouselData && editingCard === null ? '' : 'flex-1 flex flex-col'} style={carouselData && editingCard === null ? { flex: 1, display: 'flex', flexDirection: 'column' } : undefined}>
        {/* ========== WIZARD - DARK THEME ========== */}
        {!carouselData && !generating && !generatingAllImages && !loadingCarousel && (
          <div className="flex-1 flex flex-col w-full relative overflow-x-hidden overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
            {/* Subtle ambient glow accents */}
            <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.04]" style={{ background: 'radial-gradient(circle, rgba(120,80,220,0.8) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-150px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none opacity-[0.03]" style={{ background: 'radial-gradient(circle, rgba(160,100,255,0.6) 0%, transparent 70%)' }} />

            {/* Home button to return to dashboard */}
            {user && (
              <button
                onClick={() => { setShowWelcome(true); setCurrentCarouselId(null); }}
                className="absolute top-4 left-4 z-20 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Home className="w-5 h-5 text-white/60" />
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
                      setCurrentCarouselId(null);
                    }}
                    onSearch={() => {
                      setSidebarDrawerOpen(false);
                      setShowWelcome(true);
                      setCurrentCarouselId(null);
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
              <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-8 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="w-full max-w-[520px] space-y-6">
                  {/* Step dots (hide on Modo step) */}
                  {currentStepName !== 'Modo' && (
                  <div className="flex items-center justify-center gap-2">
                      {WIZARD_STEPS.filter(s => s !== 'Modo').map((stepName, i) => {
                        const realIndex = i + 1; // offset by 1 since Modo is index 0
                        if ((stepName === 'Cores' || stepName === 'Fontes') && isFullBleedMarketplace) return null;
                        return (
                          <button key={realIndex} onClick={() => {
                            if (realIndex <= wizardStep) setWizardStep(realIndex);
                          }}
                            className="transition-all"
                            style={{
                              width: realIndex === wizardStep ? 24 : 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: realIndex === wizardStep ? '#9B6BFF' : realIndex < wizardStep ? 'rgba(155,107,255,0.5)' : 'rgba(255,255,255,0.08)',
                              cursor: realIndex <= wizardStep ? 'pointer' : 'default',
                            }}
                          />
                        );
                      })}
                  </div>
                  )}

                   {/* Step content with entrance animation */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={wizardStep}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                    {currentStepName === 'Modo' && (
                      <StepMode wizardMode={wizardMode} setWizardMode={setWizardMode} />
                    )}
                    {currentStepName === 'Tema' && (
                      <StepTopic topic={topic} setTopic={setTopic} keywords={keywords} setKeywords={setKeywords}
                        cardCount={cardCount} setCardCount={setCardCount} imageCardCount={imageCardCount} setImageCardCount={setImageCardCount}
                        enhancingPrompt={enhancingPrompt} onEnhance={enhancePrompt}
                        searchingWeb={searchingWeb} onSearchWeb={handleSearchWeb} webSearchResult={webSearchResult}
                        skipWebSearch={wizardMode === 'simple' ? false : skipWebSearch}
                        onToggleSkipWebSearch={wizardMode === 'simple' ? undefined : () => { setSkipWebSearch(!skipWebSearch); if (!skipWebSearch) setWebSearchResult(null); }}
                        mentionedPrompts={mentionedPrompts}
                        onMentionAdd={(p) => setMentionedPrompts(prev => [...prev, p])}
                        onMentionRemove={(id) => setMentionedPrompts(prev => prev.filter(m => m.id !== id))}
                        contentMode={contentMode}
                        manualPostText={manualPostText}
                        setManualPostText={setManualPostText}
                        wizardMode={wizardMode}
                        guestMode={isGuest}
                        setContentMode={(mode) => {
                          setContentMode(mode);
                          if (mode === 'single-post') { setCardCount(1); setImageCardCount(1); }
                          else if (cardCount < 2) { setCardCount(5); }
                        }} />
                    )}
                    {currentStepName === 'Formato' && (
                      <StepCardCount
                        cardCount={cardCount}
                        setCardCount={isGuest ? () => {} : setCardCount}
                        contentMode={isGuest ? 'single-post' : contentMode}
                        setContentMode={isGuest ? () => {} : (mode) => {
                          setContentMode(mode);
                          if (mode === 'single-post') { setCardCount(1); setImageCardCount(1); setContinuousMode(false); }
                          else if (cardCount < 2) { setCardCount(5); }
                        }}
                        hasFacePhotos={hasFacePhotos}
                        faceCardCount={faceCardCount}
                        setFaceCardCount={setFaceCardCount}
                        wizardMode={wizardMode}
                        guestMode={isGuest}
                        continuousMode={continuousMode}
                        setContinuousMode={setContinuousMode}
                      />
                    )}
                    {currentStepName === 'Fotos' && (
                      <StepWebImages referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        webImages={webSearchResult?.images} onSkip={() => setWizardStep(wizardStep + 1)} />
                    )}
                    {currentStepName === 'Rosto' && (
                      <StepFaceRef
                        facePersons={facePersons} setFacePersons={setFacePersons}
                        referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        allPeopleOnCover={allPeopleOnCover} setAllPeopleOnCover={setAllPeopleOnCover}
                        famousList={famousList} setFamousList={setFamousList}
                        famousImages={famousImages} setFamousImages={setFamousImages}
                        faceGender={faceGender} setFaceGender={setFaceGender}
                        wearsGlasses={wearsGlasses} setWearsGlasses={setWearsGlasses} />
                    )}
                    {currentStepName === 'Visual' && (
                      <StepVisualStyle
                        selectedCategory={visualCategory} setSelectedCategory={setVisualCategory}
                        visualSearchQuery={visualSearchQuery} setVisualSearchQuery={setVisualSearchQuery}
                        referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        peopleMode={peopleMode} setPeopleMode={setPeopleMode}
                        randomFaceCount={randomFaceCount} setRandomFaceCount={setRandomFaceCount}
                        cardCount={cardCount} />
                    )}
                    {currentStepName === 'Produto' && (
                      <StepProduct productImages={productImages} setProductImages={setProductImages}
                        productAnalysis={productAnalysis} setProductAnalysis={setProductAnalysis}
                        analyzingProduct={analyzingProduct} setAnalyzingProduct={setAnalyzingProduct}
                        productSize={productSize} setProductSize={setProductSize} />
                    )}
                    {currentStepName === 'Marca' && (
                      <StepBrandRef referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        brandAssets={brandAssets}
                        onSuggestColors={(palette) => {
                          setBrandSuggestedPalette(palette);
                        }} />
                    )}
                    {currentStepName === 'Estilo' && (
                      <StepStyleSelect
                        bgColor={bgColor} setBgColor={setBgColor}
                        accentColor={accentColor} setAccentColor={setAccentColor}
                        textColor={textColor} setTextColor={setTextColor}
                        selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                        onApplyPreset={(preset) => { setActivePresetId(preset.id); setActiveMarketplaceStyle(null); setIsLoadedFullBleed(false); }}
                        onApplyMarketplaceStyle={(config) => { setActiveMarketplaceStyle(config); setIsLoadedFullBleed(!!config?.imageGeneration?.prompt_style); }}
                      />
                    )}
                    {currentStepName === 'Cores' && !isFullBleedMarketplace && (
                      <StepColors bgColor={bgColor} setBgColor={setBgColor}
                        accentColor={accentColor} setAccentColor={setAccentColor}
                        textColor={textColor} setTextColor={setTextColor}
                        brandSuggestedPalette={brandSuggestedPalette}
                        onAcceptBrandPalette={() => {
                          if (brandSuggestedPalette) {
                            setBgColor(brandSuggestedPalette.bg);
                            setAccentColor(brandSuggestedPalette.accent);
                            setTextColor(brandSuggestedPalette.text || '#FFFFFF');
                          }
                          setBrandSuggestedPalette(null);
                        }}
                        onDismissBrandPalette={() => setBrandSuggestedPalette(null)} />
                    )}
                    {currentStepName === 'Fontes' && !isFullBleedMarketplace && (
                      <StepFonts selectedFont={selectedFont} setSelectedFont={setSelectedFont} />
                    )}
                    {currentStepName === 'Roteiro' && (
                      <StepCardTexts
                        cardCount={cardCount}
                        contentMode={contentMode}
                        manualCardTexts={manualCardTexts}
                        setManualCardTexts={setManualCardTexts}
                        topic={topic} />
                    )}
                    {currentStepName === 'Logo' && (
                      <StepBranding
                        showHeader={showHeader} setShowHeader={setShowHeader}
                        logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                        logoPosition={logoPosition} setLogoPosition={setLogoPosition}
                        logoBrandColors={logoBrandColors}
                        brandName={brandName} setBrandName={setBrandName}
                        userName={userName} setUserName={setUserName}
                        dateLabel={dateLabel} setDateLabel={setDateLabel} />
                    )}
                    {currentStepName === 'Velocidade' && (
                      <StepSpeed
                        imageModel={imageSettings.model === 'nano-banana' ? 'nano-banana' : 'gemini'}
                        setImageModel={(m) => setImageSettings(prev => ({ ...prev, model: m }))} />
                    )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button onClick={() => {
                      if (currentStepName === 'Modo') { setShowWelcome(true); setCurrentCarouselId(null); setWizardStep(0); }
                      else {
                        let prev = wizardStep - 1;
                        const prevName = WIZARD_STEPS[prev];
                        // Skip Fotos when toggle is off or no images (advanced only)
                        if (prevName === 'Fotos' && (skipWebSearch || (!webSearchResult?.images?.length && !webSearchResult?.content))) prev--;
                        // Skip Cores/Fontes when marketplace style is active (advanced only)
                        if ((WIZARD_STEPS[prev] === 'Cores' || WIZARD_STEPS[prev] === 'Fontes') && isFullBleedMarketplace) {
                          while (prev > 0 && (WIZARD_STEPS[prev] === 'Cores' || WIZARD_STEPS[prev] === 'Fontes')) prev--;
                        }
                        setWizardStep(prev);
                      }
                    }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white/30 hover:text-white/60 transition-all">
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </button>

                    {wizardStep < WIZARD_STEPS.length - 1 ? (
                      <div className="flex items-center gap-2">
                        {/* Skip button for optional steps */}
                        {(currentStepName === 'Rosto' || currentStepName === 'Visual' || currentStepName === 'Produto' || currentStepName === 'Marca' || currentStepName === 'Roteiro') && (
                          <button onClick={() => setWizardStep(wizardStep + 1)}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all">
                            Pular
                          </button>
                        )}
                        <button onClick={async () => {
                            const hasManualText = manualPostText.trim().length > 0;
                            // Web search on Tema step
                            if (currentStepName === 'Tema' && !webSearchResult && !skipWebSearch && topic.trim() && !hasManualText) {
                              await handleSearchWeb();
                            }
                            if (currentStepName === 'Tema' && hasManualText && !topic.trim()) {
                              setTopic(manualPostText.trim());
                            }
                            if (currentStepName === 'Tema' && hasManualText) {
                              setSkipWebSearch(true);
                            }
                            // Formato step (advanced)
                            if (currentStepName === 'Formato') {
                              if (cardCount === 1) {
                                setContentMode('single-post');
                                setImageCardCount(1);
                              } else {
                                setContentMode('carousel');
                                setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                              }
                            }
                            let next = wizardStep + 1;
                            const nextName = WIZARD_STEPS[next];
                            // Skip Fotos when toggle is off or no images found (advanced)
                            if (nextName === 'Fotos' && (skipWebSearch || (!webSearchResult?.images?.length && !webSearchResult?.content))) next++;
                            // Skip Cores/Fontes when marketplace style is active (advanced)
                            if (WIZARD_STEPS[next] === 'Cores' && isFullBleedMarketplace) {
                              while (next < WIZARD_STEPS.length && (WIZARD_STEPS[next] === 'Cores' || WIZARD_STEPS[next] === 'Fontes')) next++;
                            }
                            setWizardStep(next);
                          }} disabled={!canProceed || searchingWeb}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
                          style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}>
                          {searchingWeb ? <><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando...</> : <>Continuar <ChevronRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => {
                          if (isGuest && cardCount > 1) {
                            setShowLoginGate(true);
                            return;
                          }
                          if (cardCount === 1) {
                            setContentMode('single-post');
                            setImageCardCount(1);
                          } else {
                            setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                          }
                          setTransitionToGenerate(true);
                          setTimeout(() => generateContent(), 1200);
                        }} disabled={generating || transitionToGenerate || !topic.trim()}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
                        style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)' }}>
                        {isGuest ? <><Sparkles className="h-4 w-4" /> Gerar Post Grátis</> : <><Sparkles className="h-4 w-4" /> {contentMode === 'single-post' ? 'Gerar Post' : 'Gerar Carrossel'}</>}
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
                    <AnimatedCounter target={Math.round((wizardStep / Math.max(WIZARD_STEPS.length - 1, 1)) * 99)} />
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
                onClick={() => { setShowWelcome(true); setCurrentCarouselId(null); }}
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
              {!isGuest && carouselData.cards.length > 0 && (
                <div className="absolute top-1/2 right-2 md:-right-14 -translate-y-1/2 z-40">
                  <button
                    onClick={() => setShowAddCardMenu((prev) => !prev)}
                    className="w-11 h-11 rounded-full flex items-center justify-center border text-white/80 hover:text-white transition-all"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: showAddCardMenu ? 'rgba(139,92,246,0.3)' : 'rgba(20,20,30,0.85)' }}
                    aria-label="Adicionar card"
                  >
                    <Plus className="h-5 w-5" />
                  </button>

                  {showAddCardMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAddCardMenu(false)} />
                      <div
                        className="absolute top-1/2 right-full -translate-y-1/2 mr-3 z-50 w-56 rounded-xl p-1.5 shadow-xl border"
                        style={{ backgroundColor: 'rgba(20,20,30,0.97)', borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <button
                          onClick={() => { setShowAddCardMenu(false); setAddCardModal({ open: true, cardType: 'composed', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false }); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                            <User className="h-3.5 w-3.5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">Composto</p>
                            <p className="text-[10px] text-white/40">Com foto e pessoa</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setShowAddCardMenu(false); setAddCardModal({ open: true, cardType: 'solid', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false }); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                            <Type className="h-3.5 w-3.5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">Sólido</p>
                            <p className="text-[10px] text-white/40">Somente texto</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                  <img src={ellocontentProfile} alt="ellocontent" className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">{userName || brandName || 'ellocontent'}</p>
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
                    {/* Regenerating overlay on mockup */}
                    {(regeneratingCard === activeCardIndex || regeneratingFace === activeCardIndex) && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                        <div className="w-10 h-10 rounded-full border-3 border-purple-500/30 border-t-purple-500 animate-spin mb-3" />
                        <p className="text-white/80 text-xs font-medium">{regeneratingFace === activeCardIndex ? 'Regenerando rosto...' : 'Regenerando...'}</p>
                      </div>
                    )}
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
                    <p className="text-white text-[11px] line-clamp-2"><span className="font-semibold">{userName || 'ellocontent'}</span> <span className="text-white/60">{carouselData.title || originalTopic || (topic.length > 100 ? '' : topic)}</span></p>
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
                      onApplyPreset={(preset) => setActivePresetId(preset.id)}
                      onRecreateWithStyle={(config) => {
                        setActiveMarketplaceStyle(config);
                        setIsLoadedFullBleed(!!config?.imageGeneration?.prompt_style);
                        setShowStylePanel(false);
                        setTransitionToGenerate(true);
                        setCurrentCarouselId(null);
                        setTimeout(() => generateContent(), 1200);
                      }} />
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
                        onApplyPreset={(preset) => setActivePresetId(preset.id)}
                        onRecreateWithStyle={(config) => {
                          setActiveMarketplaceStyle(config);
                          setIsLoadedFullBleed(!!config?.imageGeneration?.prompt_style);
                          setShowStylePanel(false);
                          setTransitionToGenerate(true);
                          setCurrentCarouselId(null);
                          setTimeout(() => generateContent(), 1200);
                        }} />
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
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 w-full relative z-10 flex-wrap px-4">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 border border-white/5">
                {autoSaveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : autoSaveStatus === 'saved' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Save className="h-3.5 w-3.5" />}
                {autoSaveStatus === 'saving' ? 'Salvando...' : autoSaveStatus === 'saved' ? 'Salvo!' : 'Auto-save'}
              </div>
              {/* Export button */}
              <button data-tour="btn-export" onClick={isGuest ? () => navigate('/checkout') : () => setShowExportMenu(true)} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white border transition-all disabled:opacity-50"
                style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' }}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isGuest ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {isGuest ? 'Cadastre-se' : 'Exportar'}
              </button>
              {/* Generate Stories */}
              {carouselData.cards[activeCardIndex]?.imageUrl && !isGuest && (
                <button onClick={generateStoriesImage} disabled={generatingStories}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-50"
                  style={{ borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.08)' }}>
                  {generatingStories ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {generatingStories ? 'Gerando...' : 'Stories'}
                </button>
              )}

              {/* Export Dialog */}
              {showExportMenu && !isGuest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShowExportMenu(false)}>
                  <div className="rounded-2xl border border-white/10 p-6 w-72 flex flex-col gap-3"
                    style={{ backgroundColor: 'rgba(15,15,30,0.98)', backdropFilter: 'blur(20px)' }}
                    onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-sm font-semibold text-white text-center mb-1">
                      {contentMode === 'single-post' ? 'Exportar Post' : 'Exportar Carrossel'}
                    </h3>
                    {contentMode !== 'single-post' && (
                      <button onClick={() => exportAllCards('png', true)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-3 border border-white/10">
                        <FileText className="h-4 w-4 text-purple-400" /> Baixar ZIP
                      </button>
                    )}
                    <button onClick={() => exportAllCards('png')}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border border-white/5">
                      <ImageIcon className="h-4 w-4" /> Baixar PNG
                    </button>
                    <button onClick={() => exportAllCards('jpg')}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border border-white/5">
                      <ImageIcon className="h-4 w-4" /> Baixar JPG
                    </button>
                    <button onClick={() => exportAllCards('webp')}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border border-white/5">
                      <ImageIcon className="h-4 w-4" /> Baixar WEBP
                    </button>
                  </div>
                </div>
              )}
              {/* Hide editing controls when marketplace full-bleed is active */}
              {!activeMarketplaceStyle?.imageGeneration?.prompt_style && (
                <>
                  <div className="w-px h-5 bg-white/10" />
                  <button data-tour="btn-add" onClick={() => setShowAddCardMenu(true)} disabled={isGuest}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar Card
                  </button>
                  <button data-tour="btn-style" onClick={() => setShowStylePanel(!showStylePanel)} disabled={isGuest}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                    style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' }}>
                    <Palette className="h-3.5 w-3.5" /> Estilo
                  </button>
                </>
              )}
              
              {/* Generate carousel from cover */}
              {carouselData.cards[0]?.imageUrl && !isGuest && (
                <button onClick={() => { setShowCarouselFromCover(true); setCoverModalTab('config'); setCoverCardTexts(Array.from({ length: carouselFromCoverCount }, () => ({ title: '', body: '' }))); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-purple-200 border transition-all"
                  style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' }}>
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" /> Gerar Carrossel
                </button>
              )}
              <button onClick={() => { setShowCaptionPanel(!showCaptionPanel); if (!postCaption && !showCaptionPanel) generateCaption(); }} disabled={isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                style={{ borderColor: 'rgba(139,92,246,0.3)', backgroundColor: showCaptionPanel ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)' }}>
                <FileText className="h-3.5 w-3.5" /> Legenda
              </button>
              <button onClick={() => { resetWizardState(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                Novo
              </button>
            </div>

            {/* Carousel from cover modal - enhanced */}
            {showCarouselFromCover && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowCarouselFromCover(false)}>
                <div className="rounded-2xl border border-purple-500/20 p-6 w-full max-w-md max-h-[85vh] flex flex-col gap-5 overflow-hidden shadow-2xl shadow-purple-500/10"
                  style={{ backgroundColor: 'rgba(12,10,24,0.98)' }}
                  onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-white text-center flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Gerar carrossel a partir desta capa
                  </h3>

                  {/* Tabs */}
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
                    <button onClick={() => setCoverModalTab('config')}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${coverModalTab === 'config' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/60'}`}>
                      ⚙️ Configuração
                    </button>
                    <button onClick={() => setCoverModalTab('texts')}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${coverModalTab === 'texts' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/60'}`}>
                      <Type className="h-3 w-3 inline mr-1" /> Textos
                    </button>
                  </div>

                  {coverModalTab === 'config' ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-xs text-white/40 text-center">A capa atual será mantida como card 1. Os demais serão gerados pela IA.</p>
                      <div className="flex flex-col gap-3">
                        <label className="text-xs text-white/50 font-medium">Quantos cards no total?</label>
                        <div className="flex items-center gap-3">
                          <input type="range" min={4} max={20} value={carouselFromCoverCount}
                            onChange={(e) => { setCarouselFromCoverCount(Number(e.target.value)); setCoverCardTexts(Array.from({ length: Number(e.target.value) }, (_, i) => coverCardTexts[i] || { title: '', body: '' })); }}
                            className="flex-1 accent-purple-500" />
                          <span className="text-xl font-bold text-white w-8 text-center">{carouselFromCoverCount}</span>
                        </div>
                        <div className="flex gap-1.5 justify-center flex-wrap">
                          {[4, 6, 8, 10, 15, 20].map(n => (
                            <button key={n} onClick={() => { setCarouselFromCoverCount(n); setCoverCardTexts(Array.from({ length: n }, (_, i) => coverCardTexts[i] || { title: '', body: '' })); }}
                              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${carouselFromCoverCount === n ? 'bg-purple-600 text-white border border-purple-500/50' : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/30 text-center">{carouselFromCoverCount - 1} cards serão gerados pela IA</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: '50vh', WebkitOverflowScrolling: 'touch' as any }}>
                      {/* AI fill button */}
                      <button onClick={fillCoverTextsWithAI} disabled={fillingCoverTexts || !topic.trim()}
                        className="flex items-center gap-2 w-full p-2.5 rounded-xl transition-all text-left"
                        style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                          {fillingCoverTexts ? <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" /> : <Wand2 className="h-3.5 w-3.5 text-purple-400" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white/80">{fillingCoverTexts ? 'Gerando...' : 'Preencher com IA'}</p>
                          <p className="text-[10px] text-white/30">Gera sugestões de texto para cada card.</p>
                        </div>
                      </button>
                      <p className="text-[10px] text-white/40 text-center">Opcional — a IA preenche o que ficar vazio.</p>
                      {/* Card text editors */}
                      {Array.from({ length: carouselFromCoverCount }, (_, i) => {
                        const cardText = coverCardTexts[i] || { title: '', body: '' };
                        const label = i === 0 ? 'Card 1 — Capa' : i === carouselFromCoverCount - 1 ? `Card ${i + 1} — CTA` : `Card ${i + 1}`;
                        const hasContent = (cardText.title || '').trim() || (cardText.body || '').trim();
                        return (
                          <div key={i} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${hasContent ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-white/60">{label}</span>
                              {hasContent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">editado</span>}
                            </div>
                            <input value={cardText.title || ''} onChange={(e) => { const u = [...coverCardTexts]; u[i] = { ...u[i], title: e.target.value }; setCoverCardTexts(u); }}
                              placeholder={i === 0 ? 'Título da capa...' : 'Título do card...'}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-purple-500/30" />
                            <textarea value={cardText.body || ''} onChange={(e) => { const u = [...coverCardTexts]; u[i] = { ...u[i], body: e.target.value }; setCoverCardTexts(u); }}
                              placeholder={i === 0 ? 'Subtítulo...' : 'Conteúdo...'}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-xs px-2.5 py-1.5 rounded-lg resize-none outline-none focus:border-purple-500/30 min-h-[50px]"
                              rows={2} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3 mt-1">
                    <button onClick={() => setShowCarouselFromCover(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => generateCarouselFromCover(carouselFromCoverCount)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 border border-purple-500/50 transition-colors">
                      <Sparkles className="h-3.5 w-3.5 inline mr-1" /> Gerar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stories preview modal */}
            {showStoriesPreview && storiesImageUrl && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowStoriesPreview(false)}>
                <div className="relative flex flex-col items-center gap-4 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                  <div className="rounded-2xl overflow-hidden border border-white/10" style={{ width: Math.min(270, window.innerWidth - 48), height: Math.min(480, (window.innerHeight * 0.7)) }}>
                    <img src={storiesImageUrl} alt="Stories" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadStoriesImage}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-medium text-white border transition-colors"
                      style={{ borderColor: 'rgba(139,92,246,0.4)', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' }}>
                      <Download className="h-3.5 w-3.5" /> Baixar Stories
                    </button>
                    <button onClick={() => { setShowStoriesPreview(false); generateStoriesImage(); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-white/70 border border-white/10 hover:bg-white/5 transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" /> Regenerar
                    </button>
                    <button onClick={() => setShowStoriesPreview(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors">
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div data-tour="card-strip" className="w-full max-w-5xl mt-6 relative z-10 overflow-x-hidden">
              <div className="flex gap-3 pb-4 px-4 justify-center flex-wrap">
                {carouselData.cards.map((card, i) => {
                  const thumbW = 120;
                  const thumbH = thumbW * (CARD_H / CARD_W);
                  return (
                  <div key={i} className="snap-center flex-shrink-0 relative group cursor-pointer" style={{ width: thumbW + 4 }}
                    onClick={() => {
                      if (isCardLocked(i)) return;
                      setActiveCardIndex(i);
                      // Don't open editor for marketplace full-bleed styles
                      if (!activeMarketplaceStyle?.imageGeneration?.prompt_style) {
                        setEditingCard(i);
                        setAiImagePrompt(card.imagePrompt || card.title || '');
                      }
                    }}>
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
                    {/* Regenerating overlay on thumbnail */}
                    {(regeneratingCard === i || regeneratingFace === i) && (
                      <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                        <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                      </div>
                    )}
                    {/* Lock overlay for guest thumbnails */}
                    {isCardLocked(i) && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
                        <Lock className="w-4 h-4" style={{ color: 'rgba(139,92,246,0.7)' }} />
                      </div>
                    )}
                    {/* Delete button - top right */}
                    {carouselData.cards.length > 2 && (
                      <button onClick={(e) => { e.stopPropagation(); removeCard(i); }}
                        className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        style={{ backgroundColor: 'rgba(220,38,38,0.8)' }}
                        title="Excluir card">
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                    {/* Single "Modificar" button */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setModifyMenuCard(modifyMenuCard === i ? null : i); }}
                        className="px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                        {(regeneratingCard === i || regeneratingFace === i) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                        Modificar
                      </button>
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

      {/* ===== MODIFY CARD MODAL ===== */}
      <AnimatePresence>
        {modifyMenuCard !== null && carouselData && (() => {
          const cardIdx = modifyMenuCard;
          const card = carouselData.cards[cardIdx];
          if (!card) return null;
          return (
            <motion.div
              key="modify-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={() => { setModifyMenuCard(null); setFaceUploadMode(false); setTempFaceFiles([]); }}>
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl w-[340px]"
                style={{ backgroundColor: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={(e) => e.stopPropagation()}>
                <div className="px-4 pt-4 pb-2">
                  <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
                    {faceUploadMode ? 'Fotos de referência do rosto' : `Card ${cardIdx + 1}`}
                  </p>
                </div>

                {!faceUploadMode ? (
                  <div className="flex flex-col px-2 pb-3 gap-0.5">
                    <button
                      onClick={() => { setModifyMenuCard(null); regenerateCard(cardIdx); }}
                      disabled={regeneratingCard === cardIdx}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50">
                      {regeneratingCard === cardIdx ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : <Image className="h-4 w-4 text-blue-400" />}
                      Regenerar foto completa
                    </button>
                    {card.imageUrl && (
                      <button
                        onClick={() => { setFaceUploadMode(true); setTempFaceFiles(referenceImages.filter(r => r.category === 'face').map(r => r.url)); }}
                        disabled={regeneratingFace === cardIdx}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50">
                        {regeneratingFace === cardIdx ? <Loader2 className="h-4 w-4 text-green-400 animate-spin" /> : <UserCheck className="h-4 w-4 text-green-400" />}
                        Regenerar rosto
                      </button>
                    )}
                    {(card.generatedPrompt || card.imagePrompt || card.isAiImage) && (
                      <button
                        onClick={() => { setModifyMenuCard(null); setViewPromptCard(cardIdx); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/90 hover:bg-white/10 transition-colors">
                        <FileText className="h-4 w-4 text-yellow-400" />
                        Ver prompt usado
                      </button>
                    )}
                    {carouselData.cards.length > 2 && (
                      <>
                        <div className="mx-3 my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                        <button
                          onClick={() => { setModifyMenuCard(null); removeCard(cardIdx); }}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                          Excluir post
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="px-4 pb-5">
                    <p className="text-white/60 text-[13px] mb-4 leading-relaxed">Envie até 5 fotos do rosto para referência. Fotos de diferentes ângulos melhoram o resultado.</p>
                    
                    {/* Thumbnails of uploaded faces */}
                    {tempFaceFiles.length > 0 && (
                      <div className="flex gap-2.5 mb-4 flex-wrap">
                        {tempFaceFiles.map((url, fi) => (
                          <div key={fi} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/15 shadow-lg">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setTempFaceFiles(prev => prev.filter((_, idx) => idx !== fi))}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload & Gallery buttons */}
                    {tempFaceFiles.length < 5 && (
                      <div className="flex gap-2 mb-4">
                        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3.5 rounded-xl text-[13px] text-white/70 border border-dashed border-white/20 hover:bg-white/5 transition-colors cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Enviar fotos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              files.slice(0, 5 - tempFaceFiles.length).forEach(file => {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) setTempFaceFiles(prev => {
                                    if (prev.length >= 5) return prev;
                                    return [...prev, ev.target!.result as string];
                                  });
                                };
                                reader.readAsDataURL(file);
                              });
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          onClick={() => setFaceGalleryOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[13px] text-white/70 border border-white/15 hover:bg-white/5 transition-colors">
                          <Folder className="h-4 w-4" />
                          Galeria
                        </button>
                      </div>
                    )}

                    <p className="text-white/30 text-[11px] mb-4">{tempFaceFiles.length}/5 fotos selecionadas</p>
                    
                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setFaceUploadMode(false); setTempFaceFiles([]); }}
                        className="flex-1 px-3 py-3 rounded-xl text-[13px] text-white/60 hover:bg-white/10 transition-colors border border-white/10">
                        Voltar
                      </button>
                      <button
                        onClick={() => {
                          const urls = [...tempFaceFiles];
                          setModifyMenuCard(null);
                          setFaceUploadMode(false);
                          setTempFaceFiles([]);
                          regenerateFace(cardIdx, urls);
                        }}
                        disabled={tempFaceFiles.length === 0}
                        className="flex-1 px-3 py-3 rounded-xl text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20">
                        ✨ Regenerar rosto
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ===== VIEW PROMPT MODAL ===== */}
      <AnimatePresence>
        {viewPromptCard !== null && carouselData && (() => {
          const card = carouselData.cards[viewPromptCard];
          const promptText = card?.generatedPrompt || card?.imagePrompt || '';
          if (!card || !promptText) return null;
          return (
            <motion.div
              key="view-prompt-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={() => setViewPromptCard(null)}>
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl w-[520px] max-w-[95vw] max-h-[80vh] flex flex-col"
                style={{ backgroundColor: '#1a1a2e' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-400" />
                    Prompt usado — Card {viewPromptCard + 1}
                  </h3>
                  <button onClick={() => setViewPromptCard(null)} className="text-white/50 hover:text-white/80 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <pre className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap font-mono" style={{ wordBreak: 'break-word' }}>
                    {promptText}
                  </pre>
                </div>
                <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(promptText); sonnerToast.success('Prompt copiado!'); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </button>
                  <button
                    onClick={() => setViewPromptCard(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white/90 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    Fechar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ===== ADD CARD TEXT MODE MODAL ===== */}
      <AnimatePresence>
        {addCardModal.open && (
          <motion.div
            key="add-card-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setAddCardModal(prev => ({ ...prev, open: false }))}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl w-[380px] max-w-[95vw]"
              style={{ backgroundColor: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}>
              
              <div className="px-5 pt-5 pb-3">
                <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
                  Novo Card {addCardModal.cardType === 'composed' ? 'Composto' : 'Sólido'}
                </p>
                <p className="text-white text-sm font-semibold mt-1">
                  {addCardModal.step === 'text-mode' ? 'Como definir o texto?' : addCardModal.step === 'manual' ? 'Texto do card' : 'Texto gerado pela IA'}
                </p>
              </div>

              {/* Step: text-mode selection */}
              {addCardModal.step === 'text-mode' && (
                <div className="flex flex-col px-3 pb-4 gap-1.5">
                  <button
                    onClick={() => { generateAddCardAutoText(); }}
                    disabled={addCardModal.generatingAutoText}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border"
                    style={{ borderColor: 'rgba(139,92,246,0.2)', backgroundColor: 'rgba(139,92,246,0.06)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                      {addCardModal.generatingAutoText ? <Loader2 className="h-4 w-4 text-purple-400 animate-spin" /> : <Wand2 className="h-4 w-4 text-purple-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Texto automático</p>
                      <p className="text-[11px] text-white/40">A IA sugere o conteúdo para aprovação</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setAddCardModal(prev => ({ ...prev, step: 'manual' }))}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <Type className="h-4 w-4 text-white/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">Texto manual</p>
                      <p className="text-[11px] text-white/40">Você define título e corpo</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step: manual text input */}
              {addCardModal.step === 'manual' && (
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">Título</label>
                    <input
                      value={addCardModal.manualText.title}
                      onChange={(e) => setAddCardModal(prev => ({ ...prev, manualText: { ...prev.manualText, title: e.target.value } }))}
                      placeholder="Título do card..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-lg outline-none focus:border-white/15 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1 block">Corpo</label>
                    <textarea
                      value={addCardModal.manualText.body}
                      onChange={(e) => setAddCardModal(prev => ({ ...prev, manualText: { ...prev.manualText, body: e.target.value } }))}
                      placeholder="Conteúdo do card..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-lg resize-none outline-none focus:border-white/15 transition-colors min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAddCardModal(prev => ({ ...prev, step: 'text-mode' }))}
                      className="flex-1 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={() => addOneMoreCard(addCardModal.cardType, addCardModal.manualText)}
                      disabled={!addCardModal.manualText.title.trim() && !addCardModal.manualText.body.trim()}
                      className="flex-1 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))' }}>
                      Gerar card
                    </button>
                  </div>
                </div>
              )}

              {/* Step: auto text preview */}
              {addCardModal.step === 'auto-preview' && addCardModal.autoText && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-semibold text-white/90">{addCardModal.autoText.title}</p>
                    {addCardModal.autoText.body && <p className="text-xs text-white/50 leading-relaxed">{addCardModal.autoText.body}</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => generateAddCardAutoText()}
                      disabled={addCardModal.generatingAutoText}
                      className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40">
                      {addCardModal.generatingAutoText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Gerar outro
                    </button>
                    <button
                      onClick={() => addOneMoreCard(addCardModal.cardType, addCardModal.autoText!)}
                      className="flex-1 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))' }}>
                      Aprovar e gerar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <GalleryPicker
        open={faceGalleryOpen}
        onClose={() => setFaceGalleryOpen(false)}
        onSelectFiles={(files) => {
          const newUrls = files.map(f => f.url).slice(0, 5 - tempFaceFiles.length);
          setTempFaceFiles(prev => [...prev, ...newUrls].slice(0, 5));
          setFaceGalleryOpen(false);
        }}
        label="Selecionar pasta de rostos"
      />

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
                <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/40">
                  {autoSaveStatus === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : autoSaveStatus === 'saved' ? <Check className="h-3 w-3 text-green-400" /> : <Save className="h-3 w-3" />}
                  <span className="hidden sm:inline">{autoSaveStatus === 'saving' ? 'Salvando...' : autoSaveStatus === 'saved' ? 'Salvo!' : ''}</span>
                </div>
                <button onClick={() => setShowExportMenu(true)} disabled={exporting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-50 relative"
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

      {/* Guest Paywall Modal - shown after free generation */}
      {showGuestPaywall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden p-8 text-center"
            style={{ backgroundColor: '#18181f', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
              <Sparkles className="w-8 h-8" style={{ color: '#9B6BFF' }} />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Gostou do resultado? ✨</h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Esse foi seu teste gratuito! Para baixar, editar e gerar mais conteúdos incríveis com IA, assine um plano.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowGuestPaywall(false); navigate('/precos'); }}
                className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff' }}
              >
                Ver planos e assinar
              </button>
              <button
                onClick={() => { setShowGuestPaywall(false); navigate('/register'); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                Criar conta gratuita
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Login Gate Modal */}
      {showLoginGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLoginGate(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden p-8 text-center"
            style={{ backgroundColor: '#18181f', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: 'rgba(123, 80, 220, 0.15)' }}>
              <Lock className="w-7 h-7" style={{ color: '#9B6BFF' }} />
            </div>
            <h2 className="text-white text-lg font-bold mb-2">Crie sua conta gratuita</h2>
            <p className="text-white/40 text-sm mb-6 leading-relaxed">
              Para gerar conteúdo com IA, você precisa criar uma conta. É rápido e gratuito!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowLoginGate(false); navigate('/register'); }}
                className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{ backgroundColor: '#7B50DC', color: '#fff' }}
              >
                Criar conta grátis
              </button>
              <button
                onClick={() => { setShowLoginGate(false); navigate('/auth'); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
              >
                Já tenho conta — Entrar
              </button>
            </div>
            <button onClick={() => setShowLoginGate(false)} className="absolute top-3 right-3 p-1 text-white/30 hover:text-white/60 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
      </>}
    </div>
  );
};

export default CarouselGenerator;
