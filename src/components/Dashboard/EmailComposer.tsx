import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Send, Upload, X, Plus, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

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
  const [provider, setProvider] = useState<'gmail' | 'resend'>('gmail');
  
  const { toast } = useToast();
  const { templates } = useEmailTemplates();
  const { user } = useAuth();
  const { isConnected, emailAccount } = useGmail();

  // Auto-fill sender when Gmail is connected
  useEffect(() => {
    if (isConnected && emailAccount) {
      setFromEmail(emailAccount.provider_email);
      setProvider('gmail');
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

    if (provider === 'gmail' && !isConnected) {
      toast({
        title: "Gmail não conectado",
        description: "Conecte seu Gmail na aba Conexão para enviar emails",
        variant: "destructive"
      });
      return;
    }

    if (provider === 'resend' && !fromEmail) {
      toast({
        title: "Email do remetente",
        description: "Informe o email do remetente para usar o Resend",
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
            provider: provider,
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

        // Clear form
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
      {/* Provider Selection */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <Label className="mb-3 block">Provedor de envio</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setProvider('gmail')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                provider === 'gmail' 
                  ? 'bg-white border-[#3000E3] text-[#3000E3] shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span className="font-medium">Gmail</span>
              {isConnected && provider === 'gmail' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setProvider('resend')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                provider === 'resend' 
                  ? 'bg-white border-[#3000E3] text-[#3000E3] shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Send className="h-4 w-4" />
              <span className="font-medium">Resend</span>
            </button>
          </div>
          
          {provider === 'gmail' && !isConnected && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Conecte seu Gmail na aba "Conexão" para enviar</span>
            </div>
          )}
          
          {provider === 'gmail' && isConnected && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Enviando como: {emailAccount?.provider_email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compor Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sender Config - Only show for Resend */}
          {provider === 'resend' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromEmail">Email do remetente*</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="seu@dominio.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Use um email do domínio verificado no Resend</p>
              </div>
              <div>
                <Label htmlFor="fromName">Nome do remetente</Label>
                <Input
                  id="fromName"
                  placeholder="Seu Nome"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Gmail sender info */}
          {provider === 'gmail' && isConnected && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Remetente: <strong>{emailAccount?.provider_email}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <Label htmlFor="template">Template (opcional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
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
            <Label>Tipo de envio</Label>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => setSendType('single')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  sendType === 'single' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                Envio Individual
              </button>
              <button
                type="button"
                onClick={() => setSendType('bulk')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  sendType === 'bulk' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                Envio em Massa
              </button>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <Label>Destinatários*</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="destinatario@email.com"
                  value={currentRecipient}
                  onChange={(e) => setCurrentRecipient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button onClick={addRecipient} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {sendType === 'bulk' && (
                <div>
                  <Label htmlFor="bulk-upload">Ou faça upload de uma lista (CSV/TXT)</Label>
                  <Input
                    id="bulk-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleBulkUpload}
                    className="mt-1"
                  />
                </div>
              )}

              {recipients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{recipients.length} destinatário(s):</p>
                  <div className="flex flex-wrap gap-2">
                    {recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button onClick={() => removeRecipient(email)}>
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
            <Label htmlFor="subject">Assunto*</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* HTML Content */}
          <div>
            <Label htmlFor="htmlContent">Conteúdo HTML</Label>
            <Textarea
              id="htmlContent"
              placeholder="<h1>Seu email em HTML</h1>"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="min-h-32 font-mono text-sm"
            />
          </div>

          {/* Text Content */}
          <div>
            <Label htmlFor="textContent">Conteúdo texto (fallback)</Label>
            <Textarea
              id="textContent"
              placeholder="Versão em texto do seu email"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSendEmail} 
            disabled={isSending || (provider === 'gmail' && !isConnected)}
            className="w-full bg-[#3000E3] hover:bg-[#2500B3]"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : `Enviar Email${recipients.length > 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailComposer;
