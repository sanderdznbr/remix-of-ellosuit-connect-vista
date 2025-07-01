
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

const EmailComposer = () => {
  const [formData, setFormData] = useState({
    recipient_email: '',
    recipient_name: '',
    subject: '',
    content_html: '',
    content_text: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendEmail = async () => {
    if (!formData.recipient_email || !formData.subject || !formData.content_html) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: formData
      });

      if (error) throw error;

      toast.success('Email enviado com sucesso!');
      setFormData({
        recipient_email: '',
        recipient_name: '',
        subject: '',
        content_html: '',
        content_text: ''
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Erro ao enviar email: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Compor Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recipient_email">Email do Destinatário *</Label>
            <Input
              id="recipient_email"
              type="email"
              value={formData.recipient_email}
              onChange={(e) => handleInputChange('recipient_email', e.target.value)}
              placeholder="exemplo@email.com"
            />
          </div>
          <div>
            <Label htmlFor="recipient_name">Nome do Destinatário</Label>
            <Input
              id="recipient_name"
              value={formData.recipient_name}
              onChange={(e) => handleInputChange('recipient_name', e.target.value)}
              placeholder="Nome do destinatário"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="subject">Assunto *</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Assunto do email"
          />
        </div>

        <div>
          <Label htmlFor="content_html">Conteúdo HTML *</Label>
          <Textarea
            id="content_html"
            value={formData.content_html}
            onChange={(e) => handleInputChange('content_html', e.target.value)}
            placeholder="<h1>Olá!</h1><p>Conteúdo do seu email aqui...</p>"
            rows={8}
          />
        </div>

        <div>
          <Label htmlFor="content_text">Conteúdo Texto (opcional)</Label>
          <Textarea
            id="content_text"
            value={formData.content_text}
            onChange={(e) => handleInputChange('content_text', e.target.value)}
            placeholder="Versão em texto do email..."
            rows={4}
          />
        </div>

        <Button 
          onClick={handleSendEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailComposer;
