import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Monitor, Palette, User, Image as ImageIcon } from 'lucide-react';

interface PromptMediaItem {
  id: string;
  file_url: string;
  file_name: string;
  media_type: string;
}

interface Props {
  promptTitle: string;
  media: PromptMediaItem[];
  onConfirm: (selectedMedia: PromptMediaItem[]) => void;
  onCancel: () => void;
}

const MEDIA_TYPE_INFO: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  screenshot: { label: 'Screenshot', icon: Monitor, color: '#3B82F6' },
  logo: { label: 'Logomarca', icon: Palette, color: '#8B5CF6' },
  face: { label: 'Pessoa', icon: User, color: '#F59E0B' },
  reference: { label: 'Referência', icon: ImageIcon, color: '#10B981' },
};

const PromptMediaConfirmDialog: React.FC<Props> = ({ promptTitle, media, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(media.map(m => m.id)));

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedMedia = media.filter(m => selected.has(m.id));
    onConfirm(selectedMedia);
  };

  // Group by type
  const grouped = media.reduce<Record<string, PromptMediaItem[]>>((acc, m) => {
    if (!acc[m.media_type]) acc[m.media_type] = [];
    acc[m.media_type].push(m);
    return acc;
  }, {});

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ backgroundColor: '#111118' }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-medium text-white/80">Mídias de "{promptTitle}"</p>
            <p className="text-[11px] text-white/30 mt-0.5">Selecione as mídias para usar no post</p>
          </div>
          <button onClick={onCancel} className="p-1 text-white/30 hover:text-white/60 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media groups */}
        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-4">
          {Object.entries(grouped).map(([type, items]) => {
            const info = MEDIA_TYPE_INFO[type] || MEDIA_TYPE_INFO.reference;
            const Icon = info.icon;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: info.color }} />
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: `${info.color}99` }}>
                    {info.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {items.map(m => {
                    const isSelected = selected.has(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleItem(m.id)}
                        className="relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                        style={{
                          aspectRatio: '1',
                          borderColor: isSelected ? info.color : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: info.color }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-black/40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Pular
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer"
          >
            Aplicar {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromptMediaConfirmDialog;
