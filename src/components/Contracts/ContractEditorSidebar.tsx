import React from 'react';
import { Upload, Image, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ContractField } from './ContractEditor';

const SUITE_COLOR = '#3000E3';

interface Props {
  description: string;
  setDescription: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  letterheadUrl: string;
  setLetterheadUrl: (v: string) => void;
  fields: ContractField[];
  removeField: (id: string) => void;
  uploadFile: (file: File, type: 'logo' | 'letterhead') => void;
}

const ContractEditorSidebar: React.FC<Props> = ({
  description, setDescription, logoUrl, setLogoUrl,
  letterheadUrl, setLetterheadUrl, fields, removeField, uploadFile,
}) => (
  <div className="w-72 bg-background border-r flex flex-col">
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">
        <div>
          <Label className="text-xs font-medium">Descrição</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 rounded-xl resize-none text-sm" rows={2} placeholder="Descrição do modelo..." />
        </div>
        <Separator />
        <div>
          <Label className="text-xs font-medium">Logo (topo do contrato)</Label>
          {logoUrl ? (
            <div className="mt-2 relative">
              <img src={logoUrl} alt="Logo" className="max-h-16 rounded-lg border" />
              <button onClick={() => setLogoUrl('')} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ) : (
            <label className="mt-2 flex items-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Enviar logo</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'logo')} />
            </label>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium">Timbrado (fundo da página)</Label>
          {letterheadUrl ? (
            <div className="mt-2 relative">
              <img src={letterheadUrl} alt="Timbrado" className="max-h-24 rounded-lg border w-full object-cover" />
              <button onClick={() => setLetterheadUrl('')} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ) : (
            <label className="mt-2 flex items-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Enviar timbrado</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'letterhead')} />
            </label>
          )}
        </div>
        <Separator />
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium">Campos editáveis</Label>
            <Badge variant="secondary" className="text-[10px]">{fields.length}</Badge>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum campo adicionado.</p>
          ) : (
            <div className="space-y-1.5">
              {fields.map(f => (
                <div key={f.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: `${SUITE_COLOR}15`, color: SUITE_COLOR }}>
                      {`{{${f.id}}}`}
                    </span>
                    <span>{f.label}</span>
                  </div>
                  <button onClick={() => removeField(f.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  </div>
);

export default ContractEditorSidebar;
