import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { extractColorsFromImage } from '@/utils/extractColorsFromImage';
import {
  ArrowLeft, ArrowRight, Upload, X, Loader2, Palette, Sparkles,
  Image as ImageIcon, User, Monitor, Wand2, Check, Plus, Eye, Download,
  Building2, Home, MapPin, BedDouble, Bath, Ruler, DollarSign, Trash2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

interface GeneratedPost {
  imageUrl: string;
  hasFace: boolean;
  cardIndex: number;
}

interface PropertyDetails {
  id: string;
  photos: File[];
  photoPreviews: string[];
  title: string;
  type: 'apartment' | 'house' | 'commercial' | 'land' | 'studio' | 'penthouse';
  mode: 'sale' | 'rent';
  price: string;
  area: string; // m²
  bedrooms: string;
  bathrooms: string;
  parkingSpots: string;
  suites: string;
  location: string;
  neighborhood: string;
  city: string;
  highlights: string; // "piscina, churrasqueira, vista mar"
  description: string;
}

const createEmptyProperty = (): PropertyDetails => ({
  id: crypto.randomUUID(),
  photos: [],
  photoPreviews: [],
  title: '',
  type: 'apartment',
  mode: 'sale',
  price: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  parkingSpots: '',
  suites: '',
  location: '',
  neighborhood: '',
  city: '',
  highlights: '',
  description: '',
});

const PROPERTY_TYPES: { value: PropertyDetails['type']; label: string }[] = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'land', label: 'Terreno' },
  { value: 'studio', label: 'Studio' },
  { value: 'penthouse', label: 'Cobertura' },
];

const BASE_STEPS = [
  { key: 'references', label: 'Referências de Estilo', icon: ImageIcon },
  { key: 'brand', label: 'Elementos da Marca', icon: Palette },
  { key: 'mockups', label: 'Fotos p/ Mockups', icon: Monitor },
  { key: 'logo', label: 'Logo & Cores', icon: Sparkles },
  { key: 'face', label: 'Foto do Rosto', icon: User },
  { key: 'generate', label: 'Gerar Posts', icon: Wand2 },
];

const PROPERTY_STEP = { key: 'property', label: 'Imóveis', icon: Building2 };

