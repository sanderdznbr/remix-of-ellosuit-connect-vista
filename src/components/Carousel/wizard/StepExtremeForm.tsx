import React, { useState, useCallback } from 'react';
import { Sparkles, Upload, X, Check, Folder } from 'lucide-react';
import type { ExtremeAnalysis, ExtremeField } from './StepExtremeVision';
import GalleryPicker from './GalleryPicker';
import { autoSaveFilesToGallery } from '@/utils/autoSaveUpload';

interface Props {
  analysis: ExtremeAnalysis;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  brandColors?: string[];
}

const StepExtremeForm: React.FC<Props> = ({ analysis, values, onChange, brandColors = [] }) => {
  const [galleryFieldId, setGalleryFieldId] = useState<string | null>(null);

  const updateField = useCallback((id: string, value: any) => {
    onChange({ ...values, [id]: value });
  }, [values, onChange]);

  const handleFileUpload = useCallback((fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Auto-save to gallery
    autoSaveFilesToGallery(files);

    const existing = (values[fieldId] as string[] | undefined) || [];
    const readers: Promise<string>[] = [];

    for (let i = 0; i < files.length; i++) {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(files[i]);
      }));
    }

    Promise.all(readers).then((dataUrls) => {
      updateField(fieldId, [...existing, ...dataUrls]);
    });

    e.target.value = '';
  }, [values, updateField]);

  const removePhoto = useCallback((fieldId: string, idx: number) => {
    const current = (values[fieldId] as string[] | undefined) || [];
    updateField(fieldId, current.filter((_, i) => i !== idx));
  }, [values, updateField]);

  const handleGallerySelect = useCallback((fieldId: string, files: { url: string; name: string }[]) => {
    const existing = (values[fieldId] as string[] | undefined) || [];
    const newUrls = files.map(f => f.url);
    updateField(fieldId, [...existing, ...newUrls]);
  }, [values, updateField]);

  const renderField = (field: ExtremeField) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={(values[field.id] as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={(values[field.id] as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-colors resize-none"
          />
        );
      case 'select':
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((opt) => {
              const selected = values[field.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => updateField(field.id, opt)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                    selected
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
                  }`}
                >
                  {selected && <Check className="w-3 h-3 inline mr-1" />}
                  {opt}
                </button>
              );
            })}
          </div>
        );
      case 'photo_upload': {
        const photos = (values[field.id] as string[] | undefined) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(field.id, i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-orange-500/30 transition-colors">
                <Upload className="w-5 h-5 text-white/20" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(field.id, e)} />
              </label>
              <button
                onClick={() => setGalleryFieldId(field.id)}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 transition-colors gap-0.5"
                title="Selecionar da Galeria"
              >
                <Folder className="w-4 h-4 text-purple-400/50" />
                <span className="text-[8px] text-white/20">Galeria</span>
              </button>
            </div>
          </div>
        );
      }
      case 'color':
        return (
          <input
            type="color"
            value={(values[field.id] as string) || '#ff6600'}
            onChange={(e) => updateField(field.id, e.target.value)}
            className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" style={{ minHeight: '300px' }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Personalize sua criação</h2>
        </div>
        <p className="text-sm text-white/40">{analysis.summary}</p>
      </div>

      <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {analysis.fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-orange-400">*</span>}
            </label>
            {field.description && (
              <p className="text-[11px] text-white/25 -mt-0.5">{field.description}</p>
            )}
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Gallery Picker */}
      <GalleryPicker
        open={!!galleryFieldId}
        onClose={() => setGalleryFieldId(null)}
        onSelectFiles={(files) => {
          if (galleryFieldId) handleGallerySelect(galleryFieldId, files);
          setGalleryFieldId(null);
        }}
        label="Selecionar da Galeria"
        maxFiles={10}
      />
    </div>
  );
};

export default StepExtremeForm;
