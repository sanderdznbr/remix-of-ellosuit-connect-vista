import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, FileText, Plus, Type, Loader2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Trash2, Upload, Image, FileUp,
  ChevronLeft, ChevronRight,
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
import ContractEditorToolbar from './ContractEditorToolbar';
import ContractEditorSidebar from './ContractEditorSidebar';
import ContractFieldDialogs from './ContractFieldDialogs';
import ContractPageArea from './ContractPageArea';

const SUITE_COLOR = '#3000E3';

export interface ContractField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
}

export const AVAILABLE_FIELDS = [
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
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  const [importing, setImporting] = useState(false);

  // Pagination
  const [pages, setPages] = useState<string[]>(['']);
  const [currentPage, setCurrentPage] = useState(0);

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
        const content = data.content || '';
        if (content.includes('<!-- PAGE_BREAK -->')) {
          setPages(content.split('<!-- PAGE_BREAK -->'));
        } else {
          setPages([content]);
        }
      }
      setLoading(false);
    };
    load();
  }, [templateId, companyId]);

  // Set innerHTML when page changes or pages load
  useEffect(() => {
    const ref = pageRefs.current[currentPage];
    if (ref && pages[currentPage] !== undefined) {
      if (ref.innerHTML !== pages[currentPage]) {
        ref.innerHTML = pages[currentPage];
      }
    }
  }, [currentPage, pages.length]);

  const savePageContent = useCallback(() => {
    const ref = pageRefs.current[currentPage];
    if (ref) {
      setPages(prev => {
        const copy = [...prev];
        copy[currentPage] = ref.innerHTML;
        return copy;
      });
    }
  }, [currentPage]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    pageRefs.current[currentPage]?.focus();
  };

  const insertField = (field: ContractField) => {
    if (!fields.find(f => f.id === field.id)) {
      setFields(prev => [...prev, field]);
    }
    const tag = `<span class="contract-field" contenteditable="false" style="background: ${SUITE_COLOR}18; border: 1px solid ${SUITE_COLOR}40; border-radius: 4px; padding: 1px 6px; color: ${SUITE_COLOR}; font-weight: 600; font-size: 0.9em; cursor: default;">{{${field.id}}}</span>&nbsp;`;
    document.execCommand('insertHTML', false, tag);
    setShowFieldDialog(false);
    pageRefs.current[currentPage]?.focus();
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

  // Import PDF
  const importPdf = async (file: File) => {
    setImporting(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newPages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        let lastY: number | null = null;
        let html = '';

        for (const item of textContent.items) {
          if ('str' in item) {
            const y = (item as any).transform?.[5];
            if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
              html += '<br/>';
            }
            html += item.str;
            lastY = y;
          }
        }
        newPages.push(`<p>${html}</p>`);
      }

      setPages(newPages.length > 0 ? newPages : ['']);
      setCurrentPage(0);
      toast.success(`PDF importado com ${newPages.length} página(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao importar PDF');
    } finally {
      setImporting(false);
    }
  };

  // Import DOCX
  const importDocx = async (file: File) => {
    setImporting(true);
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      // Split long content into pages (~3000 chars per page as rough heuristic)
      const html = result.value;
      const CHARS_PER_PAGE = 3000;
      const pagesArr: string[] = [];

      if (html.length <= CHARS_PER_PAGE) {
        pagesArr.push(html);
      } else {
        // Split by paragraphs
        const chunks = html.split(/<\/p>/gi);
        let current = '';
        for (const chunk of chunks) {
          const piece = chunk + '</p>';
          if ((current + piece).length > CHARS_PER_PAGE && current.length > 0) {
            pagesArr.push(current);
            current = piece;
          } else {
            current += piece;
          }
        }
        if (current.trim().length > 0) pagesArr.push(current);
      }

      setPages(pagesArr.length > 0 ? pagesArr : ['']);
      setCurrentPage(0);
      toast.success(`Documento importado com ${pagesArr.length} página(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao importar documento Word');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      importPdf(file);
    } else if (ext === 'docx' || ext === 'doc') {
      importDocx(file);
    } else {
      toast.error('Formato não suportado. Use PDF ou DOCX.');
    }
    e.target.value = '';
  };

  // Page management
  const addPage = () => {
    savePageContent();
    setPages(prev => [...prev, '']);
    setCurrentPage(pages.length);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== index));
    setCurrentPage(prev => Math.min(prev, pages.length - 2));
  };

  const goToPage = (index: number) => {
    savePageContent();
    setCurrentPage(index);
  };

  const save = async () => {
    if (!companyId || !user?.id) return;
    setSaving(true);
    savePageContent();

    // Build content with page break markers
    const allPages = [...pages];
    const ref = pageRefs.current[currentPage];
    if (ref) allPages[currentPage] = ref.innerHTML;
    const content = allPages.join('<!-- PAGE_BREAK -->');

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
          {/* Import button */}
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 pointer-events-none" asChild>
              <span>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {importing ? 'Importando...' : 'Importar PDF/Word'}
              </span>
            </Button>
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleImportFile} disabled={importing} />
          </label>

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
        {/* Sidebar */}
        <ContractEditorSidebar
          description={description}
          setDescription={setDescription}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          letterheadUrl={letterheadUrl}
          setLetterheadUrl={setLetterheadUrl}
          fields={fields}
          removeField={removeField}
          uploadFile={uploadFile}
        />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <ContractEditorToolbar execCmd={execCmd} />

          {/* Page Area */}
          <ContractPageArea
            pages={pages}
            currentPage={currentPage}
            pageRefs={pageRefs}
            logoUrl={logoUrl}
            letterheadUrl={letterheadUrl}
            savePageContent={savePageContent}
            goToPage={goToPage}
            addPage={addPage}
            deletePage={deletePage}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ContractFieldDialogs
        showFieldDialog={showFieldDialog}
        setShowFieldDialog={setShowFieldDialog}
        showCustomFieldDialog={showCustomFieldDialog}
        setShowCustomFieldDialog={setShowCustomFieldDialog}
        customFieldLabel={customFieldLabel}
        setCustomFieldLabel={setCustomFieldLabel}
        customFieldType={customFieldType}
        setCustomFieldType={setCustomFieldType}
        insertField={insertField}
        addCustomField={addCustomField}
      />
    </div>
  );
};

export default ContractEditor;