const StyleCreator: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isRealEstate, setIsRealEstate] = useState(false);
  const [propertyMode, setPropertyMode] = useState<'single' | 'multi'>('single');

  // Dynamic steps based on real estate toggle
  const STEPS = React.useMemo(() => {
    if (isRealEstate) {
      return [
        BASE_STEPS[0], // references
        PROPERTY_STEP,  // property details
        BASE_STEPS[1], // brand
        BASE_STEPS[2], // mockups
        BASE_STEPS[3], // logo
        BASE_STEPS[5], // generate (skip face)
      ];
    }
    return BASE_STEPS;
  }, [isRealEstate]);

  // Step data
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);

  const [brandFiles, setBrandFiles] = useState<File[]>([]);
  const [brandPreviews, setBrandPreviews] = useState<string[]>([]);

  const [mockupFiles, setMockupFiles] = useState<File[]>([]);
  const [mockupPreviews, setMockupPreviews] = useState<string[]>([]);
  const [mockupLabels, setMockupLabels] = useState<string[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);

  const [faceFiles, setFaceFiles] = useState<File[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);

  // Legacy property files (kept for backwards compat)
  const [propertyFiles, setPropertyFiles] = useState<File[]>([]);
  const [propertyPreviews, setPropertyPreviews] = useState<string[]>([]);

  // New: detailed properties
  const [properties, setProperties] = useState<PropertyDetails[]>([createEmptyProperty()]);
  const [activePropertyIdx, setActivePropertyIdx] = useState(0);

  const [styleName, setStyleName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 10, message: '' });
  const [previewPost, setPreviewPost] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const extractGeneratedImageUrl = (data: any): string | null => {
    return (
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.images?.[0]?.image_url?.url ||
      data?.raw?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      null
    );
  };

  // File helpers
  const addFiles = (
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>,
    files: FileList | null
  ) => {
    if (!files) return;
    const arr = Array.from(files);
    setter(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => previewSetter(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
    previewSetter(prev => prev.filter((_, i) => i !== index));
  };

  // Logo color extraction
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setExtractingColors(true);
    try {
      const colors = await extractColorsFromImage(url, 6);
      setExtractedColors(colors);
    } catch { setExtractedColors([]); }
    setExtractingColors(false);
  };

  // Upload helper
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/marketplace-assets/${path}`;
  };

  // Generate
  const handleGenerate = async () => {
    if (!styleName.trim()) { toast.error('Dê um nome ao estilo'); return; }
    if (refFiles.length === 0) { toast.error('Adicione pelo menos 1 referência de estilo'); return; }
    if (isRealEstate && properties.every(p => p.photos.length < 1)) { toast.error('Adicione pelo menos 1 foto por imóvel'); return; }
    if (isRealEstate && properties.some(p => !p.price && !p.area)) { toast.error('Preencha preço ou área de cada imóvel'); return; }

    setGenerating(true);
    setGeneratedPosts([]);
    const posts: GeneratedPost[] = [];

    try {
      const timestamp = Date.now();
      const slug = styleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Upload all files
      setProgress({ current: 0, total: 10, message: 'Enviando arquivos...' });

      const refUrls: string[] = [];
      for (let i = 0; i < refFiles.length; i++) {
        const url = await uploadFile(refFiles[i], `style-creator/${slug}/ref-${i}-${timestamp}.${refFiles[i].name.split('.').pop()}`);
        refUrls.push(url);
      }

      const brandUrls: string[] = [];
      for (let i = 0; i < brandFiles.length; i++) {
        const url = await uploadFile(brandFiles[i], `style-creator/${slug}/brand-${i}-${timestamp}.${brandFiles[i].name.split('.').pop()}`);
        brandUrls.push(url);
      }

      const mockupUrls: string[] = [];
      for (let i = 0; i < mockupFiles.length; i++) {
        const url = await uploadFile(mockupFiles[i], `style-creator/${slug}/mockup-${i}-${timestamp}.${mockupFiles[i].name.split('.').pop()}`);
        mockupUrls.push(url);
      }

      let logoUrl = '';
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, `style-creator/${slug}/logo-${timestamp}.${logoFile.name.split('.').pop()}`);
      }

      const faceUrls: string[] = [];
      for (let i = 0; i < faceFiles.length; i++) {
        const url = await uploadFile(faceFiles[i], `style-creator/${slug}/face-${i}-${timestamp}.${faceFiles[i].name.split('.').pop()}`);
        faceUrls.push(url);
      }

      // Upload property photos (new detailed system)
      const propertyUrls: string[][] = []; // array of arrays per property
      const propertyUrlsFlat: string[] = [];
      for (let pi = 0; pi < properties.length; pi++) {
        const prop = properties[pi];
        const urls: string[] = [];
        for (let fi = 0; fi < prop.photos.length; fi++) {
          const url = await uploadFile(prop.photos[fi], `style-creator/${slug}/property-${pi}-${fi}-${timestamp}.${prop.photos[fi].name.split('.').pop()}`);
          urls.push(url);
          propertyUrlsFlat.push(url);
        }
        propertyUrls.push(urls);
      }

      // AI identifica o DNA do estilo a partir das referências
      let styleDna = '';
      try {
        const styleAnalysisContent: any[] = [
          {
            type: 'text',
            text: `Analise as imagens e descreva o DNA visual deste estilo em português brasileiro, com no máximo 6 linhas objetivas. Inclua: composição, hierarquia tipográfica, ritmo visual, uso de espaço, direção de arte e elementos distintivos. Crie instruções acionáveis para gerar NOVOS posts no mesmo estilo sem copiar texto/marca das referências.`
          },
          ...refUrls.slice(0, 6).map(url => ({ type: 'image_url', image_url: { url } })),
          ...brandUrls.slice(0, 3).map(url => ({ type: 'image_url', image_url: { url } })),
          ...(logoUrl ? [{ type: 'image_url', image_url: { url: logoUrl } }] : []),
        ];

        const { data: styleData, error: styleError } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: [
              { role: 'system', content: 'Você é diretor(a) de criação sênior de social media. Extraia um DNA de estilo aplicável para novas artes.' },
              { role: 'user', content: styleAnalysisContent },
            ],
            model: 'google/gemini-3-flash-preview',
          },
        });

        if (styleError) throw styleError;
        styleDna = (styleData?.content || styleData?.response || styleData?.message || '').toString().trim();
      } catch (err) {
        console.warn('Falha ao extrair DNA do estilo, seguindo com prompt base:', err);
      }

      // Generate 10 posts
      for (let i = 0; i < 10; i++) {
        const hasFace = !isRealEstate && i < 5; // first 5 with face (not in real estate mode)
        const cardNumber = i + 1;

        const isMultiProperty = propertyMode === 'multi' && properties.length > 1;
        const cardLabel = isRealEstate
          ? isMultiProperty ? `(imóvel ${(i % properties.length) + 1})` : '(imóvel)'
          : hasFace ? '(com rosto)' : '(sem rosto)';
        setProgress({ current: i, total: 10, message: `Gerando post ${cardNumber}/10 ${cardLabel}...` });

        const referenceImages: { type: string; image_url: { url: string } }[] = [];

        // Add style references
        for (const url of refUrls.slice(0, 4)) {
          referenceImages.push({ type: 'image_url', image_url: { url } });
        }

        // Add brand elements
        for (const url of brandUrls.slice(0, 2)) {
          referenceImages.push({ type: 'image_url', image_url: { url } });
        }

        // Real estate: distribute property photos across cards
        if (isRealEstate && propertyUrlsFlat.length > 0) {
          if (isMultiProperty) {
            // Multi-property: each card gets photos from one property (cycling)
            const propIdx = i % properties.length;
            const propPhotos = propertyUrls[propIdx] || [];
            const photoIdx = Math.floor(i / properties.length) % Math.max(propPhotos.length, 1);
            if (propPhotos[photoIdx]) referenceImages.push({ type: 'image_url', image_url: { url: propPhotos[photoIdx] } });
            if (propPhotos.length > 1 && propPhotos[(photoIdx + 1) % propPhotos.length]) {
              referenceImages.push({ type: 'image_url', image_url: { url: propPhotos[(photoIdx + 1) % propPhotos.length] } });
            }
          } else {
            // Single property: cycle through all photos
            const allPhotos = propertyUrls[0] || [];
            const primaryIdx = i % allPhotos.length;
            if (allPhotos[primaryIdx]) referenceImages.push({ type: 'image_url', image_url: { url: allPhotos[primaryIdx] } });
            if (allPhotos.length > 2) {
              const secondaryIdx = (primaryIdx + 1) % allPhotos.length;
              referenceImages.push({ type: 'image_url', image_url: { url: allPhotos[secondaryIdx] } });
            }
          }
        }

        // Face references (only for face posts, not real estate)
        if (hasFace && faceUrls.length > 0) {
          referenceImages.push({ type: 'image_url', image_url: { url: faceUrls[0] } });
        }

        // Mockup references (for variety)
        if (mockupUrls.length > 0) {
          const mockupIdx = i % mockupUrls.length;
          referenceImages.push({ type: 'image_url', image_url: { url: mockupUrls[mockupIdx] } });
        }

        // Build prompt
        let prompt = `Crie um post profissional para Instagram no formato 1080x1350 (portrait).

ESTILO: Replique EXATAMENTE o estilo visual das imagens de referência fornecidas - mesmas cores, tipografia, composição, elementos decorativos e mood.

NOME DO ESTILO: "${styleName}"`;

        if (styleDna) {
          prompt += `\n\nDNA DO ESTILO (extraído por IA, seguir rigorosamente):\n${styleDna}`;
        }

        if (extractedColors.length > 0) {
          prompt += `\n\nCORES DA MARCA (OBRIGATÓRIO): Use predominantemente estas cores: ${extractedColors.join(', ')}. Integre estas cores harmoniosamente no design.`;
        }

        if (brandUrls.length > 0) {
          prompt += `\n\nELEMENTOS DA MARCA: Observe os patterns, texturas e elementos visuais das imagens de marca fornecidas. Incorpore-os no design.`;
        }

        if (mockupUrls.length > 0) {
          const mockupDesc = mockupLabels.filter(Boolean).join(', ') || 'tela de dispositivo (notebook, celular, etc.)';
          prompt += `\n\nMOCKUPS: Uma das imagens de referência contém fotos para serem usadas em mockups (${mockupDesc}). Integre essas fotos dentro de telas de dispositivos (notebook 3D, celular, tablet) de forma natural e profissional no design.`;
        }

        // Real estate specific prompt with detailed property info
        if (isRealEstate) {
          const propIdx = isMultiProperty ? (i % properties.length) : 0;
          const prop = properties[propIdx];
          const typeLabel = PROPERTY_TYPES.find(t => t.value === prop.type)?.label || prop.type;

          const detailParts: string[] = [];
          if (prop.title) detailParts.push(`Nome: "${prop.title}"`);
          detailParts.push(`Tipo: ${typeLabel}`);
          detailParts.push(`Modalidade: ${prop.mode === 'rent' ? 'ALUGUEL' : 'VENDA'}`);
          if (prop.price) detailParts.push(`Valor: R$ ${prop.price}`);
          if (prop.area) detailParts.push(`Área: ${prop.area}m²`);
          if (prop.bedrooms) detailParts.push(`Quartos: ${prop.bedrooms}`);
          if (prop.suites) detailParts.push(`Suítes: ${prop.suites}`);
          if (prop.bathrooms) detailParts.push(`Banheiros: ${prop.bathrooms}`);
          if (prop.parkingSpots) detailParts.push(`Vagas: ${prop.parkingSpots}`);
          if (prop.neighborhood) detailParts.push(`Bairro: ${prop.neighborhood}`);
          if (prop.city) detailParts.push(`Cidade: ${prop.city}`);
          if (prop.location) detailParts.push(`Endereço: ${prop.location}`);
          if (prop.highlights) detailParts.push(`Diferenciais: ${prop.highlights}`);
          if (prop.description) detailParts.push(`Descrição: ${prop.description}`);

          const detailsBlock = detailParts.join('\n- ');

          if (isMultiProperty) {
            prompt += `\n\nIMÓVEL (CARROSSEL - Card ${cardNumber}, Imóvel ${propIdx + 1} de ${properties.length}):
Este é um post de CARROSSEL IMOBILIÁRIO mostrando vários imóveis. Este card apresenta o imóvel ${propIdx + 1}.

DADOS DO IMÓVEL:
- ${detailsBlock}

INSTRUÇÕES:
- Use a(s) foto(s) deste imóvel como elemento principal
- Destaque as informações-chave: ${prop.mode === 'rent' ? 'ALUGUEL' : 'VENDA'}, valor R$ ${prop.price || '?'}, ${prop.area ? prop.area + 'm²' : ''} ${prop.bedrooms ? prop.bedrooms + ' quartos' : ''}
- Texto em PORTUGUÊS BRASILEIRO com tom de marketing imobiliário premium
- Layout editorial elegante — integre foto, dados e texto de forma harmoniosa
- NÃO invente fotos: use EXATAMENTE as fotos fornecidas`;
          } else {
            const roomTypes = ['fachada', 'sala de estar', 'quarto master', 'cozinha gourmet', 'banheiro', 'área externa', 'varanda', 'vista', 'área social', 'jardim'];
            const roomHint = roomTypes[i % roomTypes.length];

            prompt += `\n\nIMÓVEL (ÚNICO - Card ${cardNumber}/10, foco: ${roomHint}):

DADOS DO IMÓVEL:
- ${detailsBlock}

INSTRUÇÕES:
- Use a(s) foto(s) do imóvel como elemento principal do design
- Neste card, destaque: ${roomHint}
- Inclua informações-chave: ${prop.mode === 'rent' ? 'ALUGUEL' : 'VENDA'}, R$ ${prop.price || '?'}, ${prop.area ? prop.area + 'm²' : ''}, ${prop.bedrooms ? prop.bedrooms + ' quartos' : ''}
- Texto em PORTUGUÊS BRASILEIRO com tom premium de marketing imobiliário
- Layout editorial elegante — varie entre foto grande, foto com overlay, mosaico editorial
- NÃO invente fotos: use EXATAMENTE as fotos fornecidas`;
          }
        } else if (hasFace && faceUrls.length > 0) {
          prompt += `\n\nROSTO: Este post DEVE incluir o rosto da pessoa fornecida nas referências. A pessoa deve aparecer de forma natural e integrada ao design, mantendo FIDELIDADE TOTAL aos traços faciais da referência.`;
        } else {
          prompt += `\n\nSEM ROSTO: Este post NÃO deve conter rostos humanos. Foque em tipografia, elementos visuais, patterns e composição editorial.`;
        }

        prompt += `\n\nREGRAS:
- Full bleed, sem bordas
- Texto em PORTUGUÊS BRASILEIRO
- NÃO copie nomes, @, marcas ou logos das referências
- Varie a composição e layout entre os posts
- Post ${cardNumber}/10
- Estilo editorial profissional para Instagram`;

        if (logoUrl) {
          prompt += `\n\nLOGO: Incorpore a logomarca fornecida de forma sutil em um dos cantos do post.`;
          referenceImages.push({ type: 'image_url', image_url: { url: logoUrl } });
        }

        const userContent: any[] = [
          { type: 'text', text: prompt },
          ...referenceImages,
        ];

        // Model selection: Pro for face posts, Flash for others
        const model = hasFace ? 'google/gemini-3-pro-image-preview' : 'google/gemini-2.5-flash-image';

        // Retry up to 3 times per post
        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`Tentativa ${attempt + 1} para post ${cardNumber}...`);
              await new Promise(r => setTimeout(r, 5000 * attempt));
            }

            const { data, error } = await supabase.functions.invoke('ai-chat', {
              body: {
                messages: [
                  { role: 'system', content: 'Você é um diretor de arte sênior especializado em Instagram. Crie uma imagem original com altíssima qualidade visual, obedecendo rigorosamente o estilo e as referências.' },
                  { role: 'user', content: userContent },
                ],
                model,
                modalities: ['image', 'text'],
              },
            });

            if (error) throw error;

            const imageUrl = extractGeneratedImageUrl(data);
            if (!imageUrl) {
              console.warn(`Post ${cardNumber} sem imagem na resposta. Raw keys:`, data ? Object.keys(data) : 'null');
              throw new Error('A IA retornou resposta sem imagem.');
            }

            // Upload generated image to storage
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
            const byteString = atob(base64Data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const blob = new Blob([ab], { type: 'image/png' });
            const file = new File([blob], `generated-${i}.png`, { type: 'image/png' });

            const genUrl = await uploadFile(file, `style-creator/${slug}/generated-${hasFace ? 'face' : 'no-face'}-${i}-${timestamp}.png`);

            const post: GeneratedPost = { imageUrl: genUrl, hasFace, cardIndex: i };
            posts.push(post);
            setGeneratedPosts([...posts]);
            success = true;
          } catch (err: any) {
            console.error(`Erro no post ${cardNumber} (tentativa ${attempt + 1}):`, err);
            if (attempt === 2) {
              toast.error(`Post ${cardNumber} falhou após 3 tentativas`);
            }
          }
        }

        // Delay between generations to avoid rate limits
        if (i < 9) await new Promise(r => setTimeout(r, 4000));
      }

      setProgress({ current: 10, total: 10, message: 'Concluído!' });
      setShowResults(true);
      toast.success(`${posts.length} posts gerados com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setGenerating(false);
    }
  };

  const canAdvance = () => {
    const currentKey = STEPS[step]?.key;
    switch (currentKey) {
      case 'references': return refFiles.length > 0;
      case 'property': return properties.some(p => p.photos.length >= 1);
      case 'generate': return styleName.trim().length > 0;
      default: return true;
    }
  };

  // Property helpers
  const updateProperty = (idx: number, updates: Partial<PropertyDetails>) => {
    setProperties(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const addPropertyPhoto = (propIdx: number, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setProperties(prev => prev.map((p, i) => {
      if (i !== propIdx) return p;
      const newPhotos = [...p.photos, ...arr];
      const newPreviews = [...p.photoPreviews];
      arr.forEach(f => {
        const reader = new FileReader();
        reader.onload = e => {
          setProperties(pr => pr.map((pp, ii) => ii !== propIdx ? pp : { ...pp, photoPreviews: [...pp.photoPreviews, e.target?.result as string] }));
        };
        reader.readAsDataURL(f);
      });
      return { ...p, photos: newPhotos };
    }));
  };

  const removePropertyPhoto = (propIdx: number, photoIdx: number) => {
    setProperties(prev => prev.map((p, i) => {
      if (i !== propIdx) return p;
      return {
        ...p,
        photos: p.photos.filter((_, j) => j !== photoIdx),
        photoPreviews: p.photoPreviews.filter((_, j) => j !== photoIdx),
      };
    }));
  };

  const currentStepKey = STEPS[step]?.key;

  const renderImageGrid = (
    previews: string[],
    fileSetter: React.Dispatch<React.SetStateAction<File[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<string[]>>,
    onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void,
    label: string,
    hint: string
  ) => (
    <div>
      <p className="text-sm text-white/60 mb-3">{hint}</p>
      <div className="flex gap-3 flex-wrap">
        {previews.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => removeFile(i, fileSetter, previewSetter)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
          <div className="text-center">
            <Plus className="w-5 h-5 text-white/25 mx-auto mb-1" />
            <span className="text-[10px] text-white/25">{label}</span>
          </div>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
        </label>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStepKey) {
      case 'references': // References
        return (
          <div className="space-y-6">
            {/* Real estate toggle */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <Building2 className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80">Estilo Imobiliário</p>
                <p className="text-xs text-white/35">Ativa etapa de fotos do imóvel e adapta a geração para o mercado imobiliário</p>
              </div>
              <Switch checked={isRealEstate} onCheckedChange={(v) => { setIsRealEstate(v); setStep(0); }} />
            </div>
            {renderImageGrid(
              refPreviews, setRefFiles, setRefPreviews,
              (e) => addFiles(setRefFiles, setRefPreviews, e.target.files),
              'Adicionar', 'Adicione prints de posts que você gosta. Eles servirão como referência visual para o estilo.'
            )}
          </div>
        );

      case 'property': // Property details (real estate)
        return (
          <div className="space-y-5">
            {/* Single vs Multi toggle */}
            <div className="flex gap-2">
              <button onClick={() => { setPropertyMode('single'); setProperties([properties[0] || createEmptyProperty()]); setActivePropertyIdx(0); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${propertyMode === 'single' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
                <Home className="w-3.5 h-3.5" /> Imóvel Único
              </button>
              <button onClick={() => { setPropertyMode('multi'); if (properties.length < 2) setProperties([...properties, createEmptyProperty()]); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${propertyMode === 'multi' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'}`}>
                <Building2 className="w-3.5 h-3.5" /> Vários Imóveis
              </button>
            </div>

            {propertyMode === 'single' ? (
              <p className="text-xs text-white/40">Preencha os dados do imóvel. A IA gerará 10 posts variando ângulos e ambientes no estilo selecionado.</p>
            ) : (
              <p className="text-xs text-white/40">Adicione até 10 imóveis. A IA criará um carrossel onde cada card apresenta um imóvel diferente.</p>
            )}

            {/* Property tabs (multi mode) */}
            {propertyMode === 'multi' && (
              <div className="flex gap-1.5 flex-wrap items-center">
                {properties.map((prop, idx) => (
                  <button key={prop.id} onClick={() => setActivePropertyIdx(idx)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${activePropertyIdx === idx ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/[0.04] text-white/35 border border-white/[0.06]'}`}>
                    <Home className="w-3 h-3" />
                    {prop.title || `Imóvel ${idx + 1}`}
                    {properties.length > 1 && (
                      <X className="w-3 h-3 ml-1 opacity-50 hover:opacity-100" onClick={(e) => {
                        e.stopPropagation();
                        setProperties(prev => prev.filter((_, i) => i !== idx));
                        setActivePropertyIdx(Math.min(activePropertyIdx, properties.length - 2));
                      }} />
                    )}
                  </button>
                ))}
                {properties.length < 10 && (
                  <button onClick={() => { setProperties(prev => [...prev, createEmptyProperty()]); setActivePropertyIdx(properties.length); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.03] text-white/25 border border-dashed border-white/10 hover:border-amber-500/30 transition-all cursor-pointer">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>
            )}

            {/* Active property form */}
            {(() => {
              const prop = properties[activePropertyIdx] || properties[0];
              const idx = activePropertyIdx;
              if (!prop) return null;
              const inputCls = "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/40";
              const labelCls = "text-[11px] text-white/40 font-medium mb-1 block";
              return (
                <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {/* Photos */}
                  <div>
                    <span className={labelCls}>Fotos do Imóvel *</span>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {prop.photoPreviews.map((url, pi) => (
                        <div key={pi} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePropertyPhoto(idx, pi)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-amber-500/30 transition-colors">
                        <div className="text-center">
                          <Plus className="w-4 h-4 text-white/20 mx-auto" />
                          <span className="text-[9px] text-white/20">Foto</span>
                        </div>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => addPropertyPhoto(idx, e.target.files)} />
                      </label>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <span className={labelCls}>Título / Nome do empreendimento</span>
                    <input value={prop.title} onChange={e => updateProperty(idx, { title: e.target.value })}
                      placeholder="Ex: Residencial Vista Mar" className={inputCls} />
                  </div>

                  {/* Type + Mode row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={labelCls}>Tipo</span>
                      <select value={prop.type} onChange={e => updateProperty(idx, { type: e.target.value as PropertyDetails['type'] })}
                        className={inputCls}>
                        {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className={labelCls}>Modalidade</span>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => updateProperty(idx, { mode: 'sale' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${prop.mode === 'sale' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/[0.04] text-white/35 border border-white/[0.06]'}`}>
                          Venda
                        </button>
                        <button onClick={() => updateProperty(idx, { mode: 'rent' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${prop.mode === 'rent' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/[0.04] text-white/35 border border-white/[0.06]'}`}>
                          Aluguel
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price + Area */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={labelCls}><DollarSign className="w-3 h-3 inline" /> Valor (R$)</span>
                      <input value={prop.price} onChange={e => updateProperty(idx, { price: e.target.value })}
                        placeholder="450.000" className={inputCls} />
                    </div>
                    <div>
                      <span className={labelCls}><Ruler className="w-3 h-3 inline" /> Área (m²)</span>
                      <input value={prop.area} onChange={e => updateProperty(idx, { area: e.target.value })}
                        placeholder="120" className={inputCls} />
                    </div>
                  </div>

                  {/* Rooms row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className={labelCls}><BedDouble className="w-3 h-3 inline" /> Quartos</span>
                      <input value={prop.bedrooms} onChange={e => updateProperty(idx, { bedrooms: e.target.value })}
                        placeholder="3" className={inputCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Suítes</span>
                      <input value={prop.suites} onChange={e => updateProperty(idx, { suites: e.target.value })}
                        placeholder="1" className={inputCls} />
                    </div>
                    <div>
                      <span className={labelCls}><Bath className="w-3 h-3 inline" /> Banheiros</span>
                      <input value={prop.bathrooms} onChange={e => updateProperty(idx, { bathrooms: e.target.value })}
                        placeholder="2" className={inputCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Vagas</span>
                      <input value={prop.parkingSpots} onChange={e => updateProperty(idx, { parkingSpots: e.target.value })}
                        placeholder="2" className={inputCls} />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={labelCls}><MapPin className="w-3 h-3 inline" /> Bairro</span>
                      <input value={prop.neighborhood} onChange={e => updateProperty(idx, { neighborhood: e.target.value })}
                        placeholder="Copacabana" className={inputCls} />
                    </div>
                    <div>
                      <span className={labelCls}>Cidade</span>
                      <input value={prop.city} onChange={e => updateProperty(idx, { city: e.target.value })}
                        placeholder="Rio de Janeiro" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <span className={labelCls}>Endereço (opcional)</span>
                    <input value={prop.location} onChange={e => updateProperty(idx, { location: e.target.value })}
                      placeholder="Av. Atlântica, 1500" className={inputCls} />
                  </div>

                  {/* Highlights */}
                  <div>
                    <span className={labelCls}>Diferenciais</span>
                    <input value={prop.highlights} onChange={e => updateProperty(idx, { highlights: e.target.value })}
                      placeholder="Piscina, churrasqueira, vista mar, academia" className={inputCls} />
                  </div>

                  {/* Description */}
                  <div>
                    <span className={labelCls}>Descrição (opcional)</span>
                    <textarea value={prop.description} onChange={e => updateProperty(idx, { description: e.target.value })}
                      placeholder="Descreva o imóvel em poucas palavras..."
                      className={`${inputCls} resize-none min-h-[60px]`} rows={2} />
                  </div>
                </div>
              );
            })()}
          </div>
        );

      case 'brand': // Brand elements
        return renderImageGrid(
          brandPreviews, setBrandFiles, setBrandPreviews,
          (e) => addFiles(setBrandFiles, setBrandPreviews, e.target.files),
          'Adicionar', 'Adicione patterns, texturas, elementos gráficos da marca (opcional).'
        );

      case 'mockups': // Mockups
        return (
          <div>
            <p className="text-sm text-white/60 mb-3">
              Adicione fotos que devem aparecer dentro de telas (notebook, celular, tablet). A IA criará mockups 3D com estas imagens.
            </p>
            <div className="flex gap-3 flex-wrap">
              {mockupPreviews.map((url, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => {
                      setMockupFiles(prev => prev.filter((_, idx) => idx !== i));
                      setMockupPreviews(prev => prev.filter((_, idx) => idx !== i));
                      setMockupLabels(prev => prev.filter((_, idx) => idx !== i));
                    }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    value={mockupLabels[i] || ''}
                    onChange={e => setMockupLabels(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                    placeholder="Ex: tela notebook"
                    className="w-24 px-2 py-1 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/70 outline-none placeholder:text-white/20"
                  />
                </div>
              ))}
              <label className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
                <div className="text-center">
                  <Monitor className="w-5 h-5 text-white/25 mx-auto mb-1" />
                  <span className="text-[10px] text-white/25">Mockup</span>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setMockupFiles(prev => [...prev, ...files]);
                  files.forEach(f => {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setMockupPreviews(prev => [...prev, ev.target?.result as string]);
                      setMockupLabels(prev => [...prev, '']);
                    };
                    reader.readAsDataURL(f);
                  });
                }} />
              </label>
            </div>
          </div>
        );

      case 'logo': // Logo
        return (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Faça upload da logo para extrair as cores da marca.</p>
            {logoPreview ? (
              <div className="flex items-start gap-4">
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10">
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain bg-white/5" />
                  <button onClick={() => { setLogoFile(null); setLogoPreview(''); setExtractedColors([]); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  {extractingColors ? (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin" /> Extraindo cores...
                    </div>
                  ) : extractedColors.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/40 mb-2">Cores extraídas:</p>
                      <div className="flex gap-2 flex-wrap">
                        {extractedColors.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.06]">
                            <div className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                            <span className="text-xs text-white/50 font-mono">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30">Nenhuma cor detectada</p>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-white/15 cursor-pointer hover:border-yellow-500/40 transition-colors">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-white/25 mx-auto mb-1" />
                  <span className="text-xs text-white/25">Logo</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            )}
          </div>
        );

      case 'face': // Face
        return renderImageGrid(
          facePreviews, setFaceFiles, setFacePreviews,
          (e) => addFiles(setFaceFiles, setFacePreviews, e.target.files),
          'Adicionar', 'Adicione fotos do rosto. 5 dos 10 posts terão o rosto integrado ao design.'
        );

      case 'generate': // Generate
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Nome do Estilo *</label>
              <input value={styleName} onChange={e => setStyleName(e.target.value)}
                placeholder={isRealEstate ? 'Ex: Luxo Imobiliário' : 'Ex: Neon Editorial'}
                className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-yellow-500/40" />
            </div>

            {/* Summary */}
            <div className={`grid grid-cols-2 sm:grid-cols-${isRealEstate ? '4' : '5'} gap-3`}>
              {[
                { label: 'Referências', count: refFiles.length },
                ...(isRealEstate ? [{ label: 'Imóvel', count: propertyFiles.length }] : []),
                { label: 'Marca', count: brandFiles.length },
                { label: 'Mockups', count: mockupFiles.length },
                { label: 'Cores', count: extractedColors.length },
                ...(!isRealEstate ? [{ label: 'Rostos', count: faceFiles.length }] : []),
              ].map(s => (
                <div key={s.label} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-0.5">{s.label}</p>
                  <p className="text-lg font-bold text-white/70">{s.count}</p>
                </div>
              ))}
            </div>

            {isRealEstate && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300/80">Modo Imobiliário: as fotos do imóvel serão distribuídas entre os 10 cards</span>
              </div>
            )}

            {generating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                  {progress.message}
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Generated posts grid */}
            {generatedPosts.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-3">Posts gerados ({generatedPosts.length}/10)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {generatedPosts.map((post, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 group cursor-pointer"
                      onClick={() => setPreviewPost(post.imageUrl)}>
                      <div className="aspect-[4/5]">
                        <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[9px] text-white/60 flex items-center justify-between">
                        <span>{post.hasFace ? '👤 Com rosto' : isRealEstate ? '🏠 Imóvel' : '📐 Sem rosto'}</span>
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating || !styleName.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {generating ? 'Gerando...' : 'Gerar 10 Posts'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (user?.email !== 'admin@gmail.com') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Criador de Estilos</h1>
        <p className="text-sm text-white/40">Crie estilos únicos para o Marketplace com referências, marca e mockups.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button key={s.key} onClick={() => !generating && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                isDone ? 'bg-white/[0.06] text-white/50' :
                'bg-white/[0.03] text-white/25'
              }`}>
              {isDone ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Icon className="w-3.5 h-3.5" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {React.createElement(STEPS[step].icon, { className: 'w-5 h-5 text-yellow-500' })}
          {STEPS[step].label}
        </h2>
        {renderStep()}
      </div>

      {/* Navigation */}
      {!generating && (
        <div className="flex items-center gap-3 mt-8 max-w-3xl">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/50 text-sm hover:bg-white/[0.1] cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button onClick={() => canAdvance() && setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.12] disabled:opacity-30 cursor-pointer ml-auto">
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Results gallery (full view after generation) */}
      {showResults && generatedPosts.length > 0 && (
        <div className="fixed inset-0 z-[9998] bg-[#0a0a0f] overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Posts Gerados — {styleName}</h2>
                <p className="text-sm text-white/40 mt-1">{generatedPosts.length} posts criados • Clique para ampliar, use o botão para baixar</p>
              </div>
              <button onClick={() => setShowResults(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] text-white/60 text-sm hover:bg-white/[0.12] cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Voltar ao editor
              </button>
            </div>

            {/* Real estate: single grid */}
            {isRealEstate ? (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-white/50 mb-3">🏠 Posts Imobiliários ({generatedPosts.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {generatedPosts.map((post, i) => (
                    <div key={`prop-${i}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                      <div className="aspect-[4/5] cursor-pointer" onClick={() => setPreviewPost(post.imageUrl)}>
                        <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <a href={post.imageUrl} download={`${styleName}-imovel-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* With face */}
                {generatedPosts.filter(p => p.hasFace).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-white/50 mb-3">👤 Com Rosto ({generatedPosts.filter(p => p.hasFace).length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {generatedPosts.filter(p => p.hasFace).map((post, i) => (
                        <div key={`face-${i}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                          <div className="aspect-[4/5] cursor-pointer" onClick={() => setPreviewPost(post.imageUrl)}>
                            <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <a href={post.imageUrl} download={`${styleName}-face-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Without face */}
                {generatedPosts.filter(p => !p.hasFace).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-white/50 mb-3">📐 Sem Rosto ({generatedPosts.filter(p => !p.hasFace).length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {generatedPosts.filter(p => !p.hasFace).map((post, i) => (
                        <div key={`noface-${i}`} className="relative rounded-xl overflow-hidden border border-white/10 group">
                          <div className="aspect-[4/5] cursor-pointer" onClick={() => setPreviewPost(post.imageUrl)}>
                            <img src={post.imageUrl} alt={`Post ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <a href={post.imageUrl} download={`${styleName}-${i + 1}.png`} target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewPost && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={() => setPreviewPost(null)}>
          <div className="relative max-w-lg max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={previewPost} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl" />
            <button onClick={() => setPreviewPost(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleCreator;
