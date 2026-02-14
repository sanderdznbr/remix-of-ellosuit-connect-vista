
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Download, Plus, Trash2, Users, ChevronDown, Palette, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

const SUITE_COLOR = '#3000E3';

interface ProposalItem {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  position: number;
}

export default function ProposalEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('id');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [customTerms, setCustomTerms] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [status, setStatus] = useState('rascunho');
  const [primaryColor, setPrimaryColor] = useState(SUITE_COLOR);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: companyId } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single();
      return data?.company_id || null;
    },
    enabled: !!user?.id,
  });

  const { data: company } = useQuery({
    queryKey: ['company-info', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('clients').select('id, name, company_name, email, phone').eq('company_id', companyId).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['company-services', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('company_services').select('*').eq('company_id', companyId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Load existing proposal
  useEffect(() => {
    if (!proposalId) return;
    const load = async () => {
      const { data: p } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
      if (!p) return;
      setTitle(p.title);
      setClientId(p.client_id);
      setValidUntil(p.valid_until || '');
      setNotes(p.notes || '');
      setCustomTerms(p.custom_terms || '');
      setDiscountType(p.discount_type || 'none');
      setDiscountValue(p.discount_value || 0);
      setStatus(p.status);
      const colors = p.custom_colors as any;
      if (colors?.primary) setPrimaryColor(colors.primary);

      const { data: itemsData } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId).order('position');
      if (itemsData) setItems(itemsData.map((it: any) => ({
        id: it.id, name: it.name, description: it.description || '', quantity: Number(it.quantity), unit_price: Number(it.unit_price), total_price: Number(it.total_price), position: it.position,
      })));
    };
    load();
  }, [proposalId]);

  const selectedClient = clients.find((c: any) => c.id === clientId);

  const subtotal = items.reduce((s, it) => s + it.total_price, 0);
  const discountAmount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountType === 'fixed' ? discountValue : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const addItem = (name = '', price = 0) => {
    setItems(prev => [...prev, { name, description: '', quantity: 1, unit_price: price, total_price: price, position: prev.length }]);
  };

  const addServiceItem = (service: any) => {
    setItems(prev => [...prev, {
      name: service.name,
      description: service.description || '',
      quantity: 1,
      unit_price: Number(service.unit_price),
      total_price: Number(service.unit_price),
      position: prev.length,
    }]);
    setShowServicePicker(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0);
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!companyId || !user || !title.trim()) {
      toast({ title: 'Preencha o título da proposta', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        created_by: user.id,
        title,
        client_id: clientId,
        valid_until: validUntil || null,
        notes: notes || null,
        custom_terms: customTerms || null,
        discount_type: discountType,
        discount_value: discountValue,
        subtotal,
        total,
        status,
        custom_colors: { primary: primaryColor },
      };

      let savedId = proposalId;
      if (proposalId) {
        await supabase.from('proposals').update(payload).eq('id', proposalId);
        await supabase.from('proposal_items').delete().eq('proposal_id', proposalId);
      } else {
        const { data } = await supabase.from('proposals').insert(payload).select('id').single();
        savedId = data?.id;
      }

      if (savedId && items.length > 0) {
        await supabase.from('proposal_items').insert(
          items.map((it, i) => ({
            proposal_id: savedId!,
            name: it.name,
            description: it.description || null,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            position: i,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta salva com sucesso!' });
      if (!proposalId && savedId) {
        navigate(`/dashboard/propostas/editor?id=${savedId}`, { replace: true });
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar proposta', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    let y = 0;

    // Header bar
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, w, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Minha Empresa', 20, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PROPOSTA COMERCIAL', 20, 32);

    y = 55;

    // Proposal info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, w - 70, y);
    if (validUntil) doc.text(`Validade: ${format(new Date(validUntil), 'dd/MM/yyyy')}`, w - 70, y + 5);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y);
    y += 12;

    // Client
    if (selectedClient) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('CLIENTE', 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.text(selectedClient.name, 20, y);
      y += 5;
      if (selectedClient.company_name) { doc.setFontSize(9); doc.text(selectedClient.company_name, 20, y); y += 5; }
      if (selectedClient.email) { doc.setFontSize(9); doc.text(selectedClient.email, 20, y); y += 5; }
      if (selectedClient.phone) { doc.setFontSize(9); doc.text(selectedClient.phone, 20, y); y += 5; }
    }
    y += 8;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, w - 40, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text('ITEM', 22, y + 5.5);
    doc.text('QTD', w - 90, y + 5.5);
    doc.text('PREÇO UN.', w - 70, y + 5.5);
    doc.text('TOTAL', w - 40, y + 5.5);
    y += 12;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    items.forEach(it => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(it.name, 22, y);
      if (it.description) { doc.setFontSize(8); doc.setTextColor(130); doc.text(it.description.substring(0, 60), 22, y + 4); doc.setTextColor(30, 30, 30); }
      doc.setFontSize(9);
      doc.text(String(it.quantity), w - 88, y);
      doc.text(`R$ ${it.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, w - 70, y);
      doc.text(`R$ ${it.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, w - 40, y);
      y += it.description ? 10 : 7;
      doc.setDrawColor(230);
      doc.line(22, y - 2, w - 22, y - 2);
    });

    y += 5;

    // Totals
    doc.setFontSize(10);
    doc.text('Subtotal:', w - 75, y); doc.text(`R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, w - 40, y);
    y += 6;
    if (discountAmount > 0) {
      doc.setTextColor(200, 50, 50);
      doc.text('Desconto:', w - 75, y); doc.text(`- R$ ${discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, w - 40, y);
      y += 6;
    }
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TOTAL:', w - 75, y); doc.text(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, w - 40, y);

    y += 15;

    // Notes
    if (notes) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('OBSERVAÇÕES', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(notes, w - 40);
      doc.text(lines, 20, y);
      y += lines.length * 4 + 5;
    }

    // Terms
    if (customTerms) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('TERMOS E CONDIÇÕES', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(customTerms, w - 40);
      doc.text(lines, 20, y);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(primaryColor);
      doc.rect(0, 287, w, 10, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255);
      doc.text(`Página ${i}/${pageCount}  •  Gerado por Ellosuit`, w / 2, 293, { align: 'center' });
    }

    doc.save(`${title || 'proposta'}.pdf`);
    toast({ title: 'PDF gerado com sucesso!' });
  };

  const filteredClients = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const COLORS = ['#3000E3', '#007DE3', '#FF4500', '#16A34A', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#1F2937'];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/dashboard/propostas')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
              {proposalId ? 'Editar Proposta' : 'Nova Proposta'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-10" onClick={() => setShowColorPicker(true)}>
              <Palette className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">Cor</span>
            </Button>
            <Button variant="outline" className="rounded-xl h-10" onClick={generatePDF} disabled={items.length === 0}>
              <Download className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">PDF</span>
            </Button>
            <Button className="rounded-xl h-10 text-white gap-1.5" style={{ background: SUITE_COLOR }} onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              <span className="hidden md:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Title & Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da proposta *"
              className="rounded-xl border-0 text-lg font-semibold p-0 h-auto focus-visible:ring-0 placeholder:text-gray-300"
            />
            <div className="flex flex-wrap gap-3">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="rounded-xl h-9 text-sm w-40"
                placeholder="Válida até"
              />
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedClient.name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.company_name || selectedClient.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowClientPicker(true)} className="rounded-xl text-xs">
                  Alterar
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowClientPicker(true)}
                className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
              >
                <Users className="h-4 w-4" />
                Selecionar cliente
              </button>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase">Itens da Proposta</label>
              <div className="flex gap-2">
                {services.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowServicePicker(true)} className="rounded-xl text-xs gap-1" style={{ color: SUITE_COLOR }}>
                    <FileText className="h-3.5 w-3.5" /> Catálogo
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => addItem()} className="rounded-xl text-xs gap-1" style={{ color: SUITE_COLOR }}>
                  <Plus className="h-3.5 w-3.5" /> Item Manual
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Adicione itens à sua proposta
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.name}
                          onChange={e => updateItem(i, 'name', e.target.value)}
                          placeholder="Nome do item"
                          className="rounded-lg h-9 text-sm font-medium"
                        />
                        <Input
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          placeholder="Descrição (opcional)"
                          className="rounded-lg h-8 text-xs"
                        />
                      </div>
                      <button onClick={() => removeItem(i)} className="p-1.5 rounded-lg hover:bg-red-50 mt-1">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400">Qtd</label>
                        <Input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="rounded-lg h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400">Preço Un.</label>
                        <Input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="rounded-lg h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400">Total</label>
                        <div className="h-8 flex items-center text-sm font-semibold text-gray-700">
                          R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount & Totals */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <label className="text-xs font-semibold text-gray-400 uppercase">Desconto</label>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="w-32 rounded-xl h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem desconto</SelectItem>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
                {discountType !== 'none' && (
                  <Input
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-28 rounded-xl h-9 text-sm"
                    placeholder={discountType === 'percent' ? '%' : 'R$'}
                  />
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Desconto</span>
                    <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-1">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes & Terms */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Observações</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observações gerais..."
                className="rounded-xl min-h-[60px] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Termos e Condições</label>
              <Textarea
                value={customTerms}
                onChange={e => setCustomTerms(e.target.value)}
                placeholder="Termos e condições da proposta..."
                className="rounded-xl min-h-[60px] text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Client Picker Dialog */}
      <Dialog open={showClientPicker} onOpenChange={setShowClientPicker}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <Input
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="rounded-xl mb-3"
          />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredClients.map((c: any) => (
              <button
                key={c.id}
                onClick={() => { setClientId(c.id); setShowClientPicker(false); }}
                className={`w-full text-left p-3 rounded-xl transition-colors ${clientId === c.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <p className="font-medium text-sm text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.company_name || c.email || c.phone}</p>
              </button>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum cliente encontrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Picker Dialog */}
      <Dialog open={showServicePicker} onOpenChange={setShowServicePicker}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar do Catálogo</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {services.map((s: any) => (
              <button
                key={s.id}
                onClick={() => addServiceItem(s)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between">
                  <p className="font-medium text-sm text-gray-900">{s.name}</p>
                  <span className="text-sm font-semibold" style={{ color: SUITE_COLOR }}>
                    R$ {Number(s.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Picker Dialog */}
      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cor da Proposta</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setPrimaryColor(c); setShowColorPicker(false); }}
                className={`w-10 h-10 rounded-xl transition-all hover:scale-110 ${primaryColor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
