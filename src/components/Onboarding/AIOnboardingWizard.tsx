import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle, ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIOnboardingWizardProps {
  onComplete: (preferences: OnboardingPreferences) => void;
  onSkip: () => void;
}

interface OnboardingPreferences {
  segment: string;
  companySize: string;
  mainGoals: string[];
  recommendedTools: string[];
}

const SEGMENTS = [
  { id: 'vendas', label: 'Vendas & Comercial', icon: '💼', tools: ['crm-whatsapp', 'email', 'analytics', 'agenda-aberta'] },
  { id: 'marketing', label: 'Marketing & Comunicação', icon: '📢', tools: ['email', 'rastreamento', 'analytics', 'fluxos'] },
  { id: 'rh', label: 'Recursos Humanos', icon: '👥', tools: ['cadastros', 'agenda', 'reunioes', 'tasks'] },
  { id: 'financeiro', label: 'Financeiro & Admin', icon: '💰', tools: ['cadastros', 'drive', 'relatorios', 'email'] },
  { id: 'atendimento', label: 'Atendimento ao Cliente', icon: '🎧', tools: ['crm-whatsapp', 'bot-ia', 'reunioes', 'tasks'] },
  { id: 'consultoria', label: 'Consultoria & Serviços', icon: '🎯', tools: ['agenda-aberta', 'reunioes', 'drive', 'analytics'] },
  { id: 'educacao', label: 'Educação & Treinamento', icon: '📚', tools: ['reunioes', 'drive', 'tasks', 'agenda'] },
  { id: 'outro', label: 'Outro Segmento', icon: '🔧', tools: ['agenda', 'email', 'tasks', 'drive'] },
];

const COMPANY_SIZES = [
  { id: 'solo', label: 'Apenas eu', description: 'Profissional autônomo' },
  { id: 'small', label: '2-10 pessoas', description: 'Pequena equipe' },
  { id: 'medium', label: '11-50 pessoas', description: 'Empresa em crescimento' },
  { id: 'large', label: '51+ pessoas', description: 'Empresa estabelecida' },
];

const GOALS = [
  { id: 'vendas', label: 'Aumentar vendas', icon: '📈' },
  { id: 'produtividade', label: 'Melhorar produtividade', icon: '⚡' },
  { id: 'organizacao', label: 'Organizar processos', icon: '📋' },
  { id: 'comunicacao', label: 'Melhorar comunicação', icon: '💬' },
  { id: 'atendimento', label: 'Otimizar atendimento', icon: '🎯' },
  { id: 'automacao', label: 'Automatizar tarefas', icon: '🤖' },
];

export const AIOnboardingWizard: React.FC<AIOnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [segment, setSegment] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const analyzeAndRecommend = async () => {
    setIsAnalyzing(true);
    
    // Simular análise de IA (em produção, chamar edge function)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedSegment = SEGMENTS.find(s => s.id === segment);
    const tools = selectedSegment?.tools || ['agenda', 'email', 'tasks'];
    
    // Adicionar ferramentas baseadas nos objetivos
    const goalBasedTools: string[] = [];
    if (selectedGoals.includes('vendas')) goalBasedTools.push('analytics', 'crm-whatsapp');
    if (selectedGoals.includes('automacao')) goalBasedTools.push('bot-ia', 'fluxos');
    if (selectedGoals.includes('comunicacao')) goalBasedTools.push('reunioes', 'email');
    
    const allTools = [...new Set([...tools, ...goalBasedTools])];
    setRecommendations(allTools.slice(0, 6));
    setIsAnalyzing(false);
    setStep(4);
  };

  const handleComplete = () => {
    onComplete({
      segment,
      companySize,
      mainGoals: selectedGoals,
      recommendedTools: recommendations,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Header com progresso */}
          <div className="bg-primary p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Configuração Inteligente</h1>
                <p className="text-white/80 text-sm">Vamos personalizar sua experiência</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= step ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Segmento */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-foreground">Qual é o seu segmento?</h2>
                    <p className="text-muted-foreground">Isso nos ajuda a recomendar as melhores ferramentas</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SEGMENTS.map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => setSegment(seg.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-center hover:border-primary/50 ${
                          segment === seg.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">{seg.icon}</span>
                        <span className="text-sm font-medium text-foreground">{seg.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" onClick={onSkip}>Pular configuração</Button>
                    <Button onClick={() => setStep(2)} disabled={!segment}>
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Tamanho da empresa */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
                    <h2 className="text-xl font-semibold text-foreground">Qual o tamanho da sua equipe?</h2>
                    <p className="text-muted-foreground">Adaptamos recursos para sua realidade</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {COMPANY_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setCompanySize(size.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left hover:border-primary/50 ${
                          companySize === size.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        }`}
                      >
                        <span className="font-semibold text-foreground block">{size.label}</span>
                        <span className="text-sm text-muted-foreground">{size.description}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!companySize}>
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Objetivos */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-foreground">Quais são seus principais objetivos?</h2>
                    <p className="text-muted-foreground">Selecione até 3 objetivos</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => handleGoalToggle(goal.id)}
                        disabled={selectedGoals.length >= 3 && !selectedGoals.includes(goal.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          selectedGoals.includes(goal.id)
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        } ${selectedGoals.length >= 3 && !selectedGoals.includes(goal.id) ? 'opacity-50' : ''}`}
                      >
                        <span className="text-2xl mb-2 block">{goal.icon}</span>
                        <span className="text-sm font-medium text-foreground">{goal.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button 
                      onClick={analyzeAndRecommend} 
                      disabled={selectedGoals.length === 0 || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Gerar recomendações
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Recomendações */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Suas ferramentas recomendadas</h2>
                    <p className="text-muted-foreground">Baseado no seu perfil, recomendamos começar com:</p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {recommendations.map((tool) => (
                      <Badge 
                        key={tool} 
                        variant="secondary"
                        className="px-4 py-2 text-sm bg-primary/10 text-primary"
                      >
                        {getToolLabel(tool)}
                      </Badge>
                    ))}
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      💡 Você poderá personalizar a sidebar a qualquer momento nas configurações
                    </p>
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={handleComplete} size="lg" className="px-8 bg-primary text-primary-foreground">
                      Começar a usar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function getToolLabel(toolId: string): string {
  const labels: Record<string, string> = {
    'crm-whatsapp': 'CRM WhatsApp',
    'email': 'Email Marketing',
    'analytics': 'Analytics',
    'agenda-aberta': 'Agenda Online',
    'bot-ia': 'Agentes de IA',
    'reunioes': 'Reuniões',
    'tasks': 'Tarefas',
    'drive': 'Arquivos',
    'cadastros': 'Cadastros',
    'rastreamento': 'Rastreamento',
    'fluxos': 'Fluxos',
    'relatorios': 'Relatórios',
    'agenda': 'Agenda',
  };
  return labels[toolId] || toolId;
}

export default AIOnboardingWizard;
