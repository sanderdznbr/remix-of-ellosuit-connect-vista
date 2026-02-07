import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Eye, Plus, Trash2, GripVertical,
  Type, Mail, Phone, CircleDot, CheckSquare, Star, MousePointer,
  Loader2, Settings, ChevronLeft, ChevronRight, Smartphone, Monitor,
  ExternalLink, Calendar, Hash, MapPin, Link, FileText, User, Building, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Progress } from '@/components/ui/progress';

interface StepField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  max?: number;
}

interface FunnelStep {
  id: string;
  position: number;
  step_type: string;
  title: string;
  description: string;
  content: any;
  required: boolean;
}

interface LeadFunnel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  settings: any;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Telefone', icon: Phone },
  { type: 'name', label: 'Nome', icon: User },
  { type: 'company', label: 'Empresa', icon: Building },
  { type: 'number', label: 'Número', icon: Hash },
  { type: 'url', label: 'URL', icon: Link },
  { type: 'date', label: 'Data', icon: Calendar },
  { type: 'address', label: 'Endereço', icon: MapPin },
  { type: 'textarea', label: 'Texto Longo', icon: FileText },
  { type: 'single_choice', label: 'Escolha Única', icon: CircleDot },
  { type: 'multiple_choice', label: 'Múltipla Escolha', icon: CheckSquare },
  { type: 'rating', label: 'Avaliação', icon: Star },
];

