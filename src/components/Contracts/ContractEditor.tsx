import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, FileText, Type, Loader2, FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [pageBgColor, setPageBgColor] = useState('#ffffff');
  const [pageTextColor, setPageTextColor] = useState('#000000');

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
        // Extract background color from content metadata
        const bgMatch = content.match(/<!-- BG_COLOR:(#[0-9a-fA-F]{6}) -->/);
        const txtMatch = content.match(/<!-- TEXT_COLOR:(#[0-9a-fA-F]{6}) -->/);
        if (bgMatch) setPageBgColor(bgMatch[1]);
        if (txtMatch) setPageTextColor(txtMatch[1]);
        const cleanContent = content
          .replace(/<!-- BG_COLOR:#[0-9a-fA-F]{6} -->/, '')
          .replace(/<!-- TEXT_COLOR:#[0-9a-fA-F]{6} -->/, '')
          .trim();
        if (cleanContent.includes('<!-- PAGE_BREAK -->')) {
          setPages(cleanContent.split('<!-- PAGE_BREAK -->'));
        } else {
          setPages([cleanContent]);
        }
      }
      setLoading(false);
    };
    load();
  }, [templateId, companyId]);

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

  // Improved PDF import - renders each page to canvas for faithful reproduction
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
        const viewport = page.getViewport({ scale: 2 });
        const textContent = await page.getTextContent();

        // Group text items into lines by Y position
        interface TextLine {
          y: number;
          items: Array<{ str: string; fontSize: number; fontName: string; x: number; width: number; bold: boolean; italic: boolean }>;
        }

        const lines: TextLine[] = [];
        const Y_THRESHOLD = 3;

        for (const item of textContent.items) {
          if (!('str' in item) || !item.str.trim()) continue;
          const transform = (item as any).transform;
          const y = viewport.height - transform[5] * 2; // flip Y
          const x = transform[4] * 2;
          const fontSize = Math.abs(transform[0]) || 12;
          const fontName: string = (item as any).fontName || '';
          const bold = /bold/i.test(fontName);
          const italic = /italic|oblique/i.test(fontName);

          let foundLine = lines.find(l => Math.abs(l.y - y) < Y_THRESHOLD * 2);
          if (foundLine) {
            foundLine.items.push({ str: item.str, fontSize, fontName, x, width: (item as any).width || 0, bold, italic });
          } else {
            lines.push({ y, items: [{ str: item.str, fontSize, fontName, x, width: (item as any).width || 0, bold, italic }] });
          }
        }

        // Sort lines top to bottom, items left to right
        lines.sort((a, b) => a.y - b.y);
        lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

        // Detect dominant font size (body text)
        const allFontSizes = lines.flatMap(l => l.items.map(it => Math.round(it.fontSize)));
        const sizeFreq: Record<number, number> = {};
        allFontSizes.forEach(s => { sizeFreq[s] = (sizeFreq[s] || 0) + 1; });
        const bodyFontSize = Object.entries(sizeFreq).sort((a, b) => b[1] - a[1])[0]?.[0];
        const bodySize = bodyFontSize ? parseInt(bodyFontSize) : 12;

        // Build HTML
        let html = '';
        for (const line of lines) {
          const text = line.items.map(it => it.str).join(' ').trim();
          if (!text) continue;

          const avgFontSize = line.items.reduce((sum, it) => sum + it.fontSize, 0) / line.items.length;
          const isBold = line.items.some(it => it.bold);
          const isLargeHeading = avgFontSize > bodySize * 1.6;
          const isMediumHeading = avgFontSize > bodySize * 1.2;
          const isBullet = /^[\-•●◦▪]/.test(text) || /^[a-z]\)/.test(text);

          // Detect centered text (rough heuristic: items start > 30% from left)
          const minX = Math.min(...line.items.map(it => it.x));
          const isCentered = minX > viewport.width * 0.25;

          const align = isCentered ? ' style="text-align: center;"' : '';

          if (isLargeHeading) {
            html += `<h1${align}>${text}</h1>`;
          } else if (isMediumHeading || (isBold && text.length < 80)) {
            html += `<h2${align}>${text}</h2>`;
          } else if (isBullet) {
            const cleanText = text.replace(/^[\-•●◦▪]\s*/, '').replace(/^[a-z]\)\s*/, '');
            html += `<p style="padding-left: 24px;">• ${cleanText}</p>`;
          } else {
            const styledText = isBold ? `<strong>${text}</strong>` : text;
            html += `<p${align}>${styledText}</p>`;
          }
        }

        newPages.push(html || '<p><br></p>');
      }

      // Try to detect background color from first page
      // Render first page to canvas to sample the background color
      try {
        const firstPage = await pdf.getPage(1);
        const vp = firstPage.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await firstPage.render({ canvasContext: ctx, viewport: vp }).promise;
          // Sample color from top-left corner (likely background)
          const pixel = ctx.getImageData(10, 10, 1, 1).data;
          const bgHex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
          // If it's not white/near-white, set as background
          if (pixel[0] < 240 || pixel[1] < 240 || pixel[2] < 240) {
            setPageBgColor(bgHex);
            // If background is dark, set text to white
            const luminance = (0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]) / 255;
            if (luminance < 0.5) {
              setPageTextColor('#ffffff');
            } else {
              setPageTextColor('#000000');
            }
          }
        }
      } catch (e) {
        console.warn('Could not detect background color', e);
      }

      setPages(newPages.length > 0 ? newPages : ['']);
      setCurrentPage(0);
      toast.success(`PDF importado com ${newPages.length} página(s)!`);
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
      const html = result.value;
      const CHARS_PER_PAGE = 3000;
      const pagesArr: string[] = [];

      if (html.length <= CHARS_PER_PAGE) {
        pagesArr.push(html);
      } else {
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
    if (ext === 'pdf') importPdf(file);
    else if (ext === 'docx' || ext === 'doc') importDocx(file);
    else toast.error('Formato não suportado. Use PDF ou DOCX.');
    e.target.value = '';
  };

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

    const allPages = [...pages];
    const ref = pageRefs.current[currentPage];
    if (ref) allPages[currentPage] = ref.innerHTML;
    const content = `<!-- BG_COLOR:${pageBgColor} --><!-- TEXT_COLOR:${pageTextColor} -->${allPages.join('<!-- PAGE_BREAK -->')}`;

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
          pageBgColor={pageBgColor}
          setPageBgColor={setPageBgColor}
          pageTextColor={pageTextColor}
          setPageTextColor={setPageTextColor}
        />

        <div className="flex-1 flex flex-col">
          <ContractEditorToolbar execCmd={execCmd} />
          <ContractPageArea
            pages={pages}
            currentPage={currentPage}
            pageRefs={pageRefs}
            logoUrl={logoUrl}
            letterheadUrl={letterheadUrl}
            pageBgColor={pageBgColor}
            pageTextColor={pageTextColor}
            savePageContent={savePageContent}
            goToPage={goToPage}
            addPage={addPage}
            deletePage={deletePage}
          />
        </div>
      </div>

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
