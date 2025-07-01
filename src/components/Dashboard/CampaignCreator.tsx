
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Send, Save, Users, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CampaignCreator = () => {
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    subject: '',
    content_html: '',
    content_text: '',
    schedule_date: '',
    recipient_list: 'all'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const saveCampaign = async (status: 'draft' | 'active') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          name: campaignData.name,
          description: campaignData.description,
          status
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: status === 'draft' ? 'Campanha salva como rascunho' : 'Campanha criada com sucesso',
        description: `A campanha "${campaignData.name}" foi ${status === 'draft' ? 'salva' : 'criada'}.`
      });

      if (status === 'active') {
        // Implementar envio da campanha
        await sendCampaign(data.id);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar campanha',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      // Aqui você pode implementar a lógica de envio em massa
      // Por exemplo, buscar lista de contatos e enviar para cada um
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          campaign_id: campaignId,
          recipient_email: 'teste@exemplo.com', // Substituir por lista real
          subject: campaignData.subject,
          content_html: campaignData.content_html,
          content_text: campaignData.content_text
        }
      });

      if (error) throw error;

      toast({
        title: 'Campanha enviada com sucesso!',
        description: 'Os emails foram enviados para os destinatários.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar campanha',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Nova Campanha
          </CardTitle>
          <CardDescription>
            Configure sua campanha de email marketing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">Nome da Campanha</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex: Promoção Black Friday"
                  value={campaignData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="campaign-description">Descrição</Label>
                <Textarea
                  id="campaign-description"
                  placeholder="Descreva o objetivo desta campanha..."
                  value={campaignData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="email-subject">Assunto do Email</Label>
                <Input
                  id="email-subject"
                  placeholder="Ex: 🔥 50% OFF - Não perca!"
                  value={campaignData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient-list">Lista de Destinatários</Label>
                <Select
                  value={campaignData.recipient_list}
                  onValueChange={(value) => handleInputChange('recipient_list', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a lista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Contatos</SelectItem>
                    <SelectItem value="active">Contatos Ativos</SelectItem>
                    <SelectItem value="subscribers">Assinantes</SelectItem>
                    <SelectItem value="customers">Clientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schedule-date">Agendamento (Opcional)</Label>
                <Input
                  id="schedule-date"
                  type="datetime-local"
                  value={campaignData.schedule_date}
                  onChange={(e) => handleInputChange('schedule_date', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Estimativa de Alcance</p>
                  <p className="text-sm text-blue-700">~1,250 destinatários</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="email-content">Conteúdo do Email (HTML)</Label>
            <Textarea
              id="email-content"
              placeholder="Digite o conteúdo HTML do seu email..."
              value={campaignData.content_html}
              onChange={(e) => handleInputChange('content_html', e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="email-text">Versão em Texto (Opcional)</Label>
            <Textarea
              id="email-text"
              placeholder="Versão em texto simples do email..."
              value={campaignData.content_text}
              onChange={(e) => handleInputChange('content_text', e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => saveCampaign('draft')}
              disabled={isLoading || !campaignData.name}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            
            <Button
              onClick={() => saveCampaign('active')}
              disabled={isLoading || !campaignData.name || !campaignData.subject || !campaignData.content_html}
            >
              <Send className="h-4 w-4 mr-2" />
              {campaignData.schedule_date ? 'Agendar Envio' : 'Enviar Agora'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de Envio</CardTitle>
          <CardDescription>
            Teste o envio de email antes de ativar a campanha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="seu-email@exemplo.com"
              className="flex-1"
              id="test-email"
            />
            <Button 
              variant="outline"
              onClick={async () => {
                const testEmail = (document.getElementById('test-email') as HTMLInputElement)?.value;
                if (!testEmail) {
                  toast({
                    title: 'Email necessário',
                    description: 'Digite um email para teste',
                    variant: 'destructive'
                  });
                  return;
                }

                try {
                  await supabase.functions.invoke('send-email', {
                    body: {
                      recipient_email: testEmail,
                      subject: campaignData.subject || 'Teste de Email',
                      content_html: campaignData.content_html || '<p>Este é um email de teste.</p>',
                      content_text: campaignData.content_text || 'Este é um email de teste.'
                    }
                  });

                  toast({
                    title: 'Email de teste enviado!',
                    description: `Email enviado para ${testEmail}`
                  });
                } catch (error: any) {
                  toast({
                    title: 'Erro no teste',
                    description: error.message,
                    variant: 'destructive'
                  });
                }
              }}
            >
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignCreator;
