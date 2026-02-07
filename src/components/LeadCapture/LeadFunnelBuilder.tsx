import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Eye, Play, Plus, Trash2, GripVertical,
  Type, Mail, Phone, CircleDot, CheckSquare, Star, MousePointer,
  Loader2, Settings, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const STEP_TYPES = [
  { type: 'text', label: 'Texto', icon: Type, description: 'Campo de texto livre' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Input de email com validação' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Input de telefone' },
  { type: 'single_choice', label: 'Escolha Única', icon: CircleDot, description: 'Selecionar uma opção' },
  { type: 'multiple_choice', label: 'Múltipla Escolha', icon: CheckSquare, description: 'Selecionar várias opções' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Escala de 1-10 ou estrelas' },
  { type: 'cta', label: 'Botão CTA', icon: MousePointer, description: 'Botão de ação final' },
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50 bg-card'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{step.title || `Etapa ${step.position}`}</p>
          <p className="text-xs text-muted-foreground">{stepType?.label}</p>
        </div>
        <Badge variant={step.required ? 'default' : 'secondary'} className="text-xs">
          {step.required ? 'Obrigatório' : 'Opcional'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');

  // Load funnel and steps
  useEffect(() => {
    const loadData = async () => {
      if (!funnelId) {
        navigate('/dashboard/leads');
        return;
      }

      setLoading(true);

      // Load funnel
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

      // Load steps
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

  const addStep = (type: string) => {
    const newStep: FunnelStep = {
      id: `new-${Date.now()}`,
      position: steps.length + 1,
      step_type: type,
      title: '',
      description: '',
      content: type === 'single_choice' || type === 'multiple_choice' 
        ? { options: ['Opção 1', 'Opção 2'] } 
        : {},
      required: true
    };
    setSteps(prev => [...prev, newStep]);
    setSelectedStep(newStep);
  };

  const updateStep = (updates: Partial<FunnelStep>) => {
    if (!selectedStep) return;
    
    const updated = { ...selectedStep, ...updates };
    setSelectedStep(updated);
    setSteps(prev => prev.map(s => s.id === selectedStep.id ? updated : s));
  };

  const deleteStep = (stepId: string) => {
    setSteps(prev => {
      const filtered = prev.filter(s => s.id !== stepId);
      return filtered.map((s, i) => ({ ...s, position: i + 1 }));
    });
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
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
      // Delete existing steps
      await supabase
        .from('lead_funnel_steps')
        .delete()
        .eq('funnel_id', funnelId);

      // Insert new steps
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

      // Update funnel settings if needed
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
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
            <Button variant="outline" onClick={() => window.open(`/f/${funnel?.slug}`, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Step Types */}
        <div className="w-64 border-r bg-muted/30 p-4">
          <h3 className="font-medium text-sm mb-3">Adicionar Etapa</h3>
          <div className="space-y-2">
            {STEP_TYPES.map(stepType => {
              const Icon = stepType.icon;
              return (
                <button
                  key={stepType.type}
                  onClick={() => addStep(stepType.type)}
                  className="w-full p-3 text-left rounded-lg border border-border hover:border-primary/50 hover:bg-card transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stepType.label}</p>
                      <p className="text-xs text-muted-foreground">{stepType.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center - Steps List */}
        <div className="flex-1 p-6 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="steps">Etapas ({steps.length})</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="steps">
              {steps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Nenhuma etapa</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique em um tipo de etapa na barra lateral para adicionar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {steps.map(step => (
                        <SortableStepItem
                          key={step.id}
                          step={step}
                          isSelected={selectedStep?.id === step.id}
                          onSelect={() => setSelectedStep(step)}
                          onDelete={() => deleteStep(step.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configurações do Funil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Funil</Label>
                    <Input value={funnel?.name || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input value={funnel?.slug || ''} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Funil Ativo</p>
                      <p className="text-xs text-muted-foreground">Permitir acesso público</p>
                    </div>
                    <Switch checked={funnel?.is_active || false} disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Step Editor */}
        <div className="w-80 border-l bg-card p-4 overflow-auto">
          {selectedStep ? (
            <div className="space-y-4">
              <h3 className="font-medium">Configurar Etapa</h3>
              
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

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Obrigatório</p>
                  <p className="text-xs text-muted-foreground">O usuário deve responder</p>
                </div>
                <Switch
                  checked={selectedStep.required}
                  onCheckedChange={(checked) => updateStep({ required: checked })}
                />
              </div>

              {/* Choice options for single/multiple choice */}
              {(selectedStep.step_type === 'single_choice' || selectedStep.step_type === 'multiple_choice') && (
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
                        className="h-8 w-8"
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
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Selecione uma etapa para editar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadFunnelBuilder;
