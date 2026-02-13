import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, FileText, Plus, Image, Upload, Type, Loader2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const SUITE_COLOR = '#3000E3';

interface ContractField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
}

const AVAILABLE_FIELDS = [
  { id: 'nome', label: 'Nome Completo', type: 'text' },
  { id: 'cpf', label: 'CPF', type: 'text' },
  { id: 'cnpj', label: 'CNPJ', type: 'text' },
  { id: 'rg', label: 'RG', type: 'text' },
  { id: 'endereco', label: 'Endereço', type: 'text' },
  { id: 'cidade', label: 'Cidade', type: 'text' },
  { id: 'estado', label: 'Estado', type: 'text' },
  { id: 'cep', label: 'CEP', type: 'text' },
  { id: 'telefone', label: 'Telefone', type: 'text' },
  { id: 'email', label: 'E-mail', type: 'text' },
  { id: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
  { id: 'data_contrato', label: 'Data do Contrato', type: 'date' },
  { id: 'valor', label: 'Valor', type: 'text' },
  { id: 'prazo', label: 'Prazo', type: 'text' },
  { id: 'empresa', label: 'Nome da Empresa', type: 'text' },
  { id: 'cargo', label: 'Cargo', type: 'text' },
  { id: 'nacionalidade', label: 'Nacionalidade', type: 'text' },
  { id: 'estado_civil', label: 'Estado Civil', type: 'text' },
  { id: 'profissao', label: 'Profissão', type: 'text' },
];

const ContractEditor: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(searchParams.get('id'));
  const [title, setTitle] = useState('Novo Contrato');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ContractField[]>([]);
  const [logoUrl, setLogoUrl] = useState('');
  const [letterheadUrl, setLetterheadUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!searchParams.get('id'));
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showCustomFieldDialog, setShowCustomFieldDialog] = useState(false);
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldType, setCustomFieldType] = useState('text');

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      if (data) setCompanyId(data.company_id);
    };
    init();
  }, [user?.id]);

  useEffect(() => {
    if (!templateId || !companyId) return;
    const load = async () => {
      const { data } = await supabase.from('contract_templates').select('*').eq('id', templateId).single();
      if (data) {
        setTitle(data.title);
        setDescription(data.description || '');
        setFields((data.fields as unknown as ContractField[]) || []);
        setLogoUrl(data.logo_url || '');
        setLetterheadUrl(data.letterhead_url || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
      }
      setLoading(false);
    };
    load();
  }, [templateId, companyId]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const insertField = (field: ContractField) => {
    if (!fields.find(f => f.id === field.id)) {
      setFields(prev => [...prev, field]);
    }
    const tag = `<span class="contract-field" contenteditable="false" style="background: ${SUITE_COLOR}18; border: 1px solid ${SUITE_COLOR}40; border-radius: 4px; padding: 1px 6px; color: ${SUITE_COLOR}; font-weight: 600; font-size: 0.9em; cursor: default;">{{${field.id}}}</span>&nbsp;`;
    document.execCommand('insertHTML', false, tag);
    setShowFieldDialog(false);
    editorRef.current?.focus();
  };

  const addCustomField = () => {
    if (!customFieldLabel.trim()) return;
    const id = customFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const field: ContractField = { id, label: customFieldLabel, type: customFieldType };
    insertField(field);
    setCustomFieldLabel('');
    setCustomFieldType('text');
    setShowCustomFieldDialog(false);
  };

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const uploadFile = async (file: File, type: 'logo' | 'letterhead') => {
    if (!companyId) return;
    const ext = file.name.split('.').pop();
    const path = `${companyId}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('contract-assets').upload(path, file);
    if (error) { toast.error('Erro no upload'); return; }
    const { data: urlData } = supabase.storage.from('contract-assets').getPublicUrl(path);
    if (type === 'logo') setLogoUrl(urlData.publicUrl);
    else setLetterheadUrl(urlData.publicUrl);
    toast.success(`${type === 'logo' ? 'Logo' : 'Timbrado'} enviado!`);
  };

  const save = async () => {
    if (!companyId || !user?.id) return;
    setSaving(true);
    const content = editorRef.current?.innerHTML || '';

    try {
      if (templateId) {
        const { error } = await supabase.from('contract_templates').update({
          title, description, content, fields: fields as any, logo_url: logoUrl, letterhead_url: letterheadUrl,
        }).eq('id', templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('contract_templates').insert({
          company_id: companyId, created_by: user.id,
          title, description, content, fields: fields as any, logo_url: logoUrl, letterhead_url: letterheadUrl,
        }).select().single();
        if (error) throw error;
        setTemplateId(data.id);
        window.history.replaceState(null, '', `/dashboard/contratos/editor?id=${data.id}`);
      }
      toast.success('Modelo salvo!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: SUITE_COLOR }} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-muted/30">
      {/* Header */}
      <div className="h-14 bg-background border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/contratos')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${SUITE_COLOR}, ${SUITE_COLOR}cc)` }}>
            <FileText className="h-4 w-4 text-white" />
          </div>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="h-8 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent max-w-xs"
            placeholder="Nome do modelo"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setShowFieldDialog(true)}>
            <Type className="h-4 w-4" /> Inserir Campo
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2 rounded-xl text-white" style={{ backgroundColor: SUITE_COLOR }}>
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Settings */}
        <div className="w-72 bg-background border-r flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Description */}
              <div>
                <Label className="text-xs font-medium">Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 rounded-xl resize-none text-sm" rows={2} placeholder="Descrição do modelo..." />
              </div>

              <Separator />

              {/* Logo */}
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

              {/* Letterhead */}
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

              {/* Fields list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">Campos editáveis</Label>
                  <Badge variant="secondary" className="text-[10px]">{fields.length}</Badge>
                </div>
                {fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum campo adicionado. Use "Inserir Campo" para adicionar.</p>
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

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-10 bg-background border-b flex items-center gap-1 px-4">
            <button onClick={() => execCmd('bold')} className="p-1.5 rounded-lg hover:bg-muted" title="Negrito"><Bold className="h-4 w-4" /></button>
            <button onClick={() => execCmd('italic')} className="p-1.5 rounded-lg hover:bg-muted" title="Itálico"><Italic className="h-4 w-4" /></button>
            <button onClick={() => execCmd('underline')} className="p-1.5 rounded-lg hover:bg-muted" title="Sublinhado"><Underline className="h-4 w-4" /></button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded-lg hover:bg-muted"><AlignLeft className="h-4 w-4" /></button>
            <button onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded-lg hover:bg-muted"><AlignCenter className="h-4 w-4" /></button>
            <button onClick={() => execCmd('justifyRight')} className="p-1.5 rounded-lg hover:bg-muted"><AlignRight className="h-4 w-4" /></button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-muted"><List className="h-4 w-4" /></button>
            <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded-lg hover:bg-muted"><ListOrdered className="h-4 w-4" /></button>
            <div className="w-px h-5 bg-border mx-1" />
            <select onChange={e => execCmd('fontSize', e.target.value)} className="text-xs border rounded-lg px-2 py-1 bg-background" defaultValue="3">
              <option value="1">Pequeno</option>
              <option value="3">Normal</option>
              <option value="5">Grande</option>
              <option value="7">Muito Grande</option>
            </select>
          </div>

          {/* Page Area */}
          <div className="flex-1 overflow-auto flex justify-center py-8 bg-muted/50">
            <div
              className="bg-white shadow-xl rounded-sm relative"
              style={{
                width: '210mm',
                minHeight: '297mm',
                backgroundImage: letterheadUrl ? `url(${letterheadUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              {/* Logo */}
              {logoUrl && (
                <div className="flex justify-center pt-8 pb-2">
                  <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
                </div>
              )}

              {/* Editable Content */}
              <div
                ref={editorRef}
                contentEditable
                className="outline-none px-16 py-8 min-h-[200mm] text-sm leading-relaxed"
                style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: '1.8' }}
                suppressContentEditableWarning
                onPaste={e => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Insert Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Campo Editável</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="grid grid-cols-2 gap-2 p-1">
              {AVAILABLE_FIELDS.map(f => (
                <button
                  key={f.id}
                  onClick={() => insertField(f)}
                  className="text-left p-3 rounded-xl border hover:border-primary/40 hover:bg-muted/50 transition-all"
                >
                  <span className="text-sm font-medium block">{f.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{`{{${f.id}}}`}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <Separator />
          <Button variant="outline" onClick={() => { setShowFieldDialog(false); setShowCustomFieldDialog(true); }} className="rounded-xl gap-2 w-full">
            <Plus className="h-4 w-4" /> Campo Personalizado
          </Button>
        </DialogContent>
      </Dialog>

      {/* Custom Field Dialog */}
      <Dialog open={showCustomFieldDialog} onOpenChange={setShowCustomFieldDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Campo Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome do campo</Label>
              <Input value={customFieldLabel} onChange={e => setCustomFieldLabel(e.target.value)} className="mt-1 rounded-xl" placeholder="Ex: Número do Contrato" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={customFieldType} onValueChange={setCustomFieldType}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomFieldDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={addCustomField} disabled={!customFieldLabel.trim()} className="rounded-xl text-white" style={{ backgroundColor: SUITE_COLOR }}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractEditor;
