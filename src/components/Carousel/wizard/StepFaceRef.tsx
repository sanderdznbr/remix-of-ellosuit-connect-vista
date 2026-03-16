import React, { useState } from 'react';
import { Upload, X, Folder, Plus, User, ChevronDown, ChevronUp, Scan, Glasses, UserRound, UserRoundCheck } from 'lucide-react';

import { ReferenceImage, FacePerson } from './types';
import GalleryPicker from './GalleryPicker';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const MAX_PEOPLE = 4;
const MAX_PHOTOS_PER_PERSON = 3;

interface Props {
  facePersons: FacePerson[];
  setFacePersons: React.Dispatch<React.SetStateAction<FacePerson[]>>;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  allPeopleOnCover: boolean;
  setAllPeopleOnCover: (v: boolean) => void;
  // Legacy compat (kept for backward compat in generator)
  faceGender: 'male' | 'female' | 'auto';
  setFaceGender: (v: 'male' | 'female' | 'auto') => void;
  wearsGlasses: boolean;
  setWearsGlasses: (v: boolean) => void;
  famousList: any[];
  setFamousList: React.Dispatch<React.SetStateAction<any[]>>;
  famousImages: any[];
  setFamousImages: React.Dispatch<React.SetStateAction<any[]>>;
  activeMarketplaceStyle?: any;
  // Web search face position
  hasWebImages?: boolean;
  webFacePosition?: 'cover' | 'last' | 'none';
  setWebFacePosition?: (v: 'cover' | 'last' | 'none') => void;
}

