
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Upload, X, Plus } from 'lucide-react';
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
  
  const { toast } = useToast();
  const { templates } = useEmailTemplates();

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
    if (!fromEmail || !subject || recipients.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      for (const recipient of recipients) {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            recipient_email: recipient,
            subject,
            content_html: htmlContent,
            content_text: textContent,
            from_email: fromEmail,
            from_name: fromName,
            provider: 'resend'
          }
        });

        if (error) {
          console.error('Erro ao enviar email:', error);
          throw error;
        }
      }

      toast({
        title: "Emails enviados!",
        description: `${recipients.length} email(s) enviado(s) com sucesso`
      });

      // Limpar formulário
      setRecipients([]);
      setSubject('');
      setHtmlContent('');
      setTextContent('');
      setSelectedTemplate('');

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compor Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurações do remetente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fromEmail">Email do remetente*</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="seu@email.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
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

          {/* Seletor de template */}
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

          {/* Tipo de envio */}
          <div>
            <Label>Tipo de envio</Label>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => setSendType('single')}
                className={`px-4 py-2 rounded-lg border ${
                  sendType === 'single' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300'
                }`}
              >
                Envio Individual
              </button>
              <button
                type="button"
                onClick={() => setSendType('bulk')}
                className={`px-4 py-2 rounded-lg border ${
                  sendType === 'bulk' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300'
                }`}
              >
                Envio em Massa
              </button>
            </div>
          </div>

          {/* Destinatários */}
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

          {/* Assunto */}
          <div>
            <Label htmlFor="subject">Assunto*</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Conteúdo HTML */}
          <div>
            <Label htmlFor="htmlContent">Conteúdo HTML</Label>
            <Textarea
              id="htmlContent"
              placeholder="<h1>Seu email em HTML</h1>"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="min-h-32"
            />
          </div>

          {/* Conteúdo texto */}
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

          {/* Botão de envio */}
          <Button 
            onClick={handleSendEmail} 
            disabled={isSending}
            className="w-full"
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
