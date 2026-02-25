import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [showStylePanel, setShowStylePanel] = useState(false);
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

      // PRIORITY 1: Use images already found from the initial web search (Step 1)
      const webImageSet = new Set<string>();
      const initialWebImages = webSearchResult?.images || [];
      initialWebImages.forEach((url: string) => webImageSet.add(url));
      console.log('Initial web search images available:', initialWebImages.length);

      // PRIORITY 2: Also add any manually selected reference images (general category)
      referenceImages.filter(r => r.category === 'general').forEach(r => webImageSet.add(r.url));

      // PRIORITY 3: Only if we have very few images, do additional search with card terms
      if (webImageSet.size < 4) {
        const allSearchTerms = new Set<string>();
        cards.forEach(c => (c.searchTerms || []).forEach((t: string) => allSearchTerms.add(t)));
        const searchPromises = Array.from(allSearchTerms).slice(0, 5).map(async (term) => {
          try {
            const { data: sd } = await supabase.functions.invoke('generate-carousel', { body: { action: 'web-search', query: term } });
            const urls = sd?.images?.slice(0, 4).map((i: any) => i.url).filter(Boolean) || [];
            urls.forEach((u: string) => webImageSet.add(u));
            return urls;
          } catch { return []; }
        });
        await Promise.all(searchPromises);
      }

      const webImagePool = Array.from(webImageSet);
      console.log('Web image pool:', webImagePool.length, 'unique images (initial:', initialWebImages.length, ')');

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
            imagePromises.push({
              index: i,
              promise: (async () => {
                try {
                  const { data: imgData, error: imgError } = await supabase.functions.invoke('generate-carousel', {
                    body: {
                      action: 'generate-ai-image',
                      prompt: buildImagePrompt(imgPrompt),
                      imageSize: '3:4',
                      topic: imgPrompt,
                      faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
                      styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
                      imageModel: imageSettings.model,
                      negativePrompt: imageSettings.negativePrompt || undefined,
                      fidelity: imageSettings.fidelity,
                    },
                  });
                  if (!imgError && imgData?.success && imgData?.imageUrl) return imgData.imageUrl as string;
                } catch (err) { console.error('Image gen error for card', i, err); }
                return null;
              })(),
            });
          } else if (webImagePool.length > webImageIndex) {
            // Content cards: use real web photo
            updatedCards[i] = { ...updatedCards[i], imageUrl: webImagePool[webImageIndex], isAiImage: false };
            webImageIndex++;
            realImagesUsed++;
          } else {
            // No web images left - fall back to AI
            aiImagesQueued++;
            const cardDesc = card.imagePrompt || card.title || card.bodyTop || '';
            const imgPrompt = `${cleanTopic}: ${cardDesc}`;
            imagePromises.push({
              index: i,
              promise: (async () => {
                try {
                  const { data: imgData, error: imgError } = await supabase.functions.invoke('generate-carousel', {
                    body: {
                      action: 'generate-ai-image',
                      prompt: buildImagePrompt(imgPrompt),
                      imageSize: '3:4',
                      topic: imgPrompt,
                      imageModel: imageSettings.model,
                      negativePrompt: imageSettings.negativePrompt || undefined,
                      fidelity: imageSettings.fidelity,
                    },
                  });
                  if (!imgError && imgData?.success && imgData?.imageUrl) return imgData.imageUrl as string;
                } catch (err) { console.error('Image gen error for card', i, err); }
                return null;
              })(),
            });
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

  const searchImages = async (kws?: string[]) => {
    setSearchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', { body: { action: 'search-images', topic: topic.trim(), keywords: kws || keywords.split(',').map(k => k.trim()).filter(Boolean) } });
      if (error) throw error;
      if (data?.images) setPexelsImages(data.images);
    } catch (err) { console.error(err); }
    finally { setSearchingImages(false); }
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
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: {
          action: 'generate-ai-image',
          prompt: buildImagePrompt(promptText),
          imageSize: '3:4',
          topic: promptText,
          faceReferenceUrls: faceRefUrls.length > 0 ? faceRefUrls : undefined,
          styleReferenceUrls: styleRefUrls.length > 0 ? styleRefUrls : undefined,
          imageModel: imageSettings.model,
          negativePrompt: imageSettings.negativePrompt || undefined,
          fidelity: imageSettings.fidelity,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      setCardImage(cardIndex, data.imageUrl);
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
    const mainTxt = isLight ? '#1A1A1A' : textColor;
    const secondaryTxt = isAccent ? 'rgba(255,255,255,0.75)' : isLight ? '#666' : 'rgba(255,255,255,0.75)';
    const accentTxt = isAccent ? '#FFD4A0' : isLight ? accentColor : accentColor;
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
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
          {card.imageUrl && <img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: card.imageUrl ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.25) 100%)' : `linear-gradient(180deg, ${bgColor} 0%, ${accentColor}44 100%)` }} />
          <div style={{ position: 'absolute', bottom: `${70 * s * ps}px`, left: `${48 * s * ps}px`, right: `${48 * s * ps}px`, zIndex: 10, textAlign: 'center' }}>
            <h1 style={{ fontFamily: serif, fontSize: `${96 * s * fs}px`, fontWeight: 900, lineHeight: 1.0, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: `-${1 * s}px`, textShadow: '0 4px 40px rgba(0,0,0,0.7)' }}>
              {renderAccentText(card.title || '', accentColor, '#FFFFFF', 76, s)}
            </h1>
            {card.subtitle && <p style={{ fontFamily: sans, fontSize: `${22 * s * fs}px`, fontWeight: 600, color: '#FFFFFF', opacity: 0.85, marginTop: `${24 * s}px`, lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: `${3 * s}px` }}>→ {card.subtitle}</p>}
          </div>
        </div>
      );
    }

    if (card.type === 'cta') {
      return (
        <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
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
          style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
          {renderHeader()}
          <div style={{ position: 'absolute', top: `${90 * s * ps}px`, left: `${48 * s * ps}px`, right: `${48 * s * ps}px`, bottom: `${60 * s * ps}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', zIndex: 5, paddingTop: `${30 * s * ps}px` }}>
            <p style={{ fontFamily: serif, fontSize: `${56 * s * fs}px`, fontWeight: 700, lineHeight: 1.15, color: mainTxt }}>{renderAccentText(topText, accentTxt, mainTxt, 56, s)}</p>
            {bottomText && <p style={{ fontFamily: serif, fontSize: `${32 * s * fs}px`, fontWeight: 400, lineHeight: 1.5, color: secondaryTxt, marginTop: 'auto', textDecoration: 'underline', textDecorationColor: `${secondaryTxt}55`, textUnderlineOffset: `${6 * s}px` }}>{bottomText}</p>}
          </div>
        </div>
      );
    }

    return (
      <div ref={isExport ? (el) => { cardRefs.current[index] = el; } : undefined}
        style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: isExport ? 0 : 16, backgroundColor: bg }}>
        {renderHeader()}
        <div style={{ position: 'absolute', top: `${70 * s * ps}px`, left: `${48 * s * ps}px`, right: `${48 * s * ps}px`, bottom: `${40 * s * ps}px`, display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden' }}>
          <div style={{ paddingTop: `${20 * s}px`, flex: hasImage ? undefined : 1, display: hasImage ? undefined : 'flex', flexDirection: hasImage ? undefined : 'column', justifyContent: hasImage ? undefined : 'center', overflow: 'hidden' }}>
            <p style={{ fontFamily: serif, fontSize: `${48 * s * fs}px`, fontWeight: 700, lineHeight: 1.18, color: mainTxt, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: hasImage ? 5 : 10, WebkitBoxOrient: 'vertical' as any }}>{renderAccentText(topText, accentTxt, mainTxt, 48 * fs, s)}</p>
          </div>
          {hasImage && <div style={{ marginTop: `${24 * s}px`, flex: 1, minHeight: 0, borderRadius: `${16 * s}px`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: card.isAiImage ? undefined : (isLight ? '#E8E4DF' : 'rgba(255,255,255,0.08)') }}><img src={card.imageUrl} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: card.isAiImage !== false ? 'cover' : 'contain' }} /></div>}
          {bottomText && <div style={{ paddingTop: `${24 * s}px`, overflow: 'hidden' }}><p style={{ fontFamily: serif, fontSize: `${36 * s * fs}px`, fontWeight: 600, lineHeight: 1.3, color: hasImage ? mainTxt : secondaryTxt, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: hasImage ? 3 : 5, WebkitBoxOrient: 'vertical' as any }}>{renderAccentText(bottomText, accentTxt, hasImage ? mainTxt : secondaryTxt, 36 * fs, s)}</p></div>}
        </div>
      </div>
    );
  };

  // ==================== UI ====================
  const canProceed = wizardStep === 0 ? topic.trim().length > 0 : true;

  return (
    <div className="min-h-screen bg-background">
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: FLOW_COLOR }}>Gerador de Carrossel</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Carrosséis editoriais 1080×1350 para Instagram</p>
          </div>
          {carouselData && !generatingAllImages && (
            <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={saveCarousel} disabled={savingCarousel} className="gap-1 sm:gap-1.5 rounded-xl text-xs sm:text-sm">
                {savingCarousel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden sm:inline">{currentCarouselId ? 'Atualizar' : 'Salvar'}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowStylePanel(!showStylePanel)} className="gap-1 sm:gap-1.5 rounded-xl text-xs sm:text-sm">
                <Palette className="h-4 w-4" /> <span className="hidden sm:inline">Estilo</span>
              </Button>
              <Button onClick={exportAllCards} disabled={exporting} className="gap-1.5 rounded-xl text-xs sm:text-sm" style={{ backgroundColor: FLOW_COLOR }}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} <span className="hidden sm:inline">Exportar PNGs</span>
              </Button>
              <Button onClick={() => setShowPublishDialog(true)} className="gap-1.5 rounded-xl text-xs sm:text-sm" style={{ background: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' }}>
                <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Publicar</span>
              </Button>
            </div>
          )}
          {!carouselData && (
            <Button variant="outline" size="sm" onClick={() => { setShowHistory(true); loadHistory(); }} className="gap-1.5 rounded-xl">
              <History className="h-4 w-4" /> <span className="hidden sm:inline">Histórico</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* ========== WIZARD ========== */}
        {!carouselData && !generating && !generatingAllImages && (
          <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2">
                {WIZARD_STEPS.map((label, i) => (
                  <React.Fragment key={i}>
                    <button onClick={() => i <= wizardStep && setWizardStep(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        i === wizardStep ? 'bg-primary text-primary-foreground shadow-md' :
                        i < wizardStep ? 'bg-primary/15 text-primary cursor-pointer' :
                        'bg-muted text-muted-foreground'
                      }`}>
                      {i < wizardStep ? <Check className="h-3 w-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                    {i < WIZARD_STEPS.length - 1 && <div className={`w-8 h-0.5 rounded-full ${i < wizardStep ? 'bg-primary' : 'bg-border'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step content */}
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

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
                  disabled={wizardStep === 0} className="gap-1.5 rounded-xl">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>

                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <Button onClick={() => setWizardStep(wizardStep + 1)} disabled={!canProceed}
                    className="gap-1.5 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                    Próximo <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={generateContent} disabled={generating || !topic.trim()}
                    className="gap-2 rounded-xl h-12 px-8 text-base font-bold" style={{ backgroundColor: FLOW_COLOR }}>
                    <Sparkles className="h-5 w-5" /> Gerar Carrossel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generating state */}
        {(generating || generatingAllImages) && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin" style={{ color: FLOW_COLOR }} />
              <Sparkles className="h-5 w-5 absolute top-0 right-0" style={{ color: accentColor }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{imageGenProgress || 'Gerando carrossel com IA...'}</p>
              <p className="text-sm text-muted-foreground mt-1">Isso pode levar até 2 minutos</p>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><History className="h-5 w-5" style={{ color: FLOW_COLOR }} /><h3 className="font-bold text-foreground">Histórico</h3></div>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              {loadingHistory ? <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> :
                carouselHistory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum carrossel salvo.</p> :
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {carouselHistory.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                          <span>• {item.card_count} cards</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => loadCarousel(item)} className="gap-1 rounded-xl text-xs"><RotateCcw className="h-3 w-3" /> Abrir</Button>
                      <button onClick={() => deleteCarousel(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        )}

        {/* Style Panel (post-generation) */}
        {carouselData && showStylePanel && (
          <Card className="border-0 shadow-md rounded-3xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Palette className="h-5 w-5" style={{ color: FLOW_COLOR }} /><h3 className="font-bold text-foreground">Estilo</h3></div>
                <button onClick={() => setShowStylePanel(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <StepStyle bgColor={bgColor} setBgColor={setBgColor} accentColor={accentColor} setAccentColor={setAccentColor}
                textColor={textColor} setTextColor={setTextColor} selectedFont={selectedFont} setSelectedFont={setSelectedFont}
                brandName={brandName} setBrandName={setBrandName} userName={userName} setUserName={setUserName}
                dateLabel={dateLabel} setDateLabel={setDateLabel}
                showHeader={showHeader} setShowHeader={setShowHeader} />
            </CardContent>
          </Card>
        )}

        {/* Preview & Edit */}
        {carouselData && editingCard === null && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground text-lg">Preview ({carouselData.cards.length} cards)</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addCard} className="gap-1 rounded-xl"><Plus className="h-3 w-3" /> Card</Button>
                  <Button variant="outline" size="sm" onClick={() => { setCarouselData(null); setCurrentCarouselId(null); setWizardStep(0); }} className="rounded-xl">Novo</Button>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
                {carouselData.cards.map((card, i) => (
                  <div key={i} className="snap-center flex-shrink-0 relative group">
                    <div className="cursor-pointer transition-all rounded-2xl hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background"
                      onClick={() => { setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(card.imagePrompt || card.title || ''); }}>
                      {renderCardPreview(card, i)}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => { setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(card.imagePrompt || card.title || ''); }} className="p-1.5 bg-black/70 rounded-lg text-white hover:bg-black/90"><Edit3 className="h-3.5 w-3.5" /></button>
                      {carouselData.cards.length > 2 && <button onClick={() => removeCard(i)} className="p-1.5 bg-red-600/80 rounded-lg text-white hover:bg-red-700"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2 font-medium">{i + 1}/{carouselData.cards.length}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== FULL-SCREEN EDITOR WITH SIDEBAR ===== */}
      {carouselData && editingCard !== null && (() => {
        const validIndex = editingCard ?? 0;
        const ec = carouselData.cards[validIndex];
        if (!ec) return null;

        return (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Editor top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingCard(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="font-bold text-foreground">Editando Carrossel</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveCarousel} disabled={savingCarousel} className="gap-1.5 rounded-xl">
                  {savingCarousel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {currentCarouselId ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button onClick={exportAllCards} disabled={exporting} className="gap-2 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar PNGs
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Center: Large preview with card navigation */}
              <div className="flex-1 flex flex-col items-center bg-muted/20 overflow-auto p-2">
                <div className="flex-1 flex items-center justify-center w-full min-h-0">
                  <div className="relative" style={{ width: PREVIEW_W * 1.6, height: PREVIEW_H * 1.6, maxWidth: '90vw' }}>
                    <div style={{ transform: 'scale(1.6)', transformOrigin: 'top left' }}>
                      {renderCardPreview(ec, validIndex)}
                    </div>
                  </div>
                </div>
                {/* Card navigation dots */}
                <div className="flex items-center gap-2 py-3 flex-shrink-0">
                  <button onClick={() => { const prev = Math.max(0, validIndex - 1); setEditingCard(prev); setActiveCardIndex(prev); setAiImagePrompt(carouselData.cards[prev]?.imagePrompt || carouselData.cards[prev]?.title || ''); }}
                    disabled={validIndex === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {carouselData.cards.map((_, i) => (
                      <button key={i} onClick={() => { setEditingCard(i); setActiveCardIndex(i); setAiImagePrompt(carouselData.cards[i]?.imagePrompt || carouselData.cards[i]?.title || ''); }}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${i === validIndex ? 'bg-primary scale-125' : 'bg-border hover:bg-muted-foreground'}`} />
                    ))}
                  </div>
                  <button onClick={() => { const next = Math.min(carouselData.cards.length - 1, validIndex + 1); setEditingCard(next); setActiveCardIndex(next); setAiImagePrompt(carouselData.cards[next]?.imagePrompt || carouselData.cards[next]?.title || ''); }}
                    disabled={validIndex === carouselData.cards.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="text-xs text-muted-foreground font-medium ml-2">{validIndex + 1}/{carouselData.cards.length}</span>
                </div>
              </div>

              {/* Right sidebar */}
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
            </div>
          </div>
        );
      })()}

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
              {searchingImages && <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</div>}
              {pexelsImages.length > 0 && (
                <><div className="grid grid-cols-4 gap-2 max-h-[250px] overflow-y-auto rounded-xl">
                  {pexelsImages.map((img) => (
                    <button key={img.id} onClick={() => setCardImage(showImagePicker, img.url)} className="rounded-xl overflow-hidden aspect-square hover:opacity-80 transition-opacity ring-1 ring-border">
                      <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div><p className="text-[10px] text-muted-foreground text-center mt-1">Fotos por Pexels</p></>
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
