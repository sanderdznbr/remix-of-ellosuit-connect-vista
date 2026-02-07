import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Users, 
  FileText, 
  Eye, 
  Send, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  UserPlus,
  X,
  Loader2,
  Check,
  Sparkles,
  Palette,
  CheckCircle2,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGmail } from '@/hooks/useGmail';
import { supabase } from '@/integrations/supabase/client';
import AISubjectHelper from './AISubjectHelper';
import EmailConnectionPopover from './EmailConnectionPopover';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 1, title: 'Destinatários', description: 'Para quem você quer enviar?', icon: Users },
  { id: 2, title: 'Assunto', description: 'Qual será o assunto?', icon: FileText },
  { id: 3, title: 'Conteúdo', description: 'O que você quer dizer?', icon: Palette },
  { id: 4, title: 'Revisar', description: 'Confira antes de enviar', icon: Eye },
];

const CleanEmailMarketing: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [contentMode, setContentMode] = useState<'template' | 'scratch' | null>(null);
  const [sending, setSending] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState({ sent: 0, limit: 500 });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, loading, emailAccount, connectGmail, disconnectGmail } = useGmail();

  // Fetch company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data) setCompanyId(data.company_id);
    };
    
    fetchCompanyId();
  }, [user]);

  // Fetch daily limits
  useEffect(() => {
    const fetchLimits = async () => {
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('email_send_limits')
        .select('sent_count, daily_limit')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (data) {
        setDailyLimit({ sent: data.sent_count, limit: data.daily_limit });
      }
    };

    fetchLimits();
  }, [user]);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!companyId) return;
      
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (data) setTemplates(data);
    };
    
    fetchTemplates();
  }, [companyId]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      if (!companyId) return;
      
      const { data } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('company_id', companyId)
        .not('email', 'is', null)
        .limit(100);
      
      if (data) setClients(data);
    };
    
    fetchClients();
  }, [companyId]);

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmed)) {
      toast({
        title: "Email inválido",
        description: `"${trimmed}" não é um email válido`,
        variant: "destructive"
      });
      return false;
    }
    
    if (recipients.includes(trimmed)) {
      return false;
    }
    
    setRecipients(prev => [...prev, trimmed]);
    return true;
  };

  const handleEmailInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (addEmail(emailInput)) {
        setEmailInput('');
      }
    }
  };

  const handlePasteEmails = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const emails = text.split(/[,;\n\s]+/).filter(Boolean);
    
    let added = 0;
    emails.forEach(email => {
      if (addEmail(email)) added++;
    });
    
    if (added > 0) {
      toast({ title: `${added} email(s) adicionados` });
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(e => e !== email));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const emails = text.split(/[,;\n\r]+/).map(e => e.trim()).filter(Boolean);
    
    let added = 0;
    emails.forEach(email => {
      if (addEmail(email)) added++;
    });
    
    toast({
      title: "Lista importada",
      description: `${added} de ${emails.length} emails foram adicionados`
    });
    
    e.target.value = '';
  };

  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setContent(template.html_content);
  };

  const sendEmails = async () => {
    if (!isConnected || !user || !companyId) {
      toast({
        title: "Erro",
        description: "Conecte seu email primeiro",
        variant: "destructive"
      });
      return;
    }

    // Check daily limit
    if (dailyLimit.sent + recipients.length > dailyLimit.limit) {
      toast({
        title: "Limite atingido",
        description: `Você pode enviar mais ${dailyLimit.limit - dailyLimit.sent} emails hoje`,
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    let successCount = 0;

    try {
      for (const recipient of recipients) {
        try {
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              recipient_email: recipient,
              subject,
              content_html: content,
              provider: 'gmail',
              user_id: user.id,
              company_id: companyId
            }
          });

          if (!error) successCount++;
        } catch (err) {
          console.error(`Error sending to ${recipient}:`, err);
        }
      }

      if (successCount > 0) {
        toast({
          title: "🎉 Emails enviados!",
          description: `${successCount} de ${recipients.length} email(s) enviados com sucesso`
        });
        
        // Reset
        setCurrentStep(1);
        setRecipients([]);
        setSubject('');
        setContent('');
        setSelectedTemplate(null);
        setContentMode(null);
        setDailyLimit(prev => ({ ...prev, sent: prev.sent + successCount }));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return recipients.length > 0;
      case 2: return subject.trim().length > 0;
      case 3: return content.trim().length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Step 1: Recipients
  const renderStep1 = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Para quem você quer enviar?</h2>
        <p className="text-muted-foreground">Digite emails, importe uma lista ou selecione da sua agenda</p>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Digite emails separados por vírgula ou Enter..."
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={handleEmailInput}
          onPaste={handlePasteEmails}
          className="h-12 text-base"
        />
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="h-5 w-5 mr-2" />
            Importar Lista (CSV/TXT)
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setShowClientPicker(!showClientPicker)}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Selecionar da Agenda
          </Button>
        </div>
      </div>

      {/* Client picker */}
      <AnimatePresence>
        {showClientPicker && clients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Selecionar clientes:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allEmails = clients.map(c => c.email).filter(Boolean);
                      allEmails.forEach(email => addEmail(email));
                      setShowClientPicker(false);
                    }}
                  >
                    Selecionar todos
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {clients.map(client => (
                    <Badge
                      key={client.id}
                      variant="outline"
                      className={`cursor-pointer transition-all hover:bg-primary/10 py-1.5 px-3 ${
                        recipients.includes(client.email?.toLowerCase()) 
                          ? 'bg-primary/20 border-primary' 
                          : ''
                      }`}
                      onClick={() => client.email && addEmail(client.email)}
                    >
                      {client.name}
                      {recipients.includes(client.email?.toLowerCase()) && (
                        <Check className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipients list */}
      {recipients.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">{recipients.length} destinatário(s)</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setRecipients([])}
              >
                Limpar todos
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {recipients.map(email => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="py-1.5 px-3 pr-2 gap-1"
                >
                  {email}
                  <button
                    onClick={() => removeRecipient(email)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 2: Subject
  const renderStep2 = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Qual será o assunto do email?</h2>
        <p className="text-muted-foreground">Um bom assunto aumenta a taxa de abertura</p>
      </div>
      
      <div className="space-y-4">
        <Input
          placeholder="Ex: Oferta especial para você!"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="h-14 text-lg"
        />
        
        <AISubjectHelper
          currentSubject={subject}
          onSelectSubject={setSubject}
        />
      </div>

      {/* Preview */}
      {subject && (
        <Card className="bg-muted/30">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Preview na caixa de entrada</p>
            <div className="bg-background rounded-lg p-4 border shadow-sm">
              <p className="font-semibold text-sm text-muted-foreground">{emailAccount?.email || 'seu@email.com'}</p>
              <p className="font-bold text-lg mt-1">{subject}</p>
              <p className="text-muted-foreground mt-1 truncate">
                {content ? content.replace(/<[^>]*>/g, '').substring(0, 80) + '...' : 'Prévia do conteúdo do email...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 3: Content
  const renderStep3 = () => (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Como você quer criar o email?</h2>
        <p className="text-muted-foreground">Escolha um template ou escreva do zero</p>
      </div>

      {!contentMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
            onClick={() => setContentMode('template')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-bold text-lg mb-2">Usar Template</h4>
              <p className="text-muted-foreground">
                Escolha um dos seus templates salvos
              </p>
              {templates.length > 0 && (
                <Badge variant="outline" className="mt-3">
                  {templates.length} disponíveis
                </Badge>
              )}
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
            onClick={() => setContentMode('scratch')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-bold text-lg mb-2">Criar do Zero</h4>
              <p className="text-muted-foreground">
                Escreva seu próprio conteúdo
              </p>
            </CardContent>
          </Card>
        </div>
      ) : contentMode === 'template' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setContentMode(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar às opções
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/email/builder')}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Criar novo template
            </Button>
          </div>
          
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => selectTemplate(template)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description || 'Sem descrição'}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">Nenhum template salvo</p>
                <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro template no construtor visual</p>
                <Button onClick={() => navigate('/dashboard/email/builder')}>
                  <Palette className="h-4 w-4 mr-2" />
                  Criar Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setContentMode(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar às opções
            </Button>
          </div>
          
          <Textarea
            placeholder="Escreva o conteúdo do seu email aqui...

Você pode usar HTML para formatação:
<b>texto em negrito</b>
<i>texto em itálico</i>
<a href='link'>link clicável</a>"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="resize-none text-base"
          />
        </div>
      )}
    </div>
  );

  // Step 4: Review
  const renderStep4 = () => (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Revise antes de enviar</h2>
        <p className="text-muted-foreground">Confira todas as informações estão corretas</p>
      </div>

      <div className="grid gap-6">
        {/* Summary Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{recipients.length}</p>
                <p className="text-sm text-muted-foreground">Destinatários</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{dailyLimit.limit - dailyLimit.sent}</p>
                <p className="text-sm text-muted-foreground">Restantes hoje</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  {isConnected ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">De:</span>
                <span className="font-medium">{emailAccount?.email || 'Não conectado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assunto:</span>
                <span className="font-medium truncate max-w-xs">{subject}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Preview */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">Preview do email:</p>
            <div 
              className="prose prose-sm max-w-none bg-white dark:bg-muted/20 rounded-lg border p-6 max-h-64 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground italic">Sem conteúdo</p>' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Enviar Email</h1>
                <p className="text-xs text-muted-foreground">{dailyLimit.sent}/{dailyLimit.limit} enviados hoje</p>
              </div>
            </div>
            
            <EmailConnectionPopover
              isConnected={isConnected}
              loading={loading}
              emailAccount={emailAccount}
              onConnect={connectGmail}
              onDisconnect={disconnectGmail}
            />
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="border-b bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all ${
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : step.id < currentStep
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                  <span className="text-sm font-medium sm:hidden">{step.id}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="gap-2 px-8"
                size="lg"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={sendEmails}
                disabled={sending || !isConnected}
                className="gap-2 px-8"
                size="lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar {recipients.length} Email(s)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanEmailMarketing;
