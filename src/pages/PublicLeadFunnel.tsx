import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Loader2, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

const PublicLeadFunnel: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const [funnel, setFunnel] = useState<LeadFunnel | null>(null);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate session ID
  useEffect(() => {
    setSessionId(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Load funnel
  useEffect(() => {
    const loadFunnel = async () => {
      if (!slug) return;

      setLoading(true);

      // First try to find the funnel by slug (active only)
      let { data: funnelData, error: funnelError } = await supabase
        .from('lead_funnels')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      // If not found as active, check if it exists but is inactive
      if (funnelError || !funnelData) {
        const { data: inactiveFunnel } = await supabase
          .from('lead_funnels')
          .select('id, is_active')
          .eq('slug', slug)
          .single();
        
        if (inactiveFunnel && !inactiveFunnel.is_active) {
          setError('Este funil está pausado. Entre em contato com o administrador.');
        } else {
          setError('Funil não encontrado. Verifique o link e tente novamente.');
        }
        setLoading(false);
        return;
      }

      setFunnel(funnelData);

      // Load steps
      const { data: stepsData } = await supabase
        .from('lead_funnel_steps')
        .select('*')
        .eq('funnel_id', funnelData.id)
        .order('position', { ascending: true });

      if (stepsData && stepsData.length > 0) {
        setSteps(stepsData.map(s => ({
          ...s,
          title: s.title || '',
          description: s.description || '',
          content: s.content || {}
        })));
      } else {
        setError('Este funil não possui etapas configuradas.');
      }

      setLoading(false);
    };

    loadFunnel();
  }, [slug]);

  // Create or update submission
  useEffect(() => {
    const trackSubmission = async () => {
      if (!funnel || !sessionId || steps.length === 0) return;

      if (!submissionId) {
        // Create new submission
        const { data } = await supabase
          .from('lead_submissions')
          .insert({
            funnel_id: funnel.id,
            session_id: sessionId,
            status: 'in_progress',
            current_step: 1,
            answers: {},
            metadata: {
              userAgent: navigator.userAgent,
              referrer: document.referrer,
              startedAt: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (data) {
          setSubmissionId(data.id);
        }

        // Track view event
        await supabase.from('lead_step_events').insert({
          funnel_id: funnel.id,
          step_id: steps[0]?.id || null,
          event_type: 'view',
          metadata: { stepIndex: 0 }
        });
      }
    };

    trackSubmission();
  }, [funnel, sessionId, steps]);

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  const setAnswer = (value: any) => {
    if (!currentStep) return;
    setAnswers(prev => ({ ...prev, [currentStep.id]: value }));
  };

  const canProceed = () => {
    if (!currentStep) return false;
    if (!currentStep.required) return true;
    
    const answer = answers[currentStep.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    
    return true;
  };

  const goNext = async () => {
    if (!canProceed() || !funnel) return;

    // Track step completion
    await supabase.from('lead_step_events').insert({
      funnel_id: funnel.id,
      step_id: currentStep.id,
      submission_id: submissionId,
      event_type: 'complete',
      metadata: { stepIndex: currentStepIndex, answer: answers[currentStep.id] }
    });

    // Update submission
    if (submissionId) {
      await supabase
        .from('lead_submissions')
        .update({
          current_step: currentStepIndex + 2,
          answers
        })
        .eq('id', submissionId);
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      
      // Track next step view
      await supabase.from('lead_step_events').insert({
        funnel_id: funnel.id,
        step_id: steps[currentStepIndex + 1]?.id || null,
        submission_id: submissionId,
        event_type: 'view',
        metadata: { stepIndex: currentStepIndex + 1 }
      });
    } else {
      // Complete submission
      setSubmitting(true);
      
      if (submissionId) {
        await supabase
          .from('lead_submissions')
          .update({
            status: 'completed',
            answers,
            completed_at: new Date().toISOString()
          })
          .eq('id', submissionId);
      }

      setCompleted(true);
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    if (!currentStep) return null;

    const answer = answers[currentStep.id];

    switch (currentStep.step_type) {
      case 'text':
      case 'name':
      case 'company':
        return (
          <Input
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={
              currentStep.step_type === 'name' ? 'Nome completo' :
              currentStep.step_type === 'company' ? 'Nome da empresa' :
              'Digite sua resposta...'
            }
            className="text-lg py-6"
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="seu@email.com"
            className="text-lg py-6"
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="(00) 00000-0000"
            className="text-lg py-6"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Digite um número"
            className="text-lg py-6"
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="https://exemplo.com"
            className="text-lg py-6"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            className="text-lg py-6"
          />
        );

      case 'address':
      case 'textarea':
        return (
          <Textarea
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={currentStep.step_type === 'address' ? 'Digite seu endereço completo...' : 'Digite sua resposta...'}
            className="text-lg"
            rows={currentStep.step_type === 'address' ? 2 : 4}
          />
        );

      case 'single_choice':
        return (
          <RadioGroup
            value={answer || ''}
            onValueChange={setAnswer}
            className="space-y-3"
          >
            {(currentStep.content?.options || []).map((option: string, idx: number) => (
              <label
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  answer === option
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option} />
                <span className="text-base">{option}</span>
              </label>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {(currentStep.content?.options || []).map((option: string, idx: number) => {
              const selected = Array.isArray(answer) && answer.includes(option);
              return (
                <label
                  key={idx}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(answer) ? answer : [];
                      if (checked) {
                        setAnswer([...current, option]);
                      } else {
                        setAnswer(current.filter((a: string) => a !== option));
                      }
                    }}
                  />
                  <span className="text-base">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case 'rating':
        const max = currentStep.content?.max || 5;
        return (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: max }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setAnswer(num)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  answer >= num
                    ? "text-yellow-500"
                    : "text-muted-foreground hover:text-yellow-400"
                )}
              >
                <Star className={cn("h-8 w-8", answer >= num && "fill-current")} />
              </button>
            ))}
          </div>
        );

      case 'cta':
        return (
          <Button
            size="lg"
            className="w-full py-6 text-lg"
            onClick={goNext}
          >
            {currentStep.content?.buttonText || 'Continuar'}
          </Button>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua resposta foi enviada com sucesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-xl mx-auto pt-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Etapa {currentStepIndex + 1} de {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Card */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {currentStep?.title || `Etapa ${currentStepIndex + 1}`}
            </h1>
            
            {/* Description */}
            {currentStep?.description && (
              <p className="text-muted-foreground mb-6">
                {currentStep.description}
              </p>
            )}

            {/* Content */}
            <div className="mb-8">
              {renderStepContent()}
            </div>

            {/* Navigation */}
            {currentStep?.step_type !== 'cta' && (
              <div className="flex items-center gap-3">
                {currentStepIndex > 0 && (
                  <Button variant="outline" onClick={goBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                )}
                <Button
                  className="flex-1 gap-2"
                  onClick={goNext}
                  disabled={!canProceed() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentStepIndex === steps.length - 1 ? (
                    <>
                      Enviar
                      <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Powered by */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Ellosuit
        </p>
      </div>
    </div>
  );
};

export default PublicLeadFunnel;
