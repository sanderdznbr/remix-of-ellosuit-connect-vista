import React, { useState, useRef, useEffect, useCallback } from 'react';
import { calculateCreditCost } from '@/utils/creditCost';
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

// Resilient edge function invoke — falls back to direct HTTP fetch if SDK times out
const resilientInvoke = async (fnName: string, body: Record<string, unknown>) => {
  try {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error) throw error;
    return data;
  } catch (sdkErr) {
    console.warn(`[resilientInvoke] SDK failed for ${fnName}, trying direct fetch...`, sdkErr);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZGRpeXVlenFycHVha2F6dmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDIzNTgsImV4cCI6MjA2NjkxODM1OH0.CrUu3HGCfWh6cPfGsbDXGQNG5AWOsi9X2GGix1-7izg'}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZGRpeXVlenFycHVha2F6dmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDIzNTgsImV4cCI6MjA2NjkxODM1OH0.CrUu3HGCfWh6cPfGsbDXGQNG5AWOsi9X2GGix1-7izg',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Direct fetch failed: ${res.status} ${text}`);
    }
    return await res.json();
  }
};
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
  Save, History, Clock, RotateCcw, ChevronLeft, ChevronRight, Check, ExternalLink, FileText, Copy, Lock, Menu, Home, User, MoreHorizontal, Image, UserCheck, Pencil, Folder, Smartphone, Layers, Undo2, Instagram
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast as sonnerToast } from 'sonner';
import StepTopic from './wizard/StepTopic';
import StepWebSearchResult from './wizard/StepWebSearchResult';
import StepCardCount from './wizard/StepCardCount';
import StepWebImages from './wizard/StepWebImages';
import StepFaceRef from './wizard/StepFaceRef';
import StepFacePosition from './wizard/StepFacePosition';
import StepProduct, { ProductAnalysis, ProductSize, PRODUCT_SIZE_OPTIONS } from './wizard/StepProduct';
import GalleryPicker from './wizard/GalleryPicker';
import StepBrandRef from './wizard/StepBrandRef';
import StepColors from './wizard/StepColors';
import StepFonts from './wizard/StepFonts';
import StepStyleSelect from './wizard/StepStyleSelect';
import StepBranding from './wizard/StepBranding';
import StepSpeed from './wizard/StepSpeed';
import StepVisualStyle, { VisualCategory, PeopleMode } from './wizard/StepVisualStyle';
import StepPeopleMode from './wizard/StepPeopleMode';
import StepCardTexts from './wizard/StepCardTexts';
import StepMode from './wizard/StepMode';
import StepExtremeVision, { ExtremeAnalysis } from './wizard/StepExtremeVision';
import StepExtremeForm from './wizard/StepExtremeForm';
import StepExtremeResumo from './wizard/StepExtremeResumo';
import StepExtremeBehanceRefs from './wizard/StepExtremeBehanceRefs';
import StepExtremeFonts from './wizard/StepExtremeFonts';
import StepStyle, { STYLE_PRESETS, StylePreset, LogoPosition } from './wizard/StepStyle';
import StepProperty, { PropertyData, createEmptyProperty, buildPropertyPromptContext } from './wizard/StepProperty';
import StepPropertyPhotos from './wizard/StepPropertyPhotos';
import StepPropertyCrop from './wizard/StepPropertyCrop';
import StepPropertyInfo from './wizard/StepPropertyInfo';
import AddCardStylePicker from './AddCardStylePicker';
import CarouselEditorSidebar from './editor/CarouselEditorSidebar';
import { PropertyCardData } from './RealEstateCardTemplates';
import SocialPublishDialog from './SocialPublishDialog';
// CarouselTour removed
import StepPersonalization from './wizard/StepPersonalization';
import GeneratingAnimation from './GeneratingAnimation';
import WelcomeScreen from './WelcomeScreen';
import PostCorrectionEditor from './PostCorrectionEditor';
import RegeneratePhotoDialog from './RegeneratePhotoDialog';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { ReferenceImage, FamousPerson, FacePerson, ImageSettings, DEFAULT_IMAGE_SETTINGS, FLOW_COLOR } from './wizard/types';
import { useCarouselVoice } from '@/hooks/useCarouselVoice';
import { usePlanLimits } from '@/hooks/usePlanLimits';

// Format dimensions lookup
const FORMAT_DIMENSIONS = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
} as const;
type PostFormatType = keyof typeof FORMAT_DIMENSIONS;

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
  const planLimits = usePlanLimits();
  const isCardLocked = (index: number) => isGuest && index > 0 && !!carouselData;
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showGuestPaywall, setShowGuestPaywall] = useState(false);

  // Welcome screen state
  const [showWelcome, setShowWelcome] = useState(true);
  const showWelcomeRef = useRef(true);
  // Keep ref in sync
  useEffect(() => { showWelcomeRef.current = showWelcome; }, [showWelcome]);
  const [loadingCarousel, setLoadingCarousel] = useState(false);

  // Post format state
  const [postFormat, setPostFormat] = useState<PostFormatType>('portrait');
  const formatDims = FORMAT_DIMENSIONS[postFormat];
  const cardW = formatDims.w;
  const cardH = formatDims.h;
  const previewW = PREVIEW_W;
  const previewH = previewW * (cardH / cardW);
  
  // Content mode: carousel vs single-post
  const [contentMode, setContentMode] = useState<'carousel' | 'single-post'>('carousel');
  const [manualPostText, setManualPostText] = useState('');
  const [manualCardTexts, setManualCardTexts] = useState<{ title?: string; body?: string }[]>([]);
  const [cardPhotoAssignments, setCardPhotoAssignments] = useState<Record<number, string>>({});
  const [cardPhotoOptions, setCardPhotoOptions] = useState<Record<number, string[]>>({});
  const [roteiroGenerated, setRoteiroGenerated] = useState(false);
  const [generatingRoteiro, setGeneratingRoteiro] = useState(false);
  const [webFacePosition, setWebFacePosition] = useState<'cover' | 'last' | 'none'>('cover');

  // Wizard mode: simple vs advanced
  const [wizardMode, setWizardMode] = useState<'simple' | 'advanced' | 'extreme'>('simple');
  const [continuousMode, setContinuousMode] = useState(false);
  const [extremeAnalysis, setExtremeAnalysis] = useState<ExtremeAnalysis | null>(null);
  const [extremeVision, setExtremeVision] = useState('');
  const [extremeFormValues, setExtremeFormValues] = useState<Record<string, any>>({});
  const [extremeBehanceRefs, setExtremeBehanceRefs] = useState<string[]>([]);
  const [extremeSelectedFont, setExtremeSelectedFont] = useState<{ name: string; previewUrl: string; pageUrl: string } | null>(null);

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

  // Real estate property state
  const [propertyList, setPropertyList] = useState<PropertyData[]>([createEmptyProperty()]);
  const propertyListRef = useRef<PropertyData[]>(propertyList);
  // CRITICAL: Sync ref inline at render time (NOT in useEffect which is async/deferred)
  propertyListRef.current = propertyList;

  // NOTE: isRealEstateStyle, realEstateMode, and WIZARD_STEPS are computed after activeMarketplaceStyle is declared (see below)

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
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');
  const [logoBrandColors, setLogoBrandColors] = useState<string[]>([]);
  const [useBrandColors, setUseBrandColors] = useState(true);

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
  const [completingGeneration, setCompletingGeneration] = useState(false);
  const [resultEntrance, setResultEntrance] = useState(false);
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
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [regeneratingCard, setRegeneratingCard] = useState<number | null>(null);
  const [regeneratingFace, setRegeneratingFace] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regenAllProgress, setRegenAllProgress] = useState<{ current: number; total: number } | null>(null);
   const [modifyMenuCard, setModifyMenuCard] = useState<number | null>(null);
   const [faceUploadMode, setFaceUploadMode] = useState(false);
   const [regenDialogCard, setRegenDialogCard] = useState<number | null>(null);
   const [tempFaceFiles, setTempFaceFiles] = useState<string[]>([]);
    const [correctionCardIndex, setCorrectionCardIndex] = useState<number | null>(null);
    const [correctionUndoStack, setCorrectionUndoStack] = useState<Array<{ cardIndex: number; imageUrl: string }>>([]);
   const [viewPromptCard, setViewPromptCard] = useState<number | null>(null);
   const [showFullConfigModal, setShowFullConfigModal] = useState(false);
   const [faceGalleryOpen, setFaceGalleryOpen] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [styleChangeSource, setStyleChangeSource] = useState<'toolbar' | 'add-card' | 'recreate'>('toolbar');
  const [pendingAddCardStyle, setPendingAddCardStyle] = useState<any>(null);
  const [showCaptionPanel, setShowCaptionPanel] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [showCaptionConfigDialog, setShowCaptionConfigDialog] = useState(false);
  const [captionMaxChars, setCaptionMaxChars] = useState('');
  const [captionMentions, setCaptionMentions] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>('ellosuit-editorial');
  const [regenMenuOpen, setRegenMenuOpen] = useState<number | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  // CarouselTour removed
  const [editorRefImage, setEditorRefImage] = useState<string | null>(null);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [activeMarketplaceStyle, setActiveMarketplaceStyle] = useState<any>(null);
  const activeMarketplaceStyleRef = useRef<any>(null);
  const [isLoadedFullBleed, setIsLoadedFullBleed] = useState(false);
  const [loadedMarketplaceStyleId, setLoadedMarketplaceStyleId] = useState<string | null>(null);
  const isFullBleedMarketplace = !!activeMarketplaceStyle?.imageGeneration?.prompt_style;
  const isRealEstateStyle = !!activeMarketplaceStyle?.is_real_estate;
  const realEstateMode = (activeMarketplaceStyle?.real_estate_mode as 'single' | 'multiple') || 'single';

  // Web search state (declared early for WIZARD_STEPS computation)
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [skipWebSearch, setSkipWebSearch] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState<{ summary: string; citations: string[]; content?: any; images?: string[]; imageCandidates?: { url: string; title?: string; desc?: string; source?: string }[] } | null>(null);

  // Compute wizard steps after all state is declared
  const hasFacePhotos = facePersons.some(p => p.photos.length > 0);
  const hasWebResearch = !skipWebSearch && !!webSearchResult?.content;
  const hasWebImages = !skipWebSearch && Object.keys(cardPhotoAssignments).length > 0;
  // When web research is active, skip Pessoas and Visual steps (photos will be searched after the roteiro exists)
  const skipPeopleVisual = hasFacePhotos || hasWebResearch;
  // Show 'Posição' step only when user uploaded face AND web research is active
  const showFacePositionStep = hasFacePhotos && hasWebResearch;
  const showPesquisaStep = hasWebResearch;
  const SIMPLE_STEPS = isRealEstateStyle
    ? ['Modo', 'Tema', 'Estilo', 'Formato', 'Fotos Imóvel', 'Crop Imóvel', 'Info Imóvel', 'Personalização', 'Velocidade']
    : ['Modo', 'Tema', ...(showPesquisaStep ? ['Pesquisa'] : []), 'Estilo', 'Formato', ...(skipPeopleVisual ? [] : ['Pessoas', 'Visual']), 'Personalização', 'Velocidade'];
  const ADVANCED_STEPS = isRealEstateStyle
    ? ['Modo', 'Tema', 'Estilo', 'Formato', 'Fotos Imóvel', 'Crop Imóvel', 'Info Imóvel', 'Personalização', 'Produto', 'Cores', 'Fontes', 'Roteiro', 'Velocidade']
    : ['Modo', 'Tema', ...(showPesquisaStep ? ['Pesquisa'] : []), 'Estilo', 'Formato', ...(skipPeopleVisual ? [] : ['Pessoas', 'Visual']), 'Personalização', 'Produto', 'Cores', 'Fontes', 'Roteiro', 'Velocidade'];
  const EXTREME_STEPS = extremeAnalysis
    ? ['Modo', 'Visão', 'Detalhes', 'Fontes', 'Referências', 'Estilo', 'Personalização', 'Resumo', ...(contentMode === 'carousel' && cardCount > 1 ? ['Roteiro'] : [])]
    : ['Modo', 'Visão'];
  const WIZARD_STEPS = wizardMode === 'extreme' ? EXTREME_STEPS : wizardMode === 'simple' ? SIMPLE_STEPS : ADVANCED_STEPS;
  
  // Theme colors per wizard mode
  const modeTheme = wizardMode === 'extreme'
    ? { hex: '#E84D1A', hexDark: '#C43A0F', rgb: '232,77,26', rgb2: '200,60,20', gradient: 'linear-gradient(135deg, #C2410C 0%, #F97316 50%, #EA580C 100%)', tailwind: 'orange', loadingColor: '#F97316' }
    : wizardMode === 'advanced'
    ? { hex: '#DC2626', hexDark: '#B91C1C', rgb: '220,38,38', rgb2: '185,28,28', gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 50%, #DC2626 100%)', tailwind: 'red', loadingColor: '#EF4444' }
    : { hex: '#8B5CF6', hexDark: '#6D28D9', rgb: '139,92,246', rgb2: '99,102,241', gradient: 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 50%, #6B3FA0 100%)', tailwind: 'purple', loadingColor: '#A855F7' };
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
  const [showRegenModeMenu, setShowRegenModeMenu] = useState(false);
  const [addCardModal, setAddCardModal] = useState<{ open: boolean; cardType: 'composed' | 'solid'; step: 'type' | 'text-mode' | 'manual' | 'auto-preview'; autoText: { title: string; body: string } | null; manualText: { title: string; body: string }; generatingAutoText: boolean; textSize: 'short' | 'medium' | 'long' }>({ open: false, cardType: 'composed', step: 'type', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false, textSize: 'short' });
  const [cloudJobId, setCloudJobId] = useState<string | null>(null);
  const cloudJobIdRef = useRef<string | null>(null);
  const carouselDataRef = useRef<CarouselData | null>(null);
  const skipCloudRef = useRef(false);
  const generatingRef = useRef(false);
  const pendingExtremeRefsRef = useRef<ReferenceImage[]>([]);

  // DEFINITIVE FIX: Generation snapshot ref — captures ALL critical data at click time
  // This eliminates ALL stale closure issues because generateContent reads from this snapshot
  const generationSnapshotRef = useRef<{
    isRealEstate: boolean;
    realEstateMode: 'single' | 'multiple';
    propertyList: PropertyData[];
    marketplaceStyle: any;
  } | null>(null);

  // Keep refs in sync with state
  useEffect(() => { cloudJobIdRef.current = cloudJobId; }, [cloudJobId]);
  useEffect(() => { generatingRef.current = generating; }, [generating]);
  useEffect(() => { carouselDataRef.current = carouselData; }, [carouselData]);
  // CRITICAL: Sync marketplace style ref inline at render time (NOT in useEffect)
  activeMarketplaceStyleRef.current = activeMarketplaceStyle;

  const triggerCloudFallback = useCallback((jobId: string, useKeepAlive = false) => {
    const body = JSON.stringify({ jobId });

    if (useKeepAlive) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-carousel-cloud`, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        keepalive: true,
      }).catch(() => {});
      return;
    }

    supabase.functions.invoke('generate-carousel-cloud', {
      body: { jobId },
    }).catch((err) => {
      console.warn('Cloud fallback trigger failed:', err);
    });
  }, []);

  // === BEFOREUNLOAD: If user closes while generating, trigger cloud fallback ===
  useEffect(() => {
    const handleBeforeUnload = () => {
      const jobId = cloudJobIdRef.current;
      if (!jobId || !generatingRef.current) return;
      triggerCloudFallback(jobId, true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [triggerCloudFallback]);
  const handleEditorRefImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setEditorRefImage(url);
  };

  // Web search state (additional)
  const [classifyingTopic, setClassifyingTopic] = useState(false);
  const [webSearchSuggestion, setWebSearchSuggestion] = useState<{ classification: string; reason: string } | null>(null);
  const [webSearchDecisionMade, setWebSearchDecisionMade] = useState(false);

  const assignPerCardWebPhotos = useCallback(async (
    outline: { title?: string; body?: string }[],
    totalCards: number
  ) => {
    if (skipWebSearch || !webSearchResult?.content || totalCards <= 0) return;

    const candidates = (webSearchResult?.imageCandidates || [])
      .filter((c: any) => c?.url && typeof c.url === 'string' && c.url.startsWith('http'));
    const webImgs = (webSearchResult?.images || []).filter((u: string) => typeof u === 'string' && u.startsWith('http'));
    if (candidates.length === 0 && webImgs.length === 0) {
      setCardPhotoAssignments({});
      setCardPhotoOptions({});
      return;
    }

    const normalize = (value: string) => value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const stopwords = new Set(['de','da','do','das','dos','e','o','a','os','as','um','uma','para','com','no','na','em','por','sobre','ao','aos','que','como','mais','melhor','pior','card','capa']);
    const extractTerms = (text: string) => Array.from(new Set(normalize(text).split(' ').filter(t => t.length > 2 && !stopwords.has(t))));
    const topicTerms = extractTerms(String(webSearchResult?.content?.clean_topic || topic || ''));

    const scoreCandidate = (candidate: any, cardText: string) => {
      const haystack = normalize(`${candidate.title || ''} ${candidate.desc || ''} ${candidate.source || ''} ${candidate.url || ''}`);
      const cardTerms = extractTerms(cardText);
      let score = 0;

      for (const term of topicTerms) if (haystack.includes(term)) score += 3;
      for (const term of cardTerms) if (haystack.includes(term)) score += 6;

      if (/(portrait|headshot|press|premiere|red carpet|ceremony|festival|event|actor|atriz|celebrity|director|diretor|producer|cantor|singer)/i.test(haystack)) score += 4;
      if (/(poster|thumbnail|wallpaper|cover|banner|flyer|promo|promotional|advertisement|template|mockup|collage|montage|quote|caption|text|typography|screenshot|tweet|twitter|x.com|youtube|ytimg|pbs.twimg|meme)/i.test(haystack)) score -= 18;
      if (/(oscars?|academy awards?|award statue|trophy|logo)/i.test(haystack) && !/(actor|atriz|celebrity|portrait|press|red carpet)/i.test(haystack)) score -= 8;
      if (/getty|shutterstock|alamy|depositphotos|istock|freepik|vecteezy/.test(haystack)) score -= 8;

      return score;
    };

    const fallbackCandidates = webImgs.map((url) => ({ url, title: '', desc: '', source: '' }));
    const candidatePool = (candidates.length > 0 ? candidates : fallbackCandidates)
      .filter((candidate: any, index: number, arr: any[]) => arr.findIndex((item) => item.url === candidate.url) === index);

    const assignments: Record<number, string> = {};
    const optionsByCard: Record<number, string[]> = {};
    const usedUrls = new Set<string>();

    for (let ci = 0; ci < totalCards; ci++) {
      const card = outline[ci] || {};
      const cardText = `${card.title || ''} ${card.body || ''}`.trim();
      const ranked = [...candidatePool].sort((a, b) => scoreCandidate(b, cardText) - scoreCandidate(a, cardText));
      const uniqueRankedUrls = ranked
        .map((candidate: any) => candidate.url)
        .filter((url: string, index: number, arr: string[]) => arr.indexOf(url) === index);

      const preferredOptions = uniqueRankedUrls.filter((url: string) => !usedUrls.has(url)).slice(0, 3);
      const fallbackOptions = uniqueRankedUrls.filter((url: string) => !preferredOptions.includes(url)).slice(0, Math.max(0, 3 - preferredOptions.length));
      const options = [...preferredOptions, ...fallbackOptions].slice(0, 3);

      if (options.length > 0) {
        optionsByCard[ci] = options;
        assignments[ci] = options[0];
        usedUrls.add(options[0]);
      }
    }

    setCardPhotoOptions(optionsByCard);
    setCardPhotoAssignments(assignments);
  }, [skipWebSearch, webSearchResult?.content, webSearchResult?.images, webSearchResult?.imageCandidates, topic]);

  const handleSearchWeb = async () => {
    if (!topic.trim()) return;
    setSearchingWeb(true);
    setCardPhotoAssignments({});
    setCardPhotoOptions({});
    try {
      const data = await resilientInvoke('search-news', { topic: topic.trim(), language: 'pt-BR' });
      if (!data?.success) throw new Error(data?.error || 'Erro na pesquisa');
      
      const content = data.content || {};
      const images = Array.isArray(data.images) ? data.images.filter((u: string) => typeof u === 'string' && u.startsWith('http')) : [];
      const imageCandidates = Array.isArray(data.image_candidates)
        ? data.image_candidates.filter((c: any) => c?.url && typeof c.url === 'string' && c.url.startsWith('http'))
        : [];
      setWebSearchResult({
        summary: content?.summary || 'Conteúdo encontrado com sucesso',
        citations: data.citations || [],
        content,
        images,
        imageCandidates,
      });

      if (content?.image_search_terms?.length > 0) {
        setKeywords(content.image_search_terms.join(', '));
      }

      toast({ title: '🌐 Pesquisa concluída!', description: `${data.citations?.length || 0} fontes encontradas. As fotos serão buscadas por card após gerar o roteiro.` });
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
  const [currentCarouselId, _setCurrentCarouselId] = useState<string | null>(null);
  const currentCarouselIdRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const generationInFlightRef = useRef(false);
  const setCurrentCarouselId = useCallback((id: string | null) => {
    currentCarouselIdRef.current = id;
    _setCurrentCarouselId(id);
  }, []);

  // Full reset for starting a brand-new carousel
  const resetWizardState = useCallback(() => {
    setWizardStep(0);
    setContentMode('carousel');
    setManualPostText('');
    setManualCardTexts([]);
    setCardPhotoAssignments({});
    setCardPhotoOptions({});
    setWizardMode('simple');
    setExtremeAnalysis(null);
    setExtremeVision('');
    setExtremeFormValues({});
    setExtremeSelectedFont(null);
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
    setClassifyingTopic(false);
    setWebSearchSuggestion(null);
    setWebSearchDecisionMade(false);
    setCurrentCarouselId(null);
    setPexelsImages([]);
    setShowImagePicker(null);
    setGeneratingAiImage(false);
    setAiImagePrompt('');
    setGenerating(false);
    setPostFormat('portrait');
    setTransitionToGenerate(false);
    setCompletingGeneration(false);
    setResultEntrance(false);
    setGeneratingAllImages(false);
    setImageGenProgress('');
    setPropertyList([createEmptyProperty()]);
    setFacePersons([]);
    setFaceGender('auto');
    setWearsGlasses(false);
    setAllPeopleOnCover(true);
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
  const hasManuallyNavigatedAway = useRef(false);
  useEffect(() => {
    if (!routeCarouselId || !user || showWelcome) return;
    if (hasManuallyNavigatedAway.current) return;
    // Don't reload if we already have this carousel loaded
    if (currentCarouselId === routeCarouselId) return;
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
      hasManuallyNavigatedAway.current = true;
      // When returning to dashboard, reset URL to root
      if (window.location.pathname.startsWith('/carousel/')) {
        navigate('/', { replace: true });
      }
      return;
    }
    hasManuallyNavigatedAway.current = false;
    if (currentCarouselId) {
      // Use replaceState only — don't use navigate to avoid re-renders
      if (!window.location.pathname.includes(currentCarouselId)) {
        window.history.replaceState({}, '', `/carousel/${currentCarouselId}`);
      }
    } else if (window.location.pathname.startsWith('/carousel/')) {
      navigate('/', { replace: true });
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
            if (job.carousel_data) setCarouselData(job.carousel_data);
            if (job.carousel_id) setCurrentCarouselId(job.carousel_id);
            finishGeneration();
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
    // Extreme mode settings
    wizardMode,
    extremeVision: wizardMode === 'extreme' ? extremeVision : undefined,
    extremeAnalysis: wizardMode === 'extreme' ? extremeAnalysis : undefined,
    extremeFormValues: wizardMode === 'extreme' ? extremeFormValues : undefined,
    extremeSelectedFont: wizardMode === 'extreme' ? extremeSelectedFont : undefined,
    postFormat,
  }), [topic, keywords, cardCount, imageCardCount, contentMode, manualPostText, referenceImages, facePersons, allPeopleOnCover, faceGender, wearsGlasses, imageSettings, bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, activePresetId, logoUrl, logoPosition, showHeader, activeMarketplaceStyle, loadedMarketplaceStyleId, wizardMode, extremeVision, extremeAnalysis, extremeFormValues, extremeSelectedFont, postFormat]);

  // ===== AUTO-SAVE: debounced save when carouselData changes =====
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>('');
  
  useEffect(() => {
    if (!carouselData || !user || generating || generatingAllImages || regeneratingAll || regeneratingCard !== null || isGuest || isSavingRef.current) return;
    
    const dataHash = JSON.stringify({ cards: carouselData.cards.map(c => ({ ...c })), title: carouselData.title });
    if (dataHash === lastSavedDataRef.current) return;
    
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current || generatingRef.current) return; // Re-check inside timeout to prevent duplicate inserts
      try {
        setAutoSaveStatus('saving');
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
        if (!companyData) return;
        
        const isFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed || !!loadedMarketplaceStyleId || wizardMode === 'extreme';
        const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, referenceImages: referenceImages.length > 0 ? referenceImages : undefined, faceGender, wearsGlasses, facePersons: facePersons.length > 0 ? facePersons : undefined, allPeopleOnCover };
        
        if (currentCarouselIdRef.current) {
          await supabase.from('generated_carousels').update({ 
            title: carouselData.title || topic, topic, 
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), 
            carousel_data: carouselData as any, style_config: styleConfig as any, 
            card_count: carouselData.cards.length,
            marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null,
            generation_config: buildGenerationConfig(),
          } as any).eq('id', currentCarouselIdRef.current);
          // Retry cover capture if missing
          try {
            const { data: existing } = await supabase.from('generated_carousels').select('cover_url').eq('id', currentCarouselIdRef.current).single();
            if (!existing?.cover_url) {
              captureCoverImage(currentCarouselIdRef.current, companyData.company_id, carouselData).catch(() => {});
            }
          } catch { /* ignore */ }
        } else if (!generationInFlightRef.current) {
          // Only INSERT if no generation is currently in flight (prevents duplicates)
          isSavingRef.current = true;
          try {
            const { data: inserted, error } = await supabase.from('generated_carousels').insert({
              company_id: companyData.company_id, user_id: userData.user.id,
              title: carouselData.title || topic, topic,
              keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
              carousel_data: carouselData as any, style_config: styleConfig as any,
              card_count: carouselData.cards.length,
              marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null,
              generation_config: buildGenerationConfig(),
              post_format: postFormat,
            } as any).select('id').single();
            if (inserted && !error) {
              setCurrentCarouselId(inserted.id);
              captureCoverImage(inserted.id, companyData.company_id, carouselData).catch(() => {});
            }
          } finally { isSavingRef.current = false; }
        } else {
          console.log('[AUTO-SAVE] Skipping INSERT: generation in flight');
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
  }, [carouselData, bgColor, accentColor, textColor, selectedFont, brandName, userName, logoUrl, logoPosition, showHeader, activeMarketplaceStyle, isLoadedFullBleed, loadedMarketplaceStyleId, regeneratingAll, regeneratingCard]);

  // Export dialog is now a centered modal, no outside-click handler needed

  // ===== BUILD IMAGE PROMPT with settings =====
  const buildImagePrompt = (basePrompt: string, cardIndex?: number): string => {
    const parts: string[] = [];

    // If marketplace style has imageGeneration config, use its prompt_style as the foundation
    const styleImageGen = activeMarketplaceStyleRef.current?.imageGeneration;
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

    // Brand colors — only inject when toggle is ON
    if (useBrandColors && logoBrandColors.length > 0) {
      parts.push(`PALETA DE CORES DA MARCA (OBRIGATÓRIO): Use predominantemente estas cores: ${logoBrandColors.join(', ')}. Essas cores DEVEM dominar a composição, fundos, elementos decorativos, tipografia e acentos visuais. NÃO ignore estas cores. MANTENHA o estilo editorial e layout do template, mas SUBSTITUA a paleta de cores original pelas cores da marca. O fundo deve combinar com a paleta da marca (tons claros ou da cor dominante).`);
    }

    // Only add aspect ratio for non-panoramic prompts — format-aware
    if (!basePrompt.includes('PANORÂMICA CONTÍNUA')) {
      const fmtDims = FORMAT_DIMENSIONS[postFormat];
      const aspectLabel = postFormat === 'square' ? '1:1 square' : postFormat === 'story' ? '9:16 vertical story' : '4:5 portrait';
      parts.push(`${aspectLabel} aspect ratio, ${fmtDims.w}x${fmtDims.h}px, ultra high resolution`);
    } else {
      parts.push('ultra high resolution');
    }

    // Real estate property context
    if (isRealEstateStyle && propertyList.length > 0 && propertyList.some(p => p.price || p.area || p.photos.length > 0)) {
      const propContext = buildPropertyPromptContext(propertyList, realEstateMode, cardIndex ?? 0);
      if (propContext) parts.push(propContext);
    }

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
    fontReferenceImage?: string;
    fontReferenceName?: string;
  }): Promise<string | null> => {
    // Use the model selected by the user (nano-banana = quality default, gemini = fast)
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
    const styleImageGen = activeMarketplaceStyleRef.current?.imageGeneration;
    
    // Add timeout to prevent infinite loading (90s max per image)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Image generation timeout (90s)')), 90000)
    );
    
    const invokePromise = supabase.functions.invoke('generate-carousel-image', {
      body: {
        prompt: opts.prompt,
        imageSize: postFormat === 'square' ? '1:1' : postFormat === 'story' ? '9:16' : '3:4',
        topic: opts.prompt,
        faceReferenceUrls: opts.faceReferenceUrls,
        styleReferenceUrls: opts.styleReferenceUrls,
        referenceImageUrls: opts.referenceImageUrls,
        imageModel: resolvedModel,
        negativePrompt: opts.negativePrompt,
        fidelity: styleImageGen?.fidelity || imageSettings.fidelity,
        faceGender: faceGender,
        facePersonsMetadata: opts.facePersonsMetadata,
        ...(styleImageGen?.prompt_style ? { stylePrompt: styleImageGen.prompt_style + (activeMarketplaceStyleRef.current?._strictInstructions ? `\n\nINSTRUÇÕES RÍGIDAS DO ESTILO (PRIORIDADE MÁXIMA - SIGA À RISCA):\n${activeMarketplaceStyleRef.current._strictInstructions}` : '') } : {}),
        ...(useBrandColors && logoBrandColors.length > 0 ? { brandColors: logoBrandColors } : {}),
        ...(opts.fontReferenceImage ? { fontReferenceImage: opts.fontReferenceImage, fontReferenceName: opts.fontReferenceName } : {}),
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
  const openCaptionConfigDialog = () => {
    setShowCaptionConfigDialog(true);
  };

  const generateCaption = async (maxChars?: string, mentions?: string) => {
    if (generatingCaption) return;
    setGeneratingCaption(true);
    setShowCaptionPanel(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-caption',
          topic: topic.trim(),
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          cardCount: carouselData?.cards?.length || 7,
          ...(maxChars ? { maxChars: parseInt(maxChars) } : {}),
          ...(mentions ? { mentions: mentions.trim() } : {}),
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
  const captureCoverImage = async (carouselId: string, companyId: string, explicitData?: CarouselData | null, retryCount = 0) => {
    try {
      // Use explicit data (passed directly) or fall back to state
      const dataSource = explicitData || carouselData;
      
      // For real estate styles, use the property photo as cover (matches rendered template)
      let firstCardImage = dataSource?.cards?.[0]?.imageUrl;
      if (isRealEstateStyle && propertyListRef.current.length > 0 && propertyListRef.current[0]?.photos?.[0]?.url) {
        firstCardImage = propertyListRef.current[0].photos[0].url;
      }
      
      if (!firstCardImage) {
        // Retry up to 3 times with increasing delay (image may still be generating)
        if (retryCount < 3) {
          const delay = (retryCount + 1) * 3000;
          console.warn(`Cover: no image yet, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
          setTimeout(() => captureCoverImage(carouselId, companyId, null, retryCount + 1), delay);
          return;
        }
        console.warn('Cover: no AI image on first card after retries, using server fallback');
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
        // Retry if blob fetch failed (CORS might resolve after a moment)
        if (retryCount < 2) {
          console.warn(`Cover: blob fetch failed, retrying in 3s (attempt ${retryCount + 1}/2)`);
          setTimeout(() => captureCoverImage(carouselId, companyId, explicitData, retryCount + 1), 3000);
          return;
        }
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
      const isFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed || !!loadedMarketplaceStyleId || wizardMode === 'extreme';
      const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, referenceImages: referenceImages.length > 0 ? referenceImages : undefined, faceGender, wearsGlasses, facePersons: facePersons.length > 0 ? facePersons : undefined, allPeopleOnCover, continuousMode };
      const effectiveId = currentCarouselIdRef.current;
      if (effectiveId) {
        await supabase.from('generated_carousels').update({ title: carouselData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: carouselData as any, style_config: styleConfig as any, card_count: carouselData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || loadedMarketplaceStyleId || null, generation_config: buildGenerationConfig() } as any).eq('id', effectiveId);
        // Capture real rendered card as cover in background
        captureCoverImage(effectiveId, companyData.company_id).catch(() => {});
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
      const { data } = await supabase.from('generated_carousels').select('id, title, topic, keywords, created_at, card_count, style_config, cover_url, marketplace_style_id, generation_config').eq('company_id', companyData.company_id).order('created_at', { ascending: false }).limit(50);
      setCarouselHistory(data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const loadCarousel = async (item: any) => {
    setCarouselData(item.carousel_data);
    setTopic(item.topic);
    setKeywords((item.keywords || []).join(', '));
    setCurrentCarouselId(item.id);
    // Restore post format from DB column or generation_config
    const savedFormat = item.post_format || item.generation_config?.postFormat;
    if (savedFormat && savedFormat in FORMAT_DIMENSIONS) setPostFormat(savedFormat as PostFormatType);
    // Detect full-bleed: trust explicit marketplace_style_id, persisted isFullBleed flag, or extreme mode
    const hasMarketplaceStyle = !!item.marketplace_style_id || !!item.style_config?.isFullBleed || item.generation_config?.wizardMode === 'extreme';
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
      // Restore continuous mode
      if (sc.continuousMode) setContinuousMode(true); else setContinuousMode(false);
      // Restore real estate property data
      if (sc.propertyList?.length) setPropertyList(sc.propertyList);
    }
    // Restore extreme mode settings from generation_config
    const gc = item.generation_config;
    if (gc) {
      if (gc.contentMode) setContentMode(gc.contentMode);
      if (gc.cardCount) setCardCount(gc.cardCount);
      if (gc.imageCardCount !== undefined) setImageCardCount(gc.imageCardCount);
      if (gc.manualPostText) setManualPostText(gc.manualPostText);
      if (gc.postFormat && gc.postFormat in FORMAT_DIMENSIONS) setPostFormat(gc.postFormat as PostFormatType);
      if (gc.wizardMode === 'extreme') {
        setWizardMode('extreme');
        if (gc.extremeVision) setExtremeVision(gc.extremeVision);
        if (gc.extremeAnalysis) setExtremeAnalysis(gc.extremeAnalysis);
        if (gc.extremeFormValues) setExtremeFormValues(gc.extremeFormValues);
        if (gc.extremeSelectedFont) setExtremeSelectedFont(gc.extremeSelectedFont);
      } else {
        setWizardMode(gc.wizardMode || 'simple');
      }
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
          config.name = styleData.name;
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

      const extremeFormPhotoRefs: ReferenceImage[] = wizardMode === 'extreme' && extremeAnalysis
        ? extremeAnalysis.fields
            .filter((field) => field.type === 'photo_upload')
            .flatMap((field) => {
              const photos = extremeFormValues[field.id] as string[] | undefined;
              if (!photos?.length) return [];
              const normalized = `${field.label} ${field.id}`.toLowerCase();
              const isFace = /pessoa|rosto|face|foto.*pessoa|retrato|portrait|selfie|model|cliente|character|personagem|humano|human/.test(normalized);
              const isProduct = /print|screenshot|tela|app|produto|mockup|logo|marca|interface|screen/.test(normalized);
              const category: ReferenceImage['category'] = isFace ? 'face' : isProduct ? 'product' : 'style';
              return photos.map((url, idx) => ({
                url,
                thumb: url,
                label: `${field.label} ${idx + 1}`,
                source: 'upload' as const,
                category,
              }));
            })
        : [];

      const mergedReferenceImages: ReferenceImage[] = [...referenceImages, ...extremeFormPhotoRefs]
        .filter((ref, idx, arr) => !!ref?.url && arr.findIndex((r) => r.url === ref.url) === idx);

      const extremeProductUrls = extremeFormPhotoRefs
        .filter((ref) => ref.category === 'product' || ref.category === 'general')
        .map((ref) => ref.url);

      const extremeStyleUrls = extremeFormPhotoRefs
        .filter((ref) => ref.category === 'style')
        .map((ref) => ref.url);

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
        image_card_count: imageCardCount,
        face_card_count: faceCardCount,
        style_config: styleConfig as any,
        marketplace_style_id: activeMarketplaceStyle?.id || null,
        marketplace_style_config: marketplaceConfig as any,
        brand_name: brandName,
        user_name: userName,
        date_label: dateLabel,
        logo_url: logoUrl,
        logo_dark_url: logoDarkUrl,
        logo_position: logoPosition,
        show_header: showHeader,
        image_settings: { ...imageSettings, faceGender, wearsGlasses, brandColors: useBrandColors && logoBrandColors.length > 0 ? logoBrandColors : undefined, facePersonsMetadata: facePersons.filter(p => p.photos.length > 0).length > 1 ? facePersons.filter(p => p.photos.length > 0).map(p => ({ label: p.label, gender: p.gender, wearsGlasses: p.wearsGlasses, photoCount: p.photos.length })) : undefined, allPeopleOnCover } as any,
        reference_images: referenceImages as any,
        face_ref_urls: (() => { const active = facePersons.filter(p => p.photos.length > 0); return active.length > 0 ? active.flatMap(p => p.photos.map(ph => ph.url)) : referenceImages.filter(r => r.category === 'face').map(r => r.url); })() as any,
        product_context: isRealEstateStyle
          ? `REAL_ESTATE_DATA:${JSON.stringify({ properties: propertyList.map(p => ({ ...p, photos: p.photos.map(ph => ph.url) })), mode: realEstateMode })}`
          : wizardMode === 'extreme' && extremeAnalysis
            ? `EXTREME_VISION:${JSON.stringify({ vision: extremeVision, analysis: extremeAnalysis, formValues: extremeFormValues, fontReference: extremeSelectedFont ? { name: extremeSelectedFont.name, previewUrl: extremeSelectedFont.previewUrl, instruction: 'OBRIGATÓRIO: Use EXATAMENTE esta fonte tipográfica como referência visual. Replique o estilo, peso e proporções da fonte mostrada na imagem de referência.' } : null })}`
            : productContext,
        web_search_content: webSearchResult?.content ? JSON.stringify(webSearchResult.content) : null,
        web_search_citations: webSearchResult?.citations as any,
        negative_prompt: imageSettings.negativePrompt || null,
        post_format: postFormat,
      } as any).select('id').single();

      if (jobError || !jobData?.id) {
        console.error('[CLOUD_JOB] Failed to create cloud job:', jobError?.message, jobError?.details, jobError?.hint);
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
    if (generationInFlightRef.current) {
      console.log('[GENERATE_GUARD] Duplicate single-post trigger ignored');
      return;
    }
    generationInFlightRef.current = true;

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
      if (activeMarketplaceStyleRef.current?._previewImages?.length) {
        const origin = window.location.origin;
        const allPreviews = (activeMarketplaceStyleRef.current._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
        marketplaceRefUrls.push(...allPreviews.slice(0, 8));
      }

      // === EXTREME MODE: Extract photos from dynamic form and merge ===
      const extremeRefs = getExtremeFormPhotoRefs();
      const extremeFaceRefs = extremeRefs.filter(r => r.category === 'face').map(r => r.url);
      const extremeProductRefs = extremeRefs.filter(r => r.category === 'product').map(r => r.url);
      const extremeStyleRefs = extremeRefs.filter(r => r.category === 'style').map(r => r.url);
      const mergedFaceRefs = [...faceRefUrls, ...extremeFaceRefs];
      const mergedProductRefs = [...productRefUrls, ...extremeProductRefs];
      // Filter out font reference from style refs (it will be sent separately as fontReferenceImage)
      const fontRefLabel = extremeSelectedFont ? `Fonte: ${extremeSelectedFont.name}` : null;
      const allStyleRefs = [...styleRefUrls, ...marketplaceRefUrls, ...extremeStyleRefs].filter(url => {
        // Remove the font preview URL from style refs — it goes as a dedicated param
        if (fontRefLabel && extremeSelectedFont) {
          const fontUrl = extremeSelectedFont.previewUrl;
          return url !== fontUrl;
        }
        return true;
      });
      console.log('[SINGLE_POST] Extreme refs:', { face: extremeFaceRefs.length, product: extremeProductRefs.length, style: extremeStyleRefs.length, total: extremeRefs.length, hasFont: !!extremeSelectedFont });

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
      const fmtLabel = postFormat === 'square' ? '1:1 quadrado (1080x1080)' : postFormat === 'story' ? '9:16 vertical stories (1080x1920)' : '4:5 retrato (1080x1350)';
      promptParts.push(`POST ÚNICO para Instagram (${formatDims.w}x${formatDims.h}, formato ${fmtLabel}). UMA ÚNICA composição editorial completa — como uma CAPA de revista ou de carrossel. NÃO divida a imagem em múltiplos quadros, slides ou seções. Apenas UMA imagem unificada e impactante.`);
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
      if (useBrandColors && logoBrandColors.length > 0) {
        promptParts.push(`PALETA DE CORES DA MARCA: Use predominantemente estas cores: ${logoBrandColors.join(', ')}.`);
      }

      // === EXTREME MODE: Add vision context to prompt ===
      const extremeContext = buildExtremePromptContext();
      if (extremeContext) {
        promptParts.push(extremeContext);
      }

      // === REAL ESTATE BLEND DETECTION (triple-source: snapshot > ref > state) ===
      const snapshot = generationSnapshotRef.current;
      const snapshotIsRealEstate = snapshot?.isRealEstate ?? isRealEstateStyle;
      const snapshotPropertyList: PropertyData[] = (snapshot?.propertyList && snapshot.propertyList.length > 0)
        ? snapshot.propertyList
        : (propertyListRef.current && propertyListRef.current.length > 0 ? propertyListRef.current : propertyList);
      const useRealEstateBlend = snapshotIsRealEstate && snapshotPropertyList.some(p => p.photos && p.photos.length > 0);
      
      console.log('[SINGLE_BLEND_DETECT] useRealEstateBlend:', useRealEstateBlend,
        'snapshotIsRealEstate:', snapshotIsRealEstate,
        'propertyCount:', snapshotPropertyList.length,
        'photosPerProp:', snapshotPropertyList.map(p => p.photos?.length || 0));

      // === Convert property photos to base64 ===
      let propertyPhotoBase64: string[] = [];
      if (useRealEstateBlend) {
        setImageGenProgress('📸 Processando foto do imóvel...');
        const firstProp = snapshotPropertyList[0];
        for (const photo of (firstProp?.photos || [])) {
          try {
            if (photo.url.startsWith('data:')) {
              propertyPhotoBase64.push(photo.url);
            } else {
              const response = await fetch(photo.url);
              const blob = await response.blob();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              propertyPhotoBase64.push(dataUrl);
            }
          } catch (e) { console.warn('[SINGLE_BLEND] Photo convert failed:', e); }
        }
        console.log('[SINGLE_BLEND] Converted', propertyPhotoBase64.length, 'photos to base64');
      }

      // === If real estate: modify prompt for black BG ===
      if (useRealEstateBlend && propertyPhotoBase64.length > 0) {
        promptParts.push(`\n\n🏠 INSTRUÇÃO CRÍTICA — CARD IMOBILIÁRIO:
Use um FUNDO SÓLIDO PRETO (#000000) puro como base da imagem. NÃO gere nenhuma foto de casa, prédio, imóvel ou cenário de fundo.
O fundo DEVE ser completamente preto/escuro.
Sobreponha no fundo preto: textos editorials, badges de preço, ícones de especificações (quartos, vagas, m²), 
elementos gráficos decorativos do estilo visual, gradientes sutis e tipografia impactante.
A composição final deve ser como um overlay/HUD elegante sobre fundo escuro.
PROIBIDO: qualquer imagem de imóvel, casa, apartamento, prédio no fundo. APENAS fundo preto com overlay gráfico.`);
      }

      // If real estate blend: do NOT send property photos as reference (AI would try to recreate them)
      let effectiveProductRefs = (useRealEstateBlend && propertyPhotoBase64.length > 0) ? undefined : (mergedProductRefs.length > 0 ? mergedProductRefs : undefined);

      // === AUTO-ASSIGN WEB SEARCH REAL PHOTO (Single Post) ===
      if (!effectiveProductRefs && !skipWebSearch && webSearchResult?.images?.length && productImages.length === 0 && !useRealEstateBlend) {
        const webImgs = webSearchResult.images.filter((u: string) => u && u.startsWith('http'));
        if (webImgs.length > 0) {
          effectiveProductRefs = [webImgs[0]];
          promptParts.push(`\n\n📸 INSTRUÇÃO CRÍTICA — FOTO REAL (PRESERVAÇÃO TOTAL):
A imagem de referência enviada é uma FOTO REAL do tema "${topic}". 
REGRAS DE PRESERVAÇÃO ABSOLUTA:
1. USE a foto real como FUNDO/BASE principal — ela deve ocupar a maior parte da composição.
2. NÃO RECRIE, NÃO REDESENHE e NÃO REINTERPRETE os rostos ou pessoas da foto. Mantenha-os EXATAMENTE como são.
3. NÃO substitua a foto por uma ilustração ou versão "melhorada". A foto deve permanecer FOTOGRÁFICA e INALTERADA.
4. Sobreponha APENAS textos editoriais, elementos gráficos e tipografia POR CIMA da foto real.
5. Se a foto contém pessoas, elas devem aparecer EXATAMENTE como na foto original.
6. Trate a foto como um print/screenshot que DEVE ser preservado como base da composição.`);
          console.log('[SINGLE_POST_WEB_PHOTO] Assigned web image:', webImgs[0]?.substring(0, 80));
        }
      }

      const finalPrompt = buildImagePrompt(promptParts.join('\n'));
      const negPrompt = activeMarketplaceStyleRef.current?.imageGeneration?.negative_prompt || 'Do NOT copy exact faces or identities from reference images';

      // === FONT REFERENCE: Convert Envato preview to base64 for AI ===
      let fontBase64: string | undefined;
      let fontName: string | undefined;
      if (extremeSelectedFont?.previewUrl) {
        try {
          setImageGenProgress('🔤 Processando referência de fonte...');
          const fontResp = await fetch(extremeSelectedFont.previewUrl);
          if (fontResp.ok) {
            const blob = await fontResp.blob();
            if (!blob.type.includes('text/html')) {
              fontBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              fontName = extremeSelectedFont.name;
              console.log('[SINGLE_POST] Font reference converted to base64:', fontName);
            }
          }
        } catch (e) { console.warn('[SINGLE_POST] Font base64 conversion failed:', e); }
      }

      const imageUrl = await generateImage({
        prompt: finalPrompt,
        faceReferenceUrls: mergedFaceRefs.length > 0 ? mergedFaceRefs : undefined,
        styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
        referenceImageUrls: effectiveProductRefs,
        negativePrompt: negPrompt,
        facePersonsMetadata: singlePostFaceMeta,
        fontReferenceImage: fontBase64,
        fontReferenceName: fontName,
      });

      if (!imageUrl) throw new Error('Não foi possível gerar a imagem do post');

      // === REAL ESTATE: Canvas blend (real photo + AI overlay) ===
      let finalImageUrl = imageUrl;
      if (useRealEstateBlend && propertyPhotoBase64.length > 0) {
        setImageGenProgress('🏠 Mesclando foto real com overlay IA...');
        console.log('[SINGLE_BLEND] Starting canvas blend...');
        try {
          const W = 1080, H = 1350;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;

          const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = document.createElement('img') as HTMLImageElement;
            if (src.startsWith('http')) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => { console.error('[SINGLE_BLEND] Image load error:', src.substring(0, 80), e); reject(e); };
            img.src = src;
          });

          // STEP 1: Draw REAL PHOTO as full background (cover fit with cropOffsetY or focalPoint)
          const photoImg = await loadImg(propertyPhotoBase64[0]);
          const firstPropPhotos = snapshotPropertyList[0]?.photos || [];
          const cropOffsetY = firstPropPhotos[0]?.cropOffsetY;
          const focalPoint = firstPropPhotos[0]?.focalPoint || 'center';
          const pRatio = photoImg.width / photoImg.height;
          const cRatio = W / H;
          let sw = photoImg.width, sh = photoImg.height, sx = 0, sy = 0;
          if (pRatio > cRatio) {
            sw = photoImg.height * cRatio; sx = (photoImg.width - sw) / 2;
          } else {
            sh = photoImg.width / cRatio;
            const maxSy = photoImg.height - sh;
            if (cropOffsetY !== undefined) {
              // Use precise crop offset from drag-to-reposition
              sy = cropOffsetY * maxSy;
            } else if (focalPoint === 'top') sy = 0;
            else if (focalPoint === 'bottom') sy = maxSy;
            else sy = maxSy / 2;
          }
          ctx.drawImage(photoImg, sx, sy, sw, sh, 0, 0, W, H);

          // STEP 2: Dark gradient for text readability
          const gradient = ctx.createLinearGradient(0, H * 0.35, 0, H);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(0.4, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(0.7, 'rgba(0,0,0,0.65)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, W, H);

          // STEP 3: Overlay FULL AI image using screen blend (black = transparent)
          const aiImg = await loadImg(imageUrl);
          ctx.globalCompositeOperation = 'screen';
          ctx.drawImage(aiImg, 0, 0, aiImg.width, aiImg.height, 0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';

          // STEP 4: Draw logo
          if (logoUrl) {
            try {
              const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
                const r = await fetch(logoUrl); const b = await r.blob();
                return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
              })();
              const logoImg = await loadImg(logoB64);
              const maxLW = 180, maxLH = 80;
              const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
              const lw = logoImg.width * ls, lh = logoImg.height * ls;
              const pad = 50;
              let lx = pad, ly = pad;
              const lp = logoPosition || 'top-left';
              if (lp.includes('center')) lx = (W - lw) / 2;
              if (lp.includes('right')) lx = W - lw - pad;
              if (lp.includes('bottom')) ly = H - lh - pad;
              ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
              ctx.drawImage(logoImg, lx, ly, lw, lh);
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
            } catch (e) { console.warn('[SINGLE_BLEND] Logo draw failed:', e); }
          }

          finalImageUrl = canvas.toDataURL('image/jpeg', 0.92);
          console.log('[SINGLE_BLEND] ✅ Blend complete!');
        } catch (blendErr) {
          console.error('[SINGLE_BLEND] Blend failed, using AI image as fallback:', blendErr);
        }
      }

      // === NON-REAL-ESTATE: Programmatic logo overlay via Canvas ===
      if (!useRealEstateBlend && logoUrl && finalImageUrl) {
        try {
          console.log('[LOGO_OVERLAY] Adding logo to single post...');
          const W = 1080, H = 1350;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;

          const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = document.createElement('img') as HTMLImageElement;
            if (src.startsWith('http')) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

          // Draw the AI-generated image
          const baseImg = await loadImg(finalImageUrl);
          ctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height, 0, 0, W, H);

          // Draw logo
          const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
            const r = await fetch(logoUrl); const b = await r.blob();
            return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
          })();
          const logoImg = await loadImg(logoB64);
          const maxLW = 180, maxLH = 80;
          const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
          const lw = logoImg.width * ls, lh = logoImg.height * ls;
          const pad = 50;
          let lx = pad, ly = pad;
          const lp = logoPosition || 'top-left';
          if (lp.includes('center')) lx = (W - lw) / 2;
          if (lp.includes('right')) lx = W - lw - pad;
          if (lp.includes('middle')) ly = (H - lh) / 2;
          if (lp.includes('bottom')) ly = H - lh - pad;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
          ctx.drawImage(logoImg, lx, ly, lw, lh);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

          finalImageUrl = canvas.toDataURL('image/jpeg', 0.92);
          console.log('[LOGO_OVERLAY] ✅ Logo applied!');
        } catch (logoErr) {
          console.warn('[LOGO_OVERLAY] Failed, using image without logo:', logoErr);
        }
      }

      const singleCard: CarouselCard = {
        type: 'cover',
        title: topic.trim(),
        subtitle: manualPostText.trim() || undefined,
        imageUrl: finalImageUrl,
        isAiImage: true,
        layout: 'dark',
      };

      const finalData: CarouselData = { title: topic.trim(), cards: [singleCard] };
      setCarouselData(finalData);
      finishGeneration();
      toast({ title: 'Post gerado com sucesso!' });

      // Guest: don't show blocking paywall immediately, let them see the result

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try {
              const creditAmount = calculateCreditCost({ cardCount: 1, wizardMode, hasFaceRef: facePersons.some(p => p.photos.length > 0) });
              await supabase.rpc('consume_ai_credits', { p_company_id: companyData.company_id, p_agent_id: null, p_amount: creditAmount, p_description: `Post único (${wizardMode}): ${topic} — ${creditAmount} créditos` });
            } catch { /* ignore */ }
            const isFullBleed = true;
            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, isFullBleed, contentMode: 'single-post', manualPostText };
            isSavingRef.current = true;
            try {
              if (currentCarouselIdRef.current) {
                await supabase.from('generated_carousels').update({ title: finalData.title, topic, carousel_data: finalData as any, style_config: styleConfig as any, card_count: 1, generation_config: buildGenerationConfig() } as any).eq('id', currentCarouselIdRef.current);
                captureCoverImage(currentCarouselIdRef.current, companyData.company_id, finalData).catch(() => {});
                if (jobId) completeCloudJob(jobId, currentCarouselIdRef.current);
              } else {
                const { data: inserted, error: insertErr } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title, topic, keywords: [], carousel_data: finalData as any, style_config: styleConfig as any, card_count: 1, marketplace_style_id: activeMarketplaceStyleRef.current?.id || null, generation_config: buildGenerationConfig(), post_format: postFormat } as any).select('id').single();
                if (insertErr) {
                  console.error('Single post save failed:', insertErr);
                }
                if (inserted) {
                  setCurrentCarouselId(inserted.id);
                  // Prevent auto-save from duplicating this INSERT
                  lastSavedDataRef.current = JSON.stringify({ cards: finalData.cards.map(c => ({ ...c })), title: finalData.title });
                  captureCoverImage(inserted.id, companyData.company_id, finalData).catch((e) => console.error('Cover capture failed:', e));
                  if (jobId) completeCloudJob(jobId, inserted.id);
                }
              }
            } finally { isSavingRef.current = false; }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
      // Clear cloud job on success
      if (jobId) { setCloudJobId(null); }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar o post', variant: 'destructive' });
      if (jobId) {
        failCloudJob(jobId, err.message || 'Falha na geração local do post');
        setCloudJobId(null);
      }
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      setCloudJobId(null);
      generationInFlightRef.current = false;
    }
  };

  // ===== GENERATE (CLOUD-BASED) =====
  // Strip mention tags from topic: (@Title) → Title
  const cleanMentionsFromTopic = (raw: string) => raw.replace(/\(@([^)]+)\)/g, '$1');

  const generateContent = async () => {
    console.log('[GENERATE_FLOW] generateContent() called');
    console.log('[GENERATE_FLOW] postFormat:', postFormat, 'contentMode:', contentMode, 'cardCount:', cardCount);
    console.log('[GENERATE_FLOW] generating:', generating, 'generationInFlightRef:', generationInFlightRef.current);
    console.log('[GENERATE_FLOW] snapshot ref:', JSON.stringify({
      exists: !!generationSnapshotRef.current,
      isRealEstate: generationSnapshotRef.current?.isRealEstate,
      propertyCount: generationSnapshotRef.current?.propertyList?.length,
      photoCounts: generationSnapshotRef.current?.propertyList?.map(p => p.photos?.length),
    }));
    console.log('[GENERATE_FLOW] direct state: isRealEstateStyle:', isRealEstateStyle, 'propertyList photos:', propertyList.map(p => p.photos.length));
    console.log('[GENERATE_FLOW] refs: activeMarketplaceStyleRef.is_real_estate:', !!activeMarketplaceStyleRef.current?.is_real_estate, 'propertyListRef photos:', propertyListRef.current.map(p => p.photos.length));
    if (!topic.trim()) { sonnerToast.error('Insira um tópico para gerar'); setTransitionToGenerate(false); return; }

    // === SINGLE POST MODE ===
    if (contentMode === 'single-post') {
      console.log('[GENERATE_FLOW] Routing to generateSinglePost()');
      return generateSinglePost();
    }

    // Check credit balance before generating (only for logged-in users)
    let companyId: string | null = null;
    let userId: string | null = null;
    if (user) {
      try {
        console.log('[GENERATE_FLOW] Checking credits...');
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
          const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (cu) {
            companyId = cu.company_id;
            const { data: balance } = await supabase.from('ai_credit_balances').select('balance').eq('company_id', cu.company_id).single();
            const creditsNeeded = cardCount;
            console.log('[GENERATE_FLOW] Credits check: balance=', balance?.balance, 'needed=', creditsNeeded);
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

    if (generationInFlightRef.current) {
      console.log('[GENERATE_GUARD] Duplicate carousel trigger ignored');
      return;
    }
    generationInFlightRef.current = true;

    setGenerating(true);
    setCarouselData(null);
    setCurrentCarouselId(null);
    setTimeout(() => setTransitionToGenerate(false), 500);

    // === HYBRID: Create cloud job for fallback (if user closes browser, cloud continues) ===
    let localJobId: string | null = null;
    if (userId && companyId && !skipCloudRef.current) {
      localJobId = await createCloudJob('carousel');
      if (localJobId) setCloudJobId(localJobId);
      console.log('[GENERATE_FLOW] Cloud job created:', localJobId);
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
      // DEFAULT: ~25% of cards get faces (cover + ~25% of remaining), user can override
      const faceCardIndices = new Set<number>();
      if (hasFaceRefsForGen) {
        // When web search is active with images, only apply face to cover or last card
        if (hasWebImages && webFacePosition !== 'none') {
          if (webFacePosition === 'cover') {
            faceCardIndices.add(0);
          } else if (webFacePosition === 'last') {
            faceCardIndices.add(cardCount - 1);
          }
        } else if (!hasWebImages) {
          // Normal face distribution: ~25% of cards get faces
          const defaultFaceCount = faceCardCount != null ? faceCardCount : Math.max(1, Math.round(cardCount * 0.25));
          const effectiveFaceCount = Math.min(defaultFaceCount, cardCount);
          faceCardIndices.add(0);
          if (effectiveFaceCount >= cardCount) {
            for (let fi = 0; fi < cardCount; fi++) faceCardIndices.add(fi);
          } else {
            const remaining = effectiveFaceCount - 1;
            if (remaining > 0) {
              const middleIndices = Array.from({ length: cardCount - 1 }, (_, fi) => fi + 1);
              const step = middleIndices.length / remaining;
              for (let fi = 0; fi < remaining && fi < middleIndices.length; fi++) {
                faceCardIndices.add(middleIndices[Math.min(Math.floor(fi * step), middleIndices.length - 1)]);
              }
            }
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

      const hasManualCardTexts = manualCardTexts.some(t => (t.title || '').trim() || (t.body || '').trim());
      console.log('[GENERATE_FLOW] Calling generate-carousel edge function...');
      console.log('[GENERATE_FLOW] Body:', JSON.stringify({ action: 'generate-content', topic: cleanMentionsFromTopic(topic.trim()).substring(0, 50), cardCount, hasManualCardTexts, hasWebSearch: !!webSearchResult?.content, wizardMode }));
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
          ...(hasManualCardTexts ? { manualCardTexts } : {}),
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(wizardMode === 'extreme' && extremeAnalysis ? { productContext: `EXTREME_VISION:${JSON.stringify({ vision: extremeVision, analysis: extremeAnalysis, formValues: extremeFormValues })}` } : productContext ? { productContext } : {}),
          ...(activeMarketplaceStyleRef.current ? { marketplaceStyleConfig: activeMarketplaceStyleRef.current } : {}),
        },
      });
      console.log('[GENERATE_FLOW] generate-carousel response:', error ? 'ERROR' : 'OK', data?.success, data?.error);
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
        // Force 3 cards for continuous mode
        const panelCount = Math.min(cardCount, 3);
        const targetPanoramaAspect = (panelCount * 4) / 5;
        const minAcceptedPanoramaAspect = targetPanoramaAspect * 0.82;
        setImageGenProgress('🌄 Gerando panorama contínuo...');

        // Build a panoramic prompt with all card texts
        const cleanTopic = cleanMentionsFromTopic(webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim());
        const allCardTexts = cards.slice(0, panelCount).map((c, i) => {
          const title = c.title || c.bodyTop || '';
          const body = c.bodyBottom || c.body || '';
          return `Seção ${i + 1}: ${title}${body ? ` — ${body}` : ''}`;
        }).join('\n');

        const panoramaPrompt = [
          `IDIOMA OBRIGATÓRIO: Todo texto renderizado DEVE estar em PORTUGUÊS BRASILEIRO CORRETO, sem erros ortográficos. Revise cada palavra. NÃO copie nenhum texto, crédito, watermark, assinatura ou nome de autor/marca das imagens de referência.`,
          `COMPOSIÇÃO PANORÂMICA CONTÍNUA: Gere UMA ÚNICA imagem panorâmica ultra-larga que será dividida em ${panelCount} fatias verticais iguais, cada uma ${cardW}x${cardH}.`,
          `PROPORÇÃO TOTAL DA IMAGEM: ${panelCount * cardW}x${cardH} pixels. Isso é OBRIGATÓRIO.`,
          `CONTINUIDADE VISUAL OBRIGATÓRIA: Elementos visuais, cenários, gradientes, fotos, pessoas e texturas devem fluir de forma contínua de uma ponta a outra — sem cortes, bordas internas ou separadores visíveis entre as seções. A arte deve parecer uma composição única e ininterrupta quando visualizada lado a lado.`,
          `REGRA CRÍTICA DE TEXTO: Todo texto/tipografia DEVE estar 100% contido dentro da sua seção correspondente. NENHUMA palavra, frase ou bloco de texto pode começar em uma seção e terminar em outra. Cada fatia vertical (seção) deve ter seus textos completamente legíveis de forma independente. Apenas elementos visuais (fotos, design, cenários, gradientes, pessoas, objetos) podem fluir entre seções — TEXTO NUNCA.`,
          `TEMA: "${cleanTopic}"`,
          `CONTEÚDO TEXTUAL POR SEÇÃO (cada texto DEVE ficar inteiramente dentro da sua seção, sem ultrapassar as bordas verticais de corte):`,
          allCardTexts,
          `ESTILO: Design editorial premium, tipografia integrada à composição visual, cores harmoniosas que fluem ao longo de toda a panorâmica.`,
          `MARGENS DE SEGURANÇA: Todo texto e elementos tipográficos devem respeitar uma margem interna de pelo menos 12% nas bordas esquerda e direita de CADA SEÇÃO (considerando os pontos de corte em ${Array.from({length: panelCount - 1}, (_, i) => `${((i + 1) / panelCount * 100).toFixed(0)}%`).join(', ')} da largura total). Texto também deve respeitar 8% de margem no topo e base. NENHUM texto deve ficar próximo dos pontos de corte entre seções.`,
          `PROIBIDO: NÃO crie divisões, separadores, linhas verticais ou bordas entre seções. NÃO copie nomes de marcas das referências. A imagem deve ser totalmente contínua. NÃO coloque texto colado nas bordas. NÃO permita que texto cruze de uma seção para outra.`,
          brandName ? `MARCA: "${brandName}" discretamente posicionada.` : '',
        ].filter(Boolean).join('\n');

        const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
        const marketplaceRefUrls: string[] = [];
        if (activeMarketplaceStyleRef.current?._previewImages?.length) {
          const origin = window.location.origin;
          marketplaceRefUrls.push(...(activeMarketplaceStyleRef.current._previewImages as string[]).map((p: string) => p.startsWith('http') ? p : `${origin}${p}`));
        }
        const allStyleRefs = [...styleRefUrls, ...marketplaceRefUrls];
        const allFaceRefUrls = referenceImages.filter(r => r.category === 'face').map(r => r.url);
        const styleNeg = activeMarketplaceStyleRef.current?.imageGeneration?.negative_prompt || '';

        // Use exact aspect ratio: 12:5 for 3 cards (3 * 4:5), 8:5 for 2 cards
        const panoramaAspectRatio = panelCount === 2 ? '8:5' : '12:5';
        
        let panoramaUrl: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            setImageGenProgress(`🌄 Gerando panorama contínuo... (tentativa ${attempt + 1})`);
            const styleImageGen = activeMarketplaceStyleRef.current?.imageGeneration;
            const resolvedModel = imageSettings.model === 'auto' ? 'nano-banana' : imageSettings.model;
            
            const { data: imgData, error: imgErr } = await supabase.functions.invoke('generate-carousel-image', {
              body: {
                // PANORAMIC: do NOT use buildImagePrompt() — it adds portrait-specific settings that conflict
                prompt: panoramaPrompt,
                imageSize: panoramaAspectRatio,
                topic: cleanTopic,
                faceReferenceUrls: allFaceRefUrls.length > 0 ? allFaceRefUrls : undefined,
                styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
                imageModel: resolvedModel === 'higgsfield' ? 'gemini' : resolvedModel,
                negativePrompt: [styleNeg, 'no visible cuts, no separators, no vertical lines dividing sections, no borders between panels', 'portrait format, vertical format, 1080x1350'].filter(Boolean).join(', '),
                fidelity: imageSettings.fidelity,
                // Pass stylePrompt so edge function can extract visual DNA (it will strip portrait dimensions)
                ...(styleImageGen?.prompt_style ? { stylePrompt: styleImageGen.prompt_style } : {}),
                panoramic: true,
                panoramicCardCount: panelCount,
              },
            });
            if (imgErr) throw imgErr;
            if (imgData?.success && imgData?.imageUrl) {
              const candidateUrl = imgData.imageUrl as string;
              const candidateAspect = await new Promise<number>((resolve, reject) => {
                const probe = document.createElement('img');
                probe.crossOrigin = 'anonymous';
                probe.onload = () => resolve(probe.width / Math.max(probe.height, 1));
                probe.onerror = () => reject(new Error('Failed to load panorama candidate'));
                probe.src = candidateUrl;
              });

              if (candidateAspect < minAcceptedPanoramaAspect) {
                console.warn(`Panorama candidate rejected (aspect ${candidateAspect.toFixed(2)} < ${minAcceptedPanoramaAspect.toFixed(2)})`);
                continue;
              }

              panoramaUrl = candidateUrl;
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

            const sliceWidth = Math.floor(img.width / panelCount);
            const sliceHeight = img.height;

            for (let i = 0; i < panelCount; i++) {
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
                  generatedPrompt: `[Panorama Contínuo - Fatia ${i + 1}/${panelCount}]\n${panoramaPrompt}`,
                };
              }
            }
            
            toast({ title: '🌄 Panorama contínuo gerado!', description: `${panelCount} slides com arte contínua` });
          } catch (sliceErr) {
            console.error('Panorama slicing failed:', sliceErr);
            toast({ title: 'Erro ao fatiar panorama', variant: 'destructive' });
          }
        } else {
          toast({ title: 'Falha ao gerar carrossel contínuo', description: 'A IA não retornou panorama largo suficiente. Tente regenerar novamente no modo contínuo.', variant: 'destructive' });
          setGeneratingAllImages(false);
          setImageGenProgress('');
          if (localJobId) {
            failCloudJob(localJobId, 'Falha ao gerar panorama contínuo válido');
            setCloudJobId(null);
          }
          setGenerating(false);
          return;
        }

        // If panorama succeeded, skip normal image generation
        if (panoramaUrl && updatedCards.every(c => c.imageUrl)) {
          const finalData = { ...data.data, cards: updatedCards };
          setCarouselData(finalData);
          finishGeneration();

          // Auto-save
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
              if (companyData) {
                try {
                  const creditAmount = calculateCreditCost({ cardCount: finalData.cards.length, wizardMode, hasFaceRef: facePersons.some(p => p.photos.length > 0) });
                  await supabase.rpc('consume_ai_credits', {
                    p_company_id: companyData.company_id, p_agent_id: null,
                    p_amount: creditAmount,
                    p_description: `Carrossel Contínuo (${wizardMode}): ${finalData.title || topic} (${finalData.cards.length} cards) — ${creditAmount} créditos`,
                  });
                } catch { /* ignore */ }
                const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader, continuousMode: true };
                isSavingRef.current = true;
                try {
                  if (currentCarouselIdRef.current) {
                    await supabase.from('generated_carousels').update({ title: finalData.title || topic, topic, carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, generation_config: buildGenerationConfig() } as any).eq('id', currentCarouselIdRef.current);
                    setTimeout(() => captureCoverImage(currentCarouselIdRef.current!, companyData.company_id, finalData).catch(() => {}), 2000);
                    if (localJobId) completeCloudJob(localJobId, currentCarouselIdRef.current);
                  } else {
                    const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyleRef.current?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
                    if (inserted) {
                      setCurrentCarouselId(inserted.id);
                      lastSavedDataRef.current = JSON.stringify({ cards: finalData.cards.map(c => ({ ...c })), title: finalData.title });
                      setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
                      if (localJobId) completeCloudJob(localJobId, inserted.id);
                    }
                  }
                } finally { isSavingRef.current = false; }
              }
            }
          } catch (saveErr) { console.error('Auto-save error:', saveErr); }
          if (localJobId) { setCloudJobId(null); }
          finishGeneration();
          return;
        }
      }

      // ========== REAL ESTATE: Pure Canvas compositing (no AI overlay) ==========
      // DEFINITIVE FIX: Triple-source detection — snapshot, ref, AND direct state
      const snapshot = generationSnapshotRef.current;
      const snapshotPropertyList = snapshot?.propertyList && snapshot.propertyList.length > 0 
        ? snapshot.propertyList 
        : (propertyListRef.current && propertyListRef.current.length > 0 ? propertyListRef.current : propertyList);
      
      // Detect real estate by ANY of these conditions:
      // 1. Snapshot says it's real estate
      // 2. Current style ref says it's real estate  
      // 3. Closure state says it's real estate
      // 4. FAILSAFE: Property list has photos (user uploaded them, so they expect them to be used!)
      const hasPropertyPhotosAnywhere = snapshotPropertyList.some(p => p.photos && p.photos.length > 0);
      const snapshotIsRealEstate = 
        snapshot?.isRealEstate || 
        isRealEstateStyle || 
        !!activeMarketplaceStyleRef.current?.is_real_estate ||
        hasPropertyPhotosAnywhere; // FAILSAFE: if photos exist, assume real estate mode
      
      const snapshotRealEstateMode = snapshot?.realEstateMode || realEstateMode || 'single';
      
      console.log('[REAL_ESTATE_DEBUG] ===== DETECTION =====');
      console.log('[REAL_ESTATE_DEBUG] snapshot?.isRealEstate:', snapshot?.isRealEstate);
      console.log('[REAL_ESTATE_DEBUG] isRealEstateStyle (closure):', isRealEstateStyle);
      console.log('[REAL_ESTATE_DEBUG] ref is_real_estate:', !!activeMarketplaceStyleRef.current?.is_real_estate);
      console.log('[REAL_ESTATE_DEBUG] hasPropertyPhotosAnywhere:', hasPropertyPhotosAnywhere);
      console.log('[REAL_ESTATE_DEBUG] FINAL snapshotIsRealEstate:', snapshotIsRealEstate);
      console.log('[REAL_ESTATE_DEBUG] snapshotPropertyList length:', snapshotPropertyList.length);
      console.log('[REAL_ESTATE_DEBUG] photos per property:', snapshotPropertyList.map(p => ({ photos: p.photos?.length || 0, firstPhotoUrl: p.photos?.[0]?.url?.substring(0, 60) || 'NONE' })));
      
      // Real estate is now handled via the normal AI generation path + blend post-processing
      // No early return — flow continues to normal generation below
      
      // ========== NORMAL (NON-CONTINUOUS) IMAGE GENERATION ==========
      const webImagePool = selectedImages.filter(isValidImageUrl).slice(0, 3);
      const allFaceRefUrls = [...referenceImages.filter(r => r.category === 'face').map(r => r.url), ...getExtremeFormPhotoRefs().filter(r => r.category === 'face').map(r => r.url)];
      const activeFacePersonsForGen = facePersons.filter(p => p.photos.length > 0);
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const cleanTopic = cleanMentionsFromTopic(webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim());

      // === REAL ESTATE: Convert property photos from blob URLs to base64 data URLs ===
      const useRealEstateBlend = snapshotIsRealEstate && snapshotPropertyList.some(p => p.photos && p.photos.length > 0);
      let propertyPhotoDataUrls: string[][] = [];
      console.log('[BLEND_DETECT] useRealEstateBlend:', useRealEstateBlend, 
        'snapshotIsRealEstate:', snapshotIsRealEstate,
        'propertyCount:', snapshotPropertyList.length,
        'photosPerProp:', snapshotPropertyList.map(p => p.photos?.length || 0));
      if (useRealEstateBlend) {
        console.log('[BLEND] ✅ Real estate blend mode ACTIVE — photos will be composited after AI generation');
        setImageGenProgress('📸 Processando fotos dos imóveis...');
        propertyPhotoDataUrls = await Promise.all(
          snapshotPropertyList.map(async (prop) => {
            const dataUrls: string[] = [];
            for (const photo of prop.photos) {
              try {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                dataUrls.push(dataUrl);
              } catch (err) {
                console.warn('Failed to convert property photo to base64:', err);
              }
            }
            return dataUrls;
          })
        );
      }

      // === FONT REFERENCE: Convert Envato preview to base64 for carousel AI ===
      let carouselFontBase64: string | undefined;
      let carouselFontName: string | undefined;
      if (extremeSelectedFont?.previewUrl) {
        try {
          setImageGenProgress('🔤 Processando referência de fonte...');
          const fontResp = await fetch(extremeSelectedFont.previewUrl);
          if (fontResp.ok) {
            const blob = await fontResp.blob();
            if (!blob.type.includes('text/html')) {
              carouselFontBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              carouselFontName = extremeSelectedFont.name;
              console.log('[CAROUSEL] Font reference converted to base64:', carouselFontName);
            }
          }
        } catch (e) { console.warn('[CAROUSEL] Font base64 conversion failed:', e); }
      }

      let webImageIndex = 0;
      const imageFactories: { index: number; factory: () => Promise<string | null>; prompt: string }[] = [];
      let totalImages = 0;
      let realImagesUsed = 0;
      let aiImagesQueued = 0;
      const usedImageUrls = new Set<string>();

      const styleNeg = activeMarketplaceStyleRef.current?.imageGeneration?.negative_prompt || '';
      const baseNegativePrompt = styleNeg || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
      const isFullBleedStyle = !!activeMarketplaceStyleRef.current?.imageGeneration?.prompt_style;

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
          
          const isFullBleedMarketplace = !!activeMarketplaceStyleRef.current?.imageGeneration?.prompt_style;
          if (isFullBleedMarketplace) {
            const isCover = card.type === 'cover' || i === 0;
            const isCta = card.type === 'cta' || i === updatedCards.length - 1;
            const cardTextParts: string[] = [];
            cardTextParts.push(`IDIOMA OBRIGATÓRIO: Todo texto renderizado na imagem DEVE estar em PORTUGUÊS BRASILEIRO CORRETO e sem erros ortográficos. NÃO use espanhol (ex: "descubra" não "descbura", "segunda" não "secunda", "maior" não "magior", "tornou" não "tornão", "rentável" não "rentábel", "história" não "históría"). Revise CADA palavra antes de renderizar. NÃO use inglês.`);
            cardTextParts.push(`TEMA DO CARROSSEL: "${cleanTopic}"`);
            const styleName = activeMarketplaceStyleRef.current?.name || '';
            cardTextParts.push(`PROIBIDO COPIAR DAS REFERÊNCIAS: NÃO copie NENHUM texto, nome de marca, crédito de autor, watermark, assinatura ou rodapé das imagens de referência (ex: "marketing para...", "by ...", "@...", nomes de pessoas ou empresas). Use APENAS o estilo visual (cores, tipografia, layout, elementos decorativos). NÃO COPIE OS ROSTOS das referências. NUNCA gere grades, mosaicos ou grids. NUNCA use "@" antes de nomes. Todo texto na imagem deve vir EXCLUSIVAMENTE do conteúdo fornecido pelo usuário abaixo.`);
            cardTextParts.push(`PROIBIDO NOME DO ESTILO: NUNCA renderize o nome do estilo/template ("${styleName}") como texto na imagem. Se o nome do estilo aparecer nas referências, NÃO o copie. Use SOMENTE os textos fornecidos pelo usuário abaixo.`);
            cardTextParts.push(`CRIATIVIDADE POR CARD: Cada card deve ter uma composição visual ÚNICA e CRIATIVA. Varie ângulos, elementos decorativos, ilustrações e cenários entre os cards. Gere imagens, ícones e elementos visuais RELEVANTES ao assunto "${cleanTopic}" — NÃO repita a mesma composição. A IA deve criar cenários contextuais ricos e diversificados para cada slide.`);
            cardTextParts.push(`SEM BORDAS: A imagem deve ser full bleed, sem barras ou bordas no topo ou na base.`);
            cardTextParts.push(`MARGENS DE SEGURANÇA: Todo texto e elementos tipográficos devem respeitar uma margem interna de pelo menos 8% em cada borda (topo, base, esquerda, direita). NENHUM texto deve encostar ou ficar próximo das bordas da imagem. Mantenha espaçamento generoso.`);
            
            if (logoUrl && brandName) {
              const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
              const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
              cardTextParts.push(`LOGOMARCA: Inclua a logomarca/nome "${brandName}" no ${posLabel} da imagem, sobrepondo o conteúdo com leve destaque (fundo semitransparente ou sombra sutil). A logo deve ser pequena e elegante, sem dominar o layout.`);
            } else if (brandName) {
              const posMap: Record<string, string> = { 'top-left': 'canto superior esquerdo', 'top-center': 'centro superior', 'top-right': 'canto superior direito', 'bottom-left': 'canto inferior esquerdo', 'bottom-center': 'centro inferior', 'bottom-right': 'canto inferior direito', 'middle-left': 'centro esquerdo', 'middle-right': 'centro direito' };
              const posLabel = posMap[logoPosition] || 'canto superior esquerdo';
              cardTextParts.push(`MARCA: Inclua o nome "${brandName}" como texto pequeno no ${posLabel} da imagem, com estilo sutil e elegante.`);
            }
            
            cardTextParts.push(`REGRA CRÍTICA DE TEXTO: Copie os textos abaixo LETRA POR LETRA, EXATAMENTE como escritos. NÃO invente, NÃO altere, NÃO troque letras, NÃO adicione acentos incorretos. Se o texto diz "os", escreva "os" (NÃO "on"). Se diz "financeiros", escreva "financeiros" (NÃO "financierios"). Se diz "Descubra", escreva "Descubra" (NÃO "Desctura"). Cada caractere deve ser idêntico ao fornecido.`);
            
            if (isCover) {
              cardTextParts.push(`ESTE É O CARD DE CAPA (Card 1 de ${updatedCards.length}).`);
              cardTextParts.push(`TÍTULO EXATO PARA RENDERIZAR (copie caractere por caractere): "${card.title || cleanTopic}"`);
              if (card.subtitle) cardTextParts.push(`SUBTÍTULO EXATO (copie caractere por caractere): "${card.subtitle}"`);
              cardTextParts.push(`Deve ser o card mais impactante, estilo capa de revista, com tipografia grande.`);
            } else if (isCta) {
              cardTextParts.push(`ESTE É O CARD FINAL DE CTA (Card ${i + 1} de ${updatedCards.length}).`);
              if (card.title) cardTextParts.push(`TÍTULO EXATO DO CTA (copie caractere por caractere): "${card.title}"`);
              if (card.body) cardTextParts.push(`TEXTO EXATO DO CTA (copie caractere por caractere): "${card.body}"`);
              cardTextParts.push(`Card de encerramento com call-to-action. NÃO é uma capa/hero.`);
            } else {
              cardTextParts.push(`CARD DE CONTEÚDO ${i + 1} de ${updatedCards.length} (NÃO é capa, NÃO é hero).`);
              const bodyText = (card.bodyTop || card.body || '').replace(/\*\*/g, '');
              if (bodyText) cardTextParts.push(`TEXTO PRINCIPAL EXATO PARA RENDERIZAR (copie caractere por caractere, sem alterar NENHUMA letra): "${bodyText}"`);
              if (card.bodyBottom) cardTextParts.push(`TEXTO SECUNDÁRIO EXATO (copie caractere por caractere): "${card.bodyBottom}"`);
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
          // === EXTREME MODE: Inject uploaded photos as product/style/face refs ===
          const carouselExtremeRefs = getExtremeFormPhotoRefs();
          const carouselExtremeFaceRefs = carouselExtremeRefs.filter(r => r.category === 'face').map(r => r.url);
          const carouselExtremeProductRefs = carouselExtremeRefs.filter(r => r.category === 'product').map(r => r.url);
          const carouselExtremeStyleRefs = carouselExtremeRefs.filter(r => r.category === 'style').map(r => r.url);
          const allStyleRefs = [...styleRefUrls, ...carouselExtremeStyleRefs];
          
          const marketplaceRefUrls: string[] = [];
          if (activeMarketplaceStyleRef.current?._previewImages?.length) {
            const origin = window.location.origin;
            const allPreviews = (activeMarketplaceStyleRef.current._previewImages as string[])
              .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
            marketplaceRefUrls.push(...allPreviews);
          }
          
          // Add Extreme vision context to each card's prompt
          const carouselExtremeCtx = buildExtremePromptContext();
          let capturedPrompt = buildImagePrompt(imgPrompt + (carouselExtremeCtx || '')) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');
          
          if (!hasFaceRefsForGen && peopleMode !== 'none') {
            const shouldHaveRandomPerson = randomPeopleCardIndices.has(i);
            if (!shouldHaveRandomPerson) {
              capturedPrompt += '\n\nCRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. NO HUMANS.';
            }
          } else if (!hasFaceRefsForGen && peopleMode === 'none') {
            // Will be overridden below if card has a web photo with people
            capturedPrompt += '\n\n__NO_HUMANS_PLACEHOLDER__';
          } else if (hasFaceRefsForGen && !faceCardIndices.has(i)) {
            // Card has face refs available but this specific card should NOT show a face
            capturedPrompt += '\n\nCRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. NO HUMANS. Focus on the topic, objects, scenery, or editorial design elements only.';
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
          
          // Real estate: get property photo for this card
          let capturedProductRefs: string[] | undefined;
          if (useRealEstateBlend && propertyPhotoDataUrls.length > 0) {
            if (realEstateMode === 'multiple' && snapshotPropertyList.length > 1) {
              // Multiple properties: each card gets the corresponding property's photos
              const propIdx = i % snapshotPropertyList.length;
              const propPhotos = propertyPhotoDataUrls[propIdx] || [];
              if (propPhotos.length > 0) capturedProductRefs = propPhotos;
            } else {
              // Single property: distribute photos across cards (one per card, cycling)
              const allSinglePhotos = propertyPhotoDataUrls[0] || [];
              if (allSinglePhotos.length > 0) {
                const photoIdx = i % allSinglePhotos.length;
                capturedProductRefs = [allSinglePhotos[photoIdx]];
              }
            }
          } else {
            const mergedProductUrls = [...productRefUrls, ...carouselExtremeProductRefs];
            capturedProductRefs = mergedProductUrls.length > 0 ? [...mergedProductUrls] : undefined;
            
            // === AUTO-ASSIGN WEB SEARCH REAL PHOTO ===
            // Only use the card-specific assignment generated from the roteiro text
            if (!capturedProductRefs && !skipWebSearch && cardPhotoAssignments[i]) {
              capturedProductRefs = [cardPhotoAssignments[i]];
              console.log(`[WEB_PHOTO] Card ${i}: using card-specific assignment:`, cardPhotoAssignments[i]?.substring(0, 80));
            }
          }
          
           const isFullBleedMkt = !!activeMarketplaceStyleRef.current?.imageGeneration?.prompt_style;
           const capturedNegative = isFullBleedMkt 
              ? [activeMarketplaceStyleRef.current?.imageGeneration?.negative_prompt || '', capturedFaceRefs && capturedFaceRefs.length > 0 ? '' : 'Do NOT copy the exact faces or identities of people from the reference images. Use different people with varied appearances. Only copy the visual design style, layout, typography and color scheme.'].filter(Boolean).join(', ')
              : finalNegative;
          
          // Real estate: instruct AI to use BLACK background (we blend real photo later)
          let cardPrompt = capturedPrompt;
          if (useRealEstateBlend && propertyPhotoDataUrls.length > 0 && propertyPhotoDataUrls.some(p => p.length > 0)) {
            cardPrompt += `\n\n🏠 INSTRUÇÃO CRÍTICA — CARD IMOBILIÁRIO:
Use um FUNDO SÓLIDO PRETO (#000000) puro como base da imagem. NÃO gere nenhuma foto de casa, prédio, imóvel ou cenário de fundo.
O fundo DEVE ser completamente preto/escuro.
Sobreponha no fundo preto: textos editorials, badges de preço, ícones de especificações (quartos, vagas, m²), 
elementos gráficos decorativos do estilo visual, gradientes sutis e tipografia impactante.
A composição final deve ser como um overlay/HUD elegante sobre fundo escuro.
PROIBIDO: qualquer imagem de imóvel, casa, apartamento, prédio no fundo. APENAS fundo preto com overlay gráfico.`;
            // Don't send property photos as reference - we blend them later
            capturedProductRefs = undefined;
          }

          // === WEB PHOTO FIDELITY: instruct AI to incorporate real photo ===
          const hasWebPhoto = !skipWebSearch && webSearchResult?.images?.length && capturedProductRefs?.length === 1
            && capturedProductRefs[0].startsWith('http') && !useRealEstateBlend && productImages.length === 0;
          if (hasWebPhoto) {
            // Remove the NO_HUMANS placeholder — web photos often contain people that must be preserved
            cardPrompt = cardPrompt.replace('\n\n__NO_HUMANS_PLACEHOLDER__', '');
            const cardDesc = updatedCards[i]?.title || updatedCards[i]?.bodyTop || cleanTopic;
            cardPrompt += `\n\n📸 INSTRUÇÃO CRÍTICA — FOTO REAL (PRESERVAÇÃO TOTAL):
A imagem de referência enviada é uma FOTO REAL buscada especificamente para este card sobre "${cardDesc}". 
REGRAS DE PRESERVAÇÃO ABSOLUTA:
1. USE a foto real como FUNDO/BASE principal do card — ela deve ocupar a maior parte da composição.
2. NÃO RECRIE, NÃO REDESENHE e NÃO REINTERPRETE os rostos ou pessoas da foto. Mantenha-os EXATAMENTE como são na foto original.
3. NÃO substitua a foto por uma ilustração, renderização ou versão "melhorada". A foto deve permanecer FOTOGRÁFICA e INALTERADA.
4. Sobreponha APENAS textos editoriais, elementos gráficos e tipografia POR CIMA da foto real, como um overlay/HUD.
5. Se a foto contém pessoas, elas devem aparecer EXATAMENTE como na foto original — mesma pose, mesma aparência, mesmas feições.
6. A composição final deve ser: FOTO REAL INTACTA de fundo + overlay editorial com textos e gráficos do estilo visual.
7. Trate a foto como se fosse um print/screenshot que DEVE ser preservado pixel a pixel como base da composição.`;
          } else {
            // No web photo — apply the NO HUMANS instruction if placeholder exists
            cardPrompt = cardPrompt.replace('\n\n__NO_HUMANS_PLACEHOLDER__', '\n\nCRITICAL: Do NOT include any people, faces, portraits, or human figures in this image. The image must contain ONLY visual elements, objects, graphics, text overlays, and abstract/decorative elements. NO HUMANS whatsoever.');
          }

          // === WEB SEARCH + FACE: create professional portrait matching post theme ===
          if (hasWebImages && hasFaceRefsForGen && faceCardIndices.has(i) && capturedFaceRefs?.length) {
            const personGender = activeFacePersonsForGen[0]?.gender || faceGender || 'auto';
            const genderLabel = personGender === 'male' ? 'masculino' : personGender === 'female' ? 'feminino' : '';
            // For face cards in web mode: don't use web photo, create a portrait instead
            capturedProductRefs = undefined;
            cardPrompt += `\n\n👤 INSTRUÇÃO CRÍTICA — RETRATO COM ROSTO:
Este card deve apresentar a PESSOA da referência facial. Crie uma foto profissional ${genderLabel ? `de corpo ${genderLabel}` : ''} 
com o ROSTO da referência em um corpo completo gerado, vestido de forma elegante e adequada ao tema "${cleanTopic}".
A composição deve ser um retrato editorial premium que combine com a estética do post.
NÃO use foto da web neste card — crie uma foto original com o rosto fornecido.
Mantenha total fidelidade facial — o rosto deve ser idêntico à referência.`;
          }

          imageFactories.push({
            index: i,
            prompt: cardPrompt,
            factory: () => generateImage({
              prompt: cardPrompt,
              faceReferenceUrls: capturedFaceRefs,
              styleReferenceUrls: capturedStyleRefs,
              referenceImageUrls: capturedProductRefs,
              negativePrompt: capturedNegative,
              facePersonsMetadata: cardFacePersonsMeta,
              fontReferenceImage: carouselFontBase64,
              fontReferenceName: carouselFontName,
            }).catch(err => { console.error('Image gen error for card', i, err); return null; }),
          });
        }
      }

      if (imageFactories.length > 0) {
        let completed = 0;
        const totalAi = imageFactories.length;
        setImageGenProgress(`🎨 0/${totalAi} imagens geradas...`);

        // When using marketplace styles with heavy refs, go fully sequential to avoid 429
        const hasHeavyRefs = !!activeMarketplaceStyleRef.current || styleRefUrls.length > 0;
        const effectiveBatchSize = hasHeavyRefs ? 1 : 2;
        const batchDelay = hasHeavyRefs ? 4000 : 1500;
        
        const generateBatch = async (factories: typeof imageFactories, batchSize: number) => {
          for (let i = 0; i < factories.length; i += batchSize) {
            const batch = factories.slice(i, i + batchSize);
            if (i > 0) await new Promise(r => setTimeout(r, batchDelay));
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
          await generateBatch(middleFactories, effectiveBatchSize);
        }

        if (lastFactory) {
          await new Promise(r => setTimeout(r, batchDelay));
          const lastUrl = await lastFactory.factory();
          completed++;
          setImageGenProgress(`🎨 ${completed}/${totalAi} imagens geradas...`);
          if (lastUrl) updatedCards[lastFactory.index] = { ...updatedCards[lastFactory.index], imageUrl: lastUrl, isAiImage: true, generatedPrompt: lastFactory.prompt };
        }

        const failedFactories = imageFactories.filter(f => !updatedCards[f.index]?.imageUrl);
        if (failedFactories.length > 0) {
          setImageGenProgress(`🔄 Regenerando ${failedFactories.length} imagens que falharam...`);
          for (const target of failedFactories) {
            await new Promise(r => setTimeout(r, 5000));
            try {
              const retryUrl = await target.factory();
              if (retryUrl) updatedCards[target.index] = { ...updatedCards[target.index], imageUrl: retryUrl, isAiImage: true, generatedPrompt: target.prompt };
            } catch { /* next */ }
          }
        }

        const stillFailed = imageFactories.filter(f => !updatedCards[f.index]?.imageUrl);
        if (stillFailed.length > 0) {
          for (const target of stillFailed) {
            await new Promise(r => setTimeout(r, 6000));
            try {
              const retryUrl = await target.factory();
              if (retryUrl) updatedCards[target.index] = { ...updatedCards[target.index], imageUrl: retryUrl, isAiImage: true, generatedPrompt: target.prompt };
            } catch { /* accept */ }
          }
        }
      }

      // ========== REAL ESTATE POST-PROCESSING: Blend real photo + AI overlay ==========
      if (useRealEstateBlend && propertyPhotoDataUrls.length > 0 && propertyPhotoDataUrls.some(p => p.length > 0)) {
        setImageGenProgress('🏠 Mesclando fotos reais com overlay IA...');
        console.log('[BLEND] Starting real estate photo blend for', updatedCards.length, 'cards');
        
        const blendPhotoWithOverlay = async (photoDataUrl: string, aiImageUrl: string, focalPoint: string = 'center', cropOffsetY?: number): Promise<string> => {
          const W = 1080, H = 1350;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;
          
          const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = document.createElement('img') as HTMLImageElement;
            if (src.startsWith('http')) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => { console.error('[BLEND] Image load error:', src.substring(0, 80), e); reject(e); };
            img.src = src;
          });
          
          // === STEP 1: Draw REAL PHOTO as full background (cover fit with cropOffsetY or focalPoint) ===
          const photoImg = await loadImg(photoDataUrl);
          console.log('[BLEND] Photo loaded:', photoImg.width, 'x', photoImg.height, 'focal:', focalPoint, 'cropOffsetY:', cropOffsetY);
          const pRatio = photoImg.width / photoImg.height;
          const cRatio = W / H;
          let sw = photoImg.width, sh = photoImg.height, sx = 0, sy = 0;
          if (pRatio > cRatio) {
            sw = photoImg.height * cRatio; sx = (photoImg.width - sw) / 2;
          } else {
            sh = photoImg.width / cRatio;
            const maxSy = photoImg.height - sh;
            if (cropOffsetY !== undefined) {
              sy = cropOffsetY * maxSy;
            } else if (focalPoint === 'top') sy = 0;
            else if (focalPoint === 'bottom') sy = maxSy;
            else sy = maxSy / 2;
          }
          ctx.drawImage(photoImg, sx, sy, sw, sh, 0, 0, W, H);
          
          // === STEP 2: Add gradient overlay (transparent top → dark bottom) for text readability ===
          const gradient = ctx.createLinearGradient(0, H * 0.35, 0, H);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(0.4, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(0.7, 'rgba(0,0,0,0.65)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, W, H);
          
          // === STEP 3: Draw BOTTOM portion of AI image (text/specs area) ===
          // Overlay FULL AI image with screen blend (black = transparent, graphics show through)
          const aiImg = await loadImg(aiImageUrl);
          console.log('[BLEND] AI image loaded:', aiImg.width, 'x', aiImg.height);
          ctx.globalCompositeOperation = 'screen';
          ctx.drawImage(aiImg, 0, 0, aiImg.width, aiImg.height, 0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
          
          // === STEP 4: Draw logo ===
          if (logoUrl) {
            try {
              const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
                const r = await fetch(logoUrl); const b = await r.blob();
                return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
              })();
              const logoImg = await loadImg(logoB64);
              const maxLW = 180, maxLH = 80;
              const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
              const lw = logoImg.width * ls, lh = logoImg.height * ls;
              const pad = 50;
              let lx = pad, ly = pad;
              const lp = logoPosition || 'top-left';
              if (lp.includes('center')) lx = (W - lw) / 2;
              if (lp.includes('right')) lx = W - lw - pad;
              if (lp.includes('middle')) ly = (H - lh) / 2;
              if (lp.includes('bottom')) ly = H - lh - pad;
              ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
              ctx.drawImage(logoImg, lx, ly, lw, lh);
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
            } catch (e) { console.warn('[BLEND] Logo draw failed:', e); }
          }
          
          console.log('[BLEND] Composite complete');
          return canvas.toDataURL('image/jpeg', 0.92);
        };
        
        for (let i = 0; i < updatedCards.length; i++) {
          const aiImageUrl = updatedCards[i]?.imageUrl;
          if (!aiImageUrl) continue;
          
          // Get the corresponding property photo + focal point
          let photoUrl = '';
          let focalPoint = 'center';
          let cropOffset: number | undefined;
          if (realEstateMode === 'multiple' && propertyPhotoDataUrls.length > 1) {
            const propIdx = i % propertyPhotoDataUrls.length;
            const propPhotos = propertyPhotoDataUrls[propIdx] || [];
            photoUrl = propPhotos[i % Math.max(propPhotos.length, 1)] || propPhotos[0] || '';
            const propData = snapshotPropertyList[propIdx];
            const photoIdx = i % Math.max(propData?.photos?.length || 1, 1);
            focalPoint = propData?.photos?.[photoIdx]?.focalPoint || 'center';
            cropOffset = propData?.photos?.[photoIdx]?.cropOffsetY;
          } else {
            const allPhotos = propertyPhotoDataUrls[0] || [];
            photoUrl = allPhotos[i % Math.max(allPhotos.length, 1)] || allPhotos[0] || '';
            const propData = snapshotPropertyList[0];
            const photoIdx = i % Math.max(propData?.photos?.length || 1, 1);
            focalPoint = propData?.photos?.[photoIdx]?.focalPoint || 'center';
            cropOffset = propData?.photos?.[photoIdx]?.cropOffsetY;
          }
          
          if (!photoUrl) {
            console.warn('[BLEND] No photo for card', i, '— skipping blend');
            continue;
          }
          
          try {
            setImageGenProgress(`🏠 Mesclando foto ${i + 1}/${updatedCards.length}...`);
            const blended = await blendPhotoWithOverlay(photoUrl, aiImageUrl, focalPoint, cropOffset);
            updatedCards[i] = { ...updatedCards[i], imageUrl: blended };
            console.log('[BLEND] Card', i, 'blended successfully');
          } catch (err) {
            console.error('[BLEND] Failed for card', i, err);
            // Keep the AI image as fallback
          }
        }
      }

      // === NON-REAL-ESTATE: Programmatic logo overlay for ALL carousel cards ===
      if (!useRealEstateBlend && logoUrl && updatedCards.length > 0) {
        console.log('[LOGO_OVERLAY] Adding logo to', updatedCards.length, 'carousel cards...');
        const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
          const img = document.createElement('img') as HTMLImageElement;
          if (src.startsWith('http')) img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
        try {
          const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
            const r = await fetch(logoUrl); const b = await r.blob();
            return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
          })();
          const logoImg = await loadImg(logoB64);
          const W = 1080, H = 1350;
          const maxLW = 180, maxLH = 80;
          const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
          const lw = logoImg.width * ls, lh = logoImg.height * ls;
          const pad = 50;
          const lp = logoPosition || 'top-left';

          for (let i = 0; i < updatedCards.length; i++) {
            const cardImgUrl = updatedCards[i]?.imageUrl;
            if (!cardImgUrl) continue;
            try {
              const canvas = document.createElement('canvas');
              canvas.width = W; canvas.height = H;
              const ctx = canvas.getContext('2d')!;
              const baseImg = await loadImg(cardImgUrl);
              ctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height, 0, 0, W, H);
              let lx = pad, ly = pad;
              if (lp.includes('center')) lx = (W - lw) / 2;
              if (lp.includes('right')) lx = W - lw - pad;
              if (lp.includes('middle')) ly = (H - lh) / 2;
              if (lp.includes('bottom')) ly = H - lh - pad;
              ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
              ctx.drawImage(logoImg, lx, ly, lw, lh);
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
              updatedCards[i] = { ...updatedCards[i], imageUrl: canvas.toDataURL('image/jpeg', 0.92) };
            } catch (e) { console.warn('[LOGO_OVERLAY] Card', i, 'failed:', e); }
          }
          console.log('[LOGO_OVERLAY] ✅ Logo applied to carousel cards');
        } catch (logoErr) {
          console.warn('[LOGO_OVERLAY] Logo load failed:', logoErr);
        }
      }

      const finalData = { ...data.data, cards: updatedCards };
      setCarouselData(finalData);
      finishGeneration();
      toast({ title: 'Carrossel completo!', description: `${cards.length} cards com ${totalImages} imagens gerados` });

      // Auto-save for guest (no cloud job)
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try {
              const creditAmount = calculateCreditCost({ cardCount: finalData.cards.length, wizardMode, hasFaceRef: facePersons.some(p => p.photos.length > 0) });
              await supabase.rpc('consume_ai_credits', {
                p_company_id: companyData.company_id,
                p_agent_id: null,
                p_amount: creditAmount,
                p_description: `Carrossel (${wizardMode}): ${finalData.title || topic} (${finalData.cards.length} cards) — ${creditAmount} créditos`,
              });
            } catch { /* ignore */ }

            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
            isSavingRef.current = true;
            try {
              if (currentCarouselIdRef.current) {
                await supabase.from('generated_carousels').update({ title: finalData.title || topic, topic, carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, generation_config: buildGenerationConfig() } as any).eq('id', currentCarouselIdRef.current);
                setTimeout(() => captureCoverImage(currentCarouselIdRef.current!, companyData.company_id, finalData).catch(() => {}), 2000);
                if (localJobId) completeCloudJob(localJobId, currentCarouselIdRef.current);
              } else {
                const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyleRef.current?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
                if (inserted) {
                  setCurrentCarouselId(inserted.id);
                  lastSavedDataRef.current = JSON.stringify({ cards: finalData.cards.map(c => ({ ...c })), title: finalData.title });
                  setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
                  if (localJobId) completeCloudJob(localJobId, inserted.id);
                }
              }
            } finally { isSavingRef.current = false; }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
      // Clear cloud job on success
      if (localJobId) { setCloudJobId(null); }
    } catch (err: any) {
      console.error('Generation error:', err);
      sonnerToast.error(err.message || 'Não foi possível gerar o carrossel. Tente novamente.');
      if (localJobId) {
        failCloudJob(localJobId, err.message || 'Falha na geração local do carrossel');
      }
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      setCloudJobId(null);
      generationInFlightRef.current = false;
    }
  };

  // ===== HELPER: Extract Extreme form photo refs =====
  const getExtremeFormPhotoRefs = useCallback((): ReferenceImage[] => {
    if (wizardMode !== 'extreme' || !extremeAnalysis) return [];
    return extremeAnalysis.fields
      .filter((field) => field.type === 'photo_upload')
      .flatMap((field) => {
        const photos = extremeFormValues[field.id] as string[] | undefined;
        if (!photos?.length) return [];
        const normalized = `${field.label} ${field.id}`.toLowerCase();
        const isFace = /pessoa|rosto|face|foto.*pessoa|retrato|portrait|selfie|model|cliente|character|personagem|humano|human/.test(normalized);
        const isProduct = /print|screenshot|tela|app|produto|mockup|logo|marca|interface|screen/.test(normalized);
        const category: ReferenceImage['category'] = isFace ? 'face' : isProduct ? 'product' : 'style';
        return photos.map((url, idx) => ({
          url,
          thumb: url,
          label: `${field.label} ${idx + 1}`,
          source: 'upload' as const,
          category,
        }));
      });
  }, [wizardMode, extremeAnalysis, extremeFormValues]);

  // Helper: trigger zoom-out animation before showing result
  const finishGeneration = useCallback(() => {
    setCompletingGeneration(true);
  }, []);

  const handleCompleteAnimationDone = useCallback(() => {
    setGenerating(false);
    setGeneratingAllImages(false);
    setImageGenProgress('');
    setCompletingGeneration(false);
    setResultEntrance(true);
    setTimeout(() => setResultEntrance(false), 800);
  }, []);


  // ===== HELPER: Extract exact text from Extreme form =====
  const getExtremeExactText = useCallback((): string => {
    if (wizardMode !== 'extreme' || !extremeAnalysis) return '';

    const textFields = extremeAnalysis.fields
      .filter((field) => field.type === 'text' || field.type === 'textarea')
      .map((field) => ({
        field,
        value: typeof extremeFormValues[field.id] === 'string' ? String(extremeFormValues[field.id]).trim() : '',
      }))
      .filter((item) => item.value.length > 0);

    if (textFields.length === 0) return '';

    const priorityRegex = /titulo|title|headline|texto.*(post|principal|exato)|chamada|frase|copy|slogan/i;
    const prioritized = textFields.find((item) => priorityRegex.test(`${item.field.label} ${item.field.id}`));

    return (prioritized?.value || textFields[0].value || '').trim();
  }, [wizardMode, extremeAnalysis, extremeFormValues]);

  // ===== HELPER: Build Extreme vision context for prompt enrichment =====
  const buildExtremePromptContext = useCallback((): string => {
    if (wizardMode !== 'extreme' || !extremeAnalysis) return '';
    const parts: string[] = [];
    parts.push(`\n\n🔥 MODO EXTREME — VISÃO DO USUÁRIO (PRIORIDADE MÁXIMA):`);
    parts.push(`DESCRIÇÃO DA VISÃO: "${extremeVision}"`);
    parts.push(`RESUMO DA IA: ${extremeAnalysis.summary}`);
    // Add all non-photo form values as context
    for (const field of extremeAnalysis.fields) {
      if (field.type === 'photo_upload') continue;
      const val = extremeFormValues[field.id];
      if (val && typeof val === 'string' && val.trim()) {
        parts.push(`${field.label}: ${val}`);
      }
    }
    // Smart detection for specific content types
    const visionLower = extremeVision.toLowerCase();
    if (/app|aplicativo|celular|smartphone|tela|print|screenshot/i.test(visionLower)) {
      parts.push(`📱 MOCKUP OBRIGATÓRIO: O usuário mencionou um aplicativo/tela. As imagens de referência são SCREENSHOTS REAIS. Crie um mockup FOTORREALISTA de iPhone 15 Pro com o screenshot EXATO na tela. Ângulo 3/4 premium, sombras e reflexos realistas. Composição de anúncio profissional de app — como Apple ou Nubank fariam.`);
    }
    if (/logo|marca|logotipo|logomarca/i.test(visionLower)) {
      parts.push(`🏷️ LOGO OBRIGATÓRIO: O usuário forneceu seu logo. Ele DEVE aparecer no design final, posicionado de forma elegante e profissional.`);
    }
    // Always inject quality baseline for Extreme
    parts.push(`\n🎯 QUALIDADE OBRIGATÓRIA: O resultado deve parecer criado por uma agência de design premium. Tipografia elegante com hierarquia clara (título bold grande, subtítulo leve), composição limpa e respirada, paleta coesa de 3-4 cores, elementos gráficos sutis. Pense em posts de marcas como Apple, Nike, Nubank — design minimalista e impactante.`);
    parts.push(`\n🚫 REGRA CRÍTICA DE FORMATO — CARD ÚNICO: Cada imagem gerada é UM ÚNICO CARD de um carrossel do Instagram. Cada card deve ser UMA ÚNICA COMPOSIÇÃO VISUAL que ocupa 100% do espaço (${cardW}x${cardH}). NUNCA crie grids, colagens, mosaicos ou múltiplas imagens dentro de um card. NUNCA divida o card em 2x2, 2x1 ou qualquer grade. O card deve ter UMA ÚNICA CENA/COMPOSIÇÃO por imagem. Se o carrossel tem 3 cards, são 3 imagens SEPARADAS, cada uma com sua própria composição única e completa.`);
    return parts.join('\n');
  }, [wizardMode, extremeAnalysis, extremeVision, extremeFormValues, cardW, cardH]);


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
          textSizeHint: addCardModal.textSize,
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

    // Apply pending style if coming from "Estilo Diferente" flow
    if (pendingAddCardStyle) {
      setActiveMarketplaceStyle(pendingAddCardStyle);
      activeMarketplaceStyleRef.current = pendingAddCardStyle; // Update ref immediately for async functions
      setIsLoadedFullBleed(!!pendingAddCardStyle?.imageGeneration?.prompt_style);
      setPendingAddCardStyle(null);
    }

    const currentData = carouselDataRef.current;
    if (!currentData) return;

    const newIndex = currentData.cards.length;
    const isTextOnlyCard = mode === 'solid';

    const isFullBleedMarketplace = !!activeMarketplaceStyleRef.current?.imageGeneration?.prompt_style || (isLoadedFullBleed && !!loadedMarketplaceStyleId);
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
          ...(wizardMode === 'extreme' && extremeAnalysis ? { productContext: `EXTREME_VISION:${JSON.stringify({ vision: extremeVision, analysis: extremeAnalysis, formValues: extremeFormValues })}` } : {}),
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

    if (generationInFlightRef.current) {
      console.log('[GENERATE_GUARD] Duplicate cover-to-carousel trigger ignored');
      return;
    }
    generationInFlightRef.current = true;

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

      // IMPORTANT: Collect face refs from BOTH facePersons (multi-person mode) and referenceImages
      const coverFaceRef = coverCard.imageUrl ? [coverCard.imageUrl] : [];
      const activeFP = facePersons.filter(p => p.photos.length > 0);
      const wizardFaceRefs = activeFP.length > 0
        ? activeFP.flatMap(p => p.photos.map(ph => ph.url))
        : referenceImages.filter(r => r.category === 'face').map(r => r.url);
      // Prioritize: wizard face refs if available (they were used for the cover), otherwise use cover image itself
      const faceRefUrls = wizardFaceRefs.length > 0 ? [...wizardFaceRefs, ...coverFaceRef] : coverFaceRef;
      const facePersonsMeta = activeFP.length > 1
        ? activeFP.map(p => ({ label: p.label, gender: p.gender, wearsGlasses: p.wearsGlasses, photoCount: p.photos.length }))
        : undefined;
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      // === EXTREME MODE: Inject refs for second carousel gen loop ===
      const loop2ExtremeRefs = getExtremeFormPhotoRefs();
      const loop2ExtremeProductRefs = loop2ExtremeRefs.filter(r => r.category === 'product').map(r => r.url);
      const loop2ExtremeStyleRefs = loop2ExtremeRefs.filter(r => r.category === 'style').map(r => r.url);
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
        let imgPrompt = `${cleanTopic}: ${cardDesc}. Composition: ${variation}. MANDATORY: This card MUST look like it belongs to the EXACT SAME visual series as the cover image — same color palette, same typography style, same layout approach, same mood.`;
        if (!showPerson && faceRefUrls.length > 0) {
          imgPrompt += ' This card should be TEXT-FOCUSED with abstract/editorial background — do NOT include any person or face.';
        }

        if (isFullBleedStyle) {
          const isCta = card.type === 'cta' || i === updatedCards.length - 1;
          const cardTextParts: string[] = [];
          cardTextParts.push(`IDIOMA OBRIGATÓRIO: Todo texto DEVE estar em PORTUGUÊS BRASILEIRO CORRETO, sem erros ortográficos. NÃO copie nenhum texto, crédito, watermark, assinatura ou nome de autor/marca das imagens de referência — use APENAS o estilo visual.`);
          cardTextParts.push(`TEMA: "${cleanTopic}"`);
          cardTextParts.push(`SEM BORDAS: Full bleed.`);
          cardTextParts.push(`MARGENS DE SEGURANÇA: Todo texto deve respeitar margem interna de 8% em cada borda. NENHUM texto deve encostar nas bordas.`);
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
        const mergedLoop2ProductRefs = [...productRefUrls, ...loop2ExtremeProductRefs];
        const marketplaceRefUrls: string[] = [];
        if (activeMarketplaceStyle?._previewImages?.length) {
          const origin = window.location.origin;
          const allPreviews = (activeMarketplaceStyle._previewImages as string[]).map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
          marketplaceRefUrls.push(...allPreviews.slice(0, 8));
        }

        // Use the cover image as PRIORITY style reference — it defines the visual series
        const coverStyleRef = coverCard.imageUrl && !coverCard.imageUrl.startsWith('data:') ? [coverCard.imageUrl] : [];
        // Cap total style refs to 8 max — cover image FIRST for highest priority
        const allStyleCandidates = [...coverStyleRef, ...styleRefUrls, ...loop2ExtremeStyleRefs, ...marketplaceRefUrls];
        const capturedStyleRefs = allStyleCandidates.length > 0 ? allStyleCandidates.slice(0, 8) : undefined;

        // For text-only cards, don't send face references
        const cardFaceRefs = showPerson && faceRefUrls.length > 0 ? faceRefUrls : undefined;

        // === AUTO-ASSIGN WEB SEARCH REAL PHOTO (Loop 2) ===
        let loop2ProductRefs = mergedLoop2ProductRefs.length > 0 ? mergedLoop2ProductRefs : undefined;
        if (!loop2ProductRefs && !skipWebSearch && cardPhotoAssignments[i]) {
          loop2ProductRefs = [cardPhotoAssignments[i]];
        }

        const loop2ExtremeCtx = buildExtremePromptContext();
        const hasWebPhotoL2 = !skipWebSearch && webSearchResult?.images?.length && loop2ProductRefs?.length === 1
          && loop2ProductRefs[0].startsWith('http') && productImages.length === 0;
        let loop2Prompt = buildImagePrompt(imgPrompt + (loop2ExtremeCtx || '')) + (isFullBleedStyle ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.');
        if (hasWebPhotoL2) {
          loop2Prompt += `\n\n📸 INSTRUÇÃO CRÍTICA — FOTO REAL (PRESERVAÇÃO TOTAL):
A imagem de referência enviada é uma FOTO REAL do tema. 
REGRAS DE PRESERVAÇÃO ABSOLUTA:
1. USE a foto real como FUNDO/BASE principal do card.
2. NÃO RECRIE, NÃO REDESENHE e NÃO REINTERPRETE os rostos ou pessoas. Mantenha-os EXATAMENTE como são na foto original.
3. A foto deve permanecer FOTOGRÁFICA e INALTERADA — NÃO substitua por ilustração.
4. Sobreponha APENAS textos editoriais e tipografia POR CIMA da foto real.
5. Trate a foto como um print/screenshot que DEVE ser preservado como base.`;
          // Remove NO HUMANS if present — web photos may contain people
          loop2Prompt = loop2Prompt.replace(/CRITICAL: Do NOT include any people.*?NO HUMANS whatsoever\./g, '');
          loop2Prompt = loop2Prompt.replace(/CRITICAL: Do NOT include any people.*?NO HUMANS\./g, '');
        }

        imageFactories.push({
          index: i,
          factory: () => generateImage({
            prompt: loop2Prompt,
            faceReferenceUrls: cardFaceRefs,
            styleReferenceUrls: capturedStyleRefs,
            referenceImageUrls: loop2ProductRefs,
            negativePrompt: finalNegative + (!showPerson && faceRefUrls.length > 0 ? ', no people, no faces, no portraits' : ''),
            facePersonsMetadata: showPerson ? facePersonsMeta : undefined,
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
      finishGeneration();
      toast({ title: 'Carrossel gerado!', description: `${totalCards} cards a partir da capa` });

      // Auto-save
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: companyData } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
          if (companyData) {
            try { const creditAmount = calculateCreditCost({ cardCount: totalCards, wizardMode, hasFaceRef: facePersons.some(p => p.photos.length > 0) }); await supabase.rpc('consume_ai_credits', { p_company_id: companyData.company_id, p_agent_id: null, p_amount: creditAmount, p_description: `Carrossel da capa (${wizardMode}): ${topic} (${totalCards} cards) — ${creditAmount} créditos` }); } catch { /* ignore */ }
            const styleConfig = { bgColor, accentColor, textColor, selectedFont, brandName, userName, dateLabel, imageSettings, activePresetId, logoUrl, logoPosition, showHeader };
            isSavingRef.current = true;
            try {
              if (currentCarouselIdRef.current) {
                await supabase.from('generated_carousels').update({ title: finalData.title || topic, topic, carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, generation_config: buildGenerationConfig() } as any).eq('id', currentCarouselIdRef.current);
                setTimeout(() => captureCoverImage(currentCarouselIdRef.current!, companyData.company_id, finalData).catch(() => {}), 2000);
              } else {
                const { data: inserted } = await supabase.from('generated_carousels').insert({ company_id: companyData.company_id, user_id: userData.user.id, title: finalData.title || topic, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), carousel_data: finalData as any, style_config: styleConfig as any, card_count: finalData.cards.length, marketplace_style_id: activeMarketplaceStyle?.id || null, generation_config: buildGenerationConfig() } as any).select('id').single();
                if (inserted) {
                  setCurrentCarouselId(inserted.id);
                  lastSavedDataRef.current = JSON.stringify({ cards: finalData.cards.map(c => ({ ...c })), title: finalData.title });
                  setTimeout(() => captureCoverImage(inserted.id, companyData.company_id, finalData).catch(() => {}), 2000);
                }
              }
            } finally { isSavingRef.current = false; }
          }
        }
      } catch (saveErr) { console.error('Auto-save error:', saveErr); }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível gerar', variant: 'destructive' });
    } finally {
      setGenerating(false);
      setGeneratingAllImages(false);
      setImageGenProgress('');
      generationInFlightRef.current = false;
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

  const setCardImage = (cardIndex: number, imageUrl: string, skipUndo = false) => {
    if (!carouselData) return;
    // Push previous image to undo stack (if card had an image and not already tracked)
    if (!skipUndo) {
      const prevUrl = carouselData.cards[cardIndex]?.imageUrl;
      if (prevUrl) {
        setCorrectionUndoStack(prev => [...prev, { cardIndex, imageUrl: prevUrl }]);
      }
    }
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

  const regenerateCard = async (cardIndex: number, forceImageRequired = false, disallowPeople = false, customInstruction?: string, customImageUrl?: string | null): Promise<boolean> => {
    const currentData = carouselDataRef.current;
    if (!currentData) return false;
    const carouselData = currentData;
    const card = carouselData.cards[cardIndex];
    if (!card) return false;
    setRegeneratingCard(cardIndex);
    try {
      const shouldSwapWithExistingWebPhoto = !customInstruction && !customImageUrl && !!webSearchResult?.imageCandidates?.length;
      if (shouldSwapWithExistingWebPhoto) {
        const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const stopwords = new Set(['de','da','do','das','dos','e','o','a','os','as','um','uma','para','com','no','na','em','por','sobre','ao','aos','que','como','mais','melhor','pior','card','capa']);
        const extractTerms = (text: string) => Array.from(new Set(normalize(text).split(' ').filter(t => t.length > 2 && !stopwords.has(t))));
        const scoreCandidate = (candidate: any, cardText: string) => {
          const haystack = normalize(`${candidate.title || ''} ${candidate.desc || ''} ${candidate.source || ''} ${candidate.url || ''}`);
          const cardTerms = extractTerms(cardText);
          const topicTerms = extractTerms(String(webSearchResult?.content?.clean_topic || topic || ''));
          let score = 0;
          for (const term of topicTerms) if (haystack.includes(term)) score += 2;
          for (const term of cardTerms) if (haystack.includes(term)) score += 5;
          if (/(actor|atriz|diretor|director|winner|vencedor|red carpet|ceremony|premiere|portrait|press)/i.test(haystack)) score += 2;
          if (/(tweet|twitter|x.com|pbs.twimg|youtube|ytimg|thumbnail|poster|meme|quote|text|caption|screenshot)/i.test(haystack)) score -= 10;
          return score;
        };

        const cardText = `${card.title || card.bodyTop || ''} ${card.body || card.bodyBottom || ''}`.trim();
        const ranked = [...(webSearchResult?.imageCandidates || [])].sort((a: any, b: any) => scoreCandidate(b, cardText) - scoreCandidate(a, cardText));
        const usedUrls = new Set(Object.values(cardPhotoAssignments || {}));
        const currentUrl = cardPhotoAssignments?.[cardIndex] || card.imageUrl;
        const nextCandidate = ranked.find((candidate: any) => candidate.url !== currentUrl && !usedUrls.has(candidate.url))
          || ranked.find((candidate: any) => candidate.url !== currentUrl);

        if (nextCandidate?.url) {
          setCardPhotoAssignments((prev: any) => ({ ...(prev || {}), [cardIndex]: nextCandidate.url }));
          setCarouselData((prev) => {
            if (!prev || !prev.cards[cardIndex]) return prev;
            const newCards = [...prev.cards];
            newCards[cardIndex] = { ...newCards[cardIndex], imageUrl: nextCandidate.url, isAiImage: false, needsImage: true };
            return { ...prev, cards: newCards };
          });
          toast({ title: '📸 Foto atualizada!', description: 'Troquei por outra foto relevante da mesma pesquisa.' });
          return true;
        }
      }
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
          cardCount: carouselData.cards.length,
          imageCardIndices: [cardIndex],
          ...(webSearchResult?.content ? { webSearchContent: webSearchResult.content, webSearchCitations: webSearchResult.citations } : {}),
          ...(activeMarketplaceStyleRef.current ? { marketplaceStyleConfig: activeMarketplaceStyleRef.current } : {}),
          ...(wizardMode === 'extreme' && extremeAnalysis ? { productContext: `EXTREME_VISION:${JSON.stringify({ vision: extremeVision, analysis: extremeAnalysis, formValues: extremeFormValues, fontReference: extremeSelectedFont ? { name: extremeSelectedFont.name, previewUrl: extremeSelectedFont.previewUrl, instruction: 'OBRIGATÓRIO: Use EXATAMENTE esta fonte tipográfica como referência visual.' } : null })}` } : {}),
          regenerateCardIndex: cardIndex,
          existingCardSummaries,
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

      // 2. Check if user wants text-only (no image regeneration)
      const textOnlyKeywords = ['sem foto', 'sem imagem', 'só texto', 'so texto', 'apenas texto', 'text only', 'no photo', 'no image', 'without image', 'without photo', 'remover foto', 'remover imagem', 'tirar foto', 'tirar imagem'];
      const wantsTextOnly = customInstruction && textOnlyKeywords.some(kw => customInstruction.toLowerCase().includes(kw));

      // 3. Regenerate image using AI with face/style references
      let newImageUrl = wantsTextOnly ? '' : card.imageUrl;

      if (!wantsTextOnly) {
      const cleanTopic = webSearchResult?.content?.clean_topic || topic.split('\n')[0].trim();
      const activeFPRegen = facePersons.filter(p => p.photos.length > 0);
      const wizardFaceRefs = activeFPRegen.length > 0
        ? activeFPRegen.flatMap(p => p.photos.map(ph => ph.url))
        : referenceImages.filter(r => r.category === 'face').map(r => r.url);
      // For text-only cards, never inject face references
      const allowFaceReferences = !disallowPeople;
      // If no wizard face refs, use the cover image as face reference to maintain the same person
      const coverImageUrl = carouselData.cards[0]?.imageUrl;
      let faceRefUrls = allowFaceReferences
        ? (wizardFaceRefs.length > 0 ? wizardFaceRefs : (coverImageUrl && !coverImageUrl.startsWith('data:') ? [coverImageUrl] : []))
        : [];
      const styleRefUrls = referenceImages.filter(r => r.category === 'style').map(r => r.url);
      const productRefUrls = productImages.length > 0 ? productImages.map(p => p.url) : [];
      // Include extreme mode photo refs
      const extremePhotoRefs = getExtremeFormPhotoRefs();
      const extremeFaceRefs = extremePhotoRefs.filter(r => r.category === 'face').map(r => r.url);
      const extremeStyleRefs = extremePhotoRefs.filter(r => r.category === 'style').map(r => r.url);
      const extremeProductRefs = extremePhotoRefs.filter(r => r.category === 'product').map(r => r.url);
      if (extremeFaceRefs.length > 0 && faceRefUrls.length === 0) {
        faceRefUrls.push(...extremeFaceRefs);
      }
      const isFullBleedMarketplace = !!activeMarketplaceStyleRef.current?.imageGeneration?.prompt_style || (isLoadedFullBleed && !!loadedMarketplaceStyleId) || wizardMode === 'extreme';
      
      let imgPrompt: string;
      let negPrompt: string;
      
      // Detect real estate mode for regeneration
      const regenIsRealEstate = isRealEstateStyle || !!activeMarketplaceStyleRef.current?.is_real_estate;
      const regenPropertyList = propertyListRef.current || propertyList;
      const regenHasPhotos = regenIsRealEstate && regenPropertyList.some(p => p.photos && p.photos.length > 0);

      if (isFullBleedMarketplace) {
        // Build full-bleed prompt with card text context (same as initial generation)
        const isCover = card.type === 'cover' || cardIndex === 0;
        const isCta = card.type === 'cta' || cardIndex === carouselData.cards.length - 1;
        const parts: string[] = [];
        parts.push(`IDIOMA: Todo texto gerado na imagem DEVE estar em PORTUGUÊS BRASILEIRO. NÃO use espanhol, NÃO use inglês.`);
        parts.push(`TEMA DO CARROSSEL: "${cleanTopic}"`);
        parts.push(`PROIBIDO: NÃO copie nomes de usuário (@), nomes de empresas, marcas ou qualquer informação pessoal das imagens de referência. Use APENAS o estilo visual (cores, tipografia, layout, elementos decorativos).`);
        parts.push(`SEM BORDAS: A imagem deve ser full bleed, sem barras ou bordas no topo ou na base.`);
        if (customInstruction) {
          parts.push(`\n🎯 INSTRUÇÃO ESPECIAL DO USUÁRIO (PRIORIDADE MÁXIMA): ${customInstruction}`);
        }

        // Real estate: force black BG for screen blend
        if (regenHasPhotos) {
          parts.push(`\n🏠 INSTRUÇÃO CRÍTICA — CARD IMOBILIÁRIO:
Use um FUNDO SÓLIDO PRETO (#000000) puro como base da imagem. NÃO gere nenhuma foto de casa, prédio, imóvel ou cenário de fundo.
Coloque APENAS os elementos de texto, preço, especificações e decoração sobre o fundo preto.
O fundo preto será mesclado com a foto real do imóvel via composição "screen".`);
        }
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
        // Inject extreme mode vision/form context into the image prompt
        if (wizardMode === 'extreme' && extremeAnalysis) {
          parts.push(`\nMODO EXTREME — VISÃO DO USUÁRIO: "${extremeVision}"`);
          // Add form field values as context
          const formContext = extremeAnalysis.fields
            .filter(f => f.type !== 'photo_upload' && extremeFormValues[f.id])
            .map(f => `${f.label}: ${extremeFormValues[f.id]}`)
            .join(', ');
          if (formContext) parts.push(`DETALHES: ${formContext}`);
          if (extremeSelectedFont) {
            parts.push(`FONTE OBRIGATÓRIA: Use a fonte "${extremeSelectedFont.name}" como referência visual.`);
          }
          // Add exact text instructions
          const exactText = getExtremeExactText();
          if (exactText) {
            parts.push(`TEXTO EXATO OBRIGATÓRIO (copie caractere por caractere): ${exactText}`);
          }
        }
        // Instruct AI to include product/screen images provided as references
        const allProductRefsForPrompt = [...productRefUrls, ...extremeProductRefs];
        if (allProductRefsForPrompt.length > 0) {
          parts.push(`\nREFERÊNCIAS DE PRODUTO/TELA OBRIGATÓRIAS: Foram fornecidas ${allProductRefsForPrompt.length} imagem(ns) de produto/tela/app como referência. Você DEVE incluir essas imagens de produto/tela no card regenerado, renderizando-as fielmente (mockup de celular, print de tela, etc). NÃO ignore essas referências.`);
        }
        if (logoUrl) {
          parts.push(`REFERÊNCIA DE LOGO: A imagem da logomarca foi fornecida como referência. Renderize-a fielmente na posição indicada.`);
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
        negPrompt = [activeMarketplaceStyleRef.current?.imageGeneration?.negative_prompt || '', 'Do NOT copy exact faces or identities from reference images'].filter(Boolean).join(', ');
      } else {
        // For standard styles, build a richer prompt that maintains consistency
        const cardType = card.type === 'cover' ? 'capa editorial' : card.type === 'cta' ? 'card final de chamada para ação' : 'slide de conteúdo informativo';
        imgPrompt = disallowPeople
          ? `Fundo gráfico editorial para ${cardType} sobre "${cleanTopic}". Visual tipográfico/abstrato com formas, textura e luz; sem pessoas, sem retratos e sem silhuetas humanas.${customInstruction ? ` INSTRUÇÃO ESPECIAL: ${customInstruction}` : ''}`
          : `${cardType} sobre "${cleanTopic}". ${newImagePrompt || newBody.slice(0, 150)}. Manter o mesmo estilo visual, cores e atmosfera dos outros cards do carrossel.${customInstruction ? ` INSTRUÇÃO ESPECIAL: ${customInstruction}` : ''}`;
        negPrompt = imageSettings.negativePrompt || 'no text, no words, no letters, no typography, no writing, no captions, no watermarks, no logos, no UI elements';
      }
      
      // Use existing card images as additional style references for consistency
      const existingCardImages = carouselData.cards
        .filter((c, idx) => idx !== cardIndex && c.imageUrl && !c.imageUrl.startsWith('data:'))
        .slice(0, 2)
        .map(c => c.imageUrl!);
      
      // Build marketplace style references
      const marketplaceRefUrls: string[] = [];
      if (activeMarketplaceStyleRef.current?._previewImages?.length) {
        const origin = window.location.origin;
        const allPreviews = (activeMarketplaceStyleRef.current._previewImages as string[])
          .map((p: string) => p.startsWith('http') ? p : `${origin}${p}`);
        marketplaceRefUrls.push(...allPreviews);
      }
      
      const allStyleRefs = [...styleRefUrls, ...extremeStyleRefs, ...marketplaceRefUrls, ...existingCardImages];
      // Product refs and logo should be sent as referenceImageUrls for higher fidelity
      const allProductRefs = [...productRefUrls, ...extremeProductRefs];
      // Include logo as a reference image so the AI can reproduce it exactly
      const regenReferenceImages: string[] = [...allProductRefs];
      if (logoUrl && logoUrl.startsWith('http')) {
        regenReferenceImages.push(logoUrl);
      }
      if (customImageUrl) {
        regenReferenceImages.push(customImageUrl);
      }
      
      try {
        // Retry image generation with progressive fallback to avoid blank cards
        const generationAttempts: Array<{
          faceReferenceUrls?: string[];
          styleReferenceUrls?: string[];
          referenceImageUrls?: string[];
          prompt: string;
          negativePrompt?: string;
        }> = [
          {
            prompt: buildImagePrompt(imgPrompt) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            referenceImageUrls: regenReferenceImages.length > 0 ? regenReferenceImages : undefined,
            negativePrompt: negPrompt || undefined,
          },
          {
            prompt: buildImagePrompt(imgPrompt) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
            referenceImageUrls: regenReferenceImages.length > 0 ? regenReferenceImages : undefined,
            negativePrompt: negPrompt || undefined,
          },
          {
            prompt: buildImagePrompt(`${imgPrompt}. Manter identidade visual do carrossel sem copiar conteúdo textual de referências.`) + (isFullBleedMarketplace ? '' : '. Clean professional photo, NO TEXT OR WORDS IN THE IMAGE.'),
            faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
            styleReferenceUrls: undefined,
            referenceImageUrls: regenReferenceImages.length > 0 ? regenReferenceImages : undefined,
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

      // === REAL ESTATE BLEND: merge property photo + AI overlay ===
      if (regenHasPhotos && newImageUrl) {
        try {
          console.log('[REGEN_BLEND] Starting real estate blend for card', cardIndex);
          // Find the correct property photo for this card
          let photoUrl = '';
          let focalPt = 'center';
          let cropOff: number | undefined;
          if (realEstateMode === 'multiple') {
            const propIdx = cardIndex % regenPropertyList.length;
            const propData = regenPropertyList[propIdx];
            photoUrl = propData?.photos?.[0]?.url || '';
            focalPt = propData?.photos?.[0]?.focalPoint || 'center';
            cropOff = propData?.photos?.[0]?.cropOffsetY;
          } else {
            const allPhotos = regenPropertyList[0]?.photos || [];
            const photoIdx = cardIndex % Math.max(allPhotos.length, 1);
            photoUrl = allPhotos[photoIdx]?.url || allPhotos[0]?.url || '';
            focalPt = allPhotos[photoIdx]?.focalPoint || 'center';
            cropOff = allPhotos[photoIdx]?.cropOffsetY;
          }

          if (photoUrl) {
            // Convert photo to base64 if needed
            let photoBase64 = photoUrl;
            if (!photoUrl.startsWith('data:')) {
              const resp = await fetch(photoUrl);
              const blob = await resp.blob();
              photoBase64 = await new Promise<string>((res, rej) => {
                const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(blob);
              });
            }

            const W = 1080, H = 1350;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d')!;
            const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
              const img = document.createElement('img') as HTMLImageElement;
              if (src.startsWith('http')) img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
            });

            // Draw real photo (cover fit)
            const photoImg = await loadImg(photoBase64);
            const pRatio = photoImg.width / photoImg.height;
            const cRatio = W / H;
            let sw = photoImg.width, sh = photoImg.height, sx = 0, sy = 0;
            if (pRatio > cRatio) {
              sw = photoImg.height * cRatio; sx = (photoImg.width - sw) / 2;
              if (cropOff !== undefined) sx = cropOff * (photoImg.width - sw);
            } else {
              sh = photoImg.width / cRatio;
              const maxSy = photoImg.height - sh;
              if (cropOff !== undefined) sy = cropOff * maxSy;
              else if (focalPt === 'top') sy = 0;
              else if (focalPt === 'bottom') sy = maxSy;
              else sy = maxSy / 2;
            }
            ctx.drawImage(photoImg, sx, sy, sw, sh, 0, 0, W, H);

            // Dark gradient
            const gradient = ctx.createLinearGradient(0, H * 0.35, 0, H);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(0.4, 'rgba(0,0,0,0.3)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0.65)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, W, H);

            // Screen blend AI overlay
            const aiImg = await loadImg(newImageUrl);
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(aiImg, 0, 0, aiImg.width, aiImg.height, 0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';

            // Logo
            if (logoUrl) {
              try {
                const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
                  const r = await fetch(logoUrl); const b = await r.blob();
                  return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
                })();
                const logoImg = await loadImg(logoB64);
                const maxLW = 180, maxLH = 80;
                const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
                const lw = logoImg.width * ls, lh = logoImg.height * ls;
                const pad = 50;
                let lx = pad, ly = pad;
                const lp = logoPosition || 'top-left';
                if (lp.includes('center')) lx = (W - lw) / 2;
                if (lp.includes('right')) lx = W - lw - pad;
                if (lp.includes('bottom')) ly = H - lh - pad;
                ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
                ctx.drawImage(logoImg, lx, ly, lw, lh);
                ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
              } catch (e) { console.warn('[REGEN_BLEND] Logo failed:', e); }
            }

            newImageUrl = canvas.toDataURL('image/jpeg', 0.92);
            console.log('[REGEN_BLEND] ✅ Blend complete for card', cardIndex);
          }
        } catch (blendErr) {
          console.warn('[REGEN_BLEND] Blend failed, using AI image as fallback:', blendErr);
        }
      }

      // === NON-REAL-ESTATE: Programmatic logo overlay for regenerated card ===
      if (!regenHasPhotos && logoUrl && newImageUrl) {
        try {
          console.log('[REGEN_LOGO] Adding logo to regenerated card', cardIndex);
          const W = 1080, H = 1350;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;
          const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = document.createElement('img') as HTMLImageElement;
            if (src.startsWith('http')) img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
          const baseImg = await loadImg(newImageUrl);
          ctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height, 0, 0, W, H);
          const logoB64 = logoUrl.startsWith('data:') ? logoUrl : await (async () => {
            const r = await fetch(logoUrl); const b = await r.blob();
            return new Promise<string>((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
          })();
          const logoImg = await loadImg(logoB64);
          const maxLW = 180, maxLH = 80;
          const ls = Math.min(maxLW / logoImg.width, maxLH / logoImg.height, 1);
          const lw = logoImg.width * ls, lh = logoImg.height * ls;
          const pad = 50;
          let lx = pad, ly = pad;
          const lp = logoPosition || 'top-left';
          if (lp.includes('center')) lx = (W - lw) / 2;
          if (lp.includes('right')) lx = W - lw - pad;
          if (lp.includes('middle')) ly = (H - lh) / 2;
          if (lp.includes('bottom')) ly = H - lh - pad;
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
          ctx.drawImage(logoImg, lx, ly, lw, lh);
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
          newImageUrl = canvas.toDataURL('image/jpeg', 0.92);
          console.log('[REGEN_LOGO] ✅ Logo applied!');
        } catch (logoErr) {
          console.warn('[REGEN_LOGO] Failed:', logoErr);
        }
      }
      } // end if (!wantsTextOnly)

      // 3. Push previous image to undo stack before overwriting
      {
        const prevCards = carouselDataRef.current?.cards;
        const prevUrl = prevCards?.[cardIndex]?.imageUrl;
        if (prevUrl) {
          setCorrectionUndoStack(prev => [...prev, { cardIndex, imageUrl: prevUrl }]);
        }
      }

      // 4. Update card
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

  // ===== REGENERATE ALL CARDS (re-generates entire carousel, respects continuous/panoramic mode) =====
  const regenerateAll = async () => {
    const currentData = carouselDataRef.current;
    if (!currentData || currentData.cards.length === 0) return;
    
    setRegeneratingAll(true);
    
    try {
      const isContinuous = continuousMode || currentData.cards.some(c => c.generatedPrompt?.includes('Panorama Contínuo'));
      const panelCount = currentData.cards.length;
      const targetPanoramaAspect = (panelCount * 4) / 5;
      const minAcceptedPanoramaAspect = targetPanoramaAspect * 0.82;
      
      if (isContinuous && panelCount >= 2 && panelCount <= 3) {
        // Re-generate as panoramic continuous
        const cleanTopic = cleanMentionsFromTopic(topic.split('\n')[0].trim());
        const allCardTexts = currentData.cards.map((c, i) => {
          const title = c.title || c.bodyTop || '';
          const body = c.bodyBottom || c.body || '';
          return `Seção ${i + 1}: ${title}${body ? ` — ${body}` : ''}`;
        }).join('\n');

        const panoramaPrompt = [
          `IDIOMA OBRIGATÓRIO: Todo texto renderizado DEVE estar em PORTUGUÊS BRASILEIRO CORRETO, sem erros ortográficos. Revise cada palavra. NÃO copie nenhum texto, crédito, watermark, assinatura ou nome de autor/marca das imagens de referência.`,
          `COMPOSIÇÃO PANORÂMICA CONTÍNUA: Gere UMA ÚNICA imagem panorâmica ultra-larga que será dividida em ${panelCount} fatias verticais iguais, cada uma na proporção 4:5 (1080x1350).`,
          `PROPORÇÃO TOTAL DA IMAGEM: ${panelCount * 1080}x1350 pixels (${panelCount * 4}:5). Isso é OBRIGATÓRIO.`,
          `CONTINUIDADE VISUAL OBRIGATÓRIA: Elementos visuais, cenários, gradientes, fotos, pessoas e texturas devem fluir de forma contínua de uma ponta a outra — sem cortes, bordas internas ou separadores visíveis entre as seções.`,
          `REGRA CRÍTICA DE TEXTO: Todo texto/tipografia DEVE estar 100% contido dentro da sua seção correspondente. NENHUMA palavra, frase ou bloco de texto pode começar em uma seção e terminar em outra. Cada fatia vertical (seção) deve ter seus textos completamente legíveis de forma independente. Apenas elementos visuais (fotos, design, cenários, gradientes, pessoas, objetos) podem fluir entre seções — TEXTO NUNCA.`,
          `TEMA: "${cleanTopic}"`,
          `CONTEÚDO TEXTUAL POR SEÇÃO (cada texto DEVE ficar inteiramente dentro da sua seção, sem ultrapassar as bordas verticais de corte):`,
          allCardTexts,
          `ESTILO: Design editorial premium, tipografia integrada à composição visual, cores harmoniosas que fluem ao longo de toda a panorâmica.`,
          `MARGENS DE SEGURANÇA: Todo texto deve respeitar margem interna de 12% nas bordas esquerda e direita de CADA SEÇÃO (pontos de corte). 8% no topo e base. NENHUM texto próximo dos pontos de corte.`,
          `PROIBIDO: NÃO crie divisões, separadores ou bordas entre seções. NÃO copie nomes de marcas das referências. NÃO coloque texto colado nas bordas. NÃO permita que texto cruze de uma seção para outra.`,
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
        const panoramaAspectRatio = panelCount === 2 ? '8:5' : '12:5';
        
        let panoramaUrl: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const styleImageGen = activeMarketplaceStyle?.imageGeneration;
            const resolvedModel = imageSettings.model === 'auto' ? 'nano-banana' : imageSettings.model;
            
            const { data: imgData, error: imgErr } = await supabase.functions.invoke('generate-carousel-image', {
              body: {
                // PANORAMIC: do NOT use buildImagePrompt() — it adds portrait-specific settings that conflict
                prompt: panoramaPrompt,
                imageSize: panoramaAspectRatio,
                topic: cleanTopic,
                faceReferenceUrls: allFaceRefUrls.length > 0 ? allFaceRefUrls : undefined,
                styleReferenceUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
                imageModel: resolvedModel === 'higgsfield' ? 'gemini' : resolvedModel,
                negativePrompt: [styleNeg, 'no visible cuts, no separators, no vertical lines dividing sections', 'portrait format, vertical format, 1080x1350'].filter(Boolean).join(', '),
                fidelity: imageSettings.fidelity,
                ...(styleImageGen?.prompt_style ? { stylePrompt: styleImageGen.prompt_style } : {}),
                panoramic: true,
                panoramicCardCount: panelCount,
              },
            });
            if (imgErr) throw imgErr;
            if (imgData?.success && imgData?.imageUrl) {
              const candidateUrl = imgData.imageUrl as string;
              const candidateAspect = await new Promise<number>((resolve, reject) => {
                const probe = document.createElement('img');
                probe.crossOrigin = 'anonymous';
                probe.onload = () => resolve(probe.width / Math.max(probe.height, 1));
                probe.onerror = () => reject(new Error('Failed to load panorama candidate'));
                probe.src = candidateUrl;
              });

              if (candidateAspect < minAcceptedPanoramaAspect) {
                console.warn(`Panorama regen candidate rejected (aspect ${candidateAspect.toFixed(2)} < ${minAcceptedPanoramaAspect.toFixed(2)})`);
                continue;
              }

              panoramaUrl = candidateUrl;
              break;
            }
          } catch (err) {
            console.warn(`Panorama regen attempt ${attempt + 1} failed:`, err);
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (panoramaUrl) {
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load panorama'));
            img.src = panoramaUrl!;
          });

          const sliceWidth = Math.floor(img.width / panelCount);
          const updatedCards = [...currentData.cards];
          for (let i = 0; i < panelCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = sliceWidth;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, i * sliceWidth, 0, sliceWidth, img.height, 0, 0, sliceWidth, img.height);
              updatedCards[i] = {
                ...updatedCards[i],
                imageUrl: canvas.toDataURL('image/jpeg', 0.92),
                isAiImage: true,
                generatedPrompt: `[Panorama Contínuo - Fatia ${i + 1}/${panelCount}]\n${panoramaPrompt}`,
              };
            }
          }
          setCarouselData({ ...currentData, cards: updatedCards });
          toast({ title: '🌄 Panorama regenerado!', description: `${panelCount} slides regenerados com continuidade` });
        } else {
          toast({ title: 'Falha ao regenerar panorama', variant: 'destructive' });
        }
      } else {
        // Non-continuous: regenerate each card sequentially
        const total = currentData.cards.length;
        for (let i = 0; i < total; i++) {
          setRegenAllProgress({ current: i + 1, total });
          setRegeneratingCard(i);
          try {
            await regenerateCard(i);
          } catch (err) {
            console.warn(`Failed to regenerate card ${i}:`, err);
          }
          setRegeneratingCard(null);
          // Small delay between cards
          if (i < total - 1) await new Promise(r => setTimeout(r, 500));
        }
        setRegenAllProgress(null);
        toast({ title: '✨ Todos os cards regenerados!' });
      }
      // Auto-save after regeneration
      setTimeout(() => saveCarousel(), 500);
    } catch (err: any) {
      console.error('Regenerate all error:', err);
      toast({ title: 'Erro ao regenerar tudo', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingAll(false);
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
            width: cardW, height: cardH, scale: 2, useCORS: true, allowTaint: true,
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
            width: cardW, height: cardH, scale: 1, useCORS: true, allowTaint: false,
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
    const w = isExport ? cardW : previewW;
    const h = isExport ? cardH : previewH;
    const s = isExport ? 1 : previewW / cardW;
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
    const w = isExport ? cardW : previewW;
    const h = isExport ? cardH : previewH;
    const s = isExport ? 1 : previewW / cardW;
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
    const w = isExport ? cardW : previewW;
    const h = isExport ? cardH : previewH;
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
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: `${12 * (isExport ? 1 : previewW / cardW)}px` }}>Gerando imagem...</span>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: `${12 * (isExport ? 1 : previewW / cardW)}px`, textAlign: 'center', padding: '0 16px' }}>Imagem não gerada. Clique para regenerar.</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCardPreview = (card: CarouselCard, index: number, isExport = false) => {
    // Real estate: now uses AI-generated full-bleed images (same as marketplace full-bleed)
    if (isRealEstateStyle) {
      return renderMarketplaceFullBleedCard(card, index, isExport);
    }

    // Marketplace full-bleed mode: AI generates complete images with text baked in
    // Extreme mode also generates full-bleed images with text baked in by the AI
    const isMarketplaceFullBleed = !!activeMarketplaceStyle?.imageGeneration?.prompt_style || isLoadedFullBleed || wizardMode === 'extreme';
    if (isMarketplaceFullBleed) return renderMarketplaceFullBleedCard(card, index, isExport);

    const isBetaTest2 = activePresetId === 'beta-test2';
    const isBetaTest3 = activePresetId === 'beta-test3';
    if (isBetaTest2) return renderBetaTest2Card(card, index, isExport);
    if (isBetaTest3) return renderBetaTest3Card(card, index, isExport);

    const w = isExport ? cardW : previewW;
    const h = isExport ? cardH : previewH;
    const s = isExport ? 1 : previewW / cardW;
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

    // CONTINUOUS PANORAMA MODE: image as full background, text overlaid
    if (continuousMode && hasImage) {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
          <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.25) 100%)' }} />
          {renderHeader()}
          <div style={{ position: 'absolute', bottom: `${48 * s * ps}px`, left: `${56 * s * ps}px`, right: `${56 * s * ps}px`, zIndex: 5, display: 'flex', flexDirection: 'column', gap: `${16 * s}px` }}>
            <p style={{ fontFamily: serif, fontSize: `${42 * s * fs}px`, fontWeight: 700, lineHeight: 1.22, color: '#FFFFFF', wordBreak: 'break-word' }}>{renderAccentText(topText, accentColor, '#FFFFFF', 42 * fs, s)}</p>
            {bottomText && <p style={{ fontFamily: serif, fontSize: `${28 * s * fs}px`, fontWeight: 400, lineHeight: 1.4, color: 'rgba(255,255,255,0.75)', wordBreak: 'break-word' }}>{bottomText}</p>}
          </div>
          {renderLogo()}
        </div>
      );
    }

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0, backgroundColor: bg }}>
        {renderHeader()}
        <div style={{ position: 'absolute', top: `${80 * s * ps}px`, left: `${56 * s * ps}px`, right: `${56 * s * ps}px`, bottom: `${48 * s * ps}px`, display: 'flex', flexDirection: 'column', zIndex: 5, gap: `${24 * s}px` }}>
          {/* Top text area */}
          <div style={{ flex: hasImage ? '0 0 auto' : '1', display: hasImage ? undefined : 'flex', flexDirection: hasImage ? undefined : 'column', justifyContent: hasImage ? undefined : 'center' }}>
            <p style={{ fontFamily: serif, fontSize: `${(hasImage ? 42 : 56) * s * fs}px`, fontWeight: 700, lineHeight: 1.22, color: mainTxt }}>{renderAccentText(topText, accentTxt, mainTxt, (hasImage ? 42 : 56) * fs, s)}</p>
          </div>
          {/* Image area with margin/gap */}
          {hasImage && <div style={{ flex: '1 1 auto', minHeight: 0, borderRadius: `${20 * s}px`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; if (el.parentElement) el.parentElement.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
          {/* Bottom text */}
          {bottomText && <div style={{ flex: '0 0 auto' }}><p style={{ fontFamily: serif, fontSize: `${(hasImage ? 32 : 42) * s * fs}px`, fontWeight: 500, lineHeight: 1.35, color: hasImage ? mainTxt : secondaryTxt, opacity: 0.85 }}>{renderAccentText(bottomText, accentTxt, hasImage ? mainTxt : secondaryTxt, (hasImage ? 32 : 42) * fs, s)}</p></div>}
        </div>
        {renderLogo()}
      </div>
    );
  };

  // Clamp wizardStep to valid range when WIZARD_STEPS changes dynamically
  useEffect(() => {
    if (wizardStep >= WIZARD_STEPS.length && WIZARD_STEPS.length > 0) {
      setWizardStep(WIZARD_STEPS.length - 1);
      return;
    }

    // Auto-advance to Pesquisa step when web search completes while on Tema
    const currentName = WIZARD_STEPS[wizardStep];
    if (currentName === 'Tema' && !searchingWeb && hasWebResearch) {
      const pesquisaIdx = WIZARD_STEPS.indexOf('Pesquisa');
      if (pesquisaIdx >= 0) setWizardStep(pesquisaIdx);
      return;
    }

    if (!searchingWeb && hasWebResearch) {
      if (currentName === 'Pessoas' || currentName === 'Visual') {
        const roteiroIdx = WIZARD_STEPS.indexOf('Roteiro');
        if (roteiroIdx >= 0) setWizardStep(roteiroIdx);
      }
    }
  }, [WIZARD_STEPS, wizardStep, searchingWeb, hasWebResearch]);

  // Auto-skip Cores/Fontes steps if marketplace full-bleed style is active (advanced mode only)
  const currentStepName = WIZARD_STEPS[wizardStep] || '';

  const canProceed = currentStepName === 'Modo' ? true : currentStepName === 'Tema' ? (topic.trim().length > 0 || manualPostText.trim().length > 0) : currentStepName === 'Estilo' ? (wizardMode === 'extreme' ? true : !!activeMarketplaceStyle) : true;

  // Auto-generate roteiro when entering the Roteiro step (no manual button press needed)
  const autoRoteiroTriggered = useRef(false);
  useEffect(() => {
    if (currentStepName !== 'Roteiro') {
      autoRoteiroTriggered.current = false;
      return;
    }
    if (autoRoteiroTriggered.current || generatingRoteiro) return;
    if (!topic.trim()) return;

    autoRoteiroTriggered.current = true;
    (async () => {
      setGeneratingRoteiro(true);
      setCardPhotoAssignments({});
      setCardPhotoOptions({});
      const totalCards = contentMode === 'single-post' ? 1 : cardCount;
      const localFallback = () => {
        if (contentMode === 'single-post') return [{ title: topic.trim().slice(0, 60), body: '' }];
        return Array.from({ length: totalCards }, (_, i) => {
          if (i === 0) return { title: topic.trim().slice(0, 60), body: 'Descubra tudo sobre este assunto' };
          if (i === totalCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
          return { title: `Ponto ${i}`, body: '' };
        });
      };

      let generatedOutline: { title?: string; body?: string }[] = [];
      try {
        console.log('[AutoRoteiro] Auto-generating outline on step entry');
        const { data: outlineData, error: outlineErr } = await supabase.functions.invoke('generate-carousel', {
          body: { action: 'generate-outline', topic: topic.trim(), cardCount: totalCards, contentMode },
        });
        if (!outlineErr && outlineData?.outline && Array.isArray(outlineData.outline) && outlineData.outline.length > 0) {
          generatedOutline = outlineData.outline;
          setManualCardTexts(outlineData.outline);
        } else {
          generatedOutline = localFallback();
          setManualCardTexts(generatedOutline);
        }
      } catch (err) {
        console.error('[AutoRoteiro] Error:', err);
        generatedOutline = localFallback();
        setManualCardTexts(generatedOutline);
      }

      setRoteiroGenerated(true);
      await assignPerCardWebPhotos(generatedOutline, totalCards);
      setGeneratingRoteiro(false);
    })();
  }, [currentStepName, generatingRoteiro, topic, contentMode, cardCount, assignPerCardWebPhotos]);


  // Voice guide: speak on step change (only after welcome is dismissed)
  useEffect(() => {
    // Don't speak when loading an already-generated carousel
    if (!showWelcome && !carouselData && !loadingCarousel) {
      speakStep(wizardStep);
    }
  }, [wizardStep, speakStep, showWelcome, carouselData, loadingCarousel]);


  useEffect(() => {
    if ((wizardMode === 'advanced' && isFullBleedMarketplace && (currentStepName === 'Cores' || currentStepName === 'Fontes')) ||
        (!searchingWeb && !skipWebSearch && hasWebImages && (currentStepName === 'Pessoas' || currentStepName === 'Visual'))) {
      const roteiroIdx = WIZARD_STEPS.indexOf('Roteiro');
      if (roteiroIdx >= 0) setWizardStep(roteiroIdx);
    }
  }, [wizardStep, isFullBleedMarketplace, wizardMode, currentStepName, searchingWeb, skipWebSearch, hasWebImages, WIZARD_STEPS]);

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
              onStartCarousel={(newTopic?: string, _mentionedPrompts?: any[], newPostFormat?: string) => {
                resetWizardState();
                setShowWelcome(false);
                if (newPostFormat && newPostFormat in FORMAT_DIMENSIONS) {
                  setPostFormat(newPostFormat as PostFormatType);
                }
                if (newTopic) {
                  setTopic(newTopic); setOriginalTopic(newTopic);
                }
              }}
              onLoadCarousel={async (item: any) => {
                setLoadingCarousel(true);
                try {
                  // Load directly only when payload is truly complete (includes generation_config for mode/theme restore)
                  if (item?.carousel_data && item?.generation_config) {
                    loadCarousel(item);
                    setShowWelcome(false);
                    return;
                  }

                  const { data, error } = await supabase
                    .from('generated_carousels')
                    .select('id, topic, keywords, carousel_data, marketplace_style_id, style_config, generation_config, post_format')
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
                              backgroundColor: realIndex === wizardStep ? modeTheme.loadingColor : realIndex < wizardStep ? `rgba(${modeTheme.rgb},0.5)` : 'rgba(255,255,255,0.08)',
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
                      <StepMode 
                        wizardMode={wizardMode} 
                        setWizardMode={setWizardMode}
                        allowAdvanced={planLimits.allowAdvanced}
                        allowExtreme={planLimits.allowExtreme}
                        requiredPlanForAdvanced="Pro"
                        requiredPlanForExtreme="Growth"
                      />
                    )}
                    {currentStepName === 'Visão' && (
                      <StepExtremeVision
                         onAnalysisComplete={(analysis, vision) => {
                          setExtremeAnalysis(analysis);
                          setExtremeVision(vision);
                          if (analysis.suggestedTopic) setTopic(analysis.suggestedTopic);
                          setExtremeFormValues({});
                          // Auto-advance: after analysis, Detalhes will be at index 2
                          // After analysis, advance to Logo step (Modo=0, Visão=1, Logo=2, Detalhes=3)
                          setWizardStep(2);
                        }}
                      />
                    )}
                    {currentStepName === 'Detalhes' && extremeAnalysis && (
                      <StepExtremeForm
                        analysis={extremeAnalysis}
                        values={extremeFormValues}
                        onChange={setExtremeFormValues}
                        brandColors={logoBrandColors}
                      />
                    )}
                    {currentStepName === 'Fontes' && extremeAnalysis && (
                      <StepExtremeFonts
                        selectedFont={extremeSelectedFont}
                        onSelect={setExtremeSelectedFont}
                      />
                    )}
                    {currentStepName === 'Referências' && extremeAnalysis && (
                      <StepExtremeBehanceRefs
                        vision={extremeVision}
                        suggestedStyle={extremeAnalysis.suggestedStyle}
                        selectedImages={extremeBehanceRefs}
                        onSelectionChange={setExtremeBehanceRefs}
                      />
                    )}
                    {currentStepName === 'Resumo' && extremeAnalysis && (
                      <StepExtremeResumo
                        analysis={extremeAnalysis}
                        vision={extremeVision}
                        formValues={extremeFormValues}
                        contentMode={contentMode}
                        setContentMode={setContentMode}
                        cardCount={cardCount}
                        setCardCount={setCardCount}
                        speed={imageSettings.model === 'nano-banana' ? 'pro' : 'flash'}
                        setSpeed={(s) => setImageSettings(prev => ({ ...prev, model: s === 'pro' ? 'nano-banana' : 'gemini' }))}
                        hideGenerateButton={contentMode === 'carousel' && cardCount > 1}
                        generating={generating || transitionToGenerate}
                        onGenerate={() => {
                          const nextIsSinglePost = cardCount === 1;
                          if (nextIsSinglePost) {
                            setContentMode('single-post');
                            setImageCardCount(1);
                          } else {
                            setContentMode('carousel');
                            setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                          }

                          // Inject extreme form photos + exact text context
                          if (extremeAnalysis) {
                            const newRefs: Array<{ url: string; thumb: string; label: string; source: 'upload'; category: 'product' | 'style' }> = [];
                            for (const field of extremeAnalysis.fields) {
                              if (field.type === 'photo_upload') {
                                const photos = extremeFormValues[field.id] as string[] | undefined;
                                if (photos?.length) {
                                  const fieldLabel = (field.label + ' ' + (field.id || '')).toLowerCase();
                                  const isProduct = /print|screenshot|tela|app|produto|mockup|logo|marca/i.test(fieldLabel);
                                  photos.forEach((url, idx) => {
                                    newRefs.push({
                                      url,
                                      thumb: url,
                                      label: `${field.label} ${idx + 1}`,
                                      source: 'upload' as const,
                                      category: isProduct ? 'product' : 'style',
                                    });
                                  });
                                }
                              }
                            }

                            // Add Behance style references
                            if (extremeBehanceRefs.length > 0) {
                              extremeBehanceRefs.forEach((url, idx) => {
                                newRefs.push({
                                  url,
                                  thumb: url,
                                  label: `Behance Ref ${idx + 1}`,
                                  source: 'upload' as const,
                                  category: 'style' as const,
                                });
                              });
                            }

                            // Add font reference if selected
                            if (extremeSelectedFont) {
                              newRefs.push({
                                url: extremeSelectedFont.previewUrl,
                                thumb: extremeSelectedFont.previewUrl,
                                label: `Fonte: ${extremeSelectedFont.name}`,
                                source: 'upload' as const,
                                category: 'style' as const,
                              });
                            }

                            if (newRefs.length > 0) {
                              setReferenceImages(prev => [...prev, ...newRefs]);
                            }

                            const exactText = getExtremeExactText();
                            setManualPostText(exactText || '');

                            const formSummary = extremeAnalysis.fields
                              .filter(f => extremeFormValues[f.id] && f.type !== 'photo_upload')
                              .map(f => `${f.label}: ${extremeFormValues[f.id]}`)
                              .join('. ');

                            const photoFields = extremeAnalysis.fields.filter(f => f.type === 'photo_upload' && (extremeFormValues[f.id] as string[])?.length > 0);
                            const photoContext = photoFields.map(f => {
                              const count = (extremeFormValues[f.id] as string[]).length;
                              return `[${count} imagem(ns) de "${f.label}" fornecida(s) como referência obrigatória]`;
                            }).join(' ');

                            const fontContext = extremeSelectedFont
                              ? `FONTE TIPOGRÁFICA OBRIGATÓRIA: Use EXATAMENTE a fonte "${extremeSelectedFont.name}" como referência visual. A imagem de preview da fonte foi incluída nas referências de estilo. Replique fielmente o estilo, peso e proporções desta fonte em todos os textos do design.`
                              : '';

                            const enrichedTopic = [
                              `MODO EXTREME — VISÃO DO USUÁRIO: ${extremeVision}`,
                              formSummary ? `DETALHES: ${formSummary}` : '',
                              exactText ? `TEXTO EXATO OBRIGATÓRIO (NÃO ALTERAR, NÃO REESCREVER): "${exactText}"` : '',
                              photoContext || '',
                              fontContext,
                              'INSTRUÇÃO: Crie a imagem EXATAMENTE como o usuário descreveu. Use as fotos de referência como ELEMENTOS OBRIGATÓRIOS na composição (ex: se enviou print de app, coloque na tela de um mockup de celular; se enviou logo, inclua no design).',
                              `FORMATO OBRIGATÓRIO: Cada card do carrossel deve ser UMA ÚNICA imagem/composição visual completa (${cardW}x${cardH}). NUNCA crie grids, colagens, mosaicos ou sub-divisões dentro de um card. Cada card = 1 cena única.`,
                            ].filter(Boolean).join('\n');
                            setTopic(enrichedTopic);
                          }

                          setTransitionToGenerate(true);
                          setTimeout(() => generateContent(), 1200);
                        }}
                      />
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
                        classifyingTopic={classifyingTopic}
                        webSearchSuggestion={webSearchSuggestion}
                        onAcceptWebSearch={async () => {
                          setWebSearchSuggestion(null);
                          setWebSearchDecisionMade(true);
                          await handleSearchWeb();
                        }}
                        onDeclineWebSearch={() => {
                          setWebSearchSuggestion(null);
                          setWebSearchDecisionMade(true);
                          setSkipWebSearch(true);
                        }}
                        setContentMode={(mode) => {
                          setContentMode(mode);
                          if (mode === 'single-post') { setCardCount(1); setImageCardCount(1); }
                          else if (cardCount < 2) { setCardCount(5); }
                        }} />
                    )}
                    {currentStepName === 'Pesquisa' && (
                      <StepWebSearchResult
                        webSearchResult={webSearchResult}
                        searchingWeb={searchingWeb}
                        onSearchWeb={handleSearchWeb}
                        skipWebSearch={skipWebSearch}
                        onToggleSkipWebSearch={() => { setSkipWebSearch(true); setWebSearchResult(null); setWizardStep(wizardStep + 1); }}
                      />
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
                        maxSlides={planLimits.maxSlidesPerCarousel}
                        allowContinuousMode={planLimits.allowContinuousMode}
                      />
                    )}
                    {currentStepName === 'Fotos' && (
                      <StepWebImages referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        webImages={webSearchResult?.images} onSkip={() => setWizardStep(wizardStep + 1)} />
                    )}
                    {currentStepName === 'Personalização' && (
                      <StepPersonalization
                        facePersons={facePersons} setFacePersons={setFacePersons}
                        referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        allPeopleOnCover={allPeopleOnCover} setAllPeopleOnCover={setAllPeopleOnCover}
                        faceGender={faceGender} setFaceGender={setFaceGender}
                        wearsGlasses={wearsGlasses} setWearsGlasses={setWearsGlasses}
                        brandAssets={brandAssets}
                        onSuggestColors={(palette) => setBrandSuggestedPalette(palette)}
                        showHeader={showHeader} setShowHeader={setShowHeader}
                        logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                        logoDarkUrl={logoDarkUrl} setLogoDarkUrl={setLogoDarkUrl}
                        logoPosition={logoPosition} setLogoPosition={setLogoPosition}
                        logoBrandColors={logoBrandColors}
                        useBrandColors={useBrandColors} setUseBrandColors={setUseBrandColors}
                        brandName={brandName} setBrandName={setBrandName}
                        userName={userName} setUserName={setUserName}
                        dateLabel={dateLabel} setDateLabel={setDateLabel}
                        hasWebImages={hasWebImages}
                        webFacePosition={webFacePosition} setWebFacePosition={setWebFacePosition}
                        onSkipAll={() => setWizardStep(wizardStep + 1)}
                        activeMarketplaceStyle={activeMarketplaceStyle}
                        isExtreme={wizardMode === 'extreme'}
                      />
                    )}
                    {currentStepName === 'Pessoas' && (
                      <StepPeopleMode
                        peopleMode={peopleMode} setPeopleMode={setPeopleMode}
                        randomFaceCount={randomFaceCount} setRandomFaceCount={setRandomFaceCount}
                        cardCount={cardCount} />
                    )}
                    {currentStepName === 'Visual' && (
                      <StepVisualStyle
                        selectedCategory={visualCategory} setSelectedCategory={setVisualCategory}
                        visualSearchQuery={visualSearchQuery} setVisualSearchQuery={setVisualSearchQuery}
                        referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                        topic={topic} mentionedPrompts={mentionedPrompts} productAnalysis={productAnalysis} />
                    )}
                    {currentStepName === 'Fotos Imóvel' && (
                      <StepPropertyPhotos
                        properties={propertyList}
                        setProperties={setPropertyList}
                        realEstateMode={realEstateMode}
                        cardCount={cardCount}
                      />
                    )}
                    {currentStepName === 'Crop Imóvel' && (
                      <StepPropertyCrop
                        properties={propertyList}
                        setProperties={setPropertyList}
                      />
                    )}
                    {currentStepName === 'Info Imóvel' && (
                      <StepPropertyInfo
                        properties={propertyList}
                        setProperties={setPropertyList}
                        realEstateMode={realEstateMode}
                      />
                    )}
                    {currentStepName === 'Produto' && (
                      <StepProduct productImages={productImages} setProductImages={setProductImages}
                        productAnalysis={productAnalysis} setProductAnalysis={setProductAnalysis}
                        analyzingProduct={analyzingProduct} setAnalyzingProduct={setAnalyzingProduct}
                        productSize={productSize} setProductSize={setProductSize}
                        topic={topic}
                        imageSettings={imageSettings}
                        onUpdateImageSettings={setImageSettings}
                        mentionedPrompts={mentionedPrompts} />
                    )}
                    {/* Marca step removed — merged into Personalização */}
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
                    {currentStepName === 'Fontes' && !isFullBleedMarketplace && wizardMode !== 'extreme' && (
                      <StepFonts selectedFont={selectedFont} setSelectedFont={setSelectedFont} />
                    )}
                    {currentStepName === 'Roteiro' && (
                      <StepCardTexts
                        cardCount={cardCount}
                        contentMode={contentMode}
                        manualCardTexts={manualCardTexts}
                        setManualCardTexts={setManualCardTexts}
                        topic={topic}
                        accentTheme={wizardMode === 'extreme' ? 'orange' : wizardMode === 'advanced' ? 'red' : 'purple'}
                        webImages={webSearchResult?.images}
                        cardPhotoAssignments={cardPhotoAssignments}
                        cardPhotoOptions={cardPhotoOptions}
                        setCardPhotoAssignments={setCardPhotoAssignments}
                        onOutlineGenerated={(outline) => assignPerCardWebPhotos(outline, contentMode === 'single-post' ? 1 : cardCount)} />
                    )}
                    {currentStepName === 'Logo' && (
                      <StepBranding
                        showHeader={showHeader} setShowHeader={setShowHeader}
                        logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                        logoDarkUrl={logoDarkUrl} setLogoDarkUrl={setLogoDarkUrl}
                        logoPosition={logoPosition} setLogoPosition={setLogoPosition}
                        logoBrandColors={logoBrandColors}
                        useBrandColors={useBrandColors}
                        setUseBrandColors={setUseBrandColors}
                        brandName={brandName} setBrandName={setBrandName}
                        userName={userName} setUserName={setUserName}
                        dateLabel={dateLabel} setDateLabel={setDateLabel}
                        isExtreme={wizardMode === 'extreme'} />
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

                    {(currentStepName === 'Visão' || (currentStepName === 'Resumo' && !(contentMode === 'carousel' && cardCount > 1 && wizardMode === 'extreme'))) ? (
                      <div />
                    ) : wizardStep < WIZARD_STEPS.length - 1 ? (
                      <div className="flex items-center gap-2">
                        {/* Skip button for optional steps */}
                        {(currentStepName === 'Rosto' || currentStepName === 'Pessoas' || currentStepName === 'Visual' || currentStepName === 'Produto' || currentStepName === 'Marca' || currentStepName === 'Roteiro' || currentStepName === 'Imóvel') && (
                          <button onClick={() => setWizardStep(wizardStep + 1)}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all">
                            Pular
                          </button>
                        )}
                        <button onClick={async () => {
                            const hasManualText = manualPostText.trim().length > 0;
                            // Smart web search classification on Tema step
                            if (currentStepName === 'Tema' && !webSearchResult && !skipWebSearch && topic.trim() && !hasManualText && !webSearchDecisionMade) {
                              // Classify the topic first
                              setClassifyingTopic(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('generate-carousel', {
                                  body: { action: 'classify-topic', topic: topic.trim() },
                                });
                                if (!error && data) {
                                  if (data.shouldSearch) {
                                    // Auto-search immediately without asking
                                    setWebSearchDecisionMade(true);
                                    setClassifyingTopic(false);
                                    await handleSearchWeb();
                                    // Don't advance — let user see results and click Continue again
                                    return;
                                  } else {
                                    // Personal/opinion content - skip web search automatically
                                    setSkipWebSearch(true);
                                    setWebSearchDecisionMade(true);
                                  }
                                }
                              } catch (err) {
                                console.error('Classification error:', err);
                                // On error, skip search and continue
                                setSkipWebSearch(true);
                                setWebSearchDecisionMade(true);
                              }
                              setClassifyingTopic(false);
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
                            // Extreme Resumo → Roteiro: set up context before advancing
                            if (currentStepName === 'Resumo' && wizardMode === 'extreme' && contentMode === 'carousel' && cardCount > 1 && extremeAnalysis) {
                              // Same setup as onGenerate but WITHOUT triggering generation
                              const nextIsSinglePost = cardCount === 1;
                              if (nextIsSinglePost) {
                                setContentMode('single-post');
                                setImageCardCount(1);
                              } else {
                                setContentMode('carousel');
                                setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                              }

                              const newRefs: Array<{ url: string; thumb: string; label: string; source: 'upload'; category: 'product' | 'style' }> = [];
                              for (const field of extremeAnalysis.fields) {
                                if (field.type === 'photo_upload') {
                                  const photos = extremeFormValues[field.id] as string[] | undefined;
                                  if (photos?.length) {
                                    const fieldLabel = (field.label + ' ' + (field.id || '')).toLowerCase();
                                    const isProduct = /print|screenshot|tela|app|produto|mockup|logo|marca/i.test(fieldLabel);
                                    photos.forEach((url, idx) => {
                                      newRefs.push({ url, thumb: url, label: `${field.label} ${idx + 1}`, source: 'upload' as const, category: isProduct ? 'product' : 'style' });
                                    });
                                  }
                                }
                              }
                              if (extremeBehanceRefs.length > 0) {
                                extremeBehanceRefs.forEach((url, idx) => {
                                  newRefs.push({ url, thumb: url, label: `Behance Ref ${idx + 1}`, source: 'upload' as const, category: 'style' as const });
                                });
                              }
                              if (extremeSelectedFont) {
                                newRefs.push({ url: extremeSelectedFont.previewUrl, thumb: extremeSelectedFont.previewUrl, label: `Fonte: ${extremeSelectedFont.name}`, source: 'upload' as const, category: 'style' as const });
                              }
                              if (newRefs.length > 0) {
                                setReferenceImages(prev => [...prev, ...newRefs]);
                              }

                              const exactText = getExtremeExactText();
                              setManualPostText(exactText || '');

                              const formSummary = extremeAnalysis.fields
                                .filter(f => extremeFormValues[f.id] && f.type !== 'photo_upload')
                                .map(f => `${f.label}: ${extremeFormValues[f.id]}`)
                                .join('. ');
                              const photoFields = extremeAnalysis.fields.filter(f => f.type === 'photo_upload' && (extremeFormValues[f.id] as string[])?.length > 0);
                              const photoContext = photoFields.map(f => {
                                const count = (extremeFormValues[f.id] as string[]).length;
                                return `[${count} imagem(ns) de "${f.label}" fornecida(s) como referência obrigatória]`;
                              }).join(' ');
                              const fontContext = extremeSelectedFont
                                ? `FONTE TIPOGRÁFICA OBRIGATÓRIA: Use EXATAMENTE a fonte "${extremeSelectedFont.name}" como referência visual.`
                                : '';

                              const enrichedTopic = [
                                `MODO EXTREME — VISÃO DO USUÁRIO: ${extremeVision}`,
                                formSummary ? `DETALHES: ${formSummary}` : '',
                                exactText ? `TEXTO EXATO OBRIGATÓRIO (NÃO ALTERAR, NÃO REESCREVER): "${exactText}"` : '',
                                photoContext || '',
                                fontContext,
                                'INSTRUÇÃO: Crie a imagem EXATAMENTE como o usuário descreveu. Use as fotos de referência como ELEMENTOS OBRIGATÓRIOS na composição.',
                                'FORMATO OBRIGATÓRIO: Cada card do carrossel deve ser UMA ÚNICA imagem/composição visual completa (1080x1080). NUNCA crie grids, colagens, mosaicos ou sub-divisões dentro de um card.',
                                'DIFERENCIAÇÃO DE CARDS: Card 1 = CAPA impactante (hero/título grande). Cards intermediários = CONTEÚDO (slides informativos, NÃO capas). Último card = CTA (call-to-action). Cada card DEVE ter um visual DIFERENTE.',
                              ].filter(Boolean).join('\n');
                              setTopic(enrichedTopic);
                            }
                            // Roteiro step: auto-generate on first click, advance on second
                            if (currentStepName === 'Roteiro') {
                              const hasAnyCardText = manualCardTexts.some(t => (t.title || '').trim() || (t.body || '').trim());
                              if (!hasAnyCardText && !roteiroGenerated) {
                                // First click: generate the outline
                                setGeneratingRoteiro(true);
                                let generated = false;
                                const totalCards = contentMode === 'single-post' ? 1 : cardCount;
                                
                                // Local fallback generator
                                const localFallback = () => {
                                  if (contentMode === 'single-post') {
                                    return [{ title: topic.trim().slice(0, 60), body: '' }];
                                  }
                                  return Array.from({ length: totalCards }, (_, i) => {
                                    if (i === 0) return { title: topic.trim().slice(0, 60), body: 'Descubra tudo sobre este assunto' };
                                    if (i === totalCards - 1) return { title: 'Gostou?', body: 'Siga para mais conteúdo!' };
                                    return { title: `Ponto ${i}`, body: '' };
                                  });
                                };

                                let generatedOutline: { title?: string; body?: string }[] = [];
                                try {
                                  console.log('[Wizard] Auto-generating outline, topic:', topic.trim(), 'cards:', totalCards);
                                  const { data: outlineData, error: outlineErr } = await supabase.functions.invoke('generate-carousel', {
                                    body: {
                                      action: 'generate-outline',
                                      topic: topic.trim(),
                                      cardCount: totalCards,
                                      contentMode,
                                    },
                                  });
                                  console.log('[Wizard] Outline response:', { outlineData, outlineErr });
                                  if (!outlineErr && outlineData?.outline && Array.isArray(outlineData.outline) && outlineData.outline.length > 0) {
                                    generatedOutline = outlineData.outline;
                                    setManualCardTexts(outlineData.outline);
                                  } else {
                                    // Edge function returned empty — use local fallback
                                    console.warn('Outline API returned empty, using local fallback');
                                    generatedOutline = localFallback();
                                    setManualCardTexts(generatedOutline);
                                  }
                                } catch (err) {
                                  console.error('Auto roteiro error, using local fallback:', err);
                                  generatedOutline = localFallback();
                                  setManualCardTexts(generatedOutline);
                                }
                                
                                setRoteiroGenerated(true);
                                if (webSearchResult?.images?.length && !skipWebSearch) {
                                  const outlineToUse = generatedOutline.length > 0 ? generatedOutline : manualCardTexts;
                                  await assignPerCardWebPhotos(outlineToUse, totalCards);
                                } else if (webSearchResult?.images?.length && Object.keys(cardPhotoAssignments).length === 0) {
                                  // No per-card search possible, fallback to round-robin
                                  const webImgs = webSearchResult.images.filter((u: string) => u && u.startsWith('http'));
                                  if (webImgs.length > 0) {
                                    const assignments: Record<number, string> = {};
                                    const usedUrls = new Set<string>();
                                    for (let ci = 0; ci < totalCards; ci++) {
                                      let bestImg = '';
                                      for (const url of webImgs) {
                                        if (!usedUrls.has(url)) { bestImg = url; break; }
                                      }
                                      if (!bestImg) bestImg = webImgs[ci % webImgs.length];
                                      if (bestImg) { assignments[ci] = bestImg; usedUrls.add(bestImg); }
                                    }
                                    setCardPhotoAssignments(assignments);
                                  }
                                }
                                generated = true;
                                setGeneratingRoteiro(false);

                                if (generated) {
                                  return; // Stay on step to review generated outline
                                }
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
                          }} disabled={!canProceed || searchingWeb || generatingRoteiro || !!webSearchSuggestion}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
                          style={{ background: modeTheme.gradient }}>
                          {searchingWeb ? <><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando...</> : generatingRoteiro ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando roteiro...</> : <>Continuar <ChevronRight className="h-4 w-4" /></>}
                        </button>
                      </div>
                    ) : (
                      <button onClick={async () => {
                          if (isGuest) {
                            // Guests always generate single post - set state AND call directly
                            setContentMode('single-post');
                            setCardCount(1);
                            setImageCardCount(1);
                            setTransitionToGenerate(true);
                            // CRITICAL: Set snapshot before calling generateSinglePost (same as non-guest flow)
                            const clickTimeIsRealEstate = !!activeMarketplaceStyle?.is_real_estate;
                            const frozenPropertyList = propertyList.map(p => ({
                              ...p,
                              photos: p.photos.map(ph => ({ ...ph })),
                            }));
                            // Convert blob URLs to base64
                            for (const prop of frozenPropertyList) {
                              for (let pi = 0; pi < prop.photos.length; pi++) {
                                const url = prop.photos[pi].url;
                                if (url && !url.startsWith('data:')) {
                                  try {
                                    const resp = await fetch(url);
                                    const blob = await resp.blob();
                                    const b64 = await new Promise<string>((res, rej) => {
                                      const r = new FileReader();
                                      r.onloadend = () => res(r.result as string);
                                      r.onerror = rej;
                                      r.readAsDataURL(blob);
                                    });
                                    prop.photos[pi] = { ...prop.photos[pi], url: b64 };
                                  } catch (e) { console.warn('[GUEST_SNAPSHOT] blob->b64 fail:', e); }
                                }
                              }
                            }
                            generationSnapshotRef.current = {
                              isRealEstate: clickTimeIsRealEstate,
                              realEstateMode: (activeMarketplaceStyle?.real_estate_mode as 'single' | 'multiple') || 'single',
                              propertyList: JSON.parse(JSON.stringify(frozenPropertyList)),
                              marketplaceStyle: activeMarketplaceStyle ? { ...activeMarketplaceStyle } : null,
                            };
                            propertyListRef.current = propertyList;
                            activeMarketplaceStyleRef.current = activeMarketplaceStyle;
                            // Call generateSinglePost directly to avoid state timing issues
                            setTimeout(() => generateSinglePost(), 1200);
                          } else {
                            if (cardCount === 1) {
                              setContentMode('single-post');
                              setImageCardCount(1);
                            } else {
                              setImageCardCount(Math.max(2, Math.round(cardCount * 0.7)));
                            }
                            // DEFINITIVE: Snapshot ALL critical data at click time — immune to stale closures
                            const clickTimeIsRealEstate = !!activeMarketplaceStyle?.is_real_estate;
                            // Force-convert any blob: URLs to base64 before snapshot
                            const frozenPropertyList = propertyList.map(p => ({
                              ...p,
                              photos: p.photos.map(ph => ({ ...ph })), // shallow copy photos
                            }));
                            // Async: convert all blob URLs to base64 right now
                            const convertAllPhotos = async () => {
                              for (const prop of frozenPropertyList) {
                                for (let pi = 0; pi < prop.photos.length; pi++) {
                                  const url = prop.photos[pi].url;
                                  if (url && !url.startsWith('data:')) {
                                    try {
                                      const resp = await fetch(url);
                                      const blob = await resp.blob();
                                      const b64 = await new Promise<string>((res, rej) => {
                                        const r = new FileReader();
                                        r.onloadend = () => res(r.result as string);
                                        r.onerror = rej;
                                        r.readAsDataURL(blob);
                                      });
                                      prop.photos[pi] = { ...prop.photos[pi], url: b64 };
                                    } catch (e) { console.warn('[SNAPSHOT] blob->b64 fail:', e); }
                                  }
                                }
                              }
                            };
                            convertAllPhotos().then(() => {
                              generationSnapshotRef.current = {
                                isRealEstate: clickTimeIsRealEstate,
                                realEstateMode: (activeMarketplaceStyle?.real_estate_mode as 'single' | 'multiple') || 'single',
                                propertyList: JSON.parse(JSON.stringify(frozenPropertyList)),
                                marketplaceStyle: activeMarketplaceStyle ? { ...activeMarketplaceStyle } : null,
                              };
                              console.log('[REAL_ESTATE_SNAPSHOT] Created at click time:', JSON.stringify({
                                isRealEstate: clickTimeIsRealEstate,
                                propertyPhotos: frozenPropertyList.map(p => p.photos.length),
                                firstPhotoPrefix: frozenPropertyList[0]?.photos?.[0]?.url?.substring(0, 30) || 'NONE',
                                styleName: activeMarketplaceStyle?.name || activeMarketplaceStyle?._styleName,
                              }));
                            });
                            propertyListRef.current = propertyList;
                            activeMarketplaceStyleRef.current = activeMarketplaceStyle;
                            setTransitionToGenerate(true);
                            setTimeout(() => generateContent(), 1200);
                          }
                        }} disabled={generating || transitionToGenerate || !topic.trim()}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
                        style={{ background: modeTheme.gradient }}>
                        {isGuest ? <><Sparkles className="h-4 w-4" /> Gerar Post Grátis</> : <><Sparkles className="h-4 w-4" /> {contentMode === 'single-post' ? 'Gerar Post' : 'Gerar Carrossel'}</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Carousel loader animation with step percentage */}
              <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="carousel-loader-wrapper" style={{ width: '240px', height: '240px' }}>
                  <div className={`carousel-loader-spinner ${wizardMode === 'extreme' ? 'carousel-loader-spinner--orange' : wizardMode === 'advanced' ? 'carousel-loader-spinner--red' : ''}`} />
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
                      <div className={`carousel-loader-spinner ${wizardMode === 'extreme' ? 'carousel-loader-spinner--orange' : wizardMode === 'advanced' ? 'carousel-loader-spinner--red' : ''}`} />
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
                  voiceEnabled ? (wizardMode === 'extreme' ? 'bg-orange-500/20 text-orange-400' : wizardMode === 'advanced' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400') : 'bg-white/[0.06] text-white/15 hover:text-white/30'
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
        {(generating || generatingAllImages || completingGeneration) && !transitionToGenerate && (
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
            isExtreme={wizardMode === 'extreme'}
            wizardMode={wizardMode}
            isCompleting={completingGeneration}
            onCompleteAnimationDone={handleCompleteAnimationDone}
            onGoHome={user ? () => {
              // Trigger cloud fallback for the current job
              const jobId = cloudJobIdRef.current;
              if (jobId) {
                triggerCloudFallback(jobId);
              }
              // Reset generation state and go to dashboard
              setGenerating(false);
              setGeneratingAllImages(false);
              setImageGenProgress('');
              setTransitionToGenerate(false);
              setCompletingGeneration(false);
              setCarouselData(null);
              setCurrentCarouselId(null);
              setShowWelcome(true);
            } : undefined}
          />
        )}

        {/* ===== INSTAGRAM MOCKUP PREVIEW ===== */}
        {carouselData && editingCard === null && (() => {
           const isExtreme = wizardMode === 'extreme';
          const themeHex = modeTheme.hex;
          const themeHexDark = modeTheme.hexDark;
          const themeRgb = modeTheme.rgb;
          const themeRgb2 = modeTheme.rgb2;
          return (
          <motion.div
            className="flex-1 flex flex-col items-center justify-start px-4 relative overflow-y-auto overflow-x-hidden"
            style={{ backgroundColor: '#0A0A0A' }}
            initial={resultEntrance ? { opacity: 0, y: 40, scale: 0.97 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header bar */}
            <div className="w-full flex items-center justify-between px-2 py-3 z-20 relative shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowWelcome(true); setCurrentCarouselId(null); }}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Home className="w-5 h-5 text-white/60" />
                </button>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ color: themeHex, backgroundColor: `rgba(${themeRgb},0.12)`, border: `1px solid rgba(${themeRgb},0.25)` }}>
                  {wizardMode === 'extreme' ? 'Modo Extreme' : wizardMode === 'advanced' ? 'Modo Avançado' : 'Modo Simples'}
                  {activeMarketplaceStyle?.name && (
                    <>, tema {activeMarketplaceStyle.name}</>
                  )}
                </span>
              </div>
              <button
                onClick={() => { if (isGuest) { setShowGuestPaywall(true); } else { exportAllCards('png'); } }}
                disabled={exporting}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${themeHex}, ${themeHexDark})` }}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Salvar Post
              </button>
            </div>
            {/* Subtle background glow effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px] pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${themeRgb},0.4) 0%, transparent 70%)` }} />
            <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${themeRgb2},0.5) 0%, transparent 70%)` }} />

            {/* Center area: phone + inline editor panel */}
            <div className="flex flex-row items-start justify-center gap-0 md:gap-6 flex-1 relative z-10">

            {/* Tools Sidebar - slides in from left on desktop */}
            <AnimatePresence>
              {showInlineEditor && carouselData && (
                <motion.div
                  key="inline-editor-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="hidden md:block overflow-hidden flex-shrink-0 h-[85vh] sticky top-0"
                >
                  <div className="w-[320px] h-full overflow-y-auto rounded-2xl p-4 flex flex-col gap-1"
                    style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1 px-1">
                      <h3 className="text-sm font-semibold text-white/80">Ferramentas</h3>
                      <button onClick={() => setShowInlineEditor(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Mode & Topic badge */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-[11px]" style={{ backgroundColor: `rgba(${themeRgb},0.06)`, border: `1px solid rgba(${themeRgb},0.12)` }}>
                      <span className="font-bold uppercase tracking-wider" style={{ color: themeHex }}>
                        {wizardMode === 'extreme' ? 'Extreme' : wizardMode === 'advanced' ? 'Avançado' : 'Simples'}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-white/50 truncate flex-1">{topic || 'Sem tema'}</span>
                    </div>

                    {/* Auto-save status */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-white/40 border border-white/5 mb-2">
                      {autoSaveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : autoSaveStatus === 'saved' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Save className="h-3.5 w-3.5" />}
                      {autoSaveStatus === 'saving' ? 'Salvando...' : autoSaveStatus === 'saved' ? 'Salvo!' : 'Auto-save'}
                    </div>

                    {/* Export */}
                    <button onClick={isGuest ? () => setShowGuestPaywall(true) : () => setShowExportMenu(true)} disabled={exporting}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium text-white border transition-all disabled:opacity-50 w-full"
                      style={{ borderColor: `rgba(${themeRgb},0.3)`, background: `linear-gradient(135deg, rgba(${themeRgb},0.12), rgba(${themeRgb},0.04))` }}>
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : isGuest ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" style={{ color: themeHex }} />}
                      {isGuest ? 'Assine para baixar' : 'Exportar'}
                    </button>

                    {/* Stories - hidden */}

                    {/* Generate carousel from cover */}

                    {/* Style used */}
                    {(activeMarketplaceStyle?.name || loadedMarketplaceStyleId) && (
                      <div className="px-3 py-2.5 rounded-xl text-xs border border-white/5 mb-1" style={{ backgroundColor: `rgba(${themeRgb},0.06)` }}>
                        <span className="text-white/40">Estilo: </span>
                        <span className="font-medium" style={{ color: themeHex }}>{activeMarketplaceStyle?.name || 'Estilo carregado'}</span>
                      </div>
                    )}

                    <div className="h-px bg-white/[0.06] my-1" />

                    {/* Ver Prompt (full generation config) */}
                    <button
                      onClick={() => setShowFullConfigModal(true)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-yellow-300 hover:text-yellow-200 hover:bg-white/[0.06] transition-all w-full">
                      <FileText className="h-4 w-4 text-yellow-400" />
                      Ver Prompt
                    </button>

                    {/* Criar novo usando mesmo prompt */}
                    <button
                      onClick={() => {
                        setShowInlineEditor(false);
                        setStyleChangeSource('recreate');
                        setShowStylePanel(true);
                      }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-green-300 hover:text-green-200 hover:bg-white/[0.06] transition-all w-full">
                      <RotateCcw className="h-4 w-4 text-green-400" />
                      Criar novo (mesmo prompt)
                    </button>

                    <div className="h-px bg-white/[0.06] my-1" />

                    {/* Card-specific actions header */}
                    {!isGuest && carouselData.cards.length > 0 && (
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        Card {activeCardIndex + 1} de {carouselData.cards.length}
                      </p>
                    )}

                    {/* Regenerar foto completa */}
                    {!isGuest && (
                      <button
                        onClick={() => setRegenDialogCard(activeCardIndex)}
                        disabled={regeneratingCard === activeCardIndex || !carouselData.cards[activeCardIndex]?.imageUrl}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-blue-300 hover:text-blue-200 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full">
                        {regeneratingCard === activeCardIndex ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> : <Image className="h-4 w-4 text-blue-400" />}
                        Regenerar Foto
                      </button>
                    )}

                    {/* Corrigir área */}
                    {!isGuest && (
                      <button
                        onClick={() => setCorrectionCardIndex(activeCardIndex)}
                        disabled={!carouselData.cards[activeCardIndex]?.imageUrl}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-orange-300 hover:text-orange-200 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full">
                        <Pencil className="h-4 w-4 text-orange-400" /> Corrigir Área
                      </button>
                    )}

                    {/* Retornar edição */}
                    {!isGuest && (
                      <button
                        onClick={() => {
                          if (correctionUndoStack.length === 0) return;
                          const last = correctionUndoStack[correctionUndoStack.length - 1];
                          if (!last) return;
                          const newCards = carouselData ? [...carouselData.cards] : [];
                          if (newCards[last.cardIndex]) {
                            newCards[last.cardIndex] = { ...newCards[last.cardIndex], imageUrl: last.imageUrl };
                            setCarouselData(prev => prev ? { ...prev, cards: newCards } : prev);
                          }
                          if (last.cardIndex === 0 && currentCarouselId) {
                            supabase.from('generated_carousels').update({ cover_url: `${last.imageUrl}?t=${Date.now()}` }).eq('id', currentCarouselId).then(() => {});
                          }
                          setCorrectionUndoStack(prev => prev.slice(0, -1));
                          toast({ title: 'Edição revertida!' });
                        }}
                        disabled={correctionUndoStack.length === 0}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-yellow-300 hover:text-yellow-200 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full">
                        <Undo2 className="h-4 w-4 text-yellow-400" /> Retornar Edição {correctionUndoStack.length > 0 && <span className="ml-auto text-[10px] text-yellow-400/60">({correctionUndoStack.length})</span>}
                      </button>
                    )}

                    {/* Gerar Legenda */}
                    <button
                      onClick={() => { if (!postCaption) { openCaptionConfigDialog(); } else { setShowCaptionPanel(true); } }}
                      disabled={isGuest}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-purple-300 hover:text-purple-200 hover:bg-white/[0.06] transition-all disabled:opacity-30 w-full">
                      <FileText className="h-4 w-4 text-purple-400" /> Gerar Legenda
                    </button>

                    <div className="h-px bg-white/[0.06] my-1" />

                    {/* Regenerar Tudo */}
                    {carouselData.cards.length >= 2 && !isGuest && (
                      <div className="relative">
                        <button onClick={() => {
                          if (regeneratingAll || regeneratingCard !== null) return;
                          setShowRegenModeMenu(prev => !prev);
                        }} disabled={regeneratingAll || regeneratingCard !== null}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-orange-300 hover:text-orange-200 hover:bg-white/[0.06] transition-all disabled:opacity-40 w-full">
                          {regeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 text-orange-400" />}
                          {regeneratingAll ? (regenAllProgress ? `Gerando ${regenAllProgress.current} de ${regenAllProgress.total}...` : 'Regenerando...') : 'Regenerar Tudo'}
                        </button>
                        {showRegenModeMenu && !regeneratingAll && (
                          <div className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden z-50">
                            <button onClick={() => { setShowRegenModeMenu(false); setContinuousMode(false); regenerateAll(); }}
                              className="w-full px-4 py-3 text-left text-xs font-medium text-white/80 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                              <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                              <div>
                                <p className="font-semibold">Normal</p>
                                <p className="text-[10px] text-white/40 mt-0.5">Cada card com imagem independente</p>
                              </div>
                            </button>
                            <div className="h-px bg-white/[0.06]" />
                            <button onClick={() => { setShowRegenModeMenu(false); setContinuousMode(true); regenerateAll(); }}
                              className="w-full px-4 py-3 text-left text-xs font-medium text-white/80 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5" style={{ color: themeHex }} />
                              <div>
                                <p className="font-semibold">Contínuo</p>
                                <p className="text-[10px] text-white/40 mt-0.5">Panorama único dividido em slides</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Adicionar Card */}
                    {!activeMarketplaceStyle?.imageGeneration?.prompt_style && !isGuest && (
                      <button onClick={() => setShowAddCardMenu(true)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-all w-full">
                        <Plus className="h-4 w-4" /> Adicionar Card
                      </button>
                    )}

                    <div className="flex-1" />

                    {/* Novo */}
                    <button onClick={() => { resetWizardState(); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all w-full mt-2">
                      <Plus className="h-4 w-4" /> Novo Projeto
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instagram Phone Mockup */}
            <motion.div
              className="relative flex-shrink-0"
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ width: postFormat === 'story' ? 280 : 375, maxWidth: '95vw' }}
            >
              {!isGuest && carouselData.cards.length > 0 && (
                <>
                {/* Edit button - left side */}
                <div className="absolute top-1/2 left-2 md:-left-14 -translate-y-1/2 z-40">
                  <button
                    onClick={() => setShowInlineEditor(!showInlineEditor)}
                    className="w-11 h-11 rounded-full flex items-center justify-center border text-white/80 hover:text-white transition-all hover:scale-110"
                    style={{ borderColor: showInlineEditor ? `rgba(${themeRgb},0.5)` : 'rgba(255,255,255,0.2)', backgroundColor: showInlineEditor ? `rgba(${themeRgb},0.25)` : 'rgba(20,20,30,0.85)' }}
                    aria-label="Editar card"
                  >
                    <Pencil className="h-4.5 w-4.5" />
                  </button>
                </div>
                {/* Add button - right side */}
                <div className="absolute top-1/2 right-2 md:-right-14 -translate-y-1/2 z-40">
                  <button
                    onClick={() => setShowAddCardMenu((prev) => !prev)}
                    className="w-11 h-11 rounded-full flex items-center justify-center border text-white/80 hover:text-white transition-all"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: showAddCardMenu ? `rgba(${themeRgb},0.3)` : 'rgba(20,20,30,0.85)' }}
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
                          onClick={() => { setShowAddCardMenu(false); setAddCardModal({ open: true, cardType: 'composed', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false, textSize: 'short' }); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `rgba(${themeRgb},0.15)` }}>
                            <User className="h-3.5 w-3.5" style={{ color: themeHex }} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">Composto</p>
                            <p className="text-[10px] text-white/40">Com foto e pessoa</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setShowAddCardMenu(false); setAddCardModal({ open: true, cardType: 'solid', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false, textSize: 'short' }); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `rgba(${themeRgb},0.15)` }}>
                            <Type className="h-3.5 w-3.5" style={{ color: themeHex }} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">Sólido</p>
                            <p className="text-[10px] text-white/40">Somente texto</p>
                          </div>
                        </button>
                        <div className="h-px mx-2 my-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        <button
                          onClick={() => { setShowAddCardMenu(false); setStyleChangeSource('add-card'); setShowStylePanel(true); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(52,211,153,0.15)' }}>
                            <Palette className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white/90">Estilo Diferente</p>
                            <p className="text-[10px] text-white/40">+1 card em outro estilo</p>
                          </div>
                        </button>
                      </div>
                    </>
                   )}
                </div>
                </>
              )}
              {/* Phone frame */}
              <div className={postFormat === 'story' ? 'rounded-[2rem] overflow-hidden' : 'rounded-[3rem] overflow-hidden'} style={{
                border: postFormat === 'story' ? '2px solid rgba(255,255,255,0.08)' : '3px solid rgba(255,255,255,0.1)',
                background: '#000',
                boxShadow: `0 0 80px rgba(${themeRgb},0.18), 0 0 2px rgba(255,255,255,0.1) inset`,
              }}>
                {/* Notch - hide for stories */}
                {postFormat !== 'story' && (
                <div className="flex justify-center pt-3 pb-1" style={{ backgroundColor: '#000' }}>
                  <div className="w-28 h-6 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                )}

                {/* Instagram header - hide for stories */}
                {postFormat !== 'story' && (
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
                )}

            {/* Carousel viewport */}
                <div className="relative overflow-hidden select-none" style={{ aspectRatio: `${cardW}/${cardH}`, backgroundColor: '#000', cursor: 'grab' }}
                  onMouseDown={(e) => {
                    const el = e.currentTarget as any;
                    el._dragStartX = e.clientX;
                    el._dragStartY = e.clientY;
                    el._isDragging = false;
                    el._dragDeltaX = 0;
                    const inner = el.querySelector('[data-drag-track]') as HTMLElement;
                    const viewportWidth = el.getBoundingClientRect().width;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - el._dragStartX;
                      const dy = ev.clientY - el._dragStartY;
                      if (!el._isDragging && Math.abs(dx) > 5) el._isDragging = true;
                      if (el._isDragging) {
                        el._dragDeltaX = dx;
                        el.style.cursor = 'grabbing';
                        if (inner) { inner.style.transition = 'none'; inner.style.transform = `translateX(${dx}px)`; }
                      }
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                      el.style.cursor = 'grab';
                      if (el._isDragging && Math.abs(el._dragDeltaX) > 50) {
                        if (el._dragDeltaX < 0 && activeCardIndex < carouselData.cards.length - 1 && !isCardLocked(activeCardIndex + 1)) {
                          // Animate slide to left, then change index
                          if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = `translateX(${-viewportWidth}px)`; }
                          setTimeout(() => { setActiveCardIndex(activeCardIndex + 1); if (inner) { inner.style.transition = 'none'; inner.style.transform = 'translateX(0)'; } }, 300);
                        } else if (el._dragDeltaX > 0 && activeCardIndex > 0) {
                          if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = `translateX(${viewportWidth}px)`; }
                          setTimeout(() => { setActiveCardIndex(activeCardIndex - 1); if (inner) { inner.style.transition = 'none'; inner.style.transform = 'translateX(0)'; } }, 300);
                        } else {
                          if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = 'translateX(0)'; }
                        }
                      } else {
                        if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = 'translateX(0)'; }
                      }
                      el._isDragging = false;
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const el = e.currentTarget as any;
                    el._touchStartX = touch.clientX;
                    el._touchDragging = false;
                    el._touchDeltaX = 0;
                  }}
                  onTouchMove={(e) => {
                    const el = e.currentTarget as any;
                    if (el._touchStartX == null) return;
                    const dx = e.touches[0].clientX - el._touchStartX;
                    el._touchDragging = true;
                    el._touchDeltaX = dx;
                    const inner = el.querySelector('[data-drag-track]') as HTMLElement;
                    if (inner) { inner.style.transition = 'none'; inner.style.transform = `translateX(${dx}px)`; }
                  }}
                  onTouchEnd={(e) => {
                    const el = e.currentTarget as any;
                    const inner = el.querySelector('[data-drag-track]') as HTMLElement;
                    const viewportWidth = el.getBoundingClientRect().width;
                    if (el._touchDragging && Math.abs(el._touchDeltaX) > 40) {
                      if (el._touchDeltaX < 0 && activeCardIndex < carouselData.cards.length - 1 && !isCardLocked(activeCardIndex + 1)) {
                        if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = `translateX(${-viewportWidth}px)`; }
                        setTimeout(() => { setActiveCardIndex(activeCardIndex + 1); if (inner) { inner.style.transition = 'none'; inner.style.transform = 'translateX(0)'; } }, 300);
                      } else if (el._touchDeltaX > 0 && activeCardIndex > 0) {
                        if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = `translateX(${viewportWidth}px)`; }
                        setTimeout(() => { setActiveCardIndex(activeCardIndex - 1); if (inner) { inner.style.transition = 'none'; inner.style.transform = 'translateX(0)'; } }, 300);
                      } else {
                        if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = 'translateX(0)'; }
                      }
                    } else {
                      if (inner) { inner.style.transition = 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1)'; inner.style.transform = 'translateX(0)'; }
                    }
                    el._touchStartX = null;
                    el._touchDragging = false;
                  }}
                >
                  <div data-drag-track style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', width: '300%', marginLeft: '-100%' }}>
                    {/* Previous card */}
                    <div style={{ width: '33.333%', height: '100%', flexShrink: 0, overflow: 'hidden' }}>
                      {activeCardIndex > 0 ? (
                        <div style={{ width: previewW, height: previewH, transform: `scale(${(postFormat === 'story' ? 276 : 369) / previewW})`, transformOrigin: 'top left' }}>
                          {renderCardPreview(carouselData.cards[activeCardIndex - 1], activeCardIndex - 1, false)}
                        </div>
                      ) : null}
                    </div>
                    {/* Current card */}
                    <div style={{ width: '33.333%', height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: previewW, height: previewH, transform: `scale(${(postFormat === 'story' ? 276 : 369) / previewW})`, transformOrigin: 'top left' }}>
                        {renderCardPreview(carouselData.cards[activeCardIndex], activeCardIndex, false)}
                      </div>
                      {/* Regenerating overlay on mockup */}
                      {(regeneratingCard === activeCardIndex || regeneratingFace === activeCardIndex) && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                          <div className="carousel-loader-wrapper" style={{ width: 100, height: 100 }}>
                            <div className={`carousel-loader-spinner carousel-loader-spinner--${modeTheme.tailwind}`} style={{ width: 100, height: 100 }} />
                          </div>
                          <p className="text-white/80 text-xs font-medium mt-2">{regeneratingFace === activeCardIndex ? 'Regenerando rosto...' : regenAllProgress ? `Gerando ${regenAllProgress.current} de ${regenAllProgress.total}...` : 'Regenerando...'}</p>
                        </div>
                      )}
                      {/* Guest lock overlay */}
                      {isCardLocked(activeCardIndex) && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                          <Lock className="w-8 h-8 mb-3" style={{ color: themeHex }} />
                          <p className="text-white font-semibold text-sm mb-1">Card bloqueado</p>
                          <p className="text-white/50 text-xs mb-4 text-center px-6">Cadastre-se para desbloquear todos os cards</p>
                          <button onClick={() => navigate('/checkout')}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${themeHex} 0%, ${themeHexDark} 100%)` }}>
                            Cadastrar e Desbloquear
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Next card */}
                    <div style={{ width: '33.333%', height: '100%', flexShrink: 0, overflow: 'hidden' }}>
                      {activeCardIndex < carouselData.cards.length - 1 ? (
                        <div style={{ width: previewW, height: previewH, transform: `scale(${(postFormat === 'story' ? 276 : 369) / previewW})`, transformOrigin: 'top left' }}>
                          {renderCardPreview(carouselData.cards[activeCardIndex + 1], activeCardIndex + 1, false)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {/* Swipe indicators */}
                  {activeCardIndex > 0 && (
                    <button onClick={() => setActiveCardIndex(activeCardIndex - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      <ChevronLeft className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                  {activeCardIndex < carouselData.cards.length - 1 && (
                    <button onClick={() => { if (isCardLocked(activeCardIndex + 1)) return; setActiveCardIndex(activeCardIndex + 1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      {isCardLocked(activeCardIndex + 1) ? <Lock className="h-3 w-3 text-white/60" /> : <ChevronRight className="h-3.5 w-3.5 text-white" />}
                    </button>
                  )}
                </div>

                {/* Instagram dots + actions — hide full IG UI for stories, show minimal dots */}
                {postFormat === 'story' ? (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    {/* Stories progress bars */}
                    <div className="flex items-center gap-1 px-3 py-2.5">
                      {carouselData.cards.map((_, i) => (
                        <button key={i} onClick={() => { if (!isCardLocked(i)) setActiveCardIndex(i); }}
                          className="flex-1 h-[3px] rounded-full transition-all"
                          style={{
                            backgroundColor: i <= activeCardIndex ? themeHex : 'rgba(255,255,255,0.2)',
                          }} />
                      ))}
                    </div>
                    {/* Stories header overlay */}
                    <div className="flex items-center gap-2.5 px-4 py-2">
                      <img src={ellocontentProfile} alt="ellocontent" className="w-7 h-7 rounded-full object-cover border border-white/20" />
                      <p className="text-white text-[11px] font-semibold flex-1">{userName || brandName || 'ellocontent'}</p>
                      <span className="text-white/40 text-xs">·</span>
                      <span className="text-white/40 text-[10px]">agora</span>
                    </div>
                    {/* Bottom bar */}
                    <div className="flex justify-center pb-2 pt-1">
                      <div className="w-32 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    </div>
                  </div>
                ) : (
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
                          backgroundColor: i === activeCardIndex ? themeHex : 'rgba(255,255,255,0.2)',
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
                )}
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
                        <Palette className="h-5 w-5" style={{ color: themeHex }} />
                        <h3 className="font-bold text-white text-base">
                          {styleChangeSource === 'add-card' ? 'Escolha o estilo do novo card' : styleChangeSource === 'recreate' ? 'Escolha um estilo' : 'Estilo'}
                        </h3>
                      </div>
                      <button onClick={() => setShowStylePanel(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    {styleChangeSource === 'add-card' ? (
                      <AddCardStylePicker onSelectStyle={(config) => {
                        setPendingAddCardStyle(config);
                        setShowStylePanel(false);
                        setStyleChangeSource('toolbar');
                        setAddCardModal({ open: true, cardType: 'composed', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false, textSize: 'short' });
                      }} />
                    ) : styleChangeSource === 'recreate' ? (
                      <StepStyleSelect
                        bgColor={bgColor} setBgColor={setBgColor}
                        accentColor={accentColor} setAccentColor={setAccentColor}
                        textColor={textColor} setTextColor={setTextColor}
                        selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                        onApplyMarketplaceStyle={(config) => {
                          setActiveMarketplaceStyle(config);
                          setIsLoadedFullBleed(!!config?.imageGeneration?.prompt_style);
                          setShowStylePanel(false);
                          setStyleChangeSource('toolbar');
                          propertyListRef.current = propertyList;
                          activeMarketplaceStyleRef.current = config;
                          generationSnapshotRef.current = {
                            isRealEstate: !!config?.is_real_estate,
                            realEstateMode: (config?.real_estate_mode as 'single' | 'multiple') || 'single',
                            propertyList: JSON.parse(JSON.stringify(propertyList)),
                            marketplaceStyle: config ? { ...config } : null,
                          };
                          setTransitionToGenerate(true);
                          setCurrentCarouselId(null);
                          const isSinglePost = contentMode === 'single-post' || (carouselData?.cards?.length === 1);
                          setTimeout(() => isSinglePost ? generateSinglePost() : generateContent(), 1200);
                        }}
                      />
                    ) : (
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
                          propertyListRef.current = propertyList;
                          activeMarketplaceStyleRef.current = config;
                          generationSnapshotRef.current = {
                            isRealEstate: !!config?.is_real_estate,
                            realEstateMode: (config?.real_estate_mode as 'single' | 'multiple') || 'single',
                            propertyList: JSON.parse(JSON.stringify(propertyList)),
                            marketplaceStyle: config ? { ...config } : null,
                          };
                          setTransitionToGenerate(true);
                          setCurrentCarouselId(null);
                          const isSinglePost = contentMode === 'single-post' || (carouselData?.cards?.length === 1);
                          setTimeout(() => isSinglePost ? generateSinglePost() : generateContent(), 1200);
                        }} />
                    )}
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
                        <Palette className="h-5 w-5" style={{ color: themeHex }} />
                        <h3 className="font-bold text-white text-base">
                          {styleChangeSource === 'add-card' ? 'Escolha o estilo do novo card' : styleChangeSource === 'recreate' ? 'Escolha um estilo' : 'Estilo'}
                        </h3>
                      </div>
                      <button onClick={() => setShowStylePanel(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1 px-4 pb-10" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                      {styleChangeSource === 'add-card' ? (
                        <AddCardStylePicker onSelectStyle={(config) => {
                          setPendingAddCardStyle(config);
                          setShowStylePanel(false);
                          setStyleChangeSource('toolbar');
                          setAddCardModal({ open: true, cardType: 'composed', step: 'text-mode', autoText: null, manualText: { title: '', body: '' }, generatingAutoText: false, textSize: 'short' });
                        }} />
                      ) : styleChangeSource === 'recreate' ? (
                        <StepStyleSelect
                          bgColor={bgColor} setBgColor={setBgColor}
                          accentColor={accentColor} setAccentColor={setAccentColor}
                          textColor={textColor} setTextColor={setTextColor}
                          selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                          onApplyMarketplaceStyle={(config) => {
                            setActiveMarketplaceStyle(config);
                            setIsLoadedFullBleed(!!config?.imageGeneration?.prompt_style);
                            setShowStylePanel(false);
                            setStyleChangeSource('toolbar');
                            propertyListRef.current = propertyList;
                            activeMarketplaceStyleRef.current = config;
                            generationSnapshotRef.current = {
                              isRealEstate: !!config?.is_real_estate,
                              realEstateMode: (config?.real_estate_mode as 'single' | 'multiple') || 'single',
                              propertyList: JSON.parse(JSON.stringify(propertyList)),
                              marketplaceStyle: config ? { ...config } : null,
                            };
                            setTransitionToGenerate(true);
                            setCurrentCarouselId(null);
                            const isSinglePost = contentMode === 'single-post' || (carouselData?.cards?.length === 1);
                            setTimeout(() => isSinglePost ? generateSinglePost() : generateContent(), 1200);
                          }}
                        />
                      ) : (
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
                            propertyListRef.current = propertyList;
                            activeMarketplaceStyleRef.current = config;
                            generationSnapshotRef.current = {
                              isRealEstate: !!config?.is_real_estate,
                              realEstateMode: (config?.real_estate_mode as 'single' | 'multiple') || 'single',
                              propertyList: JSON.parse(JSON.stringify(propertyList)),
                              marketplaceStyle: config ? { ...config } : null,
                            };
                            setTransitionToGenerate(true);
                            setCurrentCarouselId(null);
                            const isSinglePost = contentMode === 'single-post' || (carouselData?.cards?.length === 1);
                            setTimeout(() => isSinglePost ? generateSinglePost() : generateContent(), 1200);
                          }} />
                      )}
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
                          <FileText className="h-4 w-4" style={{ color: themeHex }} />
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
                        <button onClick={openCaptionConfigDialog} disabled={generatingCaption}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={{ backgroundColor: `rgba(${themeRgb},0.12)`, color: themeHex, border: `1px solid rgba(${themeRgb},0.15)` }}>
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
                        <FileText className="h-4 w-4" style={{ color: themeHex }} />
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
                        <button onClick={openCaptionConfigDialog} disabled={generatingCaption}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                          style={{ backgroundColor: `rgba(${themeRgb},0.12)`, color: themeHex, border: `1px solid rgba(${themeRgb},0.15)` }}>
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
                  style={{ background: `linear-gradient(135deg, rgba(${themeRgb},0.15), rgba(${themeRgb},0.05))`, border: `1px solid rgba(${themeRgb},0.2)` }}>
                  <Lock className="h-4 w-4 shrink-0" style={{ color: themeHex }} />
                  <p className="text-xs text-white/60 flex-1">Cadastre-se para desbloquear todos os cards, salvar e exportar seus carrosséis.</p>
                  <button onClick={() => navigate('/checkout')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0 transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${themeHex} 0%, ${themeHexDark} 100%)` }}>
                    Cadastrar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons below - mobile only */}
            <div className="flex md:hidden items-center justify-center gap-2 sm:gap-3 mt-6 w-full relative z-10 flex-wrap px-4">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 border border-white/5">
                {autoSaveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : autoSaveStatus === 'saved' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Save className="h-3.5 w-3.5" />}
                {autoSaveStatus === 'saving' ? 'Salvando...' : autoSaveStatus === 'saved' ? 'Salvo!' : 'Auto-save'}
              </div>
              {/* Export button */}
              <button data-tour="btn-export" onClick={isGuest ? () => setShowGuestPaywall(true) : () => setShowExportMenu(true)} disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white border transition-all disabled:opacity-50"
                style={{ borderColor: `rgba(${themeRgb},0.4)`, background: `linear-gradient(135deg, rgba(${themeRgb},0.15), rgba(${themeRgb},0.05))` }}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isGuest ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                {isGuest ? 'Assine para baixar' : 'Exportar'}
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
                    {contentMode !== 'single-post' && planLimits.allowedExportFormats.includes('zip') && (
                      <button onClick={() => exportAllCards('png', true)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-3 border border-white/10">
                        <FileText className="h-4 w-4" style={{ color: themeHex }} /> Baixar ZIP
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
                    {planLimits.allowedExportFormats.includes('webp') && (
                      <button onClick={() => exportAllCards('webp')}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border border-white/5">
                        <ImageIcon className="h-4 w-4" /> Baixar WEBP
                      </button>
                    )}
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { setShowExportMenu(false); setShowPublishDialog(true); }}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-3 border border-pink-500/20"
                      style={{ background: 'linear-gradient(135deg, rgba(131,58,180,0.15), rgba(225,48,108,0.15))' }}>
                      <Instagram className="h-4 w-4 text-pink-400" /> Publicar no Instagram
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
                  <button data-tour="btn-style" onClick={() => { setStyleChangeSource('toolbar'); setShowStylePanel(!showStylePanel); }} disabled={isGuest}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                    style={{ borderColor: `rgba(${themeRgb},0.3)`, backgroundColor: `rgba(${themeRgb},0.08)` }}>
                    <Palette className="h-3.5 w-3.5" /> Estilo
                  </button>
                </>
              )}
              
              {/* Generate carousel from cover */}
              {carouselData.cards.length === 1 && carouselData.cards[0]?.imageUrl && !isGuest && (
                <button onClick={() => { setShowCarouselFromCover(true); setCoverModalTab('config'); setCoverCardTexts(Array.from({ length: carouselFromCoverCount }, () => ({ title: '', body: '' }))); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-all"
                  style={{ color: themeHex, borderColor: `rgba(${themeRgb},0.3)`, backgroundColor: `rgba(${themeRgb},0.08)` }}>
                  <Sparkles className="h-3.5 w-3.5" style={{ color: themeHex }} /> Gerar Carrossel
                </button>
              )}
              {/* Regenerate All button with mode selector */}
              {carouselData.cards.length >= 2 && !isGuest && (
                <div className="relative">
                  <button onClick={() => {
                    if (regeneratingAll || regeneratingCard !== null) return;
                    setShowRegenModeMenu(prev => !prev);
                  }} disabled={regeneratingAll || regeneratingCard !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-orange-300 hover:text-orange-200 border transition-all disabled:opacity-40"
                    style={{ borderColor: 'rgba(251,146,60,0.3)', backgroundColor: 'rgba(251,146,60,0.08)' }}>
                    {regeneratingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    {regeneratingAll ? (regenAllProgress ? `Gerando ${regenAllProgress.current} de ${regenAllProgress.total}...` : 'Regenerando...') : 'Regenerar Tudo'}
                  </button>
                  {showRegenModeMenu && !regeneratingAll && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden z-50">
                      <button onClick={() => { setShowRegenModeMenu(false); setContinuousMode(false); regenerateAll(); }}
                        className="w-full px-4 py-3 text-left text-xs font-medium text-white/80 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                        <div>
                          <p className="font-semibold">Normal</p>
                          <p className="text-[10px] text-white/40 mt-0.5">Cada card com imagem independente</p>
                        </div>
                      </button>
                      <div className="h-px bg-white/[0.06]" />
                      <button onClick={() => { setShowRegenModeMenu(false); setContinuousMode(true); regenerateAll(); }}
                        className="w-full px-4 py-3 text-left text-xs font-medium text-white/80 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5" style={{ color: themeHex }} />
                        <div>
                          <p className="font-semibold">Contínuo</p>
                          <p className="text-[10px] text-white/40 mt-0.5">Panorama único dividido em slides</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Recriar em outro estilo - always visible */}
              {!isGuest && (
                <button onClick={() => { setStyleChangeSource('toolbar'); setShowStylePanel(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-emerald-200 border transition-all"
                  style={{ borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.08)' }}>
                  <Palette className="h-3.5 w-3.5" /> Mudar Estilo
                </button>
              )}
              <button onClick={() => { if (!showCaptionPanel) { setShowCaptionPanel(true); if (!postCaption) openCaptionConfigDialog(); } else { setShowCaptionPanel(false); } }} disabled={isGuest}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white border transition-all disabled:opacity-30"
                style={{ borderColor: `rgba(${themeRgb},0.3)`, backgroundColor: showCaptionPanel ? `rgba(${themeRgb},0.15)` : `rgba(${themeRgb},0.08)` }}>
                <FileText className="h-3.5 w-3.5" /> Legenda
              </button>
              {/* Corrigir área button */}
              {!isGuest && (
                <button
                  onClick={() => setCorrectionCardIndex(activeCardIndex)}
                  disabled={!carouselData.cards[activeCardIndex]?.imageUrl}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-orange-300 hover:text-orange-200 border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderColor: 'rgba(251,146,60,0.3)', backgroundColor: 'rgba(251,146,60,0.08)' }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Corrigir área
                </button>
              )}
              {/* Undo correction button - always visible when logged in */}
              {!isGuest && (
                <button
                  onClick={() => {
                    if (correctionUndoStack.length === 0) return;
                    const last = correctionUndoStack[correctionUndoStack.length - 1];
                    if (!last) return;
                    const newCards = carouselData ? [...carouselData.cards] : [];
                    if (newCards[last.cardIndex]) {
                      newCards[last.cardIndex] = { ...newCards[last.cardIndex], imageUrl: last.imageUrl };
                      setCarouselData(prev => prev ? { ...prev, cards: newCards } : prev);
                    }
                    if (last.cardIndex === 0 && currentCarouselId) {
                      supabase.from('generated_carousels').update({ cover_url: `${last.imageUrl}?t=${Date.now()}` }).eq('id', currentCarouselId).then(() => {});
                    }
                    setCorrectionUndoStack(prev => prev.slice(0, -1));
                    toast({ title: 'Edição revertida!' });
                  }}
                  disabled={correctionUndoStack.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-yellow-300 hover:text-yellow-200 border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderColor: 'rgba(250,204,21,0.3)', backgroundColor: 'rgba(250,204,21,0.08)' }}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Retornar edição {correctionUndoStack.length > 0 && <span className="ml-1 text-[10px] text-yellow-400/60">({correctionUndoStack.length})</span>}
                </button>
              )}
              <button onClick={() => { resetWizardState(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                Novo
              </button>
            </div>

            {/* Carousel from cover modal - enhanced */}
            {showCarouselFromCover && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowCarouselFromCover(false)}>
                <div className="rounded-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col gap-5 overflow-hidden"
                  style={{ backgroundColor: 'rgba(12,10,24,0.98)', border: `1px solid rgba(${themeRgb},0.25)`, boxShadow: `0 20px 50px rgba(${themeRgb},0.14)` }}
                  onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-white text-center flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" style={{ color: themeHex }} />
                    Gerar carrossel a partir desta capa
                  </h3>

                  {/* Tabs */}
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
                    <button onClick={() => setCoverModalTab('config')}
                      className="flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all"
                      style={coverModalTab === 'config' ? { backgroundColor: themeHex, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
                      ⚙️ Configuração
                    </button>
                    <button onClick={() => setCoverModalTab('texts')}
                      className="flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all"
                      style={coverModalTab === 'texts' ? { backgroundColor: themeHex, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
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
                            className="flex-1" style={{ accentColor: themeHex }} />
                          <span className="text-xl font-bold text-white w-8 text-center">{carouselFromCoverCount}</span>
                        </div>
                        <div className="flex gap-1.5 justify-center flex-wrap">
                          {[4, 6, 8, 10, 15, 20].map(n => (
                            <button key={n} onClick={() => { setCarouselFromCoverCount(n); setCoverCardTexts(Array.from({ length: n }, (_, i) => coverCardTexts[i] || { title: '', body: '' })); }}
                              className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                              style={carouselFromCoverCount === n ? { backgroundColor: themeHex, color: '#fff', border: `1px solid rgba(${themeRgb},0.5)` } : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                        style={{ backgroundColor: `rgba(${themeRgb},0.08)`, border: `1px solid rgba(${themeRgb},0.2)` }}>
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `rgba(${themeRgb},0.15)` }}>
                          {fillingCoverTexts ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: themeHex }} /> : <Wand2 className="h-3.5 w-3.5" style={{ color: themeHex }} />}
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
                          <div key={i} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${hasContent ? `rgba(${themeRgb},0.25)` : 'rgba(255,255,255,0.06)'}` }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-white/60">{label}</span>
                              {hasContent && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `rgba(${themeRgb},0.2)`, color: themeHex }}>editado</span>}
                            </div>
                            <input value={cardText.title || ''} onChange={(e) => { const u = [...coverCardTexts]; u[i] = { ...u[i], title: e.target.value }; setCoverCardTexts(u); }}
                              placeholder={i === 0 ? 'Título da capa...' : 'Título do card...'}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-white/20" />
                            <textarea value={cardText.body || ''} onChange={(e) => { const u = [...coverCardTexts]; u[i] = { ...u[i], body: e.target.value }; setCoverCardTexts(u); }}
                              placeholder={i === 0 ? 'Subtítulo...' : 'Conteúdo...'}
                              className="w-full bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/20 text-xs px-2.5 py-1.5 rounded-lg resize-none outline-none focus:border-white/20 min-h-[50px]"
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
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium text-white border transition-colors"
                      style={{ background: `linear-gradient(135deg, ${themeHex}, ${themeHexDark})`, borderColor: `rgba(${themeRgb},0.5)` }}>
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
                      style={{ borderColor: `rgba(${themeRgb},0.4)`, background: `linear-gradient(135deg, rgba(${themeRgb},0.15), rgba(${themeRgb},0.05))` }}>
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
                  const thumbH = thumbW * (cardH / cardW);
                  return (
                  <div key={i} className="snap-center flex-shrink-0 relative group cursor-pointer" style={{ width: thumbW + 4 }}
                    onClick={() => {
                      if (isCardLocked(i)) return;
                      setActiveCardIndex(i);
                    }}>
                    <div className="rounded-xl overflow-hidden transition-all" style={{
                      border: i === activeCardIndex ? `2px solid ${themeHex}` : '2px solid rgba(255,255,255,0.08)',
                      boxShadow: i === activeCardIndex ? `0 0 20px rgba(${themeRgb},0.3)` : 'none',
                      opacity: i === activeCardIndex ? 1 : 0.6,
                      transform: i === activeCardIndex ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      <div style={{ width: thumbW, height: thumbH, overflow: 'hidden', borderRadius: 10 }}>
                        <div style={{ transform: `scale(${thumbW / previewW})`, transformOrigin: 'top left', width: previewW, height: previewH }}>
                          {renderCardPreview(card, i, false)}
                        </div>
                      </div>
                    </div>
                    {/* Regenerating overlay on thumbnail */}
                    {(regeneratingCard === i || regeneratingFace === i) && (
                      <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `rgba(${themeRgb},0.3)`, borderTopColor: themeHex }} />
                      </div>
                    )}
                    {/* Lock overlay for guest thumbnails */}
                    {isCardLocked(i) && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
                        <Lock className="w-4 h-4" style={{ color: `rgba(${themeRgb},0.7)` }} />
                      </div>
                    )}
                    {/* Delete button - top right */}
                    {carouselData.cards.length > 2 && (
                      <button onClick={(e) => { e.stopPropagation(); removeCard(i); }}
                        className="absolute top-1 right-1 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity z-20"
                        style={{ backgroundColor: 'rgba(220,38,38,0.8)' }}
                        title="Excluir card">
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                    {/* Modificar button removed - functions moved to sidebar */}
                    <p className="text-center text-[10px] mt-1.5 font-medium" style={{ color: i === activeCardIndex ? themeHex : 'rgba(255,255,255,0.3)' }}>{i + 1}</p>
                  </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
          );
        })()}
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
                      onClick={() => { setModifyMenuCard(null); setRegenDialogCard(cardIdx); }}
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
                    {card.imageUrl && (
                      <button
                        onClick={() => { setModifyMenuCard(null); setCorrectionCardIndex(cardIdx); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/90 hover:bg-white/10 transition-colors">
                        <Pencil className="h-4 w-4 text-orange-400" />
                        Correção (editar região)
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
                    {card.imageUrl && (
                      <button
                        onClick={() => { setModifyMenuCard(null); setCorrectionCardIndex(cardIdx); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] text-white/90 hover:bg-white/10 transition-colors">
                        <Pencil className="h-4 w-4 text-orange-400" />
                        Correção (editar região)
                      </button>
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
                        className="flex-1 px-3 py-3 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                        style={{ backgroundColor: wizardMode === 'extreme' ? '#E84D1A' : '#9333EA', boxShadow: wizardMode === 'extreme' ? '0 10px 30px rgba(232,77,26,0.25)' : '0 10px 30px rgba(147,51,234,0.2)' }}>
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
              className="fixed inset-0 z-[200] flex items-center justify-center"
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

      {/* ===== FULL GENERATION CONFIG MODAL ===== */}
      <AnimatePresence>
        {showFullConfigModal && (() => {
          const config = buildGenerationConfig();
          const modeLabels: Record<string, string> = { simple: 'Simples', advanced: 'Avançado', extreme: 'Extreme' };
          const configItems = [
            { label: 'Tema/Tópico', value: config.topic || '—' },
            { label: 'Palavras-chave', value: config.keywords || '—' },
            { label: 'Modo', value: modeLabels[config.wizardMode] || config.wizardMode },
            { label: 'Tipo de conteúdo', value: config.contentMode === 'single-post' ? 'Post único' : 'Carrossel' },
            { label: 'Quantidade de cards', value: String(config.cardCount) },
            { label: 'Cards com imagem', value: String(config.imageCardCount) },
            { label: 'Estilo', value: config.marketplaceStyleName || 'Padrão' },
            { label: 'Modelo de IA', value: config.imageSettings?.model || 'auto' },
            { label: 'Fidelidade', value: config.imageSettings?.fidelity || 'balanced' },
            { label: 'Tipo de imagem', value: config.imageSettings?.imageType || 'photo' },
            { label: 'Cor de fundo', value: config.bgColor },
            { label: 'Cor de destaque', value: config.accentColor },
            { label: 'Cor do texto', value: config.textColor },
            { label: 'Marca', value: config.brandName || '—' },
            { label: 'Usuário', value: config.userName || '—' },
            { label: 'Referências de rosto', value: config.facePersons?.filter((p: any) => p.photos?.length > 0).length ? `${config.facePersons.filter((p: any) => p.photos?.length > 0).length} pessoa(s)` : 'Nenhum' },
            { label: 'Referências de imagem', value: config.referenceImages?.length ? `${config.referenceImages.length} imagem(ns)` : 'Nenhum' },
            { label: 'Logo', value: config.logoUrl ? 'Sim' : 'Não' },
            { label: 'Cabeçalho', value: config.showHeader ? 'Visível' : 'Oculto' },
          ];
          if (config.wizardMode === 'extreme' && config.extremeVision) {
            configItems.splice(3, 0, { label: 'Visão Extreme', value: config.extremeVision });
          }
          if (config.manualPostText) {
            configItems.splice(2, 0, { label: 'Texto manual', value: config.manualPostText });
          }
          const fullText = configItems.map(i => `${i.label}: ${i.value}`).join('\n');
          return (
            <motion.div
              key="full-config-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] flex items-center justify-center"
              onClick={() => setShowFullConfigModal(false)}>
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl w-[560px] max-w-[95vw] max-h-[85vh] flex flex-col"
                style={{ backgroundColor: '#1a1a2e' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-400" />
                    Configurações da geração
                  </h3>
                  <button onClick={() => setShowFullConfigModal(false)} className="text-white/50 hover:text-white/80 transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="space-y-2">
                    {configItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-1.5" style={{ borderBottom: i < configItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span className="text-[11px] font-medium text-white/40 w-[140px] shrink-0 pt-0.5">{item.label}</span>
                        <span className="text-[12px] text-white/80 break-all flex-1">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3 flex justify-between gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(fullText); sonnerToast.success('Configurações copiadas!'); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowFullConfigModal(false);
                        setShowStylePanel(true);
                        setStyleChangeSource('recreate');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
                      <RotateCcw className="h-3.5 w-3.5" /> Criar novo (mesmo prompt)
                    </button>
                    <button
                      onClick={() => setShowFullConfigModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white/90 transition-colors cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ===== CAPTION CONFIG DIALOG ===== */}
      <AnimatePresence>
        {showCaptionConfigDialog && (() => {
          const cThemeHex = modeTheme.hex;
          const cThemeRgb = modeTheme.rgb;
          return (
          <motion.div
            key="caption-config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={() => setShowCaptionConfigDialog(false)}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-[90%] max-w-sm rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: cThemeHex }} /> Configurar Legenda
                </h3>
                <button onClick={() => setShowCaptionConfigDialog(false)} className="text-white/50 hover:text-white/80 transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Limite de caracteres (opcional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {['500', '1000', '1500', '2200'].map(v => (
                      <button key={v} onClick={() => setCaptionMaxChars(captionMaxChars === v ? '' : v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${captionMaxChars === v ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                        style={{ backgroundColor: captionMaxChars === v ? `rgba(${cThemeRgb},0.2)` : 'rgba(255,255,255,0.04)', border: `1px solid ${captionMaxChars === v ? `rgba(${cThemeRgb},0.4)` : 'rgba(255,255,255,0.06)'}` }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Mencionar algo específico? (opcional)</label>
                  <textarea
                    value={captionMentions}
                    onChange={(e) => setCaptionMentions(e.target.value)}
                    placeholder="Ex: mencionar promoção de lançamento, @parceiro, link na bio..."
                    rows={3}
                    className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm px-3 py-2.5 rounded-xl resize-none outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowCaptionConfigDialog(false); generateCaption(captionMaxChars, captionMentions); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${cThemeHex}, ${cThemeHex}cc)` }}>
                  <Sparkles className="h-3.5 w-3.5" /> Gerar Legenda
                </button>
                <button
                  onClick={() => setShowCaptionConfigDialog(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/60 hover:text-white/80 transition-all cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {addCardModal.open && (
          <motion.div
            key="add-card-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => { setAddCardModal(prev => ({ ...prev, open: false })); setPendingAddCardStyle(null); }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl w-[380px] max-w-[95vw]"
              style={{ backgroundColor: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}>
              
              <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                <div>
                  <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
                    Novo Card {addCardModal.cardType === 'composed' ? 'Composto' : 'Sólido'}
                  </p>
                  <p className="text-white text-sm font-semibold mt-1">
                    {addCardModal.step === 'text-mode' ? 'Como definir o texto?' : addCardModal.step === 'manual' ? 'Texto do card' : 'Texto gerado pela IA'}
                  </p>
                </div>
                <button
                  onClick={() => { setAddCardModal(prev => ({ ...prev, open: false })); setPendingAddCardStyle(null); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors mt-0.5 shrink-0"
                >
                  <X className="h-4 w-4 text-white/40" />
                </button>
              </div>

              {/* Step: text-mode selection */}
              {addCardModal.step === 'text-mode' && (
                <div className="flex flex-col px-3 pb-4 gap-3">
                  {/* Text size selector */}
                  <div className="px-1">
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Tamanho do texto</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { value: 'short', label: 'Curto', desc: '~15 palavras' },
                        { value: 'medium', label: 'Médio', desc: '~30 palavras' },
                        { value: 'long', label: 'Longo', desc: '~50 palavras' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setAddCardModal(prev => ({ ...prev, textSize: opt.value }))}
                          className="flex flex-col items-center py-2.5 px-2 rounded-xl border transition-all"
                          style={{
                            borderColor: addCardModal.textSize === opt.value ? `rgba(${modeTheme.rgb},0.5)` : 'rgba(255,255,255,0.08)',
                            backgroundColor: addCardModal.textSize === opt.value ? `rgba(${modeTheme.rgb},0.12)` : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <span className="text-[13px] font-medium text-white/80">{opt.label}</span>
                          <span className="text-[10px] text-white/30 mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { generateAddCardAutoText(); }}
                    disabled={addCardModal.generatingAutoText}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border"
                    style={{ borderColor: `rgba(${modeTheme.rgb},0.2)`, backgroundColor: `rgba(${modeTheme.rgb},0.06)` }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `rgba(${modeTheme.rgb},0.15)` }}>
                      {addCardModal.generatingAutoText ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: modeTheme.hex }} /> : <Wand2 className="h-4 w-4" style={{ color: modeTheme.hex }} />}
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
                      style={{ background: `linear-gradient(135deg, rgba(${modeTheme.rgb},0.9), rgba(${modeTheme.rgb2},0.9))` }}>
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
                      style={{ background: `linear-gradient(135deg, rgba(${modeTheme.rgb},0.9), rgba(${modeTheme.rgb2},0.9))` }}>
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
                <button onClick={isGuest ? () => setShowGuestPaywall(true) : () => setShowExportMenu(true)} disabled={exporting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-50 relative"
                  style={{ background: `linear-gradient(135deg, ${modeTheme.hex}, ${modeTheme.hexDark})` }}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isGuest ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isGuest ? 'Assine' : 'Exportar'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Left sidebar - editing panel (slides in from left on desktop) */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="order-2 md:order-1 md:w-[380px] flex-1 md:flex-none shrink-0 overflow-y-auto"
                style={{ backgroundColor: '#111118', borderRight: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
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
                  isRealEstate={isRealEstateStyle && propertyList.length > 0}
                  propertyData={isRealEstateStyle && propertyList.length > 0 ? (() => {
                    const propIdx = realEstateMode === 'multiple' ? (validIndex % propertyList.length) : 0;
                    const p = propertyList[propIdx];
                    return p ? { price: p.price, area: p.area, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking, location: p.location, neighborhood: p.neighborhood, highlights: p.highlights, title: p.title } : undefined;
                  })() : undefined}
                  onPropertyFieldChange={isRealEstateStyle && propertyList.length > 0 ? ((field: string, value: string) => {
                    const propIdx = realEstateMode === 'multiple' ? (validIndex % propertyList.length) : 0;
                    setPropertyList(prev => {
                      const updated = [...prev];
                      const p = { ...updated[propIdx] };
                      (p as any)[field] = value;
                      updated[propIdx] = p;
                      return updated;
                    });
                  }) : undefined}
                />
              </motion.div>

              {/* Right: preview with card navigation */}
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                className="order-1 md:order-2 flex flex-col items-center p-2 md:p-4 shrink-0 md:flex-1 md:overflow-auto relative"
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
                      transform: `scale(${Math.min((typeof window !== 'undefined' ? (window.innerWidth < 768 ? window.innerWidth * 0.6 : window.innerWidth * 0.45) : 300) / previewW, 1.4)})`,
                      transformOrigin: 'top center',
                      width: previewW,
                      height: previewH,
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
                          backgroundColor: i === validIndex ? modeTheme.hex : 'rgba(255,255,255,0.2)',
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

      {/* Guest Paywall Modal - now non-blocking, dismissable */}
      {showGuestPaywall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuestPaywall(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden p-8 text-center"
            style={{ backgroundColor: '#18181f', border: wizardMode === 'extreme' ? '1px solid rgba(232,77,26,0.3)' : '1px solid rgba(139,92,246,0.3)' }}
          >
            <button onClick={() => setShowGuestPaywall(false)} className="absolute top-3 right-3 p-1 text-white/30 hover:text-white/60 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: wizardMode === 'extreme' ? 'linear-gradient(135deg, rgba(232,77,26,0.2), rgba(232,77,26,0.05))' : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))' }}>
              <Sparkles className="w-8 h-8" style={{ color: wizardMode === 'extreme' ? '#E84D1A' : '#9B6BFF' }} />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Gostou do resultado? ✨</h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Para baixar, editar e criar conteúdos ilimitados com IA, crie sua conta.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowGuestPaywall(false); navigate('/precos'); }}
                className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: wizardMode === 'extreme' ? 'linear-gradient(135deg, #E84D1A 0%, #C43A0F 100%)' : 'linear-gradient(135deg, #7B50DC 0%, #9B6BFF 100%)', color: '#fff' }}
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

      {/* ===== POST CORRECTION (Inpainting Editor) ===== */}
      {correctionCardIndex !== null && carouselData?.cards[correctionCardIndex]?.imageUrl && (
        <PostCorrectionEditor
          imageUrl={carouselData.cards[correctionCardIndex].imageUrl!}
          onClose={() => setCorrectionCardIndex(null)}
          onImageEdited={async (newUrl) => {
            // setCardImage already handles undo stack
            setCardImage(correctionCardIndex, newUrl);
            setCorrectionCardIndex(null);
            toast({ title: 'Correção aplicada!' });

            // Update cover_url in DB if we edited the first card (cover)
            if (correctionCardIndex === 0 && currentCarouselId) {
              try {
                // Upload the base64 image to storage to get a proper URL
                const { data: userData } = await supabase.auth.getUser();
                if (!userData?.user) return;
                const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', userData.user.id).limit(1).single();
                if (!cu) return;
                
                // Convert base64 to blob
                const res = await fetch(newUrl);
                const blob = await res.blob();
                const ext = blob.type.includes('png') ? 'png' : 'jpg';
                const fileName = `${cu.company_id}/${currentCarouselId}.${ext}`;
                
                await supabase.storage.from('covers').upload(fileName, blob, { contentType: blob.type, upsert: true });
                const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
                if (urlData?.publicUrl) {
                  const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                  await supabase.from('generated_carousels').update({ cover_url: coverUrl }).eq('id', currentCarouselId);
                }
              } catch (err) {
                console.error('Cover update after correction failed:', err);
              }
            }
          }}
          editFn={async (originalUrl: string, maskDataUrl: string, editPrompt: string, attachmentBase64?: string) => {
            const toDataUrl = async (url: string): Promise<string> => {
              if (url.startsWith('data:image/')) return url;
              const res = await fetch(url);
              const blob = await res.blob();
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            };

            const [imageDataUrl, maskDataUrlFull] = await Promise.all([
              toDataUrl(originalUrl),
              toDataUrl(maskDataUrl),
            ]);

            const { data: session } = await supabase.auth.getSession();
            const accessToken = session.session?.access_token;
            if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-correction`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  imageDataUrl,
                  maskDataUrl: maskDataUrlFull,
                  editPrompt,
                  attachmentDataUrl: attachmentBase64
                    ? (attachmentBase64.startsWith('data:image/')
                        ? attachmentBase64
                        : `data:image/png;base64,${attachmentBase64}`)
                    : undefined,
                }),
              }
            );

            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error || `Error ${response.status}`);
            }

            const result = await response.json();
            if (!result.resultBase64) throw new Error('Nenhuma imagem retornada');

            const aiResultDataUrl = `data:${result.mimeType || 'image/png'};base64,${result.resultBase64}`;

            // === COMPOSITE: blend AI result into original using feathered mask ===
            const compositeResult = await new Promise<string>((resolve, reject) => {
              const origImg = new window.Image();
              origImg.crossOrigin = 'anonymous';
              const aiImg = new window.Image();
              const maskImg = new window.Image();

              let loaded = 0;
              const onAllLoaded = () => {
                loaded++;
                if (loaded < 3) return;
                try {
                  const W = origImg.naturalWidth;
                  const H = origImg.naturalHeight;

                  // Draw original
                  const canvas = document.createElement('canvas');
                  canvas.width = W;
                  canvas.height = H;
                  const ctx = canvas.getContext('2d')!;
                  ctx.drawImage(origImg, 0, 0, W, H);

                  // Draw AI result
                  const aiCanvas = document.createElement('canvas');
                  aiCanvas.width = W;
                  aiCanvas.height = H;
                  const aiCtx = aiCanvas.getContext('2d')!;
                  aiCtx.drawImage(aiImg, 0, 0, W, H);

                  // Draw mask and create feathered alpha
                  const maskCanvas = document.createElement('canvas');
                  maskCanvas.width = W;
                  maskCanvas.height = H;
                  const maskCtx = maskCanvas.getContext('2d')!;
                  maskCtx.drawImage(maskImg, 0, 0, W, H);
                  const maskData = maskCtx.getImageData(0, 0, W, H);

                  // Create feathered mask by blurring edges (simple box blur on alpha)
                  const alpha = new Float32Array(W * H);
                  for (let i = 0; i < W * H; i++) {
                    alpha[i] = maskData.data[i * 4] > 128 ? 1.0 : 0.0;
                  }

                  // Apply 2-pass box blur for feathering (radius ~8px scaled to image)
                  const featherRadius = Math.max(4, Math.round(Math.min(W, H) * 0.006));
                  const blurred = new Float32Array(W * H);

                  // Horizontal pass
                  for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                      let sum = 0, count = 0;
                      for (let dx = -featherRadius; dx <= featherRadius; dx++) {
                        const nx = x + dx;
                        if (nx >= 0 && nx < W) { sum += alpha[y * W + nx]; count++; }
                      }
                      blurred[y * W + x] = sum / count;
                    }
                  }
                  // Vertical pass
                  const feathered = new Float32Array(W * H);
                  for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                      let sum = 0, count = 0;
                      for (let dy = -featherRadius; dy <= featherRadius; dy++) {
                        const ny = y + dy;
                        if (ny >= 0 && ny < H) { sum += blurred[ny * W + x]; count++; }
                      }
                      feathered[y * W + x] = sum / count;
                    }
                  }

                  // Blend: original * (1-alpha) + ai * alpha
                  const origData = ctx.getImageData(0, 0, W, H);
                  const aiData = aiCtx.getImageData(0, 0, W, H);

                  for (let i = 0; i < W * H; i++) {
                    const a = feathered[i];
                    if (a < 0.001) continue; // fully original
                    const pi = i * 4;
                    origData.data[pi]     = Math.round(origData.data[pi]     * (1 - a) + aiData.data[pi]     * a);
                    origData.data[pi + 1] = Math.round(origData.data[pi + 1] * (1 - a) + aiData.data[pi + 1] * a);
                    origData.data[pi + 2] = Math.round(origData.data[pi + 2] * (1 - a) + aiData.data[pi + 2] * a);
                    origData.data[pi + 3] = 255;
                  }

                  ctx.putImageData(origData, 0, 0);
                  resolve(canvas.toDataURL('image/png'));
                } catch (e) { reject(e); }
              };

              origImg.onload = onAllLoaded;
              aiImg.onload = onAllLoaded;
              maskImg.onload = onAllLoaded;
              origImg.onerror = reject;
              aiImg.onerror = reject;
              maskImg.onerror = reject;

              origImg.src = originalUrl;
              aiImg.src = aiResultDataUrl;
              maskImg.src = maskDataUrl;
            });

            return compositeResult;
          }}
        />
      )}
      
      {/* Regenerate Photo Dialog */}
      <RegeneratePhotoDialog
        open={regenDialogCard !== null}
        onClose={() => setRegenDialogCard(null)}
        cardIndex={regenDialogCard ?? 0}
        loading={regeneratingCard !== null}
        onConfirm={(instruction, imageUrl) => {
          const idx = regenDialogCard;
          setRegenDialogCard(null);
          if (idx !== null) {
            regenerateCard(idx, false, false, instruction || undefined, imageUrl);
          }
        }}
      />
    </div>
  );
};

export default CarouselGenerator;
