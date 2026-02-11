import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Save, Loader2, Trash2, Upload, FileText, X, Settings2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const OMNI_COLOR = '#FF4500';

interface TrainingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: string;
}

interface WhatsAppSession {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
}

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Rápido)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Avançado)' },
];

const EditAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);
  const [trainingFiles, setTrainingFiles] = useState<TrainingFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState('google/gemini-3-flash-preview');
  const [isActive, setIsActive] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappSessionId, setWhatsappSessionId] = useState('');

  // Advanced settings
  const [maxResponseChars, setMaxResponseChars] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [contextMemory, setContextMemory] = useState(10);

  useEffect(() => {
    if (id) {
      loadAgent();
      loadWhatsappSessions();
    }
  }, [id]);

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', id!)
        .single();

      if (error || !data) throw error || new Error('Agente não encontrado');

      setName(data.name);
      setDescription(data.description || '');
      setPersonality(data.personality);
      setInstructions(data.instructions);
      setModel(data.model || 'google/gemini-3-flash-preview');
      setIsActive(data.is_active ?? true);
      setWhatsappEnabled(data.whatsapp_enabled || false);
      setWhatsappSessionId(data.whatsapp_session_id || '');
      setMaxResponseChars((data.settings as any)?.maxResponseChars || 2000);
      setTemperature((data.settings as any)?.temperature || 0.7);
      setContextMemory((data.settings as any)?.contextMemory || 10);
      setTrainingFiles((data.settings as any)?.trainingFiles || []);
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Agente não encontrado', variant: 'destructive' });
      navigate('/dashboard/bot-ia');
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsappSessions = async () => {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('id, instance_name, status, phone_number')
      .eq('status', 'connected');
    setWhatsappSessions(data || []);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowedTypes = ['text/plain', 'application/pdf', 'application/json', 'text/csv', 'text/markdown'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Tipo inválido', description: 'Aceitos: TXT, PDF, JSON, CSV, MD', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 10MB', variant: 'destructive' });
      return;
    }
    setTrainingFiles(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }]);
    toast({ title: 'Arquivo adicionado', description: file.name });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = async () => {
    if (!name || !personality || !instructions) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({
          name,
          description,
          personality,
          instructions,
          model,
          is_active: isActive,
          whatsapp_enabled: whatsappEnabled,
          whatsapp_session_id: whatsappEnabled && whatsappSessionId ? whatsappSessionId : null,
          settings: {
            maxResponseChars,
            temperature,
            contextMemory,
            trainingFiles: trainingFiles.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type, uploadedAt: f.uploadedAt })),
          }
        })
        .eq('id', id!);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Agente atualizado!' });
      navigate('/dashboard/bot-ia');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao atualizar agente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id!);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Agente excluído' });
      navigate('/dashboard/bot-ia');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao excluir agente', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/dashboard/bot-ia')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Editar Agente</h1>
              <p className="text-sm text-gray-500">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-gray-500">Ativo</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700">Nome do Agente *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Assistente de Vendas"
                className="mt-1.5 rounded-xl h-11"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do agente..."
                className="mt-1.5 rounded-xl min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Modelo de IA</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Behavior */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="h-4 w-4" style={{ color: OMNI_COLOR }} />
              Comportamento
            </h2>

            <div>
              <Label className="text-sm font-medium text-gray-700">Personalidade *</Label>
              <p className="text-xs text-gray-400 mb-1.5">Defina o tom e estilo de comunicação</p>
              <Textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Ex: Profissional, empático, objetivo..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Instruções *</Label>
              <p className="text-xs text-gray-400 mb-1.5">Descreva detalhadamente como o agente deve se comportar</p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instruções detalhadas..."
                className="rounded-xl min-h-[160px]"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4" style={{ color: OMNI_COLOR }} />
              Configurações Avançadas
            </h2>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-gray-700">Limite de caracteres por resposta</Label>
                <span className="text-sm font-medium text-gray-900">{maxResponseChars}</span>
              </div>
              <Slider value={[maxResponseChars]} onValueChange={([v]) => setMaxResponseChars(v)} min={100} max={10000} step={100} />
              <p className="text-xs text-gray-400 mt-1">Limite máximo de caracteres que o agente pode responder</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-gray-700">Temperatura (Criatividade)</Label>
                <span className="text-sm font-medium text-gray-900">{temperature.toFixed(1)}</span>
              </div>
              <Slider value={[temperature * 100]} onValueChange={([v]) => setTemperature(v / 100)} min={0} max={100} step={10} />
              <p className="text-xs text-gray-400 mt-1">0 = mais preciso, 1 = mais criativo</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-gray-700">Memória de contexto (mensagens)</Label>
                <span className="text-sm font-medium text-gray-900">{contextMemory}</span>
              </div>
              <Slider value={[contextMemory]} onValueChange={([v]) => setContextMemory(v)} min={1} max={50} step={1} />
              <p className="text-xs text-gray-400 mt-1">Quantidade de mensagens anteriores que o agente lembra</p>
            </div>
          </div>

          {/* Training Files */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: OMNI_COLOR }} />
              Arquivos de Treinamento
            </h2>
            <p className="text-sm text-gray-500">Adicione arquivos para o agente estudar e usar como referência.</p>

            {trainingFiles.length > 0 && (
              <div className="space-y-2">
                {trainingFiles.map(file => (
                  <Card key={file.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setTrainingFiles(prev => prev.filter(f => f.id !== file.id))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {trainingFiles.length === 0 && (
              <div className="text-center py-6 border border-dashed rounded-xl">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum arquivo adicionado</p>
              </div>
            )}

            <div className="flex justify-center">
              <Label htmlFor="edit-file-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-gray-50 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Adicionar arquivo</span>
                </div>
                <input
                  id="edit-file-upload"
                  type="file"
                  accept=".txt,.pdf,.json,.csv,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
            </div>
            <p className="text-xs text-gray-400 text-center">Aceitos: TXT, PDF, JSON, CSV, MD (máx. 10MB)</p>
          </div>

          {/* WhatsApp Integration */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Integração WhatsApp</h2>
                  <p className="text-xs text-gray-400">Conectar ao CRM WhatsApp para responder leads</p>
                </div>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>

            {whatsappEnabled && (
              <div>
                <Label className="text-sm text-gray-700">Conexão WhatsApp</Label>
                <Select value={whatsappSessionId} onValueChange={setWhatsappSessionId}>
                  <SelectTrigger className="mt-1.5 rounded-xl h-11">
                    <SelectValue placeholder="Selecione uma conexão..." />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappSessions.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma conexão disponível</SelectItem>
                    ) : (
                      whatsappSessions.map(session => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.instance_name} ({session.phone_number || 'Sem número'})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">O agente responderá automaticamente às mensagens desta conexão</p>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-red-100 p-6 space-y-3">
            <h2 className="text-base font-semibold text-red-600">Zona de Perigo</h2>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Agente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Agente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O agente "{name}" será permanentemente excluído.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pb-8">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate('/dashboard/bot-ia')}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl text-white"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAgentPage;
