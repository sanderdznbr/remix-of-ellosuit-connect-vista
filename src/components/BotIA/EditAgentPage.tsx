import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bot, Save, Loader2, Trash2, Upload, FileText, X,
  Settings2, MessageSquare, Brain, Zap, Shield, Send, User,
  Smile, AlertTriangle, Globe, Clock, Hash, Sparkles, RefreshCw, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgentMediaManager from './AgentMediaManager';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import IntegrationTab from './IntegrationTab';
import AgentDebugChat from './AgentDebugChat';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const OMNI_COLOR = '#FF4500';

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: Bot },
  { id: 'comportamento', label: 'Comportamento', icon: Brain },
  { id: 'arquivos', label: 'Arquivos', icon: FileText },
  { id: 'configuracoes', label: 'Configurações', icon: Settings2 },
  { id: 'integracoes', label: 'Integrações', icon: Zap },
  { id: 'corrigir', label: 'Corrigir', icon: Wrench },
  { id: 'conversar', label: 'Conversar', icon: MessageSquare },
];

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Rápido e eficiente', tier: 'fast' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Balanceado', tier: 'balanced' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Mais avançado', tier: 'advanced' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', desc: 'Rápido', tier: 'fast' },
  { value: 'openai/gpt-5', label: 'GPT-5', desc: 'Mais poderoso', tier: 'advanced' },
];

function getRecommendedModel(promptText: string, instructionsText: string): string {
  const combined = (promptText + ' ' + instructionsText).trim();
  const len = combined.length;
  const complexKeywords = ['analis', 'consult', 'diagnóstic', 'relatório', 'estratég', 'jurídic', 'médic', 'técnic', 'financ', 'contábil', 'audit', 'compliance'];
  const hasComplexity = complexKeywords.some(k => combined.toLowerCase().includes(k));
  
  if (len > 1500 || hasComplexity) return 'google/gemini-2.5-pro';
  if (len > 500) return 'google/gemini-2.5-flash';
  return 'google/gemini-3-flash-preview';
}

const HUMOR_OPTIONS = [
  { value: 'profissional', label: 'Profissional', emoji: '💼' },
  { value: 'amigavel', label: 'Amigável', emoji: '😊' },
  { value: 'formal', label: 'Formal', emoji: '🎩' },
  { value: 'casual', label: 'Casual', emoji: '👋' },
  { value: 'entusiasmado', label: 'Entusiasmado', emoji: '🔥' },
  { value: 'tecnico', label: 'Técnico', emoji: '⚙️' },
];

const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'auto', label: 'Detectar idioma' },
];

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')
    .replace(/^[-*+]\s/gm, '• ')
    .trim();
}

const EditAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [agentCompanyId, setAgentCompanyId] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [instructions, setInstructions] = useState('');
  const [doNot, setDoNot] = useState('');
  const [model, setModel] = useState('google/gemini-3-flash-preview');
  const [isActive, setIsActive] = useState(true);
  const [humor, setHumor] = useState('profissional');
  const [language, setLanguage] = useState('pt-BR');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Advanced settings
  const [maxResponseChars, setMaxResponseChars] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [contextMemory, setContextMemory] = useState(10);
  const [responseDelay, setResponseDelay] = useState(0);
  const [splitLongMessages, setSplitLongMessages] = useState(false);
  const [audioResponseMode, setAudioResponseMode] = useState<'disabled' | 'when_audio' | 'always'>('disabled');
  const [ttsVoice, setTtsVoice] = useState('alloy');

  // Files
  const [trainingFiles, setTrainingFiles] = useState<TrainingFile[]>([]);

  // WhatsApp
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappSessionId, setWhatsappSessionId] = useState('');
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [aiImprovingField, setAiImprovingField] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAgent();
      loadWhatsappSessions();
    }
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const markChanged = () => { if (!hasChanges) setHasChanges(true); };

  const improveWithAI = async (fieldName: string, currentText: string, setter: (v: string) => void, context: string) => {
    if (!currentText.trim()) {
      toast({ title: 'Campo vazio', description: 'Escreva algo primeiro para melhorar com IA', variant: 'destructive' });
      return;
    }
    setAiImprovingField(fieldName);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em criação de agentes de IA e chatbots. Sua tarefa é melhorar o texto fornecido pelo usuário para o campo "${context}" de um agente de IA. Melhore o texto tornando-o mais claro, profissional, detalhado e eficaz. Mantenha a essência e intenção original. Retorne APENAS o texto melhorado, sem explicações ou comentários adicionais.`
            },
            {
              role: 'user',
              content: `Melhore este texto para o campo "${context}" de um agente de IA:\n\n${currentText}`
            }
          ]
        }
      });
      if (error) throw error;
      const improved = data?.response || data?.message || '';
      if (improved.trim()) {
        setter(improved.trim());
        markChanged();
        toast({ title: 'Texto melhorado!', description: 'O texto foi aprimorado pela IA' });
      }
    } catch (e: any) {
      console.error('AI improve error:', e);
      toast({ title: 'Erro', description: 'Não foi possível melhorar o texto. Tente novamente.', variant: 'destructive' });
    } finally {
      setAiImprovingField(null);
    }
  };

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', id!)
        .single();

      if (error || !data) throw error || new Error('Agente não encontrado');

      const settings = data.settings as any;
      setAgentCompanyId(data.company_id);
      setName(data.name);
      setDescription(data.description || '');
      setPersonality(data.personality);
      setInstructions(data.instructions);
      setModel(data.model || 'google/gemini-3-flash-preview');
      setIsActive(data.is_active ?? true);
      setWhatsappEnabled(data.whatsapp_enabled || false);
      setWhatsappSessionId(data.whatsapp_session_id || '');
      setMaxResponseChars(settings?.maxResponseChars || 2000);
      setTemperature(settings?.temperature || 0.7);
      setContextMemory(settings?.contextMemory || 10);
      setTrainingFiles(settings?.trainingFiles || []);
      setDoNot(settings?.doNot || '');
      setHumor(settings?.humor || 'profissional');
      setLanguage(settings?.language || 'pt-BR');
      setWelcomeMessage(settings?.welcomeMessage || '');
      setResponseDelay(settings?.responseDelay || 0);
      setSplitLongMessages(settings?.splitLongMessages || false);
      setAudioResponseMode(settings?.audioResponseMode || 'disabled');
      setTtsVoice(settings?.ttsVoice || 'alloy');

      // Init chat
      setChatMessages([{
        id: '1',
        role: 'assistant',
        content: `Olá! Eu sou ${data.name}. ${data.description || 'Como posso ajudá-lo hoje?'}`,
        timestamp: new Date()
      }]);
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
    markChanged();
    toast({ title: 'Arquivo adicionado', description: file.name });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = async () => {
    if (!name || !personality || !instructions) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios: Nome, Personalidade e Instruções', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const fullInstructions = doNot
        ? `${instructions}\n\nO QUE NÃO FAZER:\n${doNot}`
        : instructions;

      const { error } = await supabase
        .from('ai_agents')
        .update({
          name,
          description,
          personality,
          instructions: fullInstructions,
          model,
          is_active: isActive,
          whatsapp_enabled: whatsappEnabled,
          whatsapp_session_id: whatsappEnabled && whatsappSessionId ? whatsappSessionId : null,
          settings: {
            maxResponseChars,
            temperature,
            contextMemory,
            trainingFiles: trainingFiles.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type, uploadedAt: f.uploadedAt })),
            doNot,
            humor,
            language,
            welcomeMessage,
            responseDelay,
            splitLongMessages,
            audioResponseMode,
            ttsVoice,
          }
        })
        .eq('id', id!);

      if (error) throw error;
      setHasChanges(false);
      toast({ title: 'Sucesso', description: 'Agente atualizado!' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao atualizar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('ai_agents').delete().eq('id', id!);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Agente excluído' });
      navigate('/dashboard/bot-ia');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages
            .filter(m => m.id !== '1')
            .concat(userMsg)
            .map(m => ({ role: m.role, content: m.content })),
          agentId: id,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro na resposta');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      const assistantId = Date.now().toString() + '-ai';
      setChatMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const cleaned = cleanMarkdown(assistantContent);
              setChatMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m)
              );
            }
          } catch { /* partial json */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast({ title: 'Erro', description: 'Falha ao enviar mensagem', variant: 'destructive' });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/dashboard/bot-ia')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: OMNI_COLOR }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] h-5">
                    {isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {hasChanges && (
                    <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-600">
                      Alterações não salvas
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-gray-500">Ativo</span>
              <Switch checked={isActive} onCheckedChange={(v) => { setIsActive(v); markChanged(); }} />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl text-white gap-2"
              style={{ backgroundColor: OMNI_COLOR }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                    active
                      ? 'border-current text-gray-900 bg-gray-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={active ? { color: OMNI_COLOR, borderColor: OMNI_COLOR } : {}}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* PERFIL TAB */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Nome do Agente *</Label>
                  <Input value={name} onChange={(e) => { setName(e.target.value); markChanged(); }} placeholder="Ex: Assistente de Vendas" className="mt-1.5 rounded-xl h-11" />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Descrição</Label>
                  <Textarea value={description} onChange={(e) => { setDescription(e.target.value); markChanged(); }} placeholder="Breve descrição do agente..." className="mt-1.5 rounded-xl min-h-[80px]" />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Modelo de IA</Label>
                  {(() => {
                    const recommended = getRecommendedModel(personality, instructions);
                    const recommendedLabel = AI_MODELS.find(m => m.value === recommended)?.label;
                    return recommended !== model ? (
                      <div className="mt-1 mb-2 flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] gap-1">
                          <Sparkles className="h-3 w-3" />
                          Recomendado: {recommendedLabel}
                        </Badge>
                        <button
                          onClick={() => { setModel(recommended); markChanged(); }}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          Usar recomendado
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 mb-2">
                        <Badge className="bg-green-100 text-green-700 text-[10px] gap-1">
                          ✓ Modelo ideal para seu prompt
                        </Badge>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_MODELS.map(m => {
                      const isRecommended = m.value === getRecommendedModel(personality, instructions);
                      return (
                        <button
                          key={m.value}
                          onClick={() => { setModel(m.value); markChanged(); }}
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            model === m.value
                              ? 'border-2 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={model === m.value ? { borderColor: OMNI_COLOR } : {}}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {m.label}
                            {isRecommended && model !== m.value && (
                              <span className="ml-1.5 text-[10px] text-blue-500 font-normal">★ recomendado</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mensagem de Boas-vindas</Label>
                      <p className="text-xs text-gray-400">Primeira mensagem que o agente envia ao iniciar uma conversa</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => improveWithAI('welcome', welcomeMessage, setWelcomeMessage, 'Mensagem de Boas-vindas')}
                      disabled={aiImprovingField === 'welcome' || !welcomeMessage.trim()}
                      className="gap-1.5 text-xs"
                    >
                      {aiImprovingField === 'welcome' ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Melhorando...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Melhorar com IA</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => { setWelcomeMessage(e.target.value); markChanged(); }}
                    placeholder="Ex: Olá! 👋 Sou o assistente da empresa. Como posso ajudar?"
                    className="rounded-xl min-h-[60px]"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Idioma Principal</Label>
                  <Select value={language} onValueChange={(v) => { setLanguage(v); markChanged(); }}>
                    <SelectTrigger className="mt-1.5 rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* COMPORTAMENTO TAB */}
        {activeTab === 'comportamento' && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Tom de Voz / Humor</Label>
                  <p className="text-xs text-gray-400 mb-2">Escolha o estilo de comunicação do agente</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HUMOR_OPTIONS.map(h => (
                      <button
                        key={h.value}
                        onClick={() => { setHumor(h.value); markChanged(); }}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          humor === h.value
                            ? 'border-2 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={humor === h.value ? { borderColor: OMNI_COLOR } : {}}
                      >
                        <span className="text-lg">{h.emoji}</span>
                        <span className="text-sm font-medium text-gray-700">{h.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Personalidade *</Label>
                      <p className="text-xs text-gray-400">Defina o tom e estilo de comunicação em detalhe</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => improveWithAI('personality', personality, setPersonality, 'Personalidade')}
                      disabled={aiImprovingField === 'personality' || !personality.trim()}
                      className="gap-1.5 text-xs"
                    >
                      {aiImprovingField === 'personality' ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Melhorando...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Melhorar com IA</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={personality}
                    onChange={(e) => { setPersonality(e.target.value); markChanged(); }}
                    placeholder="Ex: Profissional, empático, objetivo e sempre oferece soluções..."
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Prompt / Instruções *</Label>
                      <p className="text-xs text-gray-400">Descreva detalhadamente como o agente deve se comportar</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => improveWithAI('instructions', instructions, setInstructions, 'Instruções/Prompt')}
                      disabled={aiImprovingField === 'instructions' || !instructions.trim()}
                      className="gap-1.5 text-xs"
                    >
                      {aiImprovingField === 'instructions' ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Melhorando...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Melhorar com IA</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={instructions}
                    onChange={(e) => { setInstructions(e.target.value); markChanged(); }}
                    placeholder="Você é um assistente especializado em vendas. Sempre cumprimente o cliente..."
                    className="rounded-xl min-h-[180px] font-mono text-sm"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-400">{instructions.length} caracteres</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <Label className="text-base font-semibold text-gray-900">Restrições e Limites</Label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">O que NÃO fazer</Label>
                      <p className="text-xs text-gray-400">Defina o que o agente nunca deve fazer ou falar</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => improveWithAI('doNot', doNot, setDoNot, 'Restrições e Limites')}
                      disabled={aiImprovingField === 'doNot' || !doNot.trim()}
                      className="gap-1.5 text-xs"
                    >
                      {aiImprovingField === 'doNot' ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Melhorando...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5" /> Melhorar com IA</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={doNot}
                    onChange={(e) => { setDoNot(e.target.value); markChanged(); }}
                    placeholder="Não falar sobre concorrentes, não inventar preços, não prometer prazos impossíveis, não compartilhar dados pessoais de clientes..."
                    className="rounded-xl min-h-[120px] border-red-200 focus:border-red-300"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ARQUIVOS TAB */}
        {activeTab === 'arquivos' && (
          <div className="space-y-6">
            {/* Mídia do Agente - fotos para enviar no WhatsApp */}
            {id && agentCompanyId && (
              <AgentMediaManager agentId={id} companyId={agentCompanyId} />
            )}

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: OMNI_COLOR }} />
                    Base de Conhecimento
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Adicione arquivos para o agente estudar e usar como referência nas respostas. Quanto mais contexto, melhores as respostas.
                  </p>
                </div>

                {trainingFiles.length > 0 ? (
                  <div className="space-y-2">
                    {trainingFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(file.size)} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('pt-BR') : ''}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => { setTrainingFiles(prev => prev.filter(f => f.id !== file.id)); markChanged(); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                    <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">Nenhum arquivo adicionado</p>
                    <p className="text-xs text-gray-400 mt-1">Arraste arquivos ou clique para adicionar</p>
                  </div>
                )}

                <div className="flex justify-center">
                  <Label htmlFor="edit-file-upload-v2" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: OMNI_COLOR }}>
                      <Upload className="h-4 w-4" />
                      Adicionar Arquivo
                    </div>
                    <input id="edit-file-upload-v2" type="file" accept=".txt,.pdf,.json,.csv,.md" onChange={handleFileUpload} className="hidden" />
                  </Label>
                </div>
                <p className="text-xs text-gray-400 text-center">Aceitos: TXT, PDF, JSON, CSV, MD (máx. 10MB cada)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CONFIGURAÇÕES TAB */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-6">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Settings2 className="h-4 w-4" style={{ color: OMNI_COLOR }} />
                  Parâmetros do Modelo
                </h2>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm text-gray-700">Limite de caracteres por resposta</Label>
                      <p className="text-xs text-gray-400">Controla o tamanho máximo das respostas</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{maxResponseChars}</Badge>
                  </div>
                  <Slider value={[maxResponseChars]} onValueChange={([v]) => { setMaxResponseChars(v); markChanged(); }} min={100} max={10000} step={100} className="[&_[role=slider]]:border-gray-400 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-gray-400 [&>span:first-child]:bg-gray-200" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm text-gray-700">Temperatura (Criatividade)</Label>
                      <p className="text-xs text-gray-400">0 = preciso e factual, 1 = criativo e variado</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{temperature.toFixed(1)}</Badge>
                  </div>
                  <Slider value={[temperature * 100]} onValueChange={([v]) => { setTemperature(v / 100); markChanged(); }} min={0} max={100} step={10} className="[&_[role=slider]]:border-gray-400 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-gray-400 [&>span:first-child]:bg-gray-200" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm text-gray-700">Memória de Contexto</Label>
                      <p className="text-xs text-gray-400">Quantidade de mensagens que o agente lembra</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{contextMemory} msgs</Badge>
                  </div>
                  <Slider value={[contextMemory]} onValueChange={([v]) => { setContextMemory(v); markChanged(); }} min={1} max={50} step={1} className="[&_[role=slider]]:border-gray-400 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-gray-400 [&>span:first-child]:bg-gray-200" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm text-gray-700">Atraso na Resposta (segundos)</Label>
                      <p className="text-xs text-gray-400">Simula tempo de digitação humana</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{responseDelay}s</Badge>
                  </div>
                  <Slider value={[responseDelay]} onValueChange={([v]) => { setResponseDelay(v); markChanged(); }} min={0} max={10} step={1} className="[&_[role=slider]]:border-gray-400 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-gray-400 [&>span:first-child]:bg-gray-200" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-sm text-gray-700">Dividir mensagens longas</Label>
                    <p className="text-xs text-gray-400">Separa respostas grandes em múltiplas mensagens</p>
                  </div>
                  <Switch checked={splitLongMessages} onCheckedChange={(v) => { setSplitLongMessages(v); markChanged(); }} />
                </div>
              </CardContent>
            </Card>

            {/* Audio Response Settings */}
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  🎙️ Resposta por Áudio
                </h2>
                <p className="text-xs text-gray-400 -mt-3">Configure quando o agente deve responder com áudio no WhatsApp</p>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Modo de Resposta por Áudio</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    {([
                      { value: 'disabled', label: 'Desativado', desc: 'Apenas texto', emoji: '💬' },
                      { value: 'when_audio', label: 'Quando receber áudio', desc: 'Responde áudio com áudio', emoji: '🎤' },
                      { value: 'always', label: 'Sempre', desc: 'Todas respostas em áudio', emoji: '🔊' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setAudioResponseMode(opt.value); markChanged(); }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          audioResponseMode === opt.value
                            ? 'border-2 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={audioResponseMode === opt.value ? { borderColor: OMNI_COLOR } : {}}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {audioResponseMode !== 'disabled' && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Voz</Label>
                    <p className="text-xs text-gray-400 mb-2">Escolha a voz para as respostas em áudio (OpenAI TTS)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'alloy', label: 'Alloy', desc: 'Neutra e versátil' },
                        { value: 'echo', label: 'Echo', desc: 'Masculina suave' },
                        { value: 'fable', label: 'Fable', desc: 'Expressiva' },
                        { value: 'onyx', label: 'Onyx', desc: 'Masculina grave' },
                        { value: 'nova', label: 'Nova', desc: 'Feminina jovem' },
                        { value: 'shimmer', label: 'Shimmer', desc: 'Feminina clara' },
                      ].map(v => (
                        <button
                          key={v.value}
                          onClick={() => { setTtsVoice(v.value); markChanged(); }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            ttsVoice === v.value
                              ? 'border-2 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={ttsVoice === v.value ? { borderColor: OMNI_COLOR } : {}}
                        >
                          <p className="text-sm font-medium text-gray-900">{v.label}</p>
                          <p className="text-xs text-gray-400">{v.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="rounded-2xl border-red-200">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-base font-semibold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Zona de Perigo
                </h2>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full rounded-xl">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Agente Permanentemente
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir "{name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O agente e todo o histórico serão permanentemente excluídos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* INTEGRAÇÕES TAB */}
        {activeTab === 'integracoes' && (
          <IntegrationTab agentId={id!} agentName={name} />
        )}

        {/* CONVERSAR TAB */}
        {activeTab === 'conversar' && (
          <Card className="rounded-2xl border-gray-200 overflow-hidden">
            <CardContent className="p-0 flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: OMNI_COLOR }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">Teste em tempo real — alterações salvas serão refletidas</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-gray-200' : ''
                      }`} style={msg.role === 'assistant' ? { backgroundColor: OMNI_COLOR } : {}}>
                        {msg.role === 'user'
                          ? <User className="h-4 w-4 text-gray-600" />
                          : <Bot className="h-4 w-4 text-white" />
                        }
                      </div>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-orange-50 text-gray-800 border border-orange-100'
                      }`}>
                        {msg.content || <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="px-4 py-3 border-t bg-white">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
                  className="flex gap-2 max-w-2xl mx-auto"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Digite uma mensagem para testar..."
                    className="rounded-xl h-11"
                    disabled={chatLoading}
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="rounded-xl h-11 px-4 text-white"
                    style={{ backgroundColor: OMNI_COLOR }}
                  >
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CORRIGIR TAB */}
        {activeTab === 'corrigir' && (
          <AgentDebugChat
            agentName={name}
            currentInstructions={instructions}
            currentPersonality={personality}
            currentDoNot={doNot}
            onApplySuggestion={(field, newValue) => {
              if (field === 'instructions') setInstructions(newValue);
              else if (field === 'personality') setPersonality(newValue);
              else if (field === 'doNot') setDoNot(newValue);
              markChanged();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EditAgentPage;