const STEP_TYPES = [
  { type: 'form', label: 'Formulário', icon: FileText, description: 'Etapa com múltiplos campos' },
  { type: 'text', label: 'Texto', icon: Type, description: 'Campo de texto simples' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Input de email' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Input de telefone' },
  { type: 'name', label: 'Nome', icon: User, description: 'Nome completo' },
  { type: 'single_choice', label: 'Escolha Única', icon: CircleDot, description: 'Selecionar uma opção' },
  { type: 'multiple_choice', label: 'Múltipla Escolha', icon: CheckSquare, description: 'Selecionar várias' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Escala de estrelas' },
  { type: 'cta', label: 'Botão CTA', icon: MousePointer, description: 'Botão final' },
];

// Sortable Step Item
const SortableStepItem: React.FC<{
  step: FunnelStep;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ step, isSelected, onSelect, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stepType = STEP_TYPES.find(t => t.type === step.step_type);
  const Icon = stepType?.icon || Type;
  const fieldCount = step.content?.fields?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50 bg-card'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className={`p-1.5 rounded ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{step.title || `Etapa ${step.position}`}</p>
          {fieldCount > 0 && (
            <p className="text-[10px] text-muted-foreground">{fieldCount} campo{fieldCount > 1 ? 's' : ''}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Live Preview Component
const LivePreview: React.FC<{
  steps: FunnelStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  previewMode: 'mobile' | 'desktop';
}> = ({ steps, currentStep, onStepChange, previewMode }) => {
  const step = steps[currentStep];
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  const renderFieldPreview = (field: StepField) => {
    switch (field.type) {
      case 'single_choice':
        return (
          <div className="space-y-1.5">
            {(field.options || ['Opção 1', 'Opção 2']).map((opt, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-border hover:border-primary/50 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-1.5">
            {(field.options || ['Opção 1', 'Opção 2']).map((opt, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-border hover:border-primary/50 flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-muted-foreground" />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        );
      case 'rating':
        return (
          <div className="flex gap-1 justify-center">
            {Array.from({ length: field.max || 5 }).map((_, idx) => (
              <Star key={idx} className="h-6 w-6 text-muted-foreground" />
            ))}
          </div>
        );
      case 'textarea':
      case 'address':
        return <Textarea placeholder={field.placeholder || field.label} className="bg-background text-sm" rows={2} readOnly />;
      default:
        return <Input placeholder={field.placeholder || field.label} className="bg-background text-sm" readOnly />;
    }
  };

  const renderStepContent = () => {
    if (!step) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Plus className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-sm">Adicione etapas para visualizar</p>
        </div>
      );
    }

    const fields = step.content?.fields as StepField[] | undefined;

    return (
      <div className="space-y-5">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {currentStep + 1} de {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {step.title || 'Título da etapa'}
          </h2>
          {step.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
          )}
        </div>

        {/* Multi-field form */}
        {fields && fields.length > 0 ? (
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {renderFieldPreview(field)}
              </div>
            ))}
          </div>
        ) : (
          // Legacy single-field display
          <>
            {step.step_type === 'text' && <Input placeholder="Digite sua resposta..." className="bg-background" readOnly />}
            {step.step_type === 'email' && <Input type="email" placeholder="seu@email.com" className="bg-background" readOnly />}
            {step.step_type === 'phone' && <Input type="tel" placeholder="(00) 00000-0000" className="bg-background" readOnly />}
            {step.step_type === 'name' && <Input placeholder="Nome completo" className="bg-background" readOnly />}
            {step.step_type === 'single_choice' && (
              <div className="space-y-2">
                {(step.content?.options || ['Opção 1', 'Opção 2']).map((opt: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-border hover:border-primary/50 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
            {step.step_type === 'multiple_choice' && (
              <div className="space-y-2">
                {(step.content?.options || ['Opção 1', 'Opção 2']).map((opt: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-border hover:border-primary/50 flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground" />
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
            {step.step_type === 'rating' && (
              <div className="flex gap-2 justify-center">
                {Array.from({ length: step.content?.max || 5 }).map((_, idx) => (
                  <Star key={idx} className="h-7 w-7 text-muted-foreground" />
                ))}
              </div>
            )}
            {step.step_type === 'cta' && (
              <Button className="w-full" size="lg">
                {step.content?.buttonText || 'Enviar'}
              </Button>
            )}
          </>
        )}

        {/* Continue button */}
        {step.step_type !== 'cta' && (
          <Button className="w-full" size="lg">
            Continuar
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Navigation */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0 || steps.length === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <div className="flex items-center gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onStepChange(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep >= steps.length - 1 || steps.length === 0}
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Preview Content - WHITE background */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div 
          className={`bg-card rounded-2xl shadow-xl border overflow-hidden transition-all ${
            previewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full max-w-2xl h-[500px]'
          }`}
        >
          <div className="h-full p-5 overflow-auto">
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadFunnelBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const funnelId = searchParams.get('id');
  
  const [funnel, setFunnel] = useState<LeadFunnel | null>(null);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    const loadData = async () => {
      if (!funnelId) {
        navigate('/dashboard/leads');
        return;
      }

      setLoading(true);

      const { data: funnelData, error: funnelError } = await supabase
        .from('lead_funnels')
        .select('*')
        .eq('id', funnelId)
        .single();

      if (funnelError || !funnelData) {
        toast({ title: 'Erro', description: 'Funil não encontrado', variant: 'destructive' });
        navigate('/dashboard/leads');
        return;
      }

      setFunnel(funnelData);

      const { data: stepsData } = await supabase
        .from('lead_funnel_steps')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('position', { ascending: true });

      if (stepsData) {
        setSteps(stepsData.map(s => ({
          ...s,
          title: s.title || '',
          description: s.description || '',
          content: s.content || {}
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [funnelId]);

  useEffect(() => {
    if (selectedStep) {
      const idx = steps.findIndex(s => s.id === selectedStep.id);
      if (idx >= 0) setPreviewStep(idx);
    }
  }, [selectedStep, steps]);

  const addStep = (type: string) => {
    const isFormStep = type === 'form';
    const newStep: FunnelStep = {
      id: `new-${Date.now()}`,
      position: steps.length + 1,
      step_type: isFormStep ? 'form' : type,
      title: '',
      description: '',
      content: isFormStep 
        ? { fields: [] }
        : type === 'single_choice' || type === 'multiple_choice' 
          ? { options: ['Opção 1', 'Opção 2'] } 
          : type === 'cta' 
            ? { buttonText: 'Enviar' }
            : {},
      required: true
    };
    setSteps(prev => [...prev, newStep]);
    setSelectedStep(newStep);
    setSelectedFieldIndex(null);
    setPreviewStep(steps.length);
  };

  const addFieldToStep = (fieldType: string) => {
    if (!selectedStep) return;
    
    const newField: StepField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: FIELD_TYPES.find(f => f.type === fieldType)?.label || 'Campo',
      placeholder: '',
      required: true,
      options: (fieldType === 'single_choice' || fieldType === 'multiple_choice') 
        ? ['Opção 1', 'Opção 2'] 
        : undefined,
      max: fieldType === 'rating' ? 5 : undefined,
    };

    const currentFields = selectedStep.content?.fields || [];
    updateStep({ 
      step_type: 'form',
      content: { ...selectedStep.content, fields: [...currentFields, newField] } 
    });
    setSelectedFieldIndex(currentFields.length);
  };

  const updateStep = (updates: Partial<FunnelStep>) => {
    if (!selectedStep) return;
    
    const updated = { ...selectedStep, ...updates };
    setSelectedStep(updated);
    setSteps(prev => prev.map(s => s.id === selectedStep.id ? updated : s));
  };

  const updateField = (fieldIndex: number, updates: Partial<StepField>) => {
    if (!selectedStep) return;
    
    const fields = [...(selectedStep.content?.fields || [])];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    updateStep({ content: { ...selectedStep.content, fields } });
  };

  const deleteField = (fieldIndex: number) => {
    if (!selectedStep) return;
    
    const fields = (selectedStep.content?.fields || []).filter((_, i) => i !== fieldIndex);
    updateStep({ content: { ...selectedStep.content, fields } });
    setSelectedFieldIndex(null);
  };

  const deleteStep = (stepId: string) => {
    setSteps(prev => {
      const filtered = prev.filter(s => s.id !== stepId);
      return filtered.map((s, i) => ({ ...s, position: i + 1 }));
    });
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
      setSelectedFieldIndex(null);
    }
    if (previewStep >= steps.length - 1) {
      setPreviewStep(Math.max(0, steps.length - 2));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex(s => s.id === active.id);
    const newIndex = steps.findIndex(s => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({
      ...s,
      position: i + 1
    }));
    
    setSteps(reordered);
  };

  const saveChanges = async () => {
    if (!funnel || !funnelId) return;

    setSaving(true);

    try {
      await supabase
        .from('lead_funnel_steps')
        .delete()
        .eq('funnel_id', funnelId);

      if (steps.length > 0) {
        const stepsToInsert = steps.map(s => ({
          funnel_id: funnelId,
          position: s.position,
          step_type: s.step_type,
          title: s.title || null,
          description: s.description || null,
          content: s.content || {},
          required: s.required
        }));

        const { error: stepsError } = await supabase
          .from('lead_funnel_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      await supabase
        .from('lead_funnels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', funnelId);

      toast({ title: 'Salvo!', description: 'Alterações salvas com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedField = selectedFieldIndex !== null && selectedStep?.content?.fields 
    ? selectedStep.content.fields[selectedFieldIndex] 
    : null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/leads')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">{funnel?.name}</h1>
              <p className="text-xs text-muted-foreground">/f/{funnel?.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Preview Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(`/f/${funnel?.slug}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir
            </Button>
            <Button onClick={saveChanges} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Step Types & List */}
        <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
          {/* Step Types */}
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm mb-3 text-muted-foreground">Adicionar Etapa</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {STEP_TYPES.slice(0, 9).map(stepType => {
                const Icon = stepType.icon;
                return (
                  <button
                    key={stepType.type}
                    onClick={() => addStep(stepType.type)}
                    className="p-2 text-center rounded-lg border border-border hover:border-primary/50 hover:bg-card transition-all"
                  >
                    <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-[10px] font-medium truncate">{stepType.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">Etapas ({steps.length})</h3>
            </div>
            
            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Clique acima para adicionar</p>
              </div>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {steps.map(step => (
                      <SortableStepItem
                        key={step.id}
                        step={step}
                        isSelected={selectedStep?.id === step.id}
                        onSelect={() => {
                          setSelectedStep(step);
                          setSelectedFieldIndex(null);
                        }}
                        onDelete={() => deleteStep(step.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Center - Live Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <LivePreview
            steps={steps}
            currentStep={previewStep}
            onStepChange={(idx) => {
              setPreviewStep(idx);
              if (steps[idx]) {
                setSelectedStep(steps[idx]);
                setSelectedFieldIndex(null);
              }
            }}
            previewMode={previewMode}
          />
        </div>

        {/* Right Panel - Step/Field Editor */}
        <div className="w-80 border-l bg-card flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-medium">
              {selectedField ? 'Configurar Campo' : 'Configurar Etapa'}
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedStep ? (
                <div className="space-y-4">
                  {/* Back to step if editing field */}
                  {selectedField && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2"
                      onClick={() => setSelectedFieldIndex(null)}
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Voltar para etapa
                    </Button>
                  )}

                  {selectedField ? (
                    // Field Editor
                    <>
                      <div className="space-y-2">
                        <Label>Tipo de Campo</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={(v) => updateField(selectedFieldIndex!, { type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(ft => (
                              <SelectItem key={ft.type} value={ft.type}>{ft.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={selectedField.label}
                          onChange={(e) => updateField(selectedFieldIndex!, { label: e.target.value })}
                          placeholder="Ex: Seu email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Placeholder</Label>
                        <Input
                          value={selectedField.placeholder || ''}
                          onChange={(e) => updateField(selectedFieldIndex!, { placeholder: e.target.value })}
                          placeholder="Texto de ajuda..."
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Obrigatório</p>
                        </div>
                        <Switch
                          checked={selectedField.required !== false}
                          onCheckedChange={(checked) => updateField(selectedFieldIndex!, { required: checked })}
                        />
                      </div>

                      {/* Options for choice fields */}
                      {(selectedField.type === 'single_choice' || selectedField.type === 'multiple_choice') && (
                        <div className="space-y-2">
                          <Label>Opções</Label>
                          {(selectedField.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...(selectedField.options || [])];
                                  newOptions[idx] = e.target.value;
                                  updateField(selectedFieldIndex!, { options: newOptions });
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => {
                                  const newOptions = (selectedField.options || []).filter((_, i) => i !== idx);
                                  updateField(selectedFieldIndex!, { options: newOptions });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const newOptions = [...(selectedField.options || []), `Opção ${(selectedField.options?.length || 0) + 1}`];
                              updateField(selectedFieldIndex!, { options: newOptions });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Opção
                          </Button>
                        </div>
                      )}

                      <Separator />

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => deleteField(selectedFieldIndex!)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Campo
                      </Button>
                    </>
                  ) : (
                    // Step Editor
                    <>
                      <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                          value={selectedStep.title}
                          onChange={(e) => updateStep({ title: e.target.value })}
                          placeholder="Ex: Qual seu nome?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={selectedStep.description}
                          onChange={(e) => updateStep({ description: e.target.value })}
                          placeholder="Texto de apoio..."
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Obrigatório</p>
                          <p className="text-xs text-muted-foreground">O usuário deve responder</p>
                        </div>
                        <Switch
                          checked={selectedStep.required}
                          onCheckedChange={(checked) => updateStep({ required: checked })}
                        />
                      </div>

                      {/* Multi-field step - show fields and add field button */}
                      {(selectedStep.step_type === 'form' || (selectedStep.content?.fields && selectedStep.content.fields.length > 0)) && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label>Campos da Etapa</Label>
                            {(selectedStep.content?.fields || []).map((field: StepField, idx: number) => {
                              const FieldIcon = FIELD_TYPES.find(f => f.type === field.type)?.icon || Type;
                              return (
                                <button
                                  key={field.id}
                                  onClick={() => setSelectedFieldIndex(idx)}
                                  className="w-full p-2 text-left rounded-lg border border-border hover:border-primary/50 flex items-center gap-2"
                                >
                                  <FieldIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{field.label}</span>
                                  {field.required && <span className="text-red-500 text-xs">*</span>}
                                </button>
                              );
                            })}
                          </div>

                          <div className="space-y-2">
                            <Label>Adicionar Campo</Label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {FIELD_TYPES.slice(0, 6).map(ft => {
                                const Icon = ft.icon;
                                return (
                                  <button
                                    key={ft.type}
                                    onClick={() => addFieldToStep(ft.type)}
                                    className="p-2 text-center rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                                  >
                                    <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
                                    <p className="text-[9px] text-muted-foreground">{ft.label}</p>
                                  </button>
                                );
                              })}
                            </div>
                            <Select onValueChange={addFieldToStep}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Mais tipos..." />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map(ft => (
                                  <SelectItem key={ft.type} value={ft.type}>{ft.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Legacy choice options */}
                      {(selectedStep.step_type === 'single_choice' || selectedStep.step_type === 'multiple_choice') && !selectedStep.content?.fields?.length && (
                        <div className="space-y-2">
                          <Label>Opções</Label>
                          {(selectedStep.content?.options || []).map((opt: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...(selectedStep.content?.options || [])];
                                  newOptions[idx] = e.target.value;
                                  updateStep({ content: { ...selectedStep.content, options: newOptions } });
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => {
                                  const newOptions = (selectedStep.content?.options || []).filter((_: any, i: number) => i !== idx);
                                  updateStep({ content: { ...selectedStep.content, options: newOptions } });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              const newOptions = [...(selectedStep.content?.options || []), `Opção ${(selectedStep.content?.options?.length || 0) + 1}`];
                              updateStep({ content: { ...selectedStep.content, options: newOptions } });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Opção
                          </Button>
                        </div>
                      )}

                      {/* CTA button text */}
                      {selectedStep.step_type === 'cta' && (
                        <div className="space-y-2">
                          <Label>Texto do Botão</Label>
                          <Input
                            value={selectedStep.content?.buttonText || ''}
                            onChange={(e) => updateStep({ content: { ...selectedStep.content, buttonText: e.target.value } })}
                            placeholder="Ex: Enviar"
                          />
                        </div>
                      )}

                      {/* Rating config */}
                      {selectedStep.step_type === 'rating' && (
                        <div className="space-y-2">
                          <Label>Máximo</Label>
                          <Select
                            value={String(selectedStep.content?.max || 5)}
                            onValueChange={(v) => updateStep({ content: { ...selectedStep.content, max: parseInt(v) } })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 estrelas</SelectItem>
                              <SelectItem value="10">10 pontos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Convert to multi-field */}
                      {selectedStep.step_type !== 'form' && selectedStep.step_type !== 'cta' && !selectedStep.content?.fields?.length && (
                        <>
                          <Separator />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              updateStep({ 
                                step_type: 'form',
                                content: { fields: [] } 
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Converter para Multi-campos
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-center">
                  <div>
                    <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Selecione uma etapa para editar</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default LeadFunnelBuilder;
