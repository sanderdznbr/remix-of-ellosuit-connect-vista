import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGmail } from '@/hooks/useGmail';
import { Send, X, Plus, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

const OMNI_COLOR = '#FF4500';

const EmailComposer = () => {
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendType, setSendType] = useState<'single' | 'bulk'>('single');
  
  const { toast } = useToast();
  const { templates } = useEmailTemplates();
  const { user } = useAuth();
  const { isConnected, emailAccount } = useGmail();

  useEffect(() => {
    if (isConnected && emailAccount) {
      setFromEmail(emailAccount.email);
    }
  }, [isConnected, emailAccount]);

  const addRecipient = () => {
    if (currentRecipient && !recipients.includes(currentRecipient)) {
      setRecipients([...recipients, currentRecipient]);
      setCurrentRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setHtmlContent(template.html_content);
      setSubject(template.name);
      setSelectedTemplate(templateId);
    }
  };

  const handleSendEmail = async () => {
    if (!subject || recipients.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha assunto e adicione pelo menos um destinatário",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Gmail não conectado",
        description: "Conecte seu Gmail nas Configurações para enviar emails",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const recipient of recipients) {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            recipient_email: recipient,
            subject,
            content_html: htmlContent || `<p>${textContent}</p>`,
            content_text: textContent,
            from_email: fromEmail,
            from_name: fromName,
            provider: 'gmail',
            user_id: user?.id
          }
        });

        if (error) {
          console.error('Erro ao enviar email:', error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Emails enviados!",
          description: `${successCount} email(s) enviado(s) com sucesso${errorCount > 0 ? `, ${errorCount} falhou` : ''}`
        });

        setRecipients([]);
        setSubject('');
        setHtmlContent('');
        setTextContent('');
        setSelectedTemplate('');
      } else {
        throw new Error('Nenhum email foi enviado');
      }

    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Erro ao enviar emails",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const emails = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.includes('@'));
        
        setRecipients(prev => [...new Set([...prev, ...emails])]);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gmail Connection Status */}
      {!isConnected ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Conecte seu Gmail nas Configurações para enviar emails</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">Enviando como: <strong>{emailAccount?.email}</strong></span>
        </div>
      )}

      <div className="bg-muted/20 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${OMNI_COLOR}15` }}>
            <Mail className="h-5 w-5" style={{ color: OMNI_COLOR }} />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Compor Email</h3>
        </div>

        {/* Template Selector */}
        <div>
          <Label htmlFor="template" className="text-sm font-medium">Template (opcional)</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="mt-1.5 rounded-xl">
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Send Type */}
        <div>
          <Label className="text-sm font-medium">Tipo de envio</Label>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setSendType('single')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                sendType === 'single' 
                  ? 'text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              style={sendType === 'single' ? { backgroundColor: OMNI_COLOR } : {}}
            >
              Envio Individual
            </button>
            <button
              type="button"
              onClick={() => setSendType('bulk')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                sendType === 'bulk' 
                  ? 'text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              style={sendType === 'bulk' ? { backgroundColor: OMNI_COLOR } : {}}
            >
              Envio em Massa
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <Label className="text-sm font-medium">Destinatários*</Label>
          <div className="space-y-3 mt-1.5">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="destinatario@email.com"
                value={currentRecipient}
                onChange={(e) => setCurrentRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                className="rounded-xl"
              />
              <Button 
                onClick={addRecipient} 
                size="icon"
                className="rounded-xl shrink-0"
                style={{ backgroundColor: OMNI_COLOR }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {sendType === 'bulk' && (
              <div>
                <Label htmlFor="bulk-upload" className="text-sm">Upload de lista (CSV/TXT)</Label>
                <Input
                  id="bulk-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleBulkUpload}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            )}

            {recipients.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{recipients.length} destinatário(s):</p>
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <Badge 
                      key={email} 
                      variant="secondary" 
                      className="flex items-center gap-1 rounded-lg px-3 py-1"
                    >
                      {email}
                      <button onClick={() => removeRecipient(email)} className="ml-1 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <Label htmlFor="subject" className="text-sm font-medium">Assunto*</Label>
          <Input
            id="subject"
            placeholder="Assunto do email"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 rounded-xl"
          />
        </div>

        {/* HTML Content */}
        <div>
          <Label htmlFor="htmlContent" className="text-sm font-medium">Conteúdo HTML</Label>
          <Textarea
            id="htmlContent"
            placeholder="<h1>Seu email em HTML</h1>"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="mt-1.5 min-h-32 font-mono text-sm rounded-xl"
          />
        </div>

        {/* Text Content */}
        <div>
          <Label htmlFor="textContent" className="text-sm font-medium">Conteúdo texto (fallback)</Label>
          <Textarea
            id="textContent"
            placeholder="Versão em texto do seu email"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="mt-1.5 min-h-20 rounded-xl"
          />
        </div>

        {/* Send Button */}
        <Button 
          onClick={handleSendEmail} 
          disabled={isSending || !isConnected}
          className="w-full rounded-xl text-white py-6 text-base font-medium"
          style={{ backgroundColor: OMNI_COLOR }}
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? 'Enviando...' : `Enviar Email${recipients.length > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
};

export default EmailComposer;