const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
      selected
        ? 'bg-white text-black'
        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
    }`}>
    {children}
  </button>
);

const PERSON_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

const createPerson = (index: number): FacePerson => ({
  id: crypto.randomUUID(),
  label: `Pessoa ${index + 1}`,
  photos: [],
  gender: 'auto',
  wearsGlasses: false,
});

const StepFaceRef: React.FC<Props> = ({
  facePersons, setFacePersons,
  referenceImages, setReferenceImages,
  allPeopleOnCover, setAllPeopleOnCover,
  faceGender, setFaceGender,
  wearsGlasses, setWearsGlasses,
  activeMarketplaceStyle,
  hasWebImages, webFacePosition, setWebFacePosition,
}) => {
  const { user } = useAuth();
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [galleryOpenFor, setGalleryOpenFor] = useState<string | null>(null);
  const [detectingGender, setDetectingGender] = useState<string | null>(null);

  const detectGenderFromPhoto = async (personId: string, imageDataUrl: string) => {
    setDetectingGender(personId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: 'You are a gender detection assistant. Respond ONLY with "male" or "female". Nothing else.' },
            { role: 'user', content: [
              { type: 'text', text: 'What is the gender of the person in this photo? Reply only "male" or "female".' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ]},
          ],
          temperature: 0,
        },
      });
      if (!error && data?.content) {
        const result = data.content.trim().toLowerCase();
        if (result.includes('female') || result.includes('fem')) {
          updatePerson(personId, { gender: 'female' });
        } else if (result.includes('male') || result.includes('masc')) {
          updatePerson(personId, { gender: 'male' });
        }
      }
    } catch (err) {
      console.warn('Gender detection failed:', err);
    } finally {
      setDetectingGender(null);
    }
  };

  // Ensure at least 1 person slot exists
  React.useEffect(() => {
    if (facePersons.length === 0) {
      const p = createPerson(0);
      setFacePersons([p]);
      setExpandedPerson(p.id);
    } else if (!expandedPerson) {
      setExpandedPerson(facePersons[0].id);
    }
  }, []);

  // Sync legacy faceGender/wearsGlasses from first person
  React.useEffect(() => {
    if (facePersons.length > 0 && facePersons[0].photos.length > 0) {
      setFaceGender(facePersons[0].gender);
      setWearsGlasses(facePersons[0].wearsGlasses);
    }
  }, [facePersons]);

  // Sync referenceImages (face category) from facePersons
  const syncFaceRefs = (persons: FacePerson[]) => {
    const nonFaceRefs = referenceImages.filter(r => r.category !== 'face');
    const allFaceRefs = persons.flatMap(p => p.photos.map(ph => ({ ...ph, personId: p.id })));
    setReferenceImages([...nonFaceRefs, ...allFaceRefs]);
  };

  const addPerson = () => {
    if (facePersons.length >= MAX_PEOPLE) return;
    const newPerson = createPerson(facePersons.length);
    const updated = [...facePersons, newPerson];
    setFacePersons(updated);
    setExpandedPerson(newPerson.id);
  };

  const removePerson = (id: string) => {
    const updated = facePersons.filter(p => p.id !== id);
    setFacePersons(updated);
    syncFaceRefs(updated);
    if (expandedPerson === id) setExpandedPerson(updated[0]?.id || null);
  };

  const updatePerson = (id: string, patch: Partial<FacePerson>) => {
    const updated = facePersons.map(p => p.id === id ? { ...p, ...patch } : p);
    setFacePersons(updated);
    if (patch.photos !== undefined) syncFaceRefs(updated);
  };

  const handlePhotoUpload = (personId: string, files: FileList | null) => {
    if (!files) return;
    const person = facePersons.find(p => p.id === personId);
    if (!person) return;
    const remaining = MAX_PHOTOS_PER_PERSON - person.photos.length;
    if (remaining <= 0) return;

    const isFirstPhoto = person.photos.length === 0;
    let firstDataUrl: string | null = null;

    Array.from(files).slice(0, remaining).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          if (idx === 0 && isFirstPhoto) firstDataUrl = dataUrl;
          const newPhoto: ReferenceImage = {
            url: dataUrl,
            thumb: dataUrl,
            label: file.name,
            source: 'upload',
            category: 'face',
            personId,
          };
          updatePerson(personId, {
            photos: [...(facePersons.find(p => p.id === personId)?.photos || []), newPhoto],
          });
          // Auto-detect gender on first photo upload (when person had no photos)
          if (idx === 0 && isFirstPhoto && person.gender === 'auto') {
            detectGenderFromPhoto(personId, dataUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGalleryFiles = (personId: string, files: { url: string; name: string }[]) => {
    const person = facePersons.find(p => p.id === personId);
    if (!person) return;
    const remaining = MAX_PHOTOS_PER_PERSON - person.photos.length;
    if (remaining <= 0) return;
    const newPhotos: ReferenceImage[] = files.slice(0, remaining).map(f => ({
      url: f.url, thumb: f.url, label: f.name, source: 'upload' as const, category: 'face' as const, personId,
    }));
    updatePerson(personId, { photos: [...person.photos, ...newPhotos] });
  };

  const removePhoto = (personId: string, photoIndex: number) => {
    const person = facePersons.find(p => p.id === personId);
    if (!person) return;
    updatePerson(personId, { photos: person.photos.filter((_, i) => i !== photoIndex) });
  };

  const totalFaces = facePersons.reduce((sum, p) => sum + p.photos.length, 0);
  const hasAnyFaces = totalFaces > 0;
  const multiPeople = facePersons.filter(p => p.photos.length > 0).length > 1;

  const styleRecommendsNoFaces = activeMarketplaceStyle?.recommended_no_faces;
  const styleRecommendationReason = activeMarketplaceStyle?.face_recommendation_reason;

  return (
    <div className="space-y-5" style={{ minHeight: '300px' }}>
      {/* Warning: style recommends no faces */}
      {styleRecommendsNoFaces && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
          <span className="text-amber-400 text-lg shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-300">Estilo recomendado sem rostos</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              {styleRecommendationReason || 'Este estilo é predominantemente tipográfico/gráfico e funciona melhor sem fotos de rostos.'}
              {' '}Para máxima fidelidade ao estilo, recomendamos <strong>pular esta etapa</strong>.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Quem deve aparecer no post?</h2>
        <p className="text-sm text-white/40">Adicione até {MAX_PEOPLE} pessoas com fotos de referência para cada uma.</p>
        <p className="text-xs text-amber-400/70 mt-1">⚡ Envie ângulos diferentes de cada pessoa para melhor resultado.</p>
      </div>

      {/* Person slots */}
      <div className="space-y-2">
        {facePersons.map((person, personIdx) => {
          const isExpanded = expandedPerson === person.id;
          const color = PERSON_COLORS[personIdx % PERSON_COLORS.length];
          const hasPhotos = person.photos.length > 0;

          return (
            <div key={person.id} className="rounded-xl border transition-all"
              style={{
                borderColor: hasPhotos ? `${color}40` : 'rgba(255,255,255,0.06)',
                background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}>
              {/* Person header */}
              <button onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${color}20`, color }}>
                  {hasPhotos ? (
                    <img src={person.photos[0].thumb} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white/80">{person.label}</span>
                  {hasPhotos && (
                    <span className="ml-2 text-[10px] text-white/30 inline-flex items-center gap-1">
                      {person.photos.length} foto(s) · {person.gender === 'auto' ? 'Auto' : person.gender === 'male' ? 'Masc' : 'Fem'}
                      {detectingGender === person.id && <Scan className="w-3 h-3 animate-pulse text-purple-400 ml-1" />}
                      {person.wearsGlasses && <><span>·</span><Glasses className="w-3 h-3" /></>}
                    </span>
                  )}
                </div>
                {facePersons.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removePerson(person.id); }}
                    className="p-1 text-white/20 hover:text-red-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-white/20" /> : <ChevronDown className="h-4 w-4 text-white/20" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Upload area */}
                  {person.photos.length < MAX_PHOTOS_PER_PERSON ? (
                    <label className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed cursor-pointer hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: `${color}30` }}>
                      <Upload className="h-5 w-5 text-white/20" />
                      <span className="text-xs font-medium text-white/50">Subir fotos de {person.label}</span>
                      <span className="text-[10px] text-white/20">Até {MAX_PHOTOS_PER_PERSON - person.photos.length} foto(s) restante(s)</span>
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => handlePhotoUpload(person.id, e.target.files)} />
                    </label>
                  ) : (
                    <div className="py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                      <p className="text-xs text-white/40">Limite de {MAX_PHOTOS_PER_PERSON} fotos atingido</p>
                    </div>
                  )}

                  {/* Gallery button - only for logged in users */}
                  {user && person.photos.length < MAX_PHOTOS_PER_PERSON && (
                    <button onClick={() => setGalleryOpenFor(person.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all cursor-pointer">
                      <Folder className="h-3.5 w-3.5" /> Importar da Galeria de Marca
                    </button>
                  )}

                  {/* Photo thumbnails */}
                  {person.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {person.photos.map((photo, i) => (
                        <div key={i} className="relative group">
                          <div className="w-14 h-14 rounded-lg overflow-hidden ring-1 ring-white/10">
                            <img src={photo.thumb} alt={photo.label} className="w-full h-full object-cover" />
                          </div>
                          <button onClick={() => removePhoto(person.id, i)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attributes — only when photos exist */}
                  {hasPhotos && (
                    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                      <div>
                        <label className="text-xs font-medium text-white/60 mb-2 flex items-center gap-1.5">
                          Gênero
                          {detectingGender === person.id && (
                            <span className="text-[10px] text-purple-400 flex items-center gap-1"><Scan className="w-3 h-3 animate-pulse" /> Detectando...</span>
                          )}
                        </label>
                        <div className="flex gap-1.5">
                          <Chip selected={person.gender === 'auto'} onClick={() => updatePerson(person.id, { gender: 'auto' })}><Scan className="w-3 h-3 inline -mt-px" /> Auto</Chip>
                          <Chip selected={person.gender === 'male'} onClick={() => updatePerson(person.id, { gender: 'male' })}><UserRound className="w-3 h-3 inline -mt-px" /> Masc</Chip>
                          <Chip selected={person.gender === 'female'} onClick={() => updatePerson(person.id, { gender: 'female' })}><UserRoundCheck className="w-3 h-3 inline -mt-px" /> Fem</Chip>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-white/60 mb-2 block">Usa óculos?</label>
                        <div className="flex gap-1.5">
                          <Chip selected={!person.wearsGlasses} onClick={() => updatePerson(person.id, { wearsGlasses: false })}>Não</Chip>
                          <Chip selected={person.wearsGlasses} onClick={() => updatePerson(person.id, { wearsGlasses: true })}><Glasses className="w-3 h-3 inline -mt-px" /> Sim</Chip>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add person button */}
      {facePersons.length < MAX_PEOPLE && (
        <button onClick={addPerson}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium text-white/30 hover:text-white/50 border border-dashed border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all">
          <Plus className="h-4 w-4" /> Adicionar outra pessoa (até {MAX_PEOPLE})
        </button>
      )}

      {/* Multi-person options */}
      {multiPeople && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
          <label className="text-sm font-medium text-white/80 block">Todas as pessoas devem aparecer na capa?</label>
          <div className="flex gap-2">
            <Chip selected={allPeopleOnCover} onClick={() => setAllPeopleOnCover(true)}>Sim, todas na capa</Chip>
            <Chip selected={!allPeopleOnCover} onClick={() => setAllPeopleOnCover(false)}>Alternar entre os cards</Chip>
          </div>
          <p className="text-[10px] text-white/30">
            {allPeopleOnCover
              ? 'Todas as pessoas aparecerão juntas em todos os cards.'
              : 'Cada pessoa aparecerá em cards diferentes, alternando ao longo do carrossel.'}
          </p>
        </div>
      )}

      {/* Gallery picker modal */}
      {galleryOpenFor && (
        <GalleryPicker
          open={!!galleryOpenFor}
          onClose={() => setGalleryOpenFor(null)}
          onSelectFiles={(files) => { handleGalleryFiles(galleryOpenFor, files); setGalleryOpenFor(null); }}
          label="Selecionar pasta de rostos"
          maxFiles={MAX_PHOTOS_PER_PERSON - (facePersons.find(p => p.id === galleryOpenFor)?.photos.length || 0)}
        />
      )}
    </div>
  );
};

export default StepFaceRef;
