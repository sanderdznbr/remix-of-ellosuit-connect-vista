import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  FileText, 
  Eye, 
  Send, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  UserPlus,
  X,
  Mail,
  Loader2,
  Check,
  Sparkles,
  Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGmail } from '@/hooks/useGmail';
import { supabase } from '@/integrations/supabase/client';
import AISubjectHelper from './AISubjectHelper';
import EmailLimitIndicator from './EmailLimitIndicator';

interface EmailComposerWizardProps {
  onOpenDesigner?: () => void;
}

const STEPS = [
  { id: 1, title: 'Destinatários', icon: Users },
  { id: 2, title: 'Assunto', icon: FileText },
  { id: 3, title: 'Conteúdo', icon: Palette },
  { id: 4, title: 'Revisar', icon: Eye },
];

const EmailComposerWizard: React.FC<EmailComposerWizardProps> = ({ onOpenDesigner }) => {
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
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, emailAccount } = useGmail();
  const [companyId, setCompanyId] = useState<string | null>(null);

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

  // Fetch clients for quick add
  useEffect(() => {
    const fetchClients = async () => {
      if (!companyId) return;
      
      const { data } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('company_id', companyId)
        .not('email', 'is', null)
        .limit(50);
      
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
      toast({
        title: "Email duplicado",
        description: "Este email já foi adicionado",
        variant: "destructive"
      });
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
      toast({
        title: "Emails adicionados",
        description: `${added} email(s) foram adicionados`
      });
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(e => e !== email));
  };

  const addClientEmails = (clientEmails: string[]) => {
    let added = 0;
    clientEmails.forEach(email => {
      if (email && !recipients.includes(email.toLowerCase())) {
        setRecipients(prev => [...prev, email.toLowerCase()]);
        added++;
      }
    });
    
    if (added > 0) {
      toast({
        title: "Clientes adicionados",
        description: `${added} email(s) de clientes foram adicionados`
      });
    }
    setShowClientPicker(false);
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

    setSending(true);
    let successCount = 0;
    let errorCount = 0;

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

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Error sending to ${recipient}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Emails enviados!",
          description: `${successCount} email(s) enviado(s) com sucesso${errorCount > 0 ? `, ${errorCount} falharam` : ''}`
        });
        
        // Reset wizard
        setCurrentStep(1);
        setRecipients([]);
        setSubject('');
        setContent('');
        setSelectedTemplate(null);
        setContentMode(null);
      } else {
        throw new Error('Nenhum email foi enviado');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro desconhecido",
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            onClick={() => step.id < currentStep && setCurrentStep(step.id)}
            disabled={step.id > currentStep}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              currentStep === step.id
                ? 'bg-primary text-primary-foreground'
                : step.id < currentStep
                  ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {step.id < currentStep ? (
              <Check className="h-4 w-4" />
            ) : (
              <step.icon className="h-4 w-4" />
            )}
            <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
          </button>
          {index < STEPS.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Para quem você quer enviar?</h3>
        <Badge variant="outline">{recipients.length} selecionado(s)</Badge>
      </div>

      {/* Email input */}
      <div className="space-y-2">
        <Input
          placeholder="Digite emails separados por vírgula ou Enter"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={handleEmailInput}
          onPaste={handlePasteEmails}
        />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            Importar Lista
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
            size="sm"
            className="gap-2"
            onClick={() => setShowClientPicker(!showClientPicker)}
          >
            <UserPlus className="h-4 w-4" />
            Da Agenda
          </Button>
        </div>
      </div>

      {/* Client picker */}
      {showClientPicker && clients.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="text-sm font-medium mb-2">Selecionar da agenda:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {clients.map(client => (
                <Badge
                  key={client.id}
                  variant="outline"
                  className={`cursor-pointer hover:bg-primary/10 ${
                    recipients.includes(client.email?.toLowerCase()) 
                      ? 'bg-primary/20 border-primary' 
                      : ''
                  }`}
                  onClick={() => client.email && addEmail(client.email)}
                >
                  {client.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipients list */}
      {recipients.length > 0 && (
        <div className="border rounded-lg p-3">
          <p className="text-sm font-medium mb-2">Destinatários:</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {recipients.map(email => (
              <Badge
                key={email}
                variant="secondary"
                className="gap-1 pr-1"
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
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Qual será o assunto do email?</h3>
      
      <div className="space-y-3">
        <Input
          placeholder="Ex: Oferta especial para você!"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="text-lg"
        />
        
        <AISubjectHelper
          currentSubject={subject}
          onSelectSubject={setSubject}
        />
      </div>

      {/* Preview */}
      {subject && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Preview na caixa de entrada:</p>
            <div className="bg-background rounded-lg p-3 border">
              <p className="font-semibold text-sm">{emailAccount?.email || 'seu@email.com'}</p>
              <p className="font-medium">{subject}</p>
              <p className="text-sm text-muted-foreground truncate">
                {content ? content.replace(/<[^>]*>/g, '').substring(0, 60) + '...' : 'Prévia do conteúdo...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Como você quer criar o email?</h3>

      {!contentMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
            onClick={() => setContentMode('template')}
          >
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-1">Usar Template</h4>
              <p className="text-sm text-muted-foreground">
                Escolha um template salvo
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
            onClick={() => setContentMode('scratch')}
          >
            <CardContent className="p-6 text-center">
              <Palette className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h4 className="font-semibold mb-1">Criar do Zero</h4>
              <p className="text-sm text-muted-foreground">
                Escreva seu próprio conteúdo
              </p>
            </CardContent>
          </Card>
        </div>
      ) : contentMode === 'template' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setContentMode(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <p className="text-sm text-muted-foreground">{templates.length} templates disponíveis</p>
          </div>
          
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
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
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description || 'Sem descrição'}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum template salvo</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setContentMode('scratch')}
                >
                  Criar do zero
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setContentMode(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            {onOpenDesigner && (
              <Button variant="outline" size="sm" onClick={onOpenDesigner} className="gap-2">
                <Palette className="h-4 w-4" />
                Abrir Designer Visual
              </Button>
            )}
          </div>
          
          <Textarea
            placeholder="Escreva o conteúdo do seu email aqui..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            className="resize-none"
          />
          
          <p className="text-xs text-muted-foreground">
            Dica: Use HTML básico para formatação (ex: &lt;b&gt;negrito&lt;/b&gt;, &lt;br&gt; para quebra de linha)
          </p>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Revise antes de enviar</h3>

      <div className="grid gap-4">
        {/* Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">De:</span>
              <span className="font-medium">{emailAccount?.email || 'Não conectado'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Para:</span>
              <span className="font-medium">{recipients.length} destinatário(s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assunto:</span>
              <span className="font-medium truncate max-w-[200px]">{subject}</span>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Preview do Email</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div 
              className="prose prose-sm max-w-none bg-white rounded-lg border p-4 max-h-60 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground">Sem conteúdo</p>' }}
            />
          </CardContent>
        </Card>

        {/* Limit indicator */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Limite diário:</span>
          <EmailLimitIndicator />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderStepIndicator()}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
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
            className="gap-2"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={sendEmails}
            disabled={sending || !isConnected}
            className="gap-2"
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
  );
};

export default EmailComposerWizard;
